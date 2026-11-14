import React, { useState, useEffect } from 'react';
import { Search, X, Save, ArrowLeft, Plus, Package, Check } from 'lucide-react';
import { api } from "../services/api";
import { useTheme } from "../components/Context/ThemeContext";
import { useNavigate, useLocation } from 'react-router-dom';
import styles from '../styles/cotacao.module.css';

import { Zap } from 'lucide-react';

import { useNotification } from "../components/Context/NotificationContext.jsx";
import { useToast } from '../components/Context/ToastContext';

export default function CotacaoDetalhe() {
  // Estados para os dados vindos do banco
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  // Estado para os produtos que ESTÃO NA COTAÇÃO (começa vazio)
  const [produtosCotacao, setProdutosCotacao] = useState([]);

  // Estados do modal de busca
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buscaModal, setBuscaModal] = useState('');

  // Metadados da cotação
  const [metaDados, setMetaDados] = useState({
    fornecedor_id: '',
    dataEntrega: ''
  });

  const [valorFrete, setValorFrete] = useState('');

  const { theme } = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { addToast } = useToast();

  // NOVO: detecta se veio pelo botão "Gerar Automaticamente"
  const isModoAutomatico = new URLSearchParams(location.search).get('auto') === 'true';

  // NOVO: percentual alvo do estoque máximo ao gerar automaticamente
  const PERCENTUAL_ALVO_ESTOQUE = 0.65;

  useEffect(() => {
    async function carregarDados() {
      try {
        const responseProdutos = await api.get("/produtos");

        const produtosMapeados = responseProdutos.data
          .filter(prod => Number(prod.produto_ativo) === 1)
          .map(prod => {
            const estoqueAtual = Number(prod.estoque_atual || 0);
            const estoqueMinimo = Number(prod.estoque_minimo || 0);
            const estoqueMaximo = Number(prod.estoque_maximo || 0);
            const UnidadeMedida = Number(prod.unidade_medida || "un");

            let qtdSugerida = 0;
            if (estoqueAtual <= estoqueMinimo && estoqueMaximo > 0) {
              qtdSugerida = Math.max(0, estoqueMaximo - estoqueAtual);
            }

            return {
              id: prod.id,
              nome: prod.nome,
              categoria: prod.categoria_nome || "Sem categoria",
              medida: prod.unidade_medida,
              estoque: estoqueAtual,
              minimo: estoqueMinimo,
              maximo: estoqueMaximo,
              modelo: prod.sku || "N/A",
              quantidadeSugerida: qtdSugerida
            };
          });

        setProdutosDisponiveis(produtosMapeados);

        // ==========================================
        // NOVO: MODO AUTOMÁTICO
        // Pré-seleciona itens em estoque baixo com
        // quantidade para atingir 65% do estoque máximo
        // ==========================================
        if (isModoAutomatico) {
          const itensEstoqueBaixo = produtosMapeados.filter(
            p => p.estoque <= p.minimo && p.maximo > 0
          );

          const produtosAutoSelecionados = itensEstoqueBaixo
            .map(p => {
              const estoqueAlvo = Math.ceil(p.maximo * PERCENTUAL_ALVO_ESTOQUE);
              const quantidadeNecessaria = Math.max(estoqueAlvo - p.estoque, 0);

              return {
                ...p,
                precoCotado: 0,
                quantidadeComprar: quantidadeNecessaria
              };
            })
            .filter(p => p.quantidadeComprar > 0);

          setProdutosCotacao(produtosAutoSelecionados);

          if (produtosAutoSelecionados.length > 0) {
            addToast(
              `${produtosAutoSelecionados.length} item(ns) de estoque baixo adicionados automaticamente.`,
              "success"
            );
          } else {
            addToast("Nenhum item em estoque baixo foi encontrado no momento.", "success");
          }
        }

        const responseFornecedores = await api.get("/produtos/fornecedores");
        setFornecedores(responseFornecedores.data);

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    }
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lógica para adicionar produto do modal para a cotação
  const adicionarProdutoNaCotacao = (produto) => {
    const jaExiste = produtosCotacao.find(p => p.id === produto.id);

    if (jaExiste) {
      addToast("Este produto já está na cotação!", "error");
      return;
    }

    setProdutosCotacao([
      ...produtosCotacao,
      {
        ...produto,
        precoCotado: 0,
        quantidadeComprar: produto.quantidadeSugerida > 0 ? produto.quantidadeSugerida : 1
      }
    ]);
    addToast(`${produto.nome} adicionado!`, "success");
  };

  const removerProdutoCotacao = (id) => {
    setProdutosCotacao(produtosCotacao.filter(prod => prod.id !== id));
  };

  const handlePrecoChange = (id, valor) => {
    setProdutosCotacao(produtosCotacao.map(prod =>
      prod.id === id ? { ...prod, precoCotado: parseFloat(valor) || 0 } : prod
    ));
  };

  const handleQuantidadeChange = (id, valor) => {
    setProdutosCotacao(produtosCotacao.map(prod =>
      prod.id === id ? { ...prod, quantidadeComprar: parseInt(valor) || 0 } : prod
    ));
  };

  // Produtos filtrados dentro do modal
  const produtosModalFiltrados = produtosDisponiveis.filter(prod =>
    prod.nome.toLowerCase().includes(buscaModal.toLowerCase()) ||
    prod.modelo.toLowerCase().includes(buscaModal.toLowerCase())
  );

  // ✅ COMO DEVE FICAR (Correto)
  const valorTotalProdutos = produtosCotacao.reduce((acc, prod) => {
    return acc + (prod.precoCotado * (prod.quantidadeComprar || 0));
  }, 0);

  // Pega o valor do frete e garante que é um número válido
  const valorFreteNum = parseFloat(valorFrete) || 0;

  // Soma os produtos + frete
  const valorTotalGeral = valorTotalProdutos + valorFreteNum;

  const totaisPorCategoria = produtosCotacao.reduce((acc, prod) => {
    const custoItem = prod.precoCotado * (prod.quantidadeComprar || 0);
    if (custoItem > 0) {
      acc[prod.categoria] = (acc[prod.categoria] || 0) + custoItem;
    }
    return acc;
  }, {});

  const salvarCotacao = async () => {
    if (!metaDados.fornecedor_id) {
      addToast("Selecione um fornecedor.", "error");
      return;
    }

    if (!metaDados.dataEntrega) {
      addToast("Informe a previsão de entrega.", "error");
      return;
    }

    if (metaDados.dataEntrega < obterDataAtual()) {
      addToast("A previsão de entrega não pode ser anterior à data atual.", "error");
      return;
    }

    if (produtosCotacao.length === 0) {
      addToast("Adicione pelo menos um produto na cotação.", "error");
      return;
    }

    const produtoSemPreco = produtosCotacao.find(
      prod => !prod.precoCotado || Number(prod.precoCotado) <= 0
    );

    if (produtoSemPreco) {
      addToast(
        `Informe um preço unitário válido para o produto "${produtoSemPreco.nome}".`,
        "error"
      );
      return;
    }

    const produtosValidos = produtosCotacao.filter(
      prod => prod.quantidadeComprar > 0
    );

    if (produtosValidos.length === 0) {
      addToast("A quantidade a comprar deve ser maior que zero.", "error");
      return;
    }

    const payload = {
      fornecedor_id: metaDados.fornecedor_id,
      data_entrega: metaDados.dataEntrega, // <-- ADICIONE ESTA LINHA
      observacoes: "",
      valor_total: valorTotalGeral,
      valor_frete: valorFreteNum,
      status: 'Pendente',
      produtos: produtosValidos.map(prod => ({
        produto_id: prod.id,
        quantidade: prod.quantidadeComprar,
        preco_unitario: prod.precoCotado,
        subtotal: prod.precoCotado * prod.quantidadeComprar
      }))
    };

    try {
      await api.post("/cotacoes", payload);
      addToast("Cotação salva com sucesso!", "success");
      addNotification("Nova Cotação Pendente", `A cotação foi salva e está pronta para análise.`, "/cotacoes");
      setTimeout(() => navigate("/cotacoes"), 1500);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      addToast("Erro ao salvar cotação.", "error");
    }
  };

  const obterDataAtual = () => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  };

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`}>
      <div className={styles.header}>
        <button className={styles.btnVoltar} onClick={() => window.history.back()}>
          <ArrowLeft size={16} />
          Voltar
        </button>
        <h1>Nova Cotação</h1>
      </div>

      {isModoAutomatico && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: '8px',
          background: theme === 'dark' ? '#1e3a2f' : '#e6f7ee',
          color: theme === 'dark' ? '#4ade80' : '#15803d',
          fontSize: '14px',
          fontWeight: 500
        }}>
          <Zap size={16} />
          <span>
            Modo automático: itens em estoque baixo foram pré-adicionados com quantidade
            para atingir 65% do estoque máximo. Selecione o fornecedor e confira os preços.
          </span>
        </div>
      )}

      <div className={styles.formFornecedor}>
        <div className={styles.inputGroup}>
          <label>Fornecedor</label>
          {/* SEU SELECT CONTINUA IGUAL */}
          <select
            value={metaDados.fornecedor_id}
            onChange={(e) => setMetaDados({ ...metaDados, fornecedor_id: e.target.value })}
            style={{
              width: '100%', padding: '10px', borderRadius: '6px',
              border: '1px solid #ccc', background: theme === 'dark' ? '#2a2a3c' : '#fff',
              color: theme === 'dark' ? '#fff' : '#000'
            }}
          >
            <option value="">Selecione um fornecedor...</option>
            {fornecedores.map((forn) => (
              <option key={forn.id} value={forn.id}>{forn.nome}</option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label>Previsão de Entrega *</label>

          <input
            type="date"
            min={obterDataAtual()}
            value={metaDados.dataEntrega}
            onChange={(e) =>
              setMetaDados({
                ...metaDados,
                dataEntrega: e.target.value
              })
            }
            required
          />
        </div>

        {/* 👇 NOVO INPUT DE FRETE AQUI 👇 */}
        <div className={styles.inputGroup}>
          <label>Valor do Frete (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={valorFrete}
            onChange={(e) => setValorFrete(e.target.value)}
          />
        </div>
      </div>

      {/* ÁREA DA TABELA DE COTAÇÃO */}
      <div className={styles.tableCard}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Estoque Atual</th>
              <th>Qtd. Comprar</th>
              <th>Preço Unitário</th>
              <th>Subtotal</th>
              <th>Remover</th>
            </tr>
          </thead>
          <tbody>
            {produtosCotacao.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.emptyStateContainer}>
                  <Package size={40} className={styles.emptyStateIcon} />
                  <p>Nenhum produto adicionado à cotação ainda.</p>
                </td>
              </tr>
            ) : (
              produtosCotacao.map(prod => (
                <tr key={prod.id}>
                  <td>
                    <strong>{prod.nome}</strong>
                    <br />
                    <small style={{ color: '#888' }}>{prod.modelo}</small>
                  </td>
                  <td><span className={styles.catTag}>{prod.categoria}</span></td>
                  <td>
                    <span style={{ color: prod.estoque < prod.minimo ? '#e74c3c' : 'inherit', fontWeight: prod.estoque < prod.minimo ? 'bold' : 'normal' }}>
                      {prod.estoque} {prod.medida}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      className={styles.inputQtd}
                      value={prod.quantidadeComprar}
                      onChange={(e) => handleQuantidadeChange(prod.id, e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <div className={styles.inputPrecoWrapper}>
                      <span>R$</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        className={styles.inputPreco}
                        value={prod.precoCotado || ''}
                        onChange={(e) => handlePrecoChange(prod.id, e.target.value)}
                        required
                      />
                    </div>
                  </td>
                  <td><strong>R$ {(prod.precoCotado * (prod.quantidadeComprar || 0)).toFixed(2)}</strong></td>
                  <td>
                    <button className={styles.btnDelete} onClick={() => removerProdutoCotacao(prod.id)} title="Remover da cotação">
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* BOTÃO DE ADICIONAR QUE FICA ABAIXO DA LISTA */}
        <div className={styles.addProdutoBarra}>
          <button className={styles.btnAddProduto} onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            Adicionar Produto na Cotação
          </button>
        </div>
      </div>

      <div className={styles.footerResumo}>
        {/* Lado Esquerdo: Categorias */}
        <div className={styles.categoriasResumo}>
          <h4>Subtotal por Categoria</h4>
          {Object.keys(totaisPorCategoria).length === 0 ? (
            <p className={styles.emptyText}>Nenhum valor calculado ainda.</p>
          ) : (
            <div className={styles.categoriasLista}>
              {Object.keys(totaisPorCategoria).map(cat => (
                <div key={cat} className={styles.categoriaItem}>
                  <span>{cat}</span>
                  <strong>R$ {totaisPorCategoria[cat].toFixed(2)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lado Direito: Card de Conferência (Resumo do Pedido) */}
        <div className={styles.resumoPedidoCard}>
          <h4>Resumo da Cotação</h4>

          <div className={styles.resumoLista}>
            {produtosCotacao.length === 0 ? (
              <p className={styles.emptyText}>Adicione produtos para ver o resumo.</p>
            ) : (
              produtosCotacao.map(prod => (
                <div key={prod.id} className={styles.resumoItem}>
                  <span className={styles.resumoItemNome}>
                    {prod.quantidadeComprar || 0}x {prod.nome}
                  </span>
                  <span className={styles.resumoItemValor}>
                    R$ {(prod.precoCotado * (prod.quantidadeComprar || 0)).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className={styles.resumoDivider}></div>

          <div className={styles.resumoTotais}>
            <div className={styles.resumoLinha}>
              <span>Subtotal Produtos:</span>
              <span>R$ {valorTotalProdutos.toFixed(2)}</span>
            </div>
            <div className={styles.resumoLinha}>
              <span>Valor do Frete:</span>
              <span>R$ {valorFreteNum.toFixed(2)}</span>
            </div>
          </div>

          <div className={styles.resumoDivider}></div>

          <div className={styles.valorTotalFinal}>
            <span>TOTAL GERAL</span>
            <h2>R$ {valorTotalGeral.toFixed(2)}</h2>
          </div>

          <button className={styles.btnSalvar} onClick={salvarCotacao}>
            <Save size={18} />
            Salvar Cotação
          </button>
        </div>
      </div>

      {/* MODAL DE BUSCA DE PRODUTOS */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Buscar Produtos</h2>
              <button className={styles.btnCloseModal} onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalSearchBox}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Digite o nome ou SKU do produto..."
                value={buscaModal}
                onChange={(e) => setBuscaModal(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.modalListContainer}>
              {produtosModalFiltrados.length === 0 ? (
                <p className={styles.modalEmpty}>Nenhum produto encontrado.</p>
              ) : (
                produtosModalFiltrados.map(prod => {
                  const jaAdicionado = produtosCotacao.some(p => p.id === prod.id);
                  return (
                    <div key={prod.id} className={styles.modalItem}>
                      <div className={styles.modalItemInfo}>
                        <strong>{prod.nome}</strong>
                        <span>{prod.categoria} | Estoque: {prod.estoque} (Mín: {prod.minimo})</span>
                      </div>
                      <button
                        className={jaAdicionado ? styles.btnModalAdicionado : styles.btnModalAdd}
                        onClick={() => adicionarProdutoNaCotacao(prod)}
                        disabled={jaAdicionado}
                      >
                        {jaAdicionado ? <Check size={18} /> : <Plus size={18} />}
                        {jaAdicionado ? 'Adicionado' : 'Adicionar'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}