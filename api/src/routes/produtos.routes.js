import express from "express";
import db from "../database.js";
import upload from "../middleware/upload.js";
import fs from "fs";
import path from "path";
import { verificarCapacidade } from "../utils/estoqueUtils.js";

const router = express.Router();

// =====================================================
// LISTAR CATEGORIAS
// =====================================================
router.get("/categorias", async (req, res) => {
  try {
    const categorias = await db.all(`
      SELECT
        categorias.id,
        categorias.nome,
        categorias.descricao,
        categorias.cor,
        COUNT(produtos.id) AS produtos,
        COALESCE(SUM(produtos.estoque_atual * produtos.preco_venda), 0) AS valor,
        COUNT(CASE WHEN produtos.estoque_atual <= produtos.estoque_minimo THEN 1 END) AS alertas
      FROM categorias
      LEFT JOIN produtos ON produtos.categoria_id = categorias.id
      WHERE categorias.ativo = 1
      GROUP BY categorias.id
      ORDER BY categorias.nome
    `);
    return res.json(categorias);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ erro: "Erro ao listar categorias." });
  }
});

// =====================================================
// CADASTRAR CATEGORIA
// =====================================================
router.post("/categorias", async (req, res) => {
  try {
    const { nome, descricao, cor } = req.body;
    await db.run(`INSERT INTO categorias (nome, descricao, cor) VALUES (?, ?, ?)`, [nome, descricao, cor]);
    res.status(201).json({ message: "Categoria criada com sucesso" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ erro: "Erro ao criar categoria" });
  }
});

// =====================================================
// LISTAR PRODUTOS POR CATEGORIA (COM FORNECEDORES HISTÓRICOS)
// =====================================================
router.get("/categorias/:idCategoria/produtos", async (req, res) => {
  const { idCategoria } = req.params;
  try {
    const produtos = await db.all(`
      SELECT
        p.*,
        c.nome AS categoria_nome,
        fp.nome AS fornecedor_nome,
        COALESCE((
          SELECT json_group_array(json_object('id', f.id, 'nome', f.nome)) 
          FROM (
            SELECT DISTINCT fornecedor_id 
            FROM movimentacoes_estoque 
            WHERE produto_id = p.id AND fornecedor_id IS NOT NULL
          ) me
          JOIN fornecedores f ON f.id = me.fornecedor_id
        ), '[]') AS fornecedores,
        COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE 0 END), 0) AS entradas,
        MAX(0,
          COALESCE(SUM(CASE WHEN m.tipo IN ('Saida', 'Venda') THEN m.quantidade ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN m.tipo IN ('Estorno Venda', 'Devolução') THEN m.quantidade ELSE 0 END), 0)
        ) AS saidas
      FROM produtos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN fornecedores fp ON fp.id = p.fornecedor_principal_id
      LEFT JOIN movimentacoes_estoque m ON p.id = m.produto_id
      WHERE p.categoria_id = ?
      GROUP BY p.id
    `, [idCategoria]);

    const produtosFormatados = produtos.map(prod => ({
      ...prod,
      fornecedores: JSON.parse(prod.fornecedores)
    }));
    res.json(produtosFormatados);
  } catch (error) {
    console.log(error);
    res.status(500).json({ erro: "Erro ao buscar produtos da categoria" });
  }
});

// =====================================================
// CADASTRAR FORNECEDOR
// =====================================================
router.post("/fornecedores", async (req, res) => {
  try {
    const { empresa, cnpj, inscricaoEstadual, responsavel, email, telefone, celular, cep, endereco, categoria, condicaoPagamento, prazo, produtos, observacoes } = req.body;
    if (!empresa || !cnpj || !email) {
      return res.status(400).json({ erro: "Empresa, CNPJ e Email são obrigatórios." });
    }
    const resultado = await db.run(`
      INSERT INTO fornecedores (nome, cnpj, inscricao_estadual, responsavel, email, telefone, celular, cep, endereco, categoria, condicao_pagamento, prazo_entrega_dias, produtos, observacoes, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [empresa, cnpj, inscricaoEstadual || null, responsavel || null, email, telefone || null, celular || null, cep || null, endereco || null, categoria || null, condicaoPagamento || null, prazo || null, produtos || null, observacoes || null]);
    return res.status(201).json({ id: resultado.lastID, mensagem: "Fornecedor cadastrado com sucesso." });
  } catch (error) {
    console.error("Erro no SQLite:", error);
    if (error.message.includes("UNIQUE")) return res.status(409).json({ erro: "Este CNPJ já está cadastrado." });
    return res.status(500).json({ erro: error.message });
  }
});

// =====================================================
// EXCLUIR FORNECEDORES
// =====================================================
router.delete("/fornecedores/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Já foi cotado?
    const temCotacao = await db.get(
      `SELECT id FROM cotacoes WHERE fornecedor_id = ? LIMIT 1`, [id]
    );
    if (temCotacao) {
      return res.status(409).json({
        erro: "Não é possível excluir: este fornecedor possui cotações registradas."
      });
    }

    // 2. Já teve movimentação de estoque (entrada/venda vinculada)?
    const temMovimentacao = await db.get(
      `SELECT id FROM movimentacoes_estoque WHERE fornecedor_id = ? LIMIT 1`, [id]
    );
    if (temMovimentacao) {
      return res.status(409).json({
        erro: "Não é possível excluir: este fornecedor possui movimentações de estoque registradas."
      });
    }

    // 3. É fornecedor principal de algum produto?
    const ehFornecedorPrincipal = await db.get(
      `SELECT id FROM produtos WHERE fornecedor_principal_id = ? LIMIT 1`, [id]
    );
    if (ehFornecedorPrincipal) {
      return res.status(409).json({
        erro: "Não é possível excluir: este fornecedor é o fornecedor principal de um ou mais produtos."
      });
    }

    // Se passou pelas 3 checagens, é seguro excluir (só tem vínculos "leves")
    await db.run('BEGIN TRANSACTION');
    try {
      await db.run("DELETE FROM fornecedor_precos WHERE fornecedor_id = ?", [id]);
      await db.run("DELETE FROM produto_fornecedores WHERE fornecedor_id = ?", [id]);
      await db.run("DELETE FROM fornecedores WHERE id = ?", [id]);
      await db.run('COMMIT');
      res.sendStatus(204);
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao excluir fornecedor." });
  }
});

// =====================================================
// ATUALIZAR FORNECEDOR (NOVO)
// =====================================================
router.put("/fornecedores/:id", async (req, res) => {
  const { id } = req.params;
  const {
    empresa, nome_fantasia, responsavel, email, telefone, celular,
    inscricaoEstadual, endereco, numero, bairro, cidade, estado, cep,
    categoria, condicaoPagamento, prazo, produtos, observacoes
  } = req.body;

  try {
    const fornecedorExistente = await db.get(`SELECT * FROM fornecedores WHERE id = ?`, [id]);
    if (!fornecedorExistente) {
      return res.status(404).json({ erro: "Fornecedor não encontrado." });
    }

    await db.run(`
      UPDATE fornecedores SET
        nome = ?, nome_fantasia = ?, responsavel = ?, email = ?, telefone = ?,
        celular = ?, inscricao_estadual = ?, endereco = ?, numero = ?, bairro = ?,
        cidade = ?, estado = ?, cep = ?, categoria = ?, condicao_pagamento = ?,
        prazo_entrega_dias = ?, produtos = ?, observacoes = ?, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      empresa ?? fornecedorExistente.nome,
      nome_fantasia ?? fornecedorExistente.nome_fantasia,
      responsavel ?? fornecedorExistente.responsavel,
      email ?? fornecedorExistente.email,
      telefone ?? fornecedorExistente.telefone,
      celular ?? fornecedorExistente.celular,
      inscricaoEstadual ?? fornecedorExistente.inscricao_estadual,
      endereco ?? fornecedorExistente.endereco,
      numero ?? fornecedorExistente.numero,
      bairro ?? fornecedorExistente.bairro,
      cidade ?? fornecedorExistente.cidade,
      estado ?? fornecedorExistente.estado,
      cep ?? fornecedorExistente.cep,
      categoria ?? fornecedorExistente.categoria,
      condicaoPagamento ?? fornecedorExistente.condicao_pagamento,
      prazo ?? fornecedorExistente.prazo_entrega_dias,
      produtos ?? fornecedorExistente.produtos,
      observacoes ?? fornecedorExistente.observacoes,
      id
    ]);

    const fornecedorAtualizado = await db.get(`SELECT * FROM fornecedores WHERE id = ?`, [id]);
    return res.json(fornecedorAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar fornecedor:", error);
    if (error.message.includes("UNIQUE")) {
      return res.status(409).json({ erro: "Já existe um fornecedor com esses dados." });
    }
    return res.status(500).json({ erro: "Erro ao atualizar fornecedor.", detalhe: error.message });
  }
});

// =====================================================
// LISTAR FORNECEDORES
// =====================================================
router.get("/fornecedores", async (req, res) => {
  try {
    const fornecedores = await db.all(`SELECT * FROM fornecedores WHERE ativo = 1 ORDER BY nome`);
    return res.json(fornecedores);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ erro: "Erro ao listar fornecedores." });
  }
});

// =====================================================
// BUSCAR PREÇO BASE DO FORNECEDOR
// =====================================================
router.get("/preco-base", async (req, res) => {
  try {
    const { fornecedor_id, categoria_id } = req.query;
    const preco = await db.get(`
      SELECT preco_base FROM fornecedor_precos WHERE fornecedor_id = ? AND categoria_id = ?
    `, [fornecedor_id, categoria_id]);

    if (!preco) return res.json({ preco_base: 0 });
    return res.json(preco);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ erro: "Erro ao buscar preço base." });
  }
});

// =====================================================
// LISTAR PRODUTOS GERAL (COM FORNECEDORES HISTÓRICOS)
// =====================================================
router.get("/", async (req, res) => {
  try {
    const produtos = await db.all(`
      SELECT p.*, c.nome AS categoria_nome,
      COALESCE((
        SELECT json_group_array(json_object('id', f.id, 'nome', f.nome)) 
        FROM (
          SELECT DISTINCT fornecedor_id 
          FROM movimentacoes_estoque 
          WHERE produto_id = p.id AND fornecedor_id IS NOT NULL
        ) me
        JOIN fornecedores f ON f.id = me.fornecedor_id
      ), '[]') AS fornecedores,
      -- Lógica de soma ajustada para o dashboard
      COALESCE(SUM(CASE WHEN m.tipo IN ('Entrada', 'Estorno Venda', 'Devolução') THEN m.quantidade ELSE 0 END), 0) AS total_entradas,
      COALESCE(SUM(CASE WHEN m.tipo IN ('Saida', 'Venda') THEN m.quantidade ELSE 0 END), 0) AS total_saidas
      FROM produtos p 
      LEFT JOIN categorias c ON c.id = p.categoria_id 
      LEFT JOIN movimentacoes_estoque m ON p.id = m.produto_id
      GROUP BY p.id
      ORDER BY p.id DESC
    `);

    const produtosFormatados = produtos.map(prod => ({
      ...prod,
      fornecedores: JSON.parse(prod.fornecedores)
    }));
    return res.json(produtosFormatados);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ erro: "Erro ao listar produtos." });
  }
});
// =====================================================
// HISTÓRICO DE MOVIMENTAÇÃO DO PRODUTO
// =====================================================
router.get("/:id/movimentacoes", async (req, res) => {
  try {
    const { id } = req.params;
    const movimentacoes = await db.all(`
      SELECT m.*, u.nome AS usuario_nome, f.nome AS fornecedor_nome
      FROM movimentacoes_estoque m
      LEFT JOIN usuarios u ON u.id = m.usuario_id
      LEFT JOIN fornecedores f ON f.id = m.fornecedor_id
      WHERE m.produto_id = ? ORDER BY m.criado_em DESC
    `, [id]);
    return res.json(movimentacoes);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ erro: "Erro ao buscar movimentações." });
  }
});

// =====================================================
// LISTAR MOVIMENTAÇÕES DE ESTOQUE GERAL
// =====================================================
router.get("/movimentacoes", async (req, res) => {
  try {
    const movimentacoes = await db.all(`SELECT * FROM movimentacoes_estoque ORDER BY criado_em DESC`);
    return res.json(movimentacoes);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ erro: "Erro ao listar movimentações de estoque." });
  }
});

// =====================================================
// BUSCAR PRODUTO POR ID (CORRIGIDO PARA FORNECEDORES HISTÓRICOS)
// =====================================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await db.get(`
      SELECT p.*, c.nome AS categoria_nome,
      COALESCE((
        SELECT json_group_array(json_object('id', f.id, 'nome', f.nome)) 
        FROM (
          SELECT DISTINCT fornecedor_id 
          FROM movimentacoes_estoque 
          WHERE produto_id = p.id AND fornecedor_id IS NOT NULL
        ) me
        JOIN fornecedores f ON f.id = me.fornecedor_id
      ), '[]') AS fornecedores
      FROM produtos p 
      LEFT JOIN categorias c ON c.id = p.categoria_id 
      WHERE p.id = ?
    `, [id]);

    if (!produto) return res.status(404).json({ erro: "Produto não encontrado." });
    produto.fornecedores = JSON.parse(produto.fornecedores);
    return res.json(produto);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ erro: "Erro ao buscar produto." });
  }
});

// =====================================================
// CADASTRAR PRODUTO
// =====================================================
router.post("/", upload.single("imagem"), async (req, res) => {
  try {
    const { nome, descricao, sku, codigo_barras, categoria_id, fornecedor_principal_id, marca, preco_custo, preco_venda, estoque_atual, estoque_minimo, estoque_maximo, unidade_medida, localizacao, tipo_material, peso, dimensoes, imposto_percentual, observacoes, data_validade, produto_ativo } = req.body;
    const imagem_principal = req.file ? req.file.filename : null;

    if (!nome) return res.status(400).json({ erro: "Nome é obrigatório." });

    // === BLOQUEIO DE NOME DUPLICADO (case-insensitive) ===
    const nomeExistente = await db.get(
      `SELECT id FROM produtos WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))`,
      [nome]
    );
    if (nomeExistente) {
      return res.status(409).json({ erro: "Já existe um produto cadastrado com este nome." });
    }
    // =======================================================

    // === BLOQUEIO DE CAPACIDADE AQUI ===
    if (estoque_atual && Number(estoque_atual) > 0) {
      const verificacao = await verificarCapacidade(Number(estoque_atual));
      if (!verificacao.temEspaco) {
        return res.status(400).json({ erro: verificacao.mensagem }); // Retornamos "erro" ao invés de "error" para manter o padrão do seu arquivo
      }
    }
    // ===================================

    const resultado = await db.run(`INSERT INTO produtos (nome, descricao, sku, codigo_barras, categoria_id, fornecedor_principal_id, marca, preco_custo, preco_venda, estoque_atual, estoque_minimo, estoque_maximo, unidade_medida, localizacao, tipo_material, peso, dimensoes, imposto_percentual, observacoes, data_validade, produto_ativo, imagem_principal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nome, descricao || null, sku || null, codigo_barras || null, categoria_id || null, fornecedor_principal_id || null, marca || null, preco_custo || 0, preco_venda || 0, estoque_atual || 0, estoque_minimo || 0, estoque_maximo || 0, unidade_medida || null, localizacao || null, tipo_material || null, peso || 0, dimensoes || null, imposto_percentual || 0, observacoes || null, data_validade || null, produto_ativo || 1, imagem_principal]);

    const idGerado = resultado.lastID;

    const letras = nome.trim().toUpperCase().replace(/[^A-ZÀ-Ú\s]/g, "").split(" ").join("").slice(0, 2);
    const skuFinal = `${letras}-${String(idGerado).padStart(4, "0")}`;
    const codigoBarrasFinal = `789${String(idGerado).padStart(9, "0")}`;

    await db.run(`UPDATE produtos SET sku = ?, codigo_barras = ? WHERE id = ?`, [skuFinal, codigoBarrasFinal, idGerado]);

    if (estoque_atual && estoque_atual > 0) {
      await db.run(`INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, estoque_antes, estoque_depois, criado_em) VALUES (?, 'Entrada', ?, 0, ?, CURRENT_TIMESTAMP)`, [idGerado, estoque_atual, estoque_atual]);
    }

    const produtoCriado = await db.get(`SELECT * FROM produtos WHERE id = ?`, [idGerado]);
    return res.status(201).json(produtoCriado);
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao cadastrar produto.", detalhe: error.message });
  }
});

// =====================================================
// ATUALIZAR PRODUTO
// =====================================================
router.put("/:id", upload.single("imagem"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, categoria_id, fornecedor_principal_id, marca, sku, preco_custo, preco_venda, imposto_percentual, estoque_atual, estoque_minimo, estoque_maximo, localizacao, produto_ativo, produto_destaque, alerta_estoque, reposicao_automatica } = req.body;

    const produtoAntigo = await db.get(`SELECT estoque_atual, imagem_principal FROM produtos WHERE id = ?`, [id]);
    if (!produtoAntigo) return res.status(404).json({ erro: "Produto não encontrado." });

    const estoqueAntes = Number(produtoAntigo.estoque_atual || 0);
    const estoqueDepois = req.body.estoque_atual !== undefined ? Number(req.body.estoque_atual) : estoqueAntes;
    const diferenca = estoqueDepois - estoqueAntes;

    // === BLOQUEIO DE NOME DUPLICADO (case-insensitive, ignorando o próprio produto) ===
    if (nome) {
      const nomeExistente = await db.get(
        `SELECT id FROM produtos WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?)) AND id != ?`,
        [nome, id]
      );
      if (nomeExistente) {
        return res.status(409).json({ erro: "Já existe outro produto cadastrado com este nome." });
      }
    }
    // ===================================================================================

    // === BLOQUEIO DE CAPACIDADE AQUI (Só se for Entrada) ===
    if (diferenca > 0) {
      const verificacao = await verificarCapacidade(diferenca);
      if (!verificacao.temEspaco) {
        return res.status(400).json({ erro: verificacao.mensagem });
      }
    }
    // =======================================================

    let imagemPrincipal = produtoAntigo.imagem_principal;
    if (req.file) {
      if (produtoAntigo.imagem_principal) {
        const caminhoImagem = path.join(process.cwd(), "uploads", produtoAntigo.imagem_principal);
        if (fs.existsSync(caminhoImagem)) fs.unlinkSync(caminhoImagem);
      }
      imagemPrincipal = req.file.filename;
    }

    await db.run(`UPDATE produtos SET nome=?, descricao=?, categoria_id=?, fornecedor_principal_id=?, marca=?, sku=?, preco_custo=?, preco_venda=?, imposto_percentual=?, estoque_atual=?, estoque_minimo=?, estoque_maximo=?, localizacao=?, produto_ativo=?, produto_destaque=?, alerta_estoque=?, reposicao_automatica=?, imagem_principal=?, atualizado_em=CURRENT_TIMESTAMP WHERE id = ?`,
      [nome, descricao, categoria_id, fornecedor_principal_id, marca, sku, preco_custo, preco_venda, imposto_percentual, estoqueDepois, estoque_minimo, estoque_maximo, localizacao, (produto_ativo == 1 || produto_ativo == 'true') ? 1 : 0, (produto_destaque == 1 || produto_destaque == 'true') ? 1 : 0, (alerta_estoque == 1 || alerta_estoque == 'true') ? 1 : 0, (reposicao_automatica == 1 || reposicao_automatica == 'true') ? 1 : 0, imagemPrincipal, id]);

    if (estoqueAntes !== estoqueDepois) {
      await db.run(`INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, estoque_antes, estoque_depois, criado_em) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [id, diferenca > 0 ? 'Entrada' : 'Saida', Math.abs(diferenca), estoqueAntes, estoqueDepois]);
    }

    const produtoAtualizado = await db.get(`SELECT * FROM produtos WHERE id = ?`, [id]);
    return res.json(produtoAtualizado);
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao atualizar produto.", detalhe: error.message });
  }
});

// =====================================================
// DELETAR PRODUTO (COM EXCLUSÃO EM CASCATA)
// =====================================================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await db.get(`SELECT imagem_principal FROM produtos WHERE id = ?`, [id]);
    if (!produto) return res.status(404).json({ erro: "Produto não encontrado." });

    await db.run(`DELETE FROM produto_fornecedores WHERE produto_id = ?`, [id]);
    await db.run(`DELETE FROM movimentacoes_estoque WHERE produto_id = ?`, [id]);
    await db.run(`DELETE FROM produtos WHERE id = ?`, [id]);

    if (produto.imagem_principal) {
      const caminho = path.join(process.cwd(), "uploads", produto.imagem_principal);
      if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao deletar produto." });
  }
});

// =====================================================
// AJUSTES MANUAIS DE ESTOQUE (Inventário)
// =====================================================
router.patch("/:id/estoque-ajuste", async (req, res) => {
  try {
    const { id } = req.params;
    const { estoque_atual, motivo, usuario_id } = req.body;

    if (estoque_atual === undefined || !motivo) {
      return res.status(400).json({ erro: "Estoque atual e motivo do ajuste são obrigatórios." });
    }

    const produtoAntigo = await db.get(`SELECT estoque_atual FROM produtos WHERE id = ?`, [id]);
    if (!produtoAntigo) return res.status(404).json({ erro: "Produto não encontrado." });

    const estoqueAntes = Number(produtoAntigo.estoque_atual || 0);
    const estoqueDepois = Number(estoque_atual);

    if (estoqueAntes === estoqueDepois) return res.json({ mensagem: "Nenhuma alteração de estoque necessária." });

    const diferenca = estoqueDepois - estoqueAntes;

    // === BLOQUEIO DE CAPACIDADE AQUI (Só se for Entrada) ===
    if (diferenca > 0) {
      const verificacao = await verificarCapacidade(diferenca);
      if (!verificacao.temEspaco) {
        return res.status(400).json({ erro: verificacao.mensagem });
      }
    }
    // =======================================================

    const tipo = diferenca > 0 ? 'Entrada' : 'Saida';

    await db.run('BEGIN TRANSACTION');
    try {
      await db.run(
        `UPDATE produtos SET estoque_atual = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`,
        [estoqueDepois, id]
      );

      await db.run(
        `INSERT INTO movimentacoes_estoque (produto_id, usuario_id, tipo, quantidade, estoque_antes, estoque_depois, motivo, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, usuario_id || null, tipo, Math.abs(diferenca), estoqueAntes, estoqueDepois, `Ajuste manual: ${motivo}`]
      );
      await db.run('COMMIT');
      return res.json({ mensagem: "Ajuste de estoque realizado." });
    } catch (e) {
      await db.run('ROLLBACK');
      throw e;
    }
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao ajustar estoque.", detalhe: error.message });
  }
});

router.get('/volume', async (req, res) => {
  try {
    // 1. Busca a capacidade máxima global
    const config = await db.get(`SELECT valor FROM configuracoes WHERE chave = 'capacidade_maxima_estoque'`);
    const capacidadeMaxima = config ? parseInt(config.valor) : 10000;

    // 2. Soma todo o estoque atual de todos os produtos
    const resultado = await db.get(`SELECT SUM(estoque_atual) as total_ocupado FROM produtos`);
    const totalOcupado = resultado.total_ocupado || 0;

    // 3. Calcula a porcentagem e espaço livre
    const espacoLivre = capacidadeMaxima - totalOcupado;
    const porcentagemOcupada = ((totalOcupado / capacidadeMaxima) * 100).toFixed(1);

    res.json({
      capacidadeMaxima,
      totalOcupado,
      espacoLivre,
      porcentagemOcupada: Number(porcentagemOcupada)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar volume de estoque.' });
  }
});

export default router;