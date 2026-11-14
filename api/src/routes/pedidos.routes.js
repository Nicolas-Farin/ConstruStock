import express from "express";
import db from "../database.js";

const router = express.Router();

// =====================================================
// 1. CRIAR NOVO PEDIDO (CHECKOUT SEGURO)
// =====================================================
router.post("/", async (req, res) => {
    const { cliente, forma_pagamento, parcelas, status, itens, usuario_id } = req.body;

    if (!itens || itens.length === 0) {
        return res.status(400).json({ erro: "O pedido não possui itens." });
    }

    await db.run('BEGIN TRANSACTION');

    try {
        let valorTotal = 0;
        let lucroTotal = 0;

        const pedidoResult = await db.run(
            `INSERT INTO pedidos (cliente, forma_pagamento, parcelas, status) VALUES (?, ?, ?, ?)`,
            [
                cliente || 'Cliente Balcão',
                forma_pagamento || 'Dinheiro',
                parcelas || 1,
                status || 'Pendente'
            ]
        );
        const pedidoId = pedidoResult.lastID;

        for (const item of itens) {
            const produto = await db.get(
                `SELECT nome, preco_custo, preco_venda, estoque_atual FROM produtos WHERE id = ?`,
                [item.produto_id]
            );

            if (!produto) throw new Error(`Produto ID ${item.produto_id} não encontrado.`);
            if (produto.estoque_atual < item.quantidade) {
                throw new Error(`Estoque insuficiente para o produto: ${produto.nome}. Disponível: ${produto.estoque_atual}`);
            }

            const precoVenda = item.preco_venda || produto.preco_venda;
            const precoCusto = produto.preco_custo || 0;

            const subtotalItem = precoVenda * item.quantidade;
            const lucroItem = (precoVenda - precoCusto) * item.quantidade;

            valorTotal += subtotalItem;
            lucroTotal += lucroItem;

            await db.run(
                `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_custo, preco_venda, subtotal) 
         VALUES (?, ?, ?, ?, ?, ?)`,
                [pedidoId, item.produto_id, item.quantidade, precoCusto, precoVenda, subtotalItem]
            );

            const novoEstoque = produto.estoque_atual - item.quantidade;
            await db.run(`UPDATE produtos SET estoque_atual = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`,
                [novoEstoque, item.produto_id]
            );

            await db.run(
                `INSERT INTO movimentacoes_estoque (produto_id, usuario_id, tipo, quantidade, estoque_antes, estoque_depois, preco_unitario, numero_documento, motivo) 
         VALUES (?, ?, 'Venda', ?, ?, ?, ?, ?, ?)`,
                [item.produto_id, usuario_id || null, item.quantidade, produto.estoque_atual, novoEstoque, precoVenda, pedidoId, `Venda PDV - Pedido #${pedidoId}`]
            );
        }

        await db.run(`UPDATE pedidos SET valor_total = ?, lucro_total = ? WHERE id = ?`, [valorTotal, lucroTotal, pedidoId]);

        await db.run('COMMIT');
        return res.status(201).json({
            mensagem: "Pedido finalizado com sucesso!",
            pedido_id: pedidoId
        });

    } catch (error) {
        await db.run('ROLLBACK');
        console.error("Erro no checkout:", error);
        return res.status(400).json({ erro: error.message });
    }
});

// =====================================================
// 2. LISTAR TODOS OS PEDIDOS (PARA A TELA DE HISTÓRICO)
// =====================================================
router.get("/", async (req, res) => {
    try {
        const pedidos = await db.all(`SELECT * FROM pedidos ORDER BY criado_em DESC`);
        return res.json(pedidos);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao listar pedidos." });
    }
});

// =====================================================
// 3. BUSCAR DETALHES DE UM PEDIDO ESPECÍFICO (ITENS)
// =====================================================
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Busca o cabeçalho do pedido
        const pedido = await db.get(`SELECT * FROM pedidos WHERE id = ?`, [id]);
        if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });

        // Busca os itens vinculados ao pedido com o nome do produto
        const itens = await db.all(`
      SELECT pi.*, p.nome as produto_nome, p.imagem_principal
      FROM pedido_itens pi
      LEFT JOIN produtos p ON p.id = pi.produto_id
      WHERE pi.pedido_id = ?
    `, [id]);

        pedido.itens = itens;
        return res.json(pedido);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao buscar detalhes do pedido." });
    }
});

// =====================================================
// 4. CANCELAR PEDIDO E ESTORNAR ESTOQUE
// =====================================================
router.patch("/:id/cancelar", async (req, res) => {
    const { id } = req.params;
    const { usuario_id } = req.body;

    await db.run('BEGIN TRANSACTION');

    try {
        const pedido = await db.get(`SELECT status FROM pedidos WHERE id = ?`, [id]);
        if (!pedido) throw new Error("Pedido não encontrado.");
        if (pedido.status === 'Cancelado') throw new Error("Este pedido já foi cancelado.");

        const itens = await db.all(`SELECT produto_id, quantidade FROM pedido_itens WHERE pedido_id = ?`, [id]);

        for (const item of itens) {
            // NOVO: desconta o que já voltou via Devolução, pra não estornar em dobro
            const jaDevolvido = await db.get(`
                SELECT COALESCE(SUM(di.quantidade), 0) as total
                FROM devolucao_itens di
                JOIN devolucoes d ON d.id = di.devolucao_id
                WHERE d.pedido_id = ? AND di.produto_id = ?
            `, [id, item.produto_id]);

            const quantidadeAEstornar = item.quantidade - (jaDevolvido?.total || 0);
            if (quantidadeAEstornar <= 0) continue; // este item já foi 100% devolvido antes do cancelamento

            const produto = await db.get(`SELECT estoque_atual FROM produtos WHERE id = ?`, [item.produto_id]);
            if (!produto) continue;

            const novoEstoque = produto.estoque_atual + quantidadeAEstornar;

            await db.run(`UPDATE produtos SET estoque_atual = ? WHERE id = ?`, [novoEstoque, item.produto_id]);

            await db.run(
                `INSERT INTO movimentacoes_estoque (produto_id, usuario_id, tipo, quantidade, estoque_antes, estoque_depois, numero_documento, motivo) 
         VALUES (?, ?, 'Estorno Venda', ?, ?, ?, ?, 'Cancelamento do Pedido #${id}')`,
                [item.produto_id, usuario_id || null, quantidadeAEstornar, produto.estoque_atual, novoEstoque, id]
            );
        }

        await db.run(`UPDATE pedidos SET status = 'Cancelado', atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`, [id]);

        await db.run('COMMIT');
        return res.json({ mensagem: "Pedido cancelado e estoque estornado com sucesso." });

    } catch (error) {
        await db.run('ROLLBACK');
        return res.status(400).json({ erro: error.message });
    }
});

// ==========================================
// ROTA PARA CONFIRMAR O PEDIDO
// ==========================================
router.patch("/:id/confirmar", async (req, res) => {
    const { id } = req.params;

    try {
        // Atualiza apenas o campo status para 'Confirmado' no banco de dados
        const result = await db.run(
            `UPDATE pedidos SET status = 'Confirmado' WHERE id = ?`,
            [id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ erro: "Pedido não encontrado." });
        }

        res.json({ mensagem: "Pedido confirmado com sucesso!" });
    } catch (error) {
        console.error("Erro ao confirmar pedido:", error);
        res.status(500).json({ erro: "Erro ao confirmar pedido." });
    }
});

export default router;