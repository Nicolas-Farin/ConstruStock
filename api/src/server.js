import express from "express";
import cors from "cors";
import path from "path";

import routes from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(routes);

app.use(
    "/uploads",
    express.static(
        path.resolve("uploads")
    )
);

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});