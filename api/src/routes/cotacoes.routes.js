import express from "express";
import db from "../database.js";
import { verificarCapacidade } from "../utils/estoqueUtils.js";

const router = express.Router();

// =====================================================
// CRIAR NOVA COTAÇÃO (SALVAR COMO PENDENTE)
// =====================================================
router.post("/", async (req, res) => {
  // Adicionado data_entrega na desestruturação
  const { fornecedor_id, data_entrega, valor_total, valor_frete, status, observacoes, grupo_comparacao, produtos } = req.body;

  try {
    const resultCotacao = await db.run(`
      INSERT INTO cotacoes (fornecedor_id, data_entrega, valor_total, valor_frete, status, observacoes, grupo_comparacao)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      fornecedor_id,
      data_entrega || null, // <=== Salva a data de entrega
      valor_total,
      valor_frete || 0,
      status || 'Pendente',
      observacoes || '',
      grupo_comparacao || null
    ]);

    const cotacaoId = resultCotacao.lastID;

    if (produtos && produtos.length > 0) {
      for (const prod of produtos) {
        await db.run(`
          INSERT INTO cotacao_itens (cotacao_id, produto_id, quantidade, preco_unitario, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `, [cotacaoId, prod.produto_id, prod.quantidade, prod.preco_unitario, prod.subtotal]);
      }
    }

    return res.status(201).json({ message: "Cotação salva com sucesso!", id: cotacaoId });
  } catch (error) {
    console.error("Erro ao criar cotação:", error);
    return res.status(500).json({ error: "Erro interno ao criar cotação." });
  }
});

// =====================================================
// LISTAR TODAS AS COTAÇÕES
// =====================================================
router.get("/", async (req, res) => {
  try {
    const cotacoes = await db.all(`
      SELECT c.*, f.nome as fornecedor_nome 
      FROM cotacoes c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      ORDER BY c.id DESC
    `);

    const itens = await db.all(`
      SELECT ci.*, p.nome as produto_nome 
      FROM cotacao_itens ci
      JOIN produtos p ON ci.produto_id = p.id
    `);

    const cotacoesMapeadas = cotacoes.map(cot => {
      const dataFormatada = new Date(cot.data_criacao).toLocaleDateString('pt-BR');
      const produtosDaCotacao = itens.filter(item => item.cotacao_id === cot.id);

      return {
        id: cot.id,
        data: dataFormatada,
        data_entrega: cot.data_entrega,
        fornecedor: cot.fornecedor_nome,
        fornecedor_id: cot.fornecedor_id,
        total: cot.valor_total,
        frete: cot.valor_frete,
        status: cot.status,
        grupo_comparacao: cot.grupo_comparacao,
        items: produtosDaCotacao.length,
        produtos: produtosDaCotacao.map(p => ({
          produto_id: p.produto_id,
          nome: p.produto_nome,
          quantidade_comprada: p.quantidade,
          preco_custo: p.preco_unitario,
          subtotal: p.subtotal
        }))
      };
    });

    return res.json(cotacoesMapeadas);
  } catch (error) {
    console.error("Erro ao listar cotações:", error);
    return res.status(500).json({ error: "Erro interno ao listar cotações." });
  }
});

// =====================================================
// CONFIRMAR COTAÇÃO (COMPRA E ESTOQUE)
// =====================================================
router.post("/confirmar", async (req, res) => {
  const { id, fornecedor, fornecedor_id, produtos } = req.body;

  try {
    // === BLOQUEIO DE CAPACIDADE AQUI ===
    // 1. Soma a quantidade de todos os produtos que estão entrando nesta cotação
    const quantidadeTotalCotacao = produtos.reduce((acc, item) => acc + Number(item.quantidade_comprada), 0);

    // 2. Verifica se cabe no armazém
    const verificacao = await verificarCapacidade(quantidadeTotalCotacao);
    if (!verificacao.temEspaco) {
      return res.status(400).json({ error: verificacao.mensagem });
    }
    // ===================================

    for (const item of produtos) {
      const preco_custo = Number(item.preco_custo);
      const quantidade = Number(item.quantidade_comprada);

      const preco_venda = preco_custo * 2;

      const historico = await db.get(`
        SELECT 
          COALESCE(SUM(quantidade), 0) as total_comprado,
          COUNT(id) as total_pedidos
        FROM movimentacoes_estoque 
        WHERE produto_id = ? AND tipo = 'Entrada'
      `, [item.produto_id]);

      const totalComprado = historico.total_comprado;
      const totalPedidos = historico.total_pedidos;

      const mediaHistorica = Math.ceil((totalComprado + quantidade) / (totalPedidos + 1));

      const estoque_maximo = mediaHistorica * 2;
      const estoque_minimo = Math.ceil(estoque_maximo * 0.2);

      const produtoAntigo = await db.get(`
        SELECT estoque_atual FROM produtos WHERE id = ?
      `, [item.produto_id]);

      if (!produtoAntigo) continue;

      const estoqueAntes = Number(produtoAntigo.estoque_atual || 0);
      const estoqueDepois = estoqueAntes + quantidade;

      await db.run(`
        UPDATE produtos 
        SET 
          preco_custo = ?,
          preco_venda = ?,
          estoque_atual = ?,
          estoque_minimo = ?,
          estoque_maximo = ?,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [preco_custo, preco_venda, estoqueDepois, estoque_minimo, estoque_maximo, item.produto_id]);

      await db.run(`
        INSERT INTO movimentacoes_estoque (
          produto_id, 
          tipo, 
          quantidade, 
          estoque_antes, 
          estoque_depois,
          motivo,
          fornecedor_id,
          criado_em
        ) VALUES (?, 'Entrada', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        item.produto_id,
        quantidade,
        estoqueAntes,
        estoqueDepois,
        `Entrada automática via Cotação #${id || 'S/N'} - ${fornecedor || 'Desconhecido'}`,
        fornecedor_id || null
      ]);
    }

    return res.status(200).json({
      mensagem: "Estoque, Preços e Limites atualizados com sucesso!"
    });

  } catch (error) {
    console.error("Erro ao processar compra:", error);
    return res.status(500).json({
      erro: "Erro interno no servidor ao confirmar cotação.",
      detalhe: error.message
    });
  }
});

// =====================================================
// ATUALIZAR STATUS E GRUPO DE COMPARAÇÃO DA COTAÇÃO (NOVA ROTA)
// =====================================================
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { status, grupo_comparacao } = req.body;

  try {
    await db.run(`
      UPDATE cotacoes 
      SET status = ?, grupo_comparacao = ?
      WHERE id = ?
    `, [status, grupo_comparacao, id]);

    return res.status(200).json({ message: "Status e grupo atualizados com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar cotação:", error);
    return res.status(500).json({ error: "Erro interno ao atualizar a cotação." });
  }
});

// =====================================================
// DELETAR COTAÇÃO
// =====================================================
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Exclui os itens da cotação primeiro (para evitar erro de chave estrangeira)
    await db.run(`DELETE FROM cotacao_itens WHERE cotacao_id = ?`, [id]);

    // 2. Exclui a cotação principal
    await db.run(`DELETE FROM cotacoes WHERE id = ?`, [id]);

    return res.status(200).json({ message: "Cotação excluída com sucesso!" });
  } catch (error) {
    console.error("Erro ao excluir cotação:", error);
    return res.status(500).json({ error: "Erro interno ao excluir cotação." });
  }
});

export default router;