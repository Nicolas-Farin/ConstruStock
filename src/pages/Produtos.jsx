import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useTheme } from '../components/Context/ThemeContext.jsx';
import styles from '../styles/Listar.module.css';
import {
  Plus,
  Edit,
  Eye,
  TriangleAlert,
  Search,
  Filter,
  ArrowDownAZ,
  ArrowUpZA,
  SortAsc,
  SortDesc,
  LayoutGrid,
  List,
  Package,
  MapPin,
  BadgeAlert
} from "lucide-react";

export default function Listar() {
  const { theme } = useTheme();
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [mostrarEstoqueBaixo, setMostrarEstoqueBaixo] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("produtos-view-mode") || "list";
  });

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc"
  });

  // ESTADOS PARA PAGINAÇÃO (15 itens por página)
  const ITENS_POR_PAGINA = 16;
  const [paginaAtivos, setPaginaAtivos] = useState(1);
  const [paginaInativos, setPaginaInativos] = useState(1);

  useEffect(() => {
    api.get("/produtos")
      .then((resposta) => {
        setItens(resposta.data);
      }).catch(() => {
        setErro("Erro ao carregar itens.");
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("produtos-view-mode", viewMode);
  }, [viewMode]);

  // Sempre que os filtros mudarem, voltamos para a página 1
  useEffect(() => {
    setPaginaAtivos(1);
    setPaginaInativos(1);
  }, [searchTerm, mostrarEstoqueBaixo, sortConfig]);

  function estoqueBaixo(item) {
    const atual = Number(item.estoque_atual) || 0;
    const minimo = Number(item.estoque_minimo) || 0;
    return atual < minimo;
  }

  function handleSortName() {
    setSortConfig((prev) => ({
      key: "name",
      direction:
        prev.key === "name" && prev.direction === "asc"
          ? "desc"
          : "asc"
    }));
  }

  function handleSortStock() {
    setSortConfig((prev) => ({
      key: "stock",
      direction:
        prev.key === "stock" && prev.direction === "asc"
          ? "desc"
          : "asc"
    }));
  }

  // 1. APLICA OS FILTROS EM TODOS OS ITENS
  const itensFiltrados = [...itens]
    .filter((item) => {
      const termo = searchTerm.toLowerCase();

      // Busca
      const busca =
        normalizarTexto(item.nome).includes(termo) ||
        normalizarTexto(item.sku).includes(termo) ||
        normalizarTexto(item.categoria_nome).includes(termo);

      // Estoque baixo
      const baixo =
        !mostrarEstoqueBaixo || estoqueBaixo(item);

      return busca && baixo;
    })
    .sort((a, b) => {
      if (sortConfig.key === "name") {
        return sortConfig.direction === "asc"
          ? a.nome.localeCompare(b.nome)
          : b.nome.localeCompare(a.nome);
      }

      if (sortConfig.key === "stock") {
        return sortConfig.direction === "asc"
          ? a.estoque_atual - b.estoque_atual
          : b.estoque_atual - a.estoque_atual;
      }

      return 0;
    });

  // 2. DIVIDE EM ATIVOS E INATIVOS
  const produtosAtivos = itensFiltrados.filter(i => String(i.produto_ativo) === "1" || i.produto_ativo === true);
  const produtosInativos = itensFiltrados.filter(i => String(i.produto_ativo) === "0" || i.produto_ativo === false);

  // 3. MATEMÁTICA DA PAGINAÇÃO
  const ativosPaginados = produtosAtivos.slice((paginaAtivos - 1) * ITENS_POR_PAGINA, paginaAtivos * ITENS_POR_PAGINA);
  const inativosPaginados = produtosInativos.slice((paginaInativos - 1) * ITENS_POR_PAGINA, paginaInativos * ITENS_POR_PAGINA);

  const filtrosAtivos = searchTerm !== "" || mostrarEstoqueBaixo || sortConfig.key !== null;

  function limparFiltros() {
    setSearchTerm("");
    setMostrarEstoqueBaixo(false);
    setSortConfig({ key: null, direction: "asc" });
  }

  function normalizarTexto(texto) {
    return (texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  // COMPONENTE AUXILIAR PARA RENDERIZAR A PAGINAÇÃO ("Abas")
  const RenderPaginacao = ({ totalItens, paginaAtual, setPagina }) => {
    const totalPaginas = Math.ceil(totalItens / ITENS_POR_PAGINA);
    if (totalPaginas <= 1) return null;

    return (
      <div className={styles.pagination}>
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            className={`${styles.pageBtn} ${paginaAtual === page ? styles.pageBtnActive : ''}`}
            onClick={() => setPagina(page)}
          >
            {page}
          </button>
        ))}
      </div>
    );
  };

  // FUNÇÃO AUXILIAR PARA RENDERIZAR A LISTA/GRID DE PRODUTOS
  const renderListaProdutos = (lista) => {
    if (lista.length === 0) {
      return <p className={styles.emptyMsg}>Nenhum produto encontrado nesta seção.</p>;
    }

    return (
      <div className={viewMode === "grid" ? styles.gridContainer : styles.listContainer}>
        {lista.map((item) => (
          viewMode === "list" ? (
            <div key={item.id} className={styles.itemCard}>
              <div className={styles.itemInfo}>
                <strong>{item.nome}</strong>
                <div className={styles.itemMeta}>
                  <span className={styles.price}>
                    R$ {Number(item.preco_venda).toFixed(2)}
                  </span>
                  <span
                    className={styles.qty}
                    style={{ color: estoqueBaixo(item) ? "#ef4444" : "" }}
                  >
                    Estoque: {item.estoque_atual}
                  </span>
                </div>
              </div>
              <div className={styles.itemActions}>
                <a href={`/produtos/${item.id}`} className={styles.btnVerDetalhes}>
                  {estoqueBaixo(item) && <TriangleAlert size={14} color="#ef4444" />}
                  <Eye size={14} /> Ver detalhes
                </a>
                <a href={`/produtos/${item.id}/editar`} className={styles.btnEditar}>
                  <Edit size={14} /> Editar
                </a>
              </div>
            </div>
          ) : (
            <div key={item.id} className={styles.productGridCard}>
              <div className={styles.cardTop}>
                <div className={styles.cardIcon}>
                  {item.imagem_principal ? (
                    <img
                      src={`http://localhost:3000/uploads/${item.imagem_principal}`}
                      alt={item.nome}
                      className={styles.cardImage}
                    />
                  ) : (
                    <Package size={22} color="#94a3b8" />
                  )}
                </div>
                {estoqueBaixo(item) && (
                  <div className={styles.lowStockBadge}>
                    <BadgeAlert size={14} /> Estoque baixo
                  </div>
                )}
              </div>
              <div className={styles.gridCardContent}>
                <h3>{item.nome}</h3>
                <p className={styles.gridSku}>SKU: {item.sku || "Não informado"}</p>
                <div className={styles.gridPrice}>R$ {Number(item.preco_venda).toFixed(2)}</div>
                <div className={styles.gridInfoRow}>
                  <span>Estoque</span>
                  <strong style={{ color: estoqueBaixo(item) ? "#ef4444" : "" }}>
                    {item.estoque_atual}
                  </strong>
                </div>
                <div className={styles.gridInfoRow}>
                  <span>Categoria</span>
                  <strong>{item.categoria_nome || "Sem categoria"}</strong>
                </div>
                <div className={styles.gridInfoRow}>
                  <span>Marca</span>
                  <strong>{item.marca || "Não definida"}</strong>
                </div>
                <div className={styles.gridLocation}>
                  <MapPin size={14} /> {item.localizacao || "Sem localização"}
                </div>
              </div>
              <div className={styles.gridActions}>
                <a href={`/produtos/${item.id}`} className={styles.btnVerDetalhes}>
                  <Eye size={14} /> Ver detalhes
                </a>
                <a href={`/produtos/${item.id}/editar`} className={styles.btnEditar}>
                  <Edit size={14} /> Editar
                </a>
              </div>
            </div>
          )
        ))}
      </div>
    );
  };

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.dark : ''}`}>
      <main className={styles.mainContent}>
        <div className={styles.content}>

          {/* TOPO ALINHADO */}
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Lista de Produtos</h1>
            <div className={styles.headerButtons}>
              <a href="/produtos/Cadastrar" className={styles.btnCadastrar}>
                <Plus size={16} /> Cadastrar Novo Item
              </a>
            </div>
          </div>

          <div className={styles.Topo}>
            <div className={styles.filtersBar}>
              {/* Busca */}
              <div className={styles.searchWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Pesquisar produto ou SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              {/* Estoque baixo */}
              <button
                className={`${styles.filterBtn} ${mostrarEstoqueBaixo ? styles.filterBtnActive : ''}`}
                onClick={() => setMostrarEstoqueBaixo(!mostrarEstoqueBaixo)}
              >
                <Filter size={16} /> Estoque Baixo
              </button>

              {/* Ordenar Nome */}
              <button
                className={`${styles.filterBtn} ${sortConfig.key === "name" ? styles.filterBtnActive : ""}`}
                onClick={handleSortName}
              >
                {sortConfig.key === "name" && sortConfig.direction === "desc"
                  ? <ArrowUpZA size={16} />
                  : <ArrowDownAZ size={16} />} Nome
              </button>

              {/* Ordenar Estoque */}
              <button
                className={`${styles.filterBtn} ${sortConfig.key === "stock" ? styles.filterBtnActive : ""}`}
                onClick={handleSortStock}
              >
                {sortConfig.key === "stock" && sortConfig.direction === "desc" ? (
                  <><SortDesc size={16} /> Maior Estoque</>
                ) : (
                  <><SortAsc size={16} /> Menor Estoque</>
                )}
              </button>

              {filtrosAtivos && (
                <button className={styles.clearBtn} onClick={limparFiltros}>
                  <Filter size={16} /> Limpar filtros
                </button>
              )}
            </div>

            <div className={styles.alternarListaCards}>
              <button
                className={styles.viewToggleBtn}
                onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
              >
                {viewMode === "list" ? <LayoutGrid size={16} /> : <List size={16} />}
                {viewMode === "list" ? "Cards" : "Lista"}
              </button>
            </div>
          </div>

          {erro && <p className={styles.errorMsg}> {erro} </p>}

          {/* SESSÃO 1: PRODUTOS ATIVOS */}
          {!erro && (
            <div className={styles.sectionContainer}>
              <h2 className={styles.sectionTitle}>Produtos Ativos ({produtosAtivos.length})</h2>
              {renderListaProdutos(ativosPaginados)}
              <RenderPaginacao
                totalItens={produtosAtivos.length}
                paginaAtual={paginaAtivos}
                setPagina={setPaginaAtivos}
              />
            </div>
          )}

          {/* SESSÃO 2: PRODUTOS INATIVOS */}
          {!erro && produtosInativos.length > 0 && (
            <div className={styles.sectionContainer}>
              <h2 className={styles.sectionTitle}>Produtos Inativos ({produtosInativos.length})</h2>
              {renderListaProdutos(inativosPaginados)}
              <RenderPaginacao
                totalItens={produtosInativos.length}
                paginaAtual={paginaInativos}
                setPagina={setPaginaInativos}
              />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}