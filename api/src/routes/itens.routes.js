import express from "express";
import db from "../database.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const sql = `
            SELECT 
                id,
                nome,
                descricao,
                preco,
                quantidade,
                criado_em,
                atualizado_em
            FROM itens
            ORDER BY id DESC
        `;

    const itens = await db.all(sql);

    return res.json(itens);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao listar itens.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
            SELECT 
                id,
                nome,
                descricao,
                preco,
                quantidade,
                criado_em,
                atualizado_em
            FROM itens
            WHERE id = ?
        `;

    const item = await db.get(sql, [id]);

    if (!item) {
      return res.status(404).json({
        erro: "Item não encontrado.",
      });
    }

    return res.json(item);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao buscar item.",
    });
  }
});

router.post("/", async (req, res) => {
  try {

    const {
      nome,
      descricao,
      sku,
      codigo_barras,
      marca,

      preco_custo,
      preco_venda,

      estoque_atual,
      estoque_minimo,

      unidade_medida,

      localizacao,

      tipo_material,

      peso,

      dimensoes,

      imposto_percentual,

      observacoes,

      data_validade,

      produto_ativo
    } = req.body;

    if (!nome || preco_venda === undefined) {
      return res.status(400).json({
        erro: "Nome e preço de venda são obrigatórios."
      });
    }

    const sql = `
      INSERT INTO produtos (
        nome,
        descricao,
        sku,
        codigo_barras,
        marca,

        preco_custo,
        preco_venda,

        estoque_atual,
        estoque_minimo,

        unidade_medida,

        localizacao,

        tipo_material,

        peso,

        dimensoes,

        imposto_percentual,

        observacoes,

        data_validade,

        produto_ativo
      )
      VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `;

    const resultado = await db.run(sql, [

      nome,
      descricao || null,
      sku || null,
      codigo_barras || null,
      marca || null,

      preco_custo || 0,
      preco_venda || 0,

      estoque_atual || 0,
      estoque_minimo || 0,

      unidade_medida || null,

      localizacao || null,

      tipo_material || null,

      peso || 0,

      dimensoes || null,

      imposto_percentual || 0,

      observacoes || null,

      data_validade || null,

      produto_ativo || 1
    ]);

    const produtoCriado = await db.get(`
      SELECT *
      FROM produtos
      WHERE id = ?
    `, [resultado.lastID]);

    return res.status(201).json(produtoCriado);

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      erro: "Erro ao cadastrar produto.",
      detalhe: error.message
    });

  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, preco, quantidade } = req.body;

    if (!nome || preco === undefined || quantidade === undefined) {
      return res.status(400).json({
        erro: "Nome, preço e quantidade são obrigatórios.",
      });
    }

    const sql = `
            UPDATE itens
            SET 
                nome = ?,
                descricao = ?,
                preco = ?,
                quantidade = ?,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

    const resultado = await db.run(sql, [
      nome,
      descricao || null,
      preco,
      quantidade,
      id,
    ]);

    if (resultado.changes === 0) {
      return res.status(404).json({
        erro: "Item não encontrado.",
      });
    }

    const itemAtualizado = await db.get(
      `
                SELECT 
                    id,
                    nome,
                    descricao,
                    preco,
                    quantidade,
                    criado_em,
                    atualizado_em
                FROM itens
                WHERE id = ?
            `,
      [id],
    );

    return res.json(itemAtualizado);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao atualizar item.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
            DELETE FROM itens
            WHERE id = ?
        `;

    const resultado = await db.run(sql, [id]);

    if (resultado.changes === 0) {
      return res.status(404).json({
        erro: "Item não encontrado.",
      });
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao deletar item.",
    });
  }
});

export default router;
