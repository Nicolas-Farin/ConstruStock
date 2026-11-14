import express from "express";
import db from "../database.js";
import { verificarCapacidade } from "../utils/estoqueUtils.js";

const router = express.Router();

// =====================================================
// BUSCAR PEDIDO PARA DEVOLUÇÃO (com quantidade já devolvida por item)
// =====================================================
router.get("/pedido/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const pedido = await db.get(`SELECT * FROM pedidos WHERE id = ?`, [id]);
        if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });

        if (pedido.status === 'Cancelado') {
            return res.status(400).json({ erro: "Este pedido foi cancelado e não pode ter itens devolvidos." });
        }

        const itens = await db.all(`
            SELECT pi.*, p.nome AS produto_nome, p.sku,
                COALESCE((
                    SELECT SUM(di.quantidade)
                    FROM devolucao_itens di
                    JOIN devolucoes d ON d.id = di.devolucao_id
                    WHERE d.pedido_id = pi.pedido_id AND di.produto_id = pi.produto_id
                ), 0) AS quantidade_devolvida
            FROM pedido_itens pi
            LEFT JOIN produtos p ON p.id = pi.produto_id
            WHERE pi.pedido_id = ?
        `, [id]);

        pedido.itens = itens;
        return res.json(pedido);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: "Erro ao buscar pedido para devolução." });
    }
});

// =====================================================
// LISTAR TODAS AS DEVOLUÇÕES (histórico, uso futuro)
// =====================================================
router.get("/", async (req, res) => {
    try {
        const devolucoes = await db.all(`
            SELECT d.*, p.cliente
            FROM devolucoes d
            LEFT JOIN pedidos p ON p.id = d.pedido_id
            ORDER BY d.id DESC
        `);
        return res.json(devolucoes);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao listar devoluções." });
    }
});

// =====================================================
// REGISTRAR DEVOLUÇÃO (devolve estoque + salva histórico)
// =====================================================
router.post("/", async (req, res) => {
    const { pedido_id, motivo, itens } = req.body;

    if (!pedido_id) return res.status(400).json({ erro: "Pedido é obrigatório." });
    if (!itens || itens.length === 0) {
        return res.status(400).json({ erro: "Selecione ao menos um item para devolver." });
    }

    await db.run('BEGIN TRANSACTION');
    try {
        const pedido = await db.get(`SELECT * FROM pedidos WHERE id = ?`, [pedido_id]);
        if (!pedido) throw new Error("Pedido não encontrado.");
        if (pedido.status === 'Cancelado') throw new Error("Este pedido já foi cancelado.");

        // Checa capacidade do armazém, já que a devolução aumenta o estoque
        const quantidadeTotal = itens.reduce((acc, i) => acc + Number(i.quantidade), 0);
        const verificacao = await verificarCapacidade(quantidadeTotal);
        if (!verificacao.temEspaco) throw new Error(verificacao.mensagem);

        let valorTotalDevolucao = 0;
        const itensValidados = [];

        for (const item of itens) {
            const quantidade = Number(item.quantidade);
            if (!quantidade || quantidade <= 0) continue;

            const itemPedido = await db.get(
                `SELECT * FROM pedido_itens WHERE pedido_id = ? AND produto_id = ?`,
                [pedido_id, item.produto_id]
            );
            if (!itemPedido) throw new Error(`Produto ID ${item.produto_id} não pertence a este pedido.`);

            const jaDevolvido = await db.get(`
                SELECT COALESCE(SUM(di.quantidade), 0) as total
                FROM devolucao_itens di
                JOIN devolucoes d ON d.id = di.devolucao_id
                WHERE d.pedido_id = ? AND di.produto_id = ?
            `, [pedido_id, item.produto_id]);

            const disponivel = itemPedido.quantidade - (jaDevolvido?.total || 0);
            if (quantidade > disponivel) {
                const produtoInfo = await db.get(`SELECT nome FROM produtos WHERE id = ?`, [item.produto_id]);
                throw new Error(`Quantidade inválida para "${produtoInfo?.nome || 'produto'}". Disponível: ${disponivel}.`);
            }

            const subtotal = itemPedido.preco_venda * quantidade;
            valorTotalDevolucao += subtotal;

            itensValidados.push({
                produto_id: item.produto_id,
                quantidade,
                preco_venda: itemPedido.preco_venda,
                subtotal
            });
        }

        if (itensValidados.length === 0) throw new Error("Nenhum item válido para devolução.");

        const resultDevolucao = await db.run(
            `INSERT INTO devolucoes (pedido_id, motivo, valor_total) VALUES (?, ?, ?)`,
            [pedido_id, motivo || null, valorTotalDevolucao]
        );
        const devolucaoId = resultDevolucao.lastID;

        for (const item of itensValidados) {
            await db.run(
                `INSERT INTO devolucao_itens (devolucao_id, produto_id, quantidade, preco_venda, subtotal) VALUES (?, ?, ?, ?, ?)`,
                [devolucaoId, item.produto_id, item.quantidade, item.preco_venda, item.subtotal]
            );

            const produto = await db.get(`SELECT estoque_atual FROM produtos WHERE id = ?`, [item.produto_id]);
            const estoqueAntes = Number(produto.estoque_atual || 0);
            const estoqueDepois = estoqueAntes + item.quantidade;

            await db.run(
                `UPDATE produtos SET estoque_atual = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`,
                [estoqueDepois, item.produto_id]
            );

            await db.run(
                `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, estoque_antes, estoque_depois, motivo, numero_documento, criado_em)
                 VALUES (?, 'Devolução', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [item.produto_id, item.quantidade, estoqueAntes, estoqueDepois, motivo || `Devolução do Pedido #${pedido_id}`, pedido_id]
            );
        }

        await db.run('COMMIT');
        return res.status(201).json({
            mensagem: "Devolução registrada com sucesso!",
            devolucao_id: devolucaoId,
            valor_total: valorTotalDevolucao
        });
    } catch (error) {
        await db.run('ROLLBACK');
        console.error("Erro ao registrar devolução:", error);
        return res.status(400).json({ erro: error.message });
    }
});

export default router;