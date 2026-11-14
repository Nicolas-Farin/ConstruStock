import { Router } from "express";
import db from "../database.js"; // Confirme se o caminho para o seu database.js está correto

const notificacoesRoutes = Router();

// ==========================================
// 1. Buscar as notificações para o TopHeader e Histórico
// ==========================================
notificacoesRoutes.get("/", async (req, res) => {
    try {
        const notificacoes = await db.all("SELECT * FROM notificacoes ORDER BY criado_em DESC");
        res.json(notificacoes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar notificações." });
    }
});

// ==========================================
// 2. Criar uma nova notificação
// ==========================================
notificacoesRoutes.post("/", async (req, res) => {
    const { titulo, descricao, link } = req.body;

    if (!titulo || !descricao) {
        return res.status(400).json({ error: "Título e descrição são obrigatórios." });
    }

    try {
        const result = await db.run(
            "INSERT INTO notificacoes (titulo, descricao, link) VALUES (?, ?, ?)",
            [titulo, descricao, link || null]
        );

        const novaNotificacao = await db.get("SELECT * FROM notificacoes WHERE id = ?", result.lastID);
        res.status(201).json(novaNotificacao);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao salvar notificação." });
    }
});

// ==========================================
// 3. Limpar TODAS as notificações (Apagar do banco)
// ==========================================
notificacoesRoutes.delete("/", async (req, res) => {
    try {
        await db.run("DELETE FROM notificacoes");
        res.json({ message: "Todas as notificações foram apagadas." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao limpar notificações." });
    }
});

// ==========================================
// 4. Deletar MÚLTIPLAS notificações em lote
// ==========================================
notificacoesRoutes.post("/batch-delete", async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Nenhum ID fornecido." });
    }

    try {
        const placeholders = ids.map(() => '?').join(',');
        await db.run(`DELETE FROM notificacoes WHERE id IN (${placeholders})`, ids);

        res.json({ message: "Notificações removidas com sucesso." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao remover notificações em lote." });
    }
});

// ==========================================
// 5. Marcar TODAS as notificações como lidas
// (DEVE FICAR ACIMA DA ROTA DE /:id)
// ==========================================
notificacoesRoutes.patch("/marcar-todas-lidas", async (req, res) => {
    try {
        await db.run("UPDATE notificacoes SET lida = 1");
        res.json({ message: "Todas as notificações marcadas como lidas." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao marcar notificações como lidas." });
    }
});

// ==========================================
// 6. Atualizar o status da notificação (Ex: Marcar UMA como lida)
// ==========================================
notificacoesRoutes.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { lida } = req.body;

    try {
        const statusLida = lida ? 1 : 0;
        await db.run("UPDATE notificacoes SET lida = ? WHERE id = ?", [statusLida, id]);
        res.json({ message: "Status da notificação atualizado." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao atualizar notificação." });
    }
});

// ==========================================
// 7. Deletar UMA notificação específica
// ==========================================
notificacoesRoutes.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.run("DELETE FROM notificacoes WHERE id = ?", [id]);
        res.json({ message: "Notificação removida com sucesso." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao remover notificação." });
    }
});

export default notificacoesRoutes;