import express from "express";

import itensRoutes from "./itens.routes.js";
import usuariosRoutes from "./usuarios.routes.js";
import produtosRoutes from "./produtos.routes.js";
import cotacoesRoutes from "./cotacoes.routes.js";
import notificacoesRoutes from "./notificacoes.routes.js";
import pedidosRoutes from "./pedidos.routes.js";
import devolucoes from "./devolucoes.routes.js";

const routes = express.Router();

routes.get("/", (req, res) => {
    return res.json({
        mensagem: "API funcionando!",
    });
});

routes.use("/itens", itensRoutes);

routes.use("/produtos", produtosRoutes);

routes.use("/auth", usuariosRoutes);

routes.use("/cotacoes", cotacoesRoutes);

routes.use("/notificacoes", notificacoesRoutes);

routes.use("/pedidos", pedidosRoutes);

routes.use("/devolucoes", devolucoes);

export default routes;