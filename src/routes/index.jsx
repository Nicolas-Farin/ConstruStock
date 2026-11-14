import { Routes, Route, Navigate } from "react-router-dom";

import Produtos from "../pages/Produtos";
import EditarItem from "../pages/Editar";
import CadastrarItem from "../pages/Cadastrar";
import DashBoard from "../pages/Dashboard";
import Login from "../pages/Login";
import Cadastro from "../pages/Cadastro";
import DetalhesProduto from "../pages/DetalheProduto";
import Cotacoes from "../pages/Cotacoes";
import Cotacao from "../pages/Cotacao";
import Pedidos from "../pages/Pedidos";
import Pedido from "../pages/Pedido";
import CadastrarFornecedor from "../pages/CadastrarFornecedor";
import ListarFornecedores from "../pages/ListarFornecedores";
import Relatorio from "../pages/Relatorio";
import VolumeEstoque from "../pages/VolumeEstoque";
import HistoricoNotificacoes from "../pages/HistoricoNotificacoes";

// Importando as páginas de categoria
import Categorias from "../pages/Categorias";
import RelatorioCategoria from "../pages/RelatorioCategoria";
import CadastrarCategoria from "../pages/NovaCategoria";
import Devolucao from "../pages/Devolucao"; // ajuste o caminho do import



import RotasPublicas from "./rotasPublicas";
import RotasPrivadas from "./rotasPrivadas";

export function AppRoutes() {
  return (
    <Routes>

      <Route element={<RotasPrivadas />}>
        <Route path="/produtos/:id/editar" element={<EditarItem />} />
        <Route path="/produtos/cadastrar" element={<CadastrarItem />} />

        <Route path="/" element={<DashBoard />} />

        <Route path="/produtos" element={<Produtos />} />
        <Route path="/produtos/:id" element={<DetalhesProduto />} />

        <Route path="/cotacoes" element={<Cotacoes />} />
        <Route path="/cotacoes/cotacao" element={<Cotacao />} />

        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/pedidos/pedido" element={<Pedido />} />

        {/* <Route path="/cotacoes/cadastrarfornecedor" element={<CadastrarFornecedor />} /> */}
        {/* <Route path="/cotacoes/fornecedores" element={<ListarFornecedores />} /> */}

        <Route path="/fornecedores" element={<ListarFornecedores />} />
        <Route path="/fornecedores/cadastrarfornecedor" element={<CadastrarFornecedor />} />

        <Route path="/categorias" element={<Categorias />} />
        <Route path="/categorias/CadastrarCategoria" element={<CadastrarCategoria />} />

        <Route path="/categorias/:idCategoria" element={<RelatorioCategoria />} />
        <Route path="/relatorios" element={<Relatorio />} />

        <Route path="/estoque" element={<VolumeEstoque />} />
        <Route path="/historico-notificacoes" element={<HistoricoNotificacoes />} />

        <Route path="/pedidos/devolucao" element={<Devolucao />} />
      </Route>

      {/*  */}

      <Route element={<RotasPublicas />}>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
      </Route>

      <Route path="*" element={<h1>Página não encontrada</h1>} />

    </Routes>
  );
}