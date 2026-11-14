import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { useTheme } from "../components/Context/ThemeContext";

import styles from "../styles/editar.module.css";

import {
  Package,
  DollarSign,
  Boxes,
  Image as ImageIcon,
  Save,
  Trash2,
  Settings,
  MapPin
} from "lucide-react";

// Importações dos contextos de notificação e toast
import { useNotification } from "../components/Context/NotificationContext.jsx";
import { useToast } from '../components/Context/ToastContext';

export default function Editar() {

  const navigate = useNavigate();
  const { id } = useParams();
  const { theme } = useTheme();
  const { addNotification } = useNotification();
  const { addToast } = useToast();

  // =========================================
  // STATES
  // =========================================

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [sku, setSku] = useState("");

  const [precoCusto, setPrecoCusto] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [desconto, setDesconto] = useState("");
  const [imposto, setImposto] = useState("");

  const [quantidade, setQuantidade] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");
  const [estoqueMaximo, setEstoqueMaximo] = useState("");
  const [localizacao, setLocalizacao] = useState("");

  const [produtoAtivo, setProdutoAtivo] = useState(true);
  const [produtoDestaque, setProdutoDestaque] = useState(false);
  const [alertaEstoque, setAlertaEstoque] = useState(true);
  const [reposicaoAutomatica, setReposicaoAutomatica] = useState(false);

  const [imagem, setImagem] = useState(null);

  const [margemLucro, setMargemLucro] = useState("100");

  // imagem já salva no banco
  const [imagemAtual, setImagemAtual] = useState("");

  // imagem nova escolhida pelo usuário
  const [previewNova, setPreviewNova] = useState("");

  const [erro, setErro] = useState("");

  const [modalAberto, setModalAberto] = useState(false);


  // NOVO ESTADO: Lista de categorias
  const [categorias, setCategorias] = useState([]);

  // NOVO EFEITO: Buscar categorias ao abrir a tela
  useEffect(() => {
    async function carregarCategorias() {
      try {
        const resposta = await api.get("/produtos/categorias");
        setCategorias(resposta.data);
      } catch (error) {
        console.log("Erro ao carregar categorias", error);
      }
    }
    carregarCategorias();
  }, []);


  // =========================================
  // CARREGAR ITEM
  // =========================================

  async function carregarItem() {

    try {
      setErro("");
      const resposta = await api.get(`/produtos/${id}`);
      const item = resposta.data;
      console.log("DADOS DO PRODUTO:", item); // <--- ADICIONE ISTO

      setNome(item.nome || "");
      setDescricao(item.descricao || "");
      setCategoria(item.categoria_id || item.categoria || item.categoria_nome || "");
      setMarca(item.marca || "");
      setSku(item.sku || "");

      setPrecoCusto(item.preco_custo || "");
      setPrecoVenda(item.preco_venda || "");
      setDesconto(item.desconto || "");
      setImposto(item.imposto_percentual || "");

      const custoInicial = Number(item.preco_custo) || 0;
      const vendaInicial = Number(item.preco_venda) || 0;

      if (custoInicial > 0) {
        const margemCalculada = (((vendaInicial - custoInicial) / custoInicial) * 100).toFixed(1);
        setMargemLucro(margemCalculada);
      } else {
        setMargemLucro("100"); // fallback: sem custo definido, assume o padrão de 100%
      }

      setQuantidade(item.estoque_atual || "");
      setEstoqueMinimo(item.estoque_minimo || "");
      setEstoqueMaximo(item.estoque_maximo || "");
      setLocalizacao(item.localizacao || "");

      // Função para garantir que os dados do banco virem true ou false corretamente
      const parseBoolean = (valor, padrao) => {
        if (valor === undefined || valor === null) return padrao;
        return valor === 1 || valor === '1' || valor === true || valor === 'true';
      };

      setProdutoAtivo(parseBoolean(item.produto_ativo, true));
      setProdutoDestaque(parseBoolean(item.produto_destaque, false));
      setAlertaEstoque(parseBoolean(item.alerta_estoque, true));
      setReposicaoAutomatica(parseBoolean(item.reposicao_automatica, false));

      if (item.imagem_principal) {
        setImagemAtual(
          `${api.defaults.baseURL}/uploads/${item.imagem_principal}`
        );
      }

    } catch (error) {
      setErro("Erro ao carregar produto.");
    }
  }

  useEffect(() => {
    carregarItem();
  }, [id]);

  // =========================================
  // CALCULOS
  // =========================================

  // const lucro = useMemo(() => {

  //   const custo = Number(precoCusto);
  //   const venda = Number(precoVenda);

  //   if (!custo || !venda) return 0;

  //   return (((venda - custo) / custo) * 100).toFixed(1);

  // }, [precoCusto, precoVenda]);

  const lucroUnitario = useMemo(() => {

    const venda = Number(precoVenda) || 0;
    const custo = Number(precoCusto) || 0;

    return (venda - custo).toFixed(2);

  }, [precoVenda, precoCusto]);

  const porcentagemEstoque = useMemo(() => {

    const qtd = Number(quantidade) || 0;
    const max = Number(estoqueMaximo) || 0;

    if (max <= 0) return 0;

    const porcentagem = (qtd / max) * 100;

    // Permite passar de 100% quando exceder a capacidade
    return Math.max(0, porcentagem);

  }, [quantidade, estoqueMaximo]);

  const corEstoque = useMemo(() => {

    const qtd = Number(quantidade) || 0;
    const min = Number(estoqueMinimo) || 0;
    const max = Number(estoqueMaximo) || 0;

    // Azul: ultrapassou a capacidade
    if (max > 0 && qtd > max) {
      return "#3b82f6";
    }

    // Verde: mínimo e máximo iguais e exatamente nesse valor
    if (min === max && qtd === min && qtd > 0) {
      return "#22c55e";
    }

    // Vermelho: abaixo do mínimo
    if (qtd < min) {
      return "#ef4444";
    }

    // Amarelo: exatamente no mínimo
    if (qtd === min && min > 0) {
      return "#f59e0b";
    }

    // Verde: exatamente no máximo
    if (qtd === max && max > 0) {
      return "#22c55e";
    }

    // Amarelo: estoque relativamente baixo
    if (porcentagemEstoque < 60) {
      return "#f59e0b";
    }

    // Verde: saudável
    return "#22c55e";

  }, [
    quantidade,
    estoqueMinimo,
    estoqueMaximo,
    porcentagemEstoque
  ]);

  const statusTexto = useMemo(() => {

    const qtd = Number(quantidade) || 0;
    const min = Number(estoqueMinimo) || 0;
    const max = Number(estoqueMaximo) || 0;

    if (max > 0 && qtd > max) {
      return "Acima da capacidade";
    }

    if (min === max && qtd === min && qtd > 0) {
      return "Estoque ideal";
    }

    if (qtd < min) {
      return "Estoque baixo";
    }

    if (qtd === min && min > 0) {
      return "No limite mínimo";
    }

    if (qtd === max && max > 0) {
      return "Capacidade máxima";
    }

    if (porcentagemEstoque < 60) {
      return "Reposição recomendada";
    }

    return "Estoque saudável";

  }, [
    quantidade,
    estoqueMinimo,
    estoqueMaximo,
    porcentagemEstoque
  ]);

  const alertaEstoqueInfo = useMemo(() => {

    const qtd = Number(quantidade) || 0;
    const min = Number(estoqueMinimo) || 0;
    const max = Number(estoqueMaximo) || 0;

    // Acima da capacidade
    if (max > 0 && qtd > max) {
      return {
        classe: styles.alertaInfo,
        mensagem: "Estoque acima da capacidade"
      };
    }

    // Estoque ideal (mínimo = máximo)
    if (min === max && qtd === min && qtd > 0) {
      return {
        classe: styles.alertaInfo,
        mensagem: "Estoque ideal"
      };
    }

    // Abaixo do mínimo
    if (qtd < min) {
      return {
        classe: styles.alertaBaixo,
        mensagem: "Estoque abaixo do mínimo"
      };
    }

    // Exatamente no mínimo
    if (qtd === min && min > 0) {
      return {
        classe: styles.alertaMedio,
        mensagem: "Estoque no limite mínimo"
      };
    }

    // Exatamente no máximo
    if (qtd === max && max > 0) {
      return {
        classe: styles.alertaInfo,
        mensagem: "Estoque na capacidade máxima"
      };
    }

    // Estoque relativamente baixo
    if (porcentagemEstoque < 60) {
      return {
        classe: styles.alertaMedio,
        mensagem: "Reposição recomendada"
      };
    }

    // Estoque saudável
    return {
      classe: styles.alertaInfo,
      mensagem: "Estoque saudável"
    };

  }, [
    quantidade,
    estoqueMinimo,
    estoqueMaximo,
    porcentagemEstoque
  ]);

  // =========================================
  // EDITAR
  // =========================================

  async function editarItem(event) {

    event.preventDefault();

    try {

      setErro("");

      const dados = new FormData();

      dados.append("nome", nome);
      dados.append("descricao", descricao);

      dados.append(
        "categoria_id",
        categoria ? Number(categoria) : ""
      );

      dados.append("marca", marca);
      dados.append("sku", sku);

      dados.append(
        "preco_custo",
        Number(precoCusto)
      );

      dados.append(
        "preco_venda",
        Number(precoVenda)
      );

      dados.append(
        "desconto",
        Number(desconto)
      );

      dados.append(
        "imposto_percentual",
        Number(imposto)
      );

      dados.append(
        "estoque_atual",
        Number(quantidade)
      );

      dados.append(
        "estoque_minimo",
        Number(estoqueMinimo)
      );

      dados.append(
        "estoque_maximo",
        Number(estoqueMaximo)
      );

      dados.append(
        "localizacao",
        localizacao
      );

      dados.append(
        "produto_ativo",
        produtoAtivo ? 1 : 0
      );

      dados.append(
        "produto_destaque",
        produtoDestaque ? 1 : 0
      );

      dados.append(
        "alerta_estoque",
        alertaEstoque ? 1 : 0
      );

      dados.append(
        "reposicao_automatica",
        reposicaoAutomatica ? 1 : 0
      );

      if (imagem) {
        dados.append("imagem", imagem);
      }

      await api.put(
        `/produtos/${id}`,
        dados,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      // Toast e Notificação de Sucesso
      addToast("Produto atualizado com sucesso!", "success");
      addNotification(
        "Produto Atualizado",
        `O produto "${nome}" foi atualizado no sistema.`,
        `/produtos/${id}` // <-- Atualizado aqui também
      );

      // Aguarda antes de redirecionar para a página de detalhes
      setTimeout(() => {
        navigate(`/produtos/${id}`); // <-- Redirecionamento atualizado
      }, 1500);

    } catch (error) {
      const mensagemErro = error.response?.data?.erro || "Erro ao atualizar produto.";
      setErro(mensagemErro);
      addToast(mensagemErro, "error");
    }
  }

  // =========================================
  // EXCLUIR (COM MODAL)
  // =========================================

  function handleAbrirModal() {
    setModalAberto(true);
  }

  function handleFecharModal() {
    setModalAberto(false);
  }

  async function handleConfirmarExclusao() {
    try {
      await api.delete(`/produtos/${id}`);

      // Toast e Notificação de Sucesso
      addToast("Produto excluído com sucesso!", "success");
      addNotification(
        "Produto Excluído",
        `O produto "${nome}" foi removido do estoque.`,
        "/produtos"
      );

      // Fecha o modal e aguarda antes de redirecionar
      setModalAberto(false);
      setTimeout(() => {
        navigate("/produtos");
      }, 1500);

    } catch (error) {
      setErro("Erro ao excluir produto.");
      addToast("Erro ao excluir produto.", "error");
      setModalAberto(false); // Fecha o modal mesmo se der erro
    }
  }

  // =========================================
  // IMAGENS
  // =========================================

  function handleImages(event) {
    const file = event.target.files[0];

    if (!file) return;

    // Libera a URL temporária anterior, se existir, antes de criar uma nova
    if (previewNova) {
      URL.revokeObjectURL(previewNova);
    }

    setImagem(file);
    setPreviewNova(URL.createObjectURL(file));
  }

  // =========================================
  // PRECIFICAÇÃO (Custo, Venda, Margem)
  // =========================================

  function handlePrecoCustoChange(valor) {
    // Só atualiza o custo. A venda permanece intacta;
    // a margem é recalculada abaixo pra refletir a mudança.
    setPrecoCusto(valor);
  }

  function handlePrecoVendaChange(valor) {
    setPrecoVenda(valor);

    const custoNum = Number(precoCusto) || 0;
    const vendaNum = Number(valor) || 0;

    if (custoNum > 0) {
      const novaMargem = ((vendaNum - custoNum) / custoNum) * 100;
      setMargemLucro(novaMargem.toFixed(1));
    }
  }

  function handleMargemChange(valor) {
    setMargemLucro(valor);

    const custoNum = Number(precoCusto) || 0;
    const margemNum = Number(valor) || 0;

    if (custoNum > 0) {
      const novoPrecoVenda = custoNum * (1 + margemNum / 100);
      setPrecoVenda(novoPrecoVenda.toFixed(2));
    }
  }

  function aplicarMargemPadrao() {
    handleMargemChange("100");
  }

  // Sempre que o custo mudar, recalcula a margem exibida (mantendo a venda fixa)
  useEffect(() => {
    const custoNum = Number(precoCusto) || 0;
    const vendaNum = Number(precoVenda) || 0;

    if (custoNum > 0) {
      const margemAtual = ((vendaNum - custoNum) / custoNum) * 100;
      setMargemLucro(margemAtual.toFixed(1));
    }
  }, [precoCusto]); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================================
  // RENDER
  // =========================================

  return (

    <div
      className={`
    ${styles.container}
    ${theme === 'dark' ? styles.darkTheme : ''}
  `}
    >

      {/* HEADER */}

      <div className={styles.topo}>

        <div>
          <h1>Editar Produto</h1>
          <p>
            Atualize informações do produto,
            estoque e preços.
          </p>
        </div>

      </div>

      {erro && (
        <div className={styles.erro}>
          {erro}
        </div>
      )}

      <div className={styles.grid}>

        {/* ========================================= */}
        {/* COLUNA ESQUERDA */}
        {/* ========================================= */}

        <div className={styles.leftColumn}>

          {/* INFO PRODUTO */}

          <div className={styles.card}>

            <div className={styles.cardTitle}>
              <Package size={20} />
              Informações do Produto
            </div>

            <div className={styles.formGrid}>

              <div>
                <label>Nome do Produto</label>

                <input
                  type="text"
                  value={nome}
                  onChange={(e) =>
                    setNome(e.target.value)
                  }
                  placeholder="Digite o nome"
                />
              </div>

              <div>
                <label>SKU</label>
                <input
                  type="text"
                  value={sku}
                  disabled
                  placeholder="Ex: CIM-CP2-50KG"
                  style={{ cursor: "not-allowed", opacity: 0.7 }}
                />
              </div>

              <div>
                <label>Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Marca</label>

                <input
                  type="text"
                  value={marca}
                  onChange={(e) =>
                    setMarca(e.target.value)
                  }
                />
              </div>

            </div>

            <div className={styles.fullWidth}>

              <label>Descrição</label>

              <textarea
                rows={5}
                value={descricao}
                onChange={(e) =>
                  setDescricao(e.target.value)
                }
              />

            </div>

          </div>

          {/* ESTOQUE */}

          <div className={styles.card}>

            <div className={styles.cardTitle}>
              <Boxes size={20} />
              Gestão de Estoque
            </div>

            <div className={styles.formGrid}>

              <div>
                <label>Quantidade Atual</label>

                <input
                  type="number"
                  value={quantidade}
                  onChange={(e) =>
                    setQuantidade(e.target.value)
                  }
                />
              </div>

              <div>
                <label>Estoque Mínimo</label>

                <input
                  type="number"
                  value={estoqueMinimo}
                  onChange={(e) =>
                    setEstoqueMinimo(e.target.value)
                  }
                />
              </div>

              <div>
                <label>Estoque Máximo</label>

                <input
                  type="number"
                  value={estoqueMaximo}
                  onChange={(e) =>
                    setEstoqueMaximo(e.target.value)
                  }
                />
              </div>

              <div>
                <label>Localização</label>

                <input
                  type="text"
                  value={localizacao}
                  onChange={(e) =>
                    setLocalizacao(e.target.value)
                  }
                  placeholder="A1 - Corredor 2"
                />
              </div>

            </div>

            <div className={styles.estoqueHeader}>

              <span>
                Saúde do Estoque
              </span>

              <span>
                {quantidade} / {estoqueMaximo || 0}
              </span>

            </div>

            <div className={styles.barraEstoque}>
              <div
                className={styles.progresso}
                style={{
                  width: `${porcentagemEstoque}%`,
                  background: corEstoque
                }}
              />
            </div>

          </div>

          {/* PRECIFICAÇÃO */}

          <div className={styles.card}>

            <div className={styles.cardTitle}>
              <DollarSign size={20} />
              Precificação
            </div>

            <div className={styles.formGrid}>

              <div>
                <label>Preço de Custo</label>
                <input
                  type="number"
                  value={precoCusto}
                  onChange={(e) => handlePrecoCustoChange(e.target.value)}
                />
              </div>

              <div>
                <label>Preço de Venda</label>
                <input
                  type="number"
                  value={precoVenda}
                  onChange={(e) => handlePrecoVendaChange(e.target.value)}
                />
              </div>

              <div>
                <label>Desconto (%)</label>

                <input
                  type="number"
                  value={desconto}
                  onChange={(e) =>
                    setDesconto(e.target.value)
                  }
                />
              </div>

              <div>
                <label>Impostos (%)</label>

                <input
                  type="number"
                  value={imposto}
                  onChange={(e) =>
                    setImposto(e.target.value)
                  }
                />
              </div>

            </div>

            <div className={styles.stats}>

              <div className={styles.statCard}>
                <span>Margem de Lucro</span>
                <div className={styles.margemInputWrapper}>
                  <input
                    type="number"
                    step="0.1"
                    value={margemLucro}
                    onChange={(e) => handleMargemChange(e.target.value)}
                    disabled={!Number(precoCusto)}
                    title={!Number(precoCusto) ? "Defina o preço de custo primeiro" : ""}
                    className={`${styles.margemInput} ${Number(margemLucro) < 0 ? styles.negativo : ""}`}
                  />
                  <span className={`${styles.margemSufixo} ${Number(margemLucro) < 0 ? styles.negativo : ""}`}>%</span>
                </div>
                <button
                  type="button"
                  className={styles.margemPadraoBtn}
                  onClick={aplicarMargemPadrao}
                >
                  Aplicar padrão (100%)
                </button>
              </div>

              <div className={styles.statCard}>
                <span>Lucro por Unidade</span>
                <strong>
                  R$ {lucroUnitario}
                </strong>
              </div>

            </div>

          </div>

          {/* IMAGENS */}

          <div className={styles.card}>

            <div className={styles.cardTitle}>
              <ImageIcon size={20} />
              Atualizar Imagem
            </div>

            <div className={styles.imgInputGrid}>
              <label className={styles.uploadBox}>

                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImages}
                />

                <ImageIcon size={40} />

                <p>
                  Clique para selecionar uma nova imagem
                </p>

              </label>

              <div className={styles.previewNovaContainer}>

                {previewNova ? (
                  <>
                    <div className={styles.imgNova}>
                      <span className={styles.previewLabel}>
                        Nova imagem selecionada
                      </span>

                      <img
                        src={previewNova}
                        alt="Nova imagem"
                        className={styles.previewImageNova}
                      />
                    </div>
                  </>
                ) : (
                  <div className={styles.noImage}>

                  </div>
                )}
              </div>
            </div>

          </div>

          {/* CONFIGURAÇÕES */}

          <div className={styles.card}>

            <div className={styles.cardTitle}>
              <Settings size={20} />
              Configurações do Produto
            </div>

            <div className={styles.configGrid}>

              <div className={styles.configItem}>
                <div>
                  <strong>Produto Ativo</strong>
                  <p>Disponível para venda</p>
                </div>
                <input
                  type="checkbox"
                  checked={produtoAtivo}
                  onChange={(e) => setProdutoAtivo(e.target.checked)} // 💡 Alterado aqui
                />
              </div>

              <div className={styles.configItem}>
                <div>
                  <strong>Produto Destaque</strong>
                  <p>Exibir na página inicial</p>
                </div>
                <input
                  type="checkbox"
                  checked={produtoDestaque}
                  onChange={(e) => setProdutoDestaque(e.target.checked)} // 💡 Alterado aqui
                />
              </div>

              <div className={styles.configItem}>
                <div>
                  <strong>Alertas</strong>
                  <p>Notificar estoque baixo</p>
                </div>
                <input
                  type="checkbox"
                  checked={alertaEstoque}
                  onChange={(e) => setAlertaEstoque(e.target.checked)} // 💡 Alterado aqui
                />
              </div>

              <div className={styles.configItem}>
                <div>
                  <strong>Reposição Automática</strong>
                  <p>Gerar pedidos automáticos</p>
                </div>
                <input
                  type="checkbox"
                  checked={reposicaoAutomatica}
                  onChange={(e) => setReposicaoAutomatica(e.target.checked)} // 💡 Alterado aqui
                />
              </div>

            </div>

          </div>

          {/* AÇÕES */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={handleAbrirModal} // <--- Alterado aqui
            >
              <Trash2 size={18} />
              Excluir Produto
            </button>

            <button
              type="button"
              className={styles.salvarBtn}
              onClick={editarItem}
            >
              <Save size={18} />
              Salvar Alterações
            </button>
          </div>
        </div>

        {/* ========================================= */}
        {/* SIDEBAR DIREITA */}
        {/* ========================================= */}

        <div className={styles.rightColumn}>

          {/* PREVIEW DO PRODUTO */}

          <div className={styles.sideCard}>

            <h3>Produto Atual</h3>

            <div className={styles.previewThumb}>
              {previewNova ? (
                <img
                  src={previewNova}
                  alt="Nova imagem selecionada"
                  className={styles.previewImage}
                />
              ) : imagemAtual ? (
                <img
                  src={imagemAtual}
                  alt="Imagem atual"
                  className={styles.previewImage}
                />
              ) : (
                <ImageIcon size={36} />
              )}
              {previewNova && (
                <span className={styles.previewBadgeNovo}>Não salvo</span>
              )}
            </div>

            <h2 className={styles.previewName}>
              {nome || "Nome do Produto"}
            </h2>

            <p className={styles.previewSku}>
              SKU: {sku || "—"}
            </p>

            <div className={styles.previewPrice}>
              R$ {precoVenda || "0,00"}
            </div>

            <div className={styles.previewInfo}>
              <div>
                <span>Estoque</span>
                <strong>{quantidade || 0}</strong>
              </div>

              <div>
                <span>Categoria</span>
                <strong>
                  {categorias.find(c => c.id === Number(categoria))?.nome
                    || "Não definida"}
                </strong>
              </div>

              <div>
                <span>Marca</span>
                <strong>{marca || "Não definida"}</strong>
              </div>
            </div>

            <p className={styles.previewLocation}>
              <MapPin size={16} /> {localizacao || "Sem localização"}
            </p>

            <span
              className={styles.previewStatus}
              style={{ color: corEstoque }}
            >
              {statusTexto}
            </span>

            <div className={styles.barraEstoque}>
              <div
                className={styles.progresso}
                style={{
                  width: `${porcentagemEstoque}%`,
                  background: corEstoque
                }}
              />
            </div>


          </div>

          {/* FORNECEDOR */}

          {/* <div className={styles.sideCard}>

            <h3>Fornecedor</h3>

            <p>Distribuidora Central</p>

            <span>
              Prazo médio: 5 dias úteis
            </span>

          </div> */}

          {/* ALERTAS */}

          {/* <div className={styles.sideCard}>

            <h3>Alertas</h3>

            <div className={alertaEstoqueInfo.classe}>
              {alertaEstoqueInfo.mensagem}
            </div>

          </div> */}

          {/* ATIVIDADES */}

          {/* <div className={styles.sideCard}>

            <h3>Atividade Recente</h3>

            <ul className={styles.listaAtividade}>

              <li>Venda realizada</li>
              <li>Entrada de estoque</li>
              <li>Preço alterado</li>
              <li>Transferência</li>

            </ul>

          </div> */}

        </div>

      </div>

      {/* ========================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO            */}
      {/* ========================================= */}
      {modalAberto && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{
              fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '12px',
              color: theme === 'dark' ? '#f9fafb' : '#111827'
            }}>
              Confirmar Exclusão
            </h2>
            <p style={{
              color: theme === 'dark' ? '#d1d5db' : '#4b5563',
              marginBottom: '24px', lineHeight: '1.5'
            }}>
              Tem certeza de que deseja excluir o produto <strong>{nome || 'selecionado'}</strong>? Todo o histórico dele será apagado e esta ação não poderá ser desfeita.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={handleFecharModal}
                style={{
                  padding: '8px 16px', borderRadius: '6px', fontWeight: '500',
                  backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                  color: theme === 'dark' ? '#d1d5db' : '#374151',
                  border: 'none', cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                style={{
                  padding: '8px 16px', borderRadius: '6px', fontWeight: '500',
                  backgroundColor: '#dc2626', color: '#ffffff',
                  border: 'none', cursor: 'pointer'
                }}
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
