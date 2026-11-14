import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api.js";
import styles from '../styles/cadastrar.module.css'; // Supondo que você use CSS Modules
import { FiPackage, FiUploadCloud, FiSave, FiX } from "react-icons/fi"; // Instale react-icons
import { useTheme } from "../components/Context/ThemeContext";
import { useNotification } from "../components/Context/NotificationContext.jsx";
import { useToast } from '../components/Context/ToastContext';

export default function Cadastrar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [erro, setErro] = useState("");
  const { theme } = useTheme();
  const { addNotification } = useNotification();
  const { addToast } = useToast();
  const [imagem, setImagem] = useState(null);
  const inputImagemRef = useRef(null);

  // Estados do Formulário
  const [formData, setFormData] = useState({
    nome: "",
    sku: "",
    codigoBarras: "",

    categoria: searchParams.get("categoria") || "",
    fornecedor: "",

    marca: "",
    descricao: "",

    estoqueAtual: 0,
    estoqueMinimo: 0,
    estoqueMaximo: 0,

    tipoUnidade: "",
    localizacao: "",

    status: "Em Estoque",

    precoCusto: 0,
    precoVenda: 0,
    imposto: 0,

    peso: 0,
    dimensoes: "",
    tipoMaterial: "",

    validade: "",
    observacoes: ""
  });

  const [margem, setMargem] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  const [precoAutomatico, setPrecoAutomatico] = useState(0);

  const [usuarioEditouCusto, setUsuarioEditouCusto] = useState(false);
  const [usuarioEditouVenda, setUsuarioEditouVenda] = useState(false);

  const [usarUnidadePersonalizada, setUsarUnidadePersonalizada] = useState(false);

  useEffect(() => {
    async function carregarDados() {
      try {
        const [categoriasRes, fornecedoresRes] = await Promise.all([
          api.get("/produtos/categorias"),
          api.get("/produtos/fornecedores")
        ]);

        setCategorias(categoriasRes.data);
        setFornecedores(fornecedoresRes.data);

      } catch (erro) {
        console.log("Erro ao carregar dados:", erro);
      }
    }

    carregarDados();
  }, []);

  // Cálculo da margem em tempo real
  useEffect(() => {

    if (
      Number(formData.precoVenda) > 0 &&
      Number(formData.precoCusto) >= 0
    ) {

      const custo = Number(formData.precoCusto);
      const venda = Number(formData.precoVenda);

      const calculo =
        ((venda - custo) / venda) * 100;

      setMargem(calculo.toFixed(1));

    }

  }, [
    formData.precoCusto,
    formData.precoVenda
  ]);

  const handleChange = (e) => {

    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Detecta edição manual
    if (name === "precoCusto") {
      setUsuarioEditouCusto(value !== "");
    }

    if (name === "precoVenda") {
      setUsuarioEditouVenda(value !== "");
    }

  };

  const handleUnidadeSelectChange = (e) => {
    const valorEscolhido = e.target.value;

    if (valorEscolhido === "outro") {
      // Se escolheu "Outro", ativa o campo de texto e zera o valor antigo para o usuário digitar
      setUsarUnidadePersonalizada(true);
      setFormData(prev => ({ ...prev, tipoUnidade: "" }));
    } else {
      // Se escolheu uma opção padrão, mantém o select ativo e atualiza o formData normalmente
      setUsarUnidadePersonalizada(false);
      setFormData(prev => ({ ...prev, tipoUnidade: valorEscolhido }));
    }
  };

  async function CadastrarItem(event) {
    event.preventDefault();
    try {
      setErro("");
      if (imagem) {
        dados.append("imagem", imagem);
      }

      // 1. Capture a resposta da API em uma variável const 'response'
      const response = await api.post("/produtos", dados, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      // 2. Pegue o ID do produto recém-criado (ajuste 'response.data.id' de acordo com o retorno do seu backend)
      const novoId = response.data.id;

      // 3. Use formData.nome para o nome e novoId para o link
      await addNotification(
        "Produto Cadastrado",
        `O produto "${formData.nome}" foi cadastrado no sistema.`,
        `/produtos/${novoId}`
      );

      // 4. Mostra o card verde (Toast)
      addToast("Produto cadastrado com sucesso!", "success");

      // 5. Muda de página
      navigate("/produtos");

    } catch (erro) {
      console.log(erro.response?.data);
      console.log(erro);

      const mensagemErro = erro.response?.data?.erro || "Erro ao cadastrar o produto. Verifique os dados.";
      addToast(mensagemErro, "error"); // ANTES: addNotification(..., "error") — bug corrigido
      setErro(mensagemErro);
    }
  }

  const dados = new FormData();
  dados.append("nome", formData.nome);
  dados.append("descricao", formData.descricao);

  dados.append("sku", formData.sku);
  dados.append("codigo_barras", formData.codigoBarras);

  dados.append(
    "categoria_id",
    formData.categoria
      ? Number(formData.categoria)
      : ""
  );

  dados.append(
    "fornecedor_principal_id",
    formData.fornecedor
      ? Number(formData.fornecedor)
      : ""
  );

  dados.append("marca", formData.marca);

  dados.append("preco_custo", Number(formData.precoCusto));

  dados.append("preco_venda", Number(formData.precoVenda));

  dados.append("estoque_atual", Number(formData.estoqueAtual));

  dados.append("estoque_minimo", Number(formData.estoqueMinimo));

  dados.append("estoque_maximo", Number(formData.estoqueMaximo));

  dados.append("unidade_medida", formData.tipoUnidade);

  dados.append("tipo_unidade", formData.tipoUnidade);

  dados.append("localizacao", formData.localizacao);

  dados.append("tipo_material", formData.tipoMaterial);

  dados.append("peso", Number(formData.peso));

  dados.append("dimensoes", formData.dimensoes);

  dados.append(
    "imposto_percentual",
    Number(formData.imposto)
  );

  dados.append("observacoes", formData.observacoes);

  dados.append(
    "data_validade",
    formData.validade || ""
  );

  dados.append("produto_ativo", 1);


  useEffect(() => {

    const nomeLimpo = formData.nome
      .trim()
      .toUpperCase();

    if (!nomeLimpo) {
      setFormData(prev => ({
        ...prev,
        sku: ""
      }));
      return;
    }

    const letras = nomeLimpo
      .replace(/[^A-ZÀ-Ú\s]/g, "")
      .split(" ")
      .join("")
      .slice(0, 2);

    const skuGerado = `${letras}-0000`;

    setFormData(prev => ({
      ...prev,
      sku: skuGerado
    }));

  }, [formData.nome]);


  useEffect(() => {

    if (!formData.nome) {
      setFormData(prev => ({
        ...prev,
        codigoBarras: ""
      }));
      return;
    }

    const codigoTemporario = "789000000000";

    setFormData(prev => ({
      ...prev,
      codigoBarras: codigoTemporario
    }));

  }, [formData.nome]);

  useEffect(() => {

    async function buscarPrecoBase() {

      if (
        !formData.fornecedor ||
        !formData.categoria
      ) return;

      try {

        const response = await api.get(
          "/produtos/preco-base",
          {
            params: {
              fornecedor_id: formData.fornecedor,
              categoria_id: formData.categoria
            }
          }
        );

        const precoBase =
          Number(response.data.preco_base || 0);

        setPrecoAutomatico(precoBase);

        setFormData(prev => {

          const imposto =
            Number(prev.imposto || 0);

          // venda = custo + 30% + imposto
          const vendaAutomatica =
            precoBase +
            (precoBase * 0.30) +
            (precoBase * (imposto / 100));

          return {

            ...prev,

            precoCusto:
              usuarioEditouCusto
                ? prev.precoCusto
                : precoBase,

            precoVenda:
              usuarioEditouVenda
                ? prev.precoVenda
                : Number(vendaAutomatica.toFixed(2))

          };

        });

      } catch (error) {

        console.log(error);

      }

    }

    buscarPrecoBase();

  }, [
    formData.fornecedor,
    formData.categoria,
    formData.imposto,
    usuarioEditouCusto,
    usuarioEditouVenda
  ]);

  const porcentagemEstoque = useMemo(() => {
    const qtd = Number(formData.estoqueAtual) || 0;
    const max = Number(formData.estoqueMaximo) || 0;

    if (max <= 0) return 0;

    return Math.max(0, (qtd / max) * 100);
  }, [
    formData.estoqueAtual,
    formData.estoqueMaximo
  ]);

  const corEstoque = useMemo(() => {

    const qtd = Number(formData.estoqueAtual) || 0;
    const min = Number(formData.estoqueMinimo) || 0;
    const max = Number(formData.estoqueMaximo) || 0;

    // Azul: acima da capacidade
    if (max > 0 && qtd > max) {
      return "#3b82f6";
    }

    // Verde: mínimo e máximo iguais
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
    formData.estoqueAtual,
    formData.estoqueMinimo,
    formData.estoqueMaximo,
    porcentagemEstoque
  ]);

  const statusTexto = useMemo(() => {

    const qtd = Number(formData.estoqueAtual) || 0;
    const min = Number(formData.estoqueMinimo) || 0;
    const max = Number(formData.estoqueMaximo) || 0;

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
    formData.estoqueAtual,
    formData.estoqueMinimo,
    formData.estoqueMaximo,
    porcentagemEstoque
  ]);

  return (
    <div
      className={`
      ${styles.container}
      ${theme === "dark" ? styles.darkTheme : ""}
    `}
    >
      <header className={styles.header}>
        <h1>Cadastrar Novo Produto</h1>
        <p>Adicione novos materiais de construção ao gerenciamento de estoque.</p>
      </header>

      <form onSubmit={CadastrarItem} className={styles.mainLayout}>
        <div className={styles.formColumn}>

          {/* Informações Básicas */}
          <section className={styles.card}>
            <h3>Informações Básicas</h3>
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label>Nome do Produto *</label>
                <input name="nome" placeholder="Ex: Cimento CP-II 50kg" onChange={handleChange} required />
              </div>
              <div className={styles.inputGroup}>
                <label>SKU / Código</label>
                <input
                  name="sku"
                  value={formData.sku}
                  disabled
                  className={styles.disabledInput}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Código de Barras</label>
                <input
                  name="codigoBarras"
                  value={formData.codigoBarras}
                  disabled
                  className={styles.disabledInput}
                />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label>Categoria *</label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
                {searchParams.get("categoria") && (
                  <span style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px', display: 'block' }}>
                    ✓ Categoria pré-selecionada a partir do relatório
                  </span>
                )}
              </div>
              <div className={styles.inputGroup}>
                <label>Marca</label>
                <input name="marca" placeholder="Ex: Votorantim" onChange={handleChange} required/>
              </div>


              {/* <div className={styles.inputGroup}>
                <label>Fornecedor</label>
                <select
                  name="fornecedor"
                  value={formData.fornecedor}
                  onChange={handleChange}
                >
                  <option value="">Selecione um fornecedor</option>

                  {fornecedores.map((fornecedor) => (
                    <option
                      key={fornecedor.id}
                      value={fornecedor.id}
                    >
                      {fornecedor.nome}
                    </option>
                  ))}
                </select>
              </div> */}

              <div className={styles.inputGroup}>
                <label>Tipo de Unidade *</label>

                {!usarUnidadePersonalizada ? (

                  <select
                    name="tipoUnidadeSelect"
                    value={formData.tipoUnidade}
                    onChange={handleUnidadeSelectChange}
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilo (KG)</option>
                    <option value="Saco 50Kg">Saco 50Kg</option>
                    <option value="Lata 18L">Lata 18L</option>
                    <option value="Metro">Metro (M)</option>
                    <option value="outro">✍️ Outro (Digitar personalizado...)</option>
                  </select>
                ) : (

                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      name="tipoUnidade"
                      value={formData.tipoUnidade}
                      onChange={handleChange}
                      placeholder="Ex: Lata 10L, Galão 3.6L"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUsarUnidadePersonalizada(false);
                        setFormData(prev => ({ ...prev, tipoUnidade: "" }));
                      }}
                      style={{
                        padding: "0 12px",
                        backgroundColor: "#64748b",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        whiteSpace: "nowrap"
                      }}
                    >
                      Voltar
                    </button>
                  </div>
                )}
              </div>


            </div>
            <div className={styles.inputGroup}>
              <label>Descrição</label>
              <textarea name="descricao" rows="4" placeholder="Descreva o produto detalhadamente..." onChange={handleChange}></textarea>
            </div>
          </section>

          {/* Estoque */}
          {/* <section className={styles.card}>
            <h3>Informações de Estoque</h3>
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label>Estoque Atual *</label>
                <input type="number" name="estoqueAtual" onChange={handleChange} />
              </div>
              <div className={styles.inputGroup}>
                <label>Estoque Mínimo</label>
                <input type="number" name="estoqueMinimo" onChange={handleChange} />
              </div>
              <div className={styles.inputGroup}>
                <label>Estoque Máximo</label>
                <input
                  type="number"
                  name="estoqueMaximo"
                  onChange={handleChange}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Tipo de Unidade</label>

                {!usarUnidadePersonalizada ? (
                  
                  <select
                    name="tipoUnidadeSelect"
                    value={formData.tipoUnidade}
                    onChange={handleUnidadeSelectChange}
                  >
                    <option value="">Selecione...</option>
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilo (KG)</option>
                    <option value="Saco 50Kg">Saco 50Kg</option>
                    <option value="Lata 18L">Lata 18L</option>
                    <option value="Metro">Metro (M)</option>
                    <option value="outro">✍️ Outro (Digitar personalizado...)</option>
                  </select>
                ) : (
                  
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      name="tipoUnidade"
                      value={formData.tipoUnidade}
                      onChange={handleChange}
                      placeholder="Ex: Lata 10L, Galão 3.6L"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUsarUnidadePersonalizada(false);
                        setFormData(prev => ({ ...prev, tipoUnidade: "" }));
                      }}
                      style={{
                        padding: "0 12px",
                        backgroundColor: "#64748b",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        whiteSpace: "nowrap"
                      }}
                    >
                      Voltar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section> */}

          {/* Preços */}
          {/* <section className={styles.card}>
            <h3>Preços</h3>
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label>Preço de Custo (R$)</label>
                <input
                  type="number"
                  name="precoCusto"
                  step="0.01"
                  value={formData.precoCusto}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Preço de Venda (R*) *</label>
                <input
                  type="number"
                  name="precoVenda"
                  step="0.01"
                  value={formData.precoVenda}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Margem de Lucro (%)</label>
                <input type="text" value={margem} disabled className={styles.disabledInput} />
              </div>
              <div className={styles.inputGroup}>
                <label>Imposto (%)</label>
                <input
                  type="number"
                  name="imposto"
                  value={formData.imposto}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section> */}

          {/* Imagem */}
          <section className={styles.cardIMG}>
            <h3>Imagem do Produto</h3>
            <div className={styles.uploadBox}>

              <FiUploadCloud size={40} color="#cbd5e1" />

              <p>
                Arraste e solte a imagem aqui ou clique para selecionar
              </p>

              <input
                ref={inputImagemRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files[0]) {
                    setImagem(e.target.files[0]);
                  }
                }}
              />

            </div>
          </section>

          {/* Informações Adicionais */}
          <section className={styles.card}>
            <h3>Informações Adicionais</h3>
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label>Peso (kg)</label>
                <input type="number" name="peso" step="0.001" onChange={handleChange} required/>
              </div>
              <div className={styles.inputGroup}>
                <label>Dimensões (LxAxP cm)</label>
                <input name="dimensoes" placeholder="Ex: 30x20x10" onChange={handleChange} required/>
              </div>
              <div className={styles.inputGroup}>
                <label>Tipo de Material</label>
                <input name="tipoMaterial" placeholder="Ex: Mineral, Químico" onChange={handleChange} required/>
              </div>
            </div>
          </section>

          <div className={styles.actionButtons}>
            <button type="button" onClick={() => navigate("/produtos")} className={styles.cancelBtn}>
              <FiX /> Cancelar
            </button>
            <button type="submit" className={styles.saveBtn}>
              <FiSave /> Salvar Produto
            </button>
          </div>
        </div>

        {/* Sidebar Preview */}
        <aside className={styles.sidebar}>
          <div className={styles.previewCard}>

            <div className={styles.previewHeader}>
              <FiPackage className={styles.previewIcon} />
              <span>Preview do Produto</span>
            </div>

            {/* Imagem */}
            <div className={styles.previewImageContainer}>
              {imagem ? (
                <div
                  className={styles.previewImageWrapper}
                  onClick={() => inputImagemRef.current.click()}
                >
                  <img
                    src={URL.createObjectURL(imagem)}
                    alt="Preview do produto"
                    className={styles.previewImage}
                  />

                  <div className={styles.imageOverlay}>
                    <FiUploadCloud size={20} />
                    <span>Alterar imagem</span>
                  </div>
                </div>
              ) : (
                <div
                  className={styles.previewImagePlaceholder}
                  onClick={() => inputImagemRef.current.click()}
                >
                  <FiPackage size={48} />

                  <span className={styles.imageText}>
                    Adicionar imagem
                  </span>
                </div>
              )}
            </div>

            {/* Nome */}
            <h2 className={styles.previewName}>
              {formData.nome || "Nome do Produto"}
            </h2>

            {/* SKU */}
            <p className={styles.previewSku}>
              SKU: {formData.sku || "Não definido"}
            </p>

            {/* Badge */}
            <span
              className={styles.badge}
              style={{ background: corEstoque }}
            >
              {statusTexto}
            </span>

            {/* Preço */}
            <div className={styles.previewPrice}>
              R$ {Number(formData.precoVenda || 0).toFixed(2)}
            </div>

            {/* Informações */}
            <div className={styles.previewInfo}>

              <div>
                <span>Estoque</span>
                <strong>
                  {formData.estoqueAtual || 0} {formData.tipoUnidade}
                </strong>
              </div>

              <div>
                <span>Mínimo</span>
                <strong>
                  {formData.estoqueMinimo || 0} {formData.tipoUnidade}
                </strong>
              </div>

              <div>
                <span>Categoria</span>
                <strong>
                  {
                    categorias.find(c => c.id === Number(formData.categoria))?.nome
                    || "Não definida"
                  }
                </strong>
              </div>

            </div>

            {/* Barra */}
            <div className={styles.stockBar}>
              <div
                className={styles.stockProgress}
                style={{
                  width: `${Math.min(porcentagemEstoque, 100)}%`,
                  background: corEstoque
                }}
              />
            </div>

            {/* Resumo */}
            <div className={styles.previewPrices}>

              <h4>Resumo Financeiro</h4>

              <div className={styles.priceRow}>
                <span>Custo</span>

                <span>
                  R$ {Number(formData.precoCusto || 0).toFixed(2)}
                </span>
              </div>

              <div className={styles.priceRow}>
                <span>Venda</span>

                <span className={styles.highlightPrice}>
                  R$ {Number(formData.precoVenda || 0).toFixed(2)}
                </span>
              </div>

              <div className={styles.priceRow}>
                <span>Margem</span>

                <span
                  className={styles.marginText}
                  style={{
                    color: margem >= 0
                      ? "#22c55e"
                      : "#ef4444"
                  }}
                >
                  {margem}%
                </span>
              </div>

            </div>

          </div>
        </aside>
      </form>
      {erro && <div className={styles.errorMessage}>{erro}</div>}
    </div>
  );
}