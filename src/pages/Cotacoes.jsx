  import React, { useState, useEffect } from 'react';
  import {
    Plus,
    FileText,
    TrendingUp,
    Truck,
    DollarSign,
    Users,
    UserPlus,
    Trash2,
    CheckCircle,
    Eye,
    Info,
    Calendar,
    Phone,
    Search,
    Zap
  } from 'lucide-react';

  import { useTheme } from "../components/Context/ThemeContext";
  import { useToast } from '../components/Context/ToastContext';
  import { useNotification } from "../components/Context/NotificationContext.jsx";
  import jsPDF from "jspdf";
  import autoTable from "jspdf-autotable";
  import { api } from "../services/api";
  import styles from '../styles/cotacoes.module.css';

  export default function Cotacoes() {
    const [cotacoes, setCotacoes] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);

    // Modais de visualização
    const [cotacaoSelecionada, setCotacaoSelecionada] = useState(null);
    const [historicoSelecionado, setHistoricoSelecionado] = useState(null);

    // NOVO: Estado para controlar o modal de Confirmação (Aprovar / Excluir)
    const [modalConfirmacao, setModalConfirmacao] = useState({
      isOpen: false,
      tipo: '', // pode ser 'excluir' ou 'aprovar'
      cotacao: null
    });

    const { theme } = useTheme();
    const { addToast } = useToast();
    const { addNotification } = useNotification();

    // NOVO: filtros do histórico de cotações aprovadas
    const [periodoSelecionado, setPeriodoSelecionado] = useState('mes');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [buscaFornecedorHistorico, setBuscaFornecedorHistorico] = useState('');
    const [modalLimiteAtingido, setModalLimiteAtingido] = useState(false); // NOVO

    // Função para aplicar a máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    const formatarTelefone = (telefone) => {
      if (!telefone) return "Não informado";

      // Remove tudo que não é número
      const digitos = telefone.replace(/\D/g, "");

      if (digitos.length === 11) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
      } else if (digitos.length === 10) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
      }

      // Se não tiver 10 ou 11 dígitos, retorna como está
      return telefone;
    };

    // Normaliza cot.data (seja "DD/MM/YYYY" ou ISO) para "YYYY-MM-DD", usado nas comparações
    function normalizarDataCotacao(dataStr) {
      if (!dataStr) return null;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
        const [dia, mes, ano] = dataStr.split('/');
        return `${ano}-${mes}-${dia}`;
      }
      return dataStr.split('T')[0].split(' ')[0];
    }

    useEffect(() => {
      async function carregarDados() {
        try {
          // 1. Busca as cotações
          const respostaCotacoes = await api.get("/cotacoes");
          const cotacoesDoBanco = respostaCotacoes.data.sort((a, b) => b.id - a.id);
          setCotacoes(cotacoesDoBanco);

          // 2. Busca os fornecedores na API de forma silenciosa para cruzar dados
          let listaFornecedoresAPI = [];
          try {
            const respostaFornecedores = await api.get("/produtos/fornecedores");
            if (respostaFornecedores.data) {
              listaFornecedoresAPI = respostaFornecedores.data;
            }
          } catch (erroFornecedor) {
            console.warn("Não foi possível carregar a API de fornecedores. Usando apenas os dados das cotações.");
          }

          // 3. Monta os Fornecedores Recentes baseados APENAS em Cotações Aprovadas
          const cotacoesAprovadas = cotacoesDoBanco.filter(c => c.status === 'Aprovada');
          const fornecedoresUsados = [];
          const nomesJaAdicionados = new Set();

          for (const cot of cotacoesAprovadas) {
            if (!nomesJaAdicionados.has(cot.fornecedor)) {
              nomesJaAdicionados.add(cot.fornecedor);

              // Procura o fornecedor na API para pegar o contato atualizado (tenta telefone, depois celular)
              const dadosFornecedorAPI = listaFornecedoresAPI.find(f => f.nome === cot.fornecedor);

              const contatoMapeado =
                dadosFornecedorAPI?.telefone ||
                dadosFornecedorAPI?.celular ||
                cot.contato ||
                "Não informado";

              fornecedoresUsados.push({
                id: cot.id,
                nome: cot.fornecedor,
                contato: contatoMapeado,
                ultimaCompra: cot.data || "Recente" // Pega a data da cotação aprovada
              });
            }
          }

          // Salva apenas os 5 últimos fornecedores com quem compramos
          setFornecedores(fornecedoresUsados.slice(0, 7));

        } catch (error) {
          console.error("Erro ao carregar dados iniciais:", error);
          addToast("Erro ao carregar os dados do painel.", "error");
        }
      }

      carregarDados();
    }, [addToast]);

    const exportarParaPDF = (cotacao) => {
      if (!cotacao) return;

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      // Cabeçalho
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('ConstruStock', 14, 14);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cotação Aprovada #${cotacao.id}`, 14, 21);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      let y = 36;

      doc.setFont('helvetica', 'bold');
      doc.text('Fornecedor:', 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(cotacao.fornecedor || 'N/A', 45, y);
      y += 7;

      doc.setFont('helvetica', 'bold');
      doc.text('Data:', 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(cotacao.data || 'N/A', 45, y);
      y += 7;

      if (cotacao.data_entrega) {
        doc.setFont('helvetica', 'bold');
        doc.text('Previsão de Entrega:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(
          new Date(cotacao.data_entrega).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
          55, y
        );
        y += 7;
      }

      const valorFrete = Number(cotacao.valor_frete || cotacao.frete || 0);
      if (valorFrete > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Frete:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`R$ ${valorFrete.toFixed(2)}`, 45, y);
        y += 7;
      }

      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Produto', 'Qtd.', 'Preço Unit.', 'Subtotal']],
        body: (cotacao.produtos || []).map(prod => {
          const qtd = Number(prod.quantidade_comprada || 0);
          const precoUnit = Number(prod.preco_custo || 0);
          return [
            prod.nome,
            qtd,
            `R$ ${precoUnit.toFixed(2)}`,
            `R$ ${(qtd * precoUnit).toFixed(2)}`
          ];
        }),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      const finalY = doc.lastAutoTable.finalY || y + 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(`TOTAL: R$ ${Number(cotacao.total || 0).toFixed(2)}`, 196, finalY + 12, { align: 'right' });

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ConstruStock`, 105, 290, { align: 'center' });

      doc.save(`cotacao_${cotacao.id}_${(cotacao.fornecedor || 'fornecedor').replace(/\s+/g, '_')}.pdf`);

      addToast(`PDF da cotação #${cotacao.id} gerado com sucesso!`, "success");
    };

    // ==========================================
    // FUNÇÕES DE ABERTURA DO MODAL
    // ==========================================
    const handleDeletarClick = (cotacao) => {
      setModalConfirmacao({ isOpen: true, tipo: 'excluir', cotacao });
    };

    const handleAprovarClick = (cotacao) => {
      setModalConfirmacao({ isOpen: true, tipo: 'aprovar', cotacao });
    };

    // NOVO: intercepta os botões que levam à criação de cotação
    const handleNovaCotacaoClick = () => {
      if (limiteComparativoAtingido) {
        setModalLimiteAtingido(true);
        return;
      }
      window.location.href = '/cotacoes/cotacao';
    };

    const handleGerarAutomaticoClick = () => {
      if (limiteComparativoAtingido) {
        setModalLimiteAtingido(true);
        return;
      }
      window.location.href = '/cotacoes/cotacao?auto=true';
    };

    const fecharModalConfirmacao = () => {
      setModalConfirmacao({ isOpen: false, tipo: '', cotacao: null });
    };

    // ==========================================
    // FUNÇÕES DE EXECUÇÃO (Chamadas pelo Modal)
    // ==========================================
    const executarExclusao = async () => {
      const id = modalConfirmacao.cotacao.id;
      try {
        await api.delete(`/cotacoes/${id}`);
        setCotacoes(cotacoes.filter(cot => cot.id !== id));
        addToast("Cotação excluída com sucesso!", "success");
      } catch (error) {
        console.error("Erro ao deletar:", error);
        addToast("Erro ao excluir do banco de dados.", "error");
      } finally {
        fecharModalConfirmacao();
      }
    };

    const executarAprovacao = async () => {
      const cotacaoAprovada = modalConfirmacao.cotacao;
      try {
        await api.post(`/cotacoes/confirmar`, cotacaoAprovada);
        const pendentesNoPainel = cotacoes.filter(c => c.status !== 'Aprovada' && c.status !== 'Rejeitada').slice(0, 3);
        const grupoId = Date.now().toString();

        await Promise.all(pendentesNoPainel.map(c => {
          const novoStatus = c.id === cotacaoAprovada.id ? 'Aprovada' : 'Rejeitada';
          return api.put(`/cotacoes/${c.id}`, {
            status: novoStatus,
            grupo_comparacao: grupoId
          });
        }));

        addToast("Compra confirmada e histórico salvo na API!", "success");

        addNotification(
          "Cotação Aprovada!",
          `A cotação #${cotacaoAprovada.id} do fornecedor ${cotacaoAprovada.fornecedor} foi aprovada.`,
          "/cotacoes"
        );

        const novasCotacoes = cotacoes.map(c => {
          if (pendentesNoPainel.find(p => p.id === c.id)) {
            return {
              ...c,
              status: c.id === cotacaoAprovada.id ? 'Aprovada' : 'Rejeitada',
              grupo_comparacao: grupoId
            };
          }
          return c;
        });

        setCotacoes(novasCotacoes);
      } catch (error) {
        console.error("Erro ao aprovar e salvar:", error);
        addToast("Erro ao aprovar a compra ou atualizar status.", "error");
      } finally {
        fecharModalConfirmacao();
      }
    };

    const cotacoesPendentes = cotacoes.filter(c => c.status !== 'Aprovada' && c.status !== 'Rejeitada').slice(0, 3);
    const cotacoesAprovadas = cotacoes.filter(c => c.status === 'Aprovada');

    // NOVO: total real de pendentes (sem cortar em 3) para validar o limite
    const totalCotacoesPendentes = cotacoes.filter(c => c.status !== 'Aprovada' && c.status !== 'Rejeitada').length;
    const limiteComparativoAtingido = totalCotacoesPendentes >= 3;

    // NOVO: aplica período + busca por fornecedor sobre as cotações aprovadas
    const cotacoesAprovadasFiltradas = cotacoesAprovadas.filter(cot => {
      const matchFornecedor = (cot.fornecedor || '').toLowerCase().includes(buscaFornecedorHistorico.toLowerCase());

      const dataAjustada = normalizarDataCotacao(cot.data);

      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
      const diaAtual = String(hoje.getDate()).padStart(2, '0');
      const dataHojeStr = `${anoAtual}-${mesAtual}-${diaAtual}`;

      let matchData = true;

      if (!dataAjustada) {
        matchData = true; // sem data cadastrada: não exclui o registro
      } else if (periodoSelecionado === 'dia') {
        matchData = dataAjustada === dataHojeStr;
      } else if (periodoSelecionado === 'semana') {
        const dataSeteDiasAtras = new Date();
        dataSeteDiasAtras.setDate(hoje.getDate() - 7);
        const dataCotacao = new Date(dataAjustada);
        matchData = dataCotacao >= dataSeteDiasAtras && dataCotacao <= hoje;
      } else if (periodoSelecionado === 'mes') {
        matchData = dataAjustada.startsWith(`${anoAtual}-${mesAtual}`);
      } else if (periodoSelecionado === 'ano') {
        matchData = dataAjustada.startsWith(`${anoAtual}`);
      } else if (periodoSelecionado === 'personalizado' && dataInicio && dataFim) {
        matchData = (dataAjustada >= dataInicio && dataAjustada <= dataFim);
      }

      return matchFornecedor && matchData;
    });

    const getComparativosDoGrupo = (grupoId) => {
      if (!grupoId) return [];
      return cotacoes.filter(c => c.grupo_comparacao === grupoId);
    };

    return (
      <main className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>Painel de Cotações</h1>
            <p>Gerencie cotações de reposição de estoque baixo</p>
          </div>

          <div className={styles.headerButtons}>
            {/* <button className={styles.btnSecundario} onClick={() => window.location.href = '/cotacoes/Fornecedores'}>
              <Users size={18} />
              <span>Fornecedores</span>
            </button>
            <button className={styles.btnSecundario} onClick={() => window.location.href = '/cotacoes/cadastrarfornecedor'}>
              <UserPlus size={18} />
              <span>Novo Fornecedor</span>
            </button> */}
            <div className={styles.headerButtons}>
              <button className={styles.btnSecundario} onClick={handleGerarAutomaticoClick}>
                <Zap size={18} />
                <span>Gerar Automaticamente</span>
              </button>

              <button className={styles.btnPrimario} onClick={handleNovaCotacaoClick}>
                <Plus size={18} />
                <span>Nova Cotação</span>
              </button>
            </div>
          </div>
        </header>

        {/* PAINEL DE COMPARATIVO */}
        <section className={styles.comparativoSection}>
          <h2>
            <TrendingUp size={20} className={styles.iconDestaque} />
            Comparativo de Custo-Benefício
            {limiteComparativoAtingido && (
              <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 600, padding: '2px 10px', borderRadius: '999px', background: '#7f1d1d', color: '#fecaca' }}>
                Limite atingido (3/3)
              </span>
            )}
          </h2>

          {cotacoesPendentes.length === 0 ? (
            <div className={styles.emptyStateContainer}>
              <Info size={32} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>Nenhuma cotação pendente no momento.</p>
              <p className={styles.emptySubtitle}>Crie novas cotações para compará-las e encontrar o melhor custo-benefício.</p>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {cotacoesPendentes.map((item) => (
                <div key={item.id} className={`${styles.card} ${item.status === 'Melhor Opção' ? styles.cardDestaque : ''}`}>
                  {item.status === 'Melhor Opção' && (
                    <span className={styles.badge}>Melhor Custo-Benefício</span>
                  )}
                  <h3>{item.fornecedor}</h3>

                  <div className={styles.cardInfo}>
                    <p><DollarSign size={16} /> <strong>Total:</strong> R$ {Number(item.valor_total || item.total || 0).toFixed(2)}</p>
                    <p><Truck size={16} /> <strong>Frete:</strong> R$ {Number(item.valor_frete || item.frete || 0).toFixed(2)}</p>
                    <p>
                      <Calendar size={16} /> <strong>Entrega:</strong>{' '}
                      {item.data_entrega ? new Date(item.data_entrega).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não informada'}
                    </p>
                    <p><FileText size={16} /> <strong>Itens:</strong> {item.produtos ? item.produtos.length : (item.items || 0)}</p>

                    {/* <p>
                      <Phone size={16} /> <strong>Contato:</strong>{' '}
                      {item.contato ||
                        fornecedores.find(f => f.nome === item.fornecedor)?.telefone ||
                        fornecedores.find(f => f.nome === item.fornecedor)?.celular ||
                        'Não informado'}
                    </p> */}
                  </div>

                  <div className={styles.cardActionGrid}>
                    <button className={styles.btnSecundarioCard} onClick={() => setCotacaoSelecionada(item)}>
                      <FileText size={16} /> Ver
                    </button>

                    <button className={styles.btnAprovarCard} onClick={() => handleAprovarClick(item)}>
                      <CheckCircle size={16} /> Aprovar
                    </button>

                    <button
                      className={styles.btnExcluirCard}
                      onClick={() => handleDeletarClick(item)}
                      title="Excluir cotação criada errada"
                    >
                      <Trash2 size={16} /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.gridDuplo}>
          {/* HISTÓRICO DE COTAÇÕES */}
          <div className={styles.secaoTabela}>
            <h2>Histórico de Cotações Aprovadas</h2>

            <div className={styles.filtrosHistorico}>
              <div className={styles.linhaPeriodos}>
                {['dia', 'semana', 'mes', 'ano', 'personalizado'].map(periodo => (
                  <button
                    key={periodo}
                    className={`${styles.btnPeriodo} ${periodoSelecionado === periodo ? styles.activePeriodo : ''}`}
                    onClick={() => setPeriodoSelecionado(periodo)}
                  >
                    {periodo.charAt(0).toUpperCase() + periodo.slice(1)}
                  </button>
                ))}

                {periodoSelecionado === 'personalizado' && (
                  <div className={styles.datasPersonalizadas}>
                    <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                    <span>até</span>
                    <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                  </div>
                )}
              </div>

              <div className={styles.inputBuscaIcon}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar fornecedor..."
                  value={buscaFornecedorHistorico}
                  onChange={(e) => setBuscaFornecedorHistorico(e.target.value)}
                />
              </div>
            </div> 

            <div className={styles.tableWrapper}>
              <table className={styles.tabela}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Fornecedor Vencedor</th>
                    <th>Valor Total</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cotacoesAprovadasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="5" className={styles.emptyState}>
                        Nenhuma cotação aprovada encontrada para o filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    cotacoesAprovadasFiltradas.map(cot => (
                      <tr key={cot.id}>
                        <td>{cot.data}</td>
                        <td>{cot.fornecedor}</td>
                        <td className={styles.valorDestacado}>
                          R$ {Number(cot.total).toFixed(2)}
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles.statusAprovado}`}>
                            {cot.status}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              className={styles.btnActionTable}
                              onClick={() => setHistoricoSelecionado(cot)}
                              title="Ver Comparativo Desta Compra"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className={styles.btnActionTable}
                              onClick={() => exportarParaPDF(cot)}
                              title="Exportar PDF"
                            >
                              <FileText size={16} />
                            </button>
                            {/* <button
                              className={styles.btnDelete}
                              onClick={() => handleDeletarClick(cot)}
                              title="Excluir Cotação"
                            >
                              <Trash2 size={16} />
                            </button> */}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FORNECEDORES RECENTES */}
          <div className={styles.secaoTabela}>
            <h2>
              <Users size={18} /> Fornecedores Recentes
            </h2>
            <div className={styles.tableWrapper}>
              <table className={styles.tabela}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Contato</th>
                    <th>Última Compra</th>
                  </tr>
                </thead>
                <tbody>
                  {fornecedores.length === 0 ? (
                    <tr>
                      <td colSpan="3" className={styles.emptyState}>
                        Nenhum fornecedor recente.
                      </td>
                    </tr>
                  ) : (
                    fornecedores.map(forn => (
                      <tr key={forn.id}>
                        <td className={styles.nomeFornecedor}>{forn.nome}</td>
                        <td>{formatarTelefone(forn.contato)}</td>
                        <td>{forn.ultimaCompra}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* MODAL 1: Visualização de Itens */}
        {cotacaoSelecionada && (
          <div className={styles.modalOverlay} onClick={() => setCotacaoSelecionada(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Itens: {cotacaoSelecionada.fornecedor}</h2>
                <button className={styles.modalCloseBtn} onClick={() => setCotacaoSelecionada(null)}>✕</button>
              </div>

              {/* NOVA ESTRUTURA DA LISTA E DOS ITENS */}
              <ul className={styles.produtoList}>
                {cotacaoSelecionada.produtos?.map((prod, idx) => (
                  <li key={idx} className={styles.produtoItem}>
                    <div className={styles.itemMain}>
                      <span className={styles.itemQtd}>{prod.quantidade_comprada}x</span>
                      <span className={styles.itemName}>{prod.nome}</span>
                    </div>
                    <div className={styles.itemPrice}>
                      R$ {Number(prod.preco_custo || 0).toFixed(2)} un.
                    </div>
                  </li>
                ))}
              </ul>

              {/* NOVO RODAPÉ COM O TOTAL DESTACADO */}
              <div className={styles.modalFooter}>
                <div className={styles.modalTotal}>
                  <span>Total Geral:</span>
                  <strong>R$ {Number(cotacaoSelecionada.total).toFixed(2)}</strong>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* MODAL 2: Visualização do Lote Específico de Comparação */}
        {historicoSelecionado && (
          <div className={styles.modalOverlay} onClick={() => setHistoricoSelecionado(null)}>
            <div className={`${styles.modalContent} ${styles.modalContentLg}`} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Resumo do Comparativo</h2>
                <button className={styles.modalCloseBtn} onClick={() => setHistoricoSelecionado(null)}>✕</button>
              </div>
              <div className={styles.modalCardsGrid}>
                {getComparativosDoGrupo(historicoSelecionado.grupo_comparacao).map((cot, idx) => {
                  const isWinner = cot.status === 'Aprovada';
                  const isRejected = cot.status === 'Rejeitada';
                  return (
                    <div key={idx} className={`${styles.comparativoCard} ${isWinner ? styles.comparativoCardWinner : ''} ${isRejected ? styles.comparativoCardRejected : ''}`}>
                      <div className={styles.comparativoCardHeader}>
                        <div className={styles.comparativoCardTitleWrapper}>
                          <h3>{cot.fornecedor}</h3>
                          {/* {isWinner && <span className={styles.winnerBadge}>Vencedora</span>} */}
                        </div>
                        <strong className={styles.comparativoCardTotal}>
                          R$ {Number(cot.total).toFixed(2)}
                        </strong>
                      </div>
                      <ul className={styles.produtoList}>
                        {cot.produtos?.map((prod, pIdx) => (
                          <li key={pIdx} className={styles.produtoItem}>
                            <span><strong>{prod.quantidade_comprada}x</strong> {prod.nome}</span>
                            <span>R$ {(prod.preco_custo || 0).toFixed(2)} / un</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              {getComparativosDoGrupo(historicoSelecionado.grupo_comparacao).length === 0 && (
                <div className={styles.modalEmptyState}>
                  <p>Não há registros de concorrência vinculados a esta compra.</p>
                  <span>Isto geralmente acontece com compras antigas ou lançamentos avulsos.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOVO MODAL: CONFIRMAÇÃO DE AÇÃO (EXCLUIR / APROVAR) */}
        {modalConfirmacao.isOpen && (
          <div className={styles.modalOverlayConfirm} onClick={fecharModalConfirmacao}>
            <div className={styles.modalContentConfirm} onClick={(e) => e.stopPropagation()}>

              <h3>
                {modalConfirmacao.tipo === 'excluir' ? 'Confirmar Exclusão' : 'Confirmar Aprovação'}
              </h3>

              <p>
                {modalConfirmacao.tipo === 'excluir' ? (
                  <>Tem certeza de que deseja excluir a cotação do fornecedor <strong>{modalConfirmacao.cotacao?.fornecedor}</strong>? Todo o histórico dela será apagado e esta ação não poderá ser desfeita.</>
                ) : (
                  <>Deseja aprovar a cotação <strong>#{modalConfirmacao.cotacao?.id}</strong> do fornecedor <strong>{modalConfirmacao.cotacao?.fornecedor}</strong>? O sistema registrará a compra e organizará o lote de cotações pendentes.</>
                )}
              </p>

              <div className={styles.modalActionsConfirm}>
                <button
                  className={styles.btnCancelConfirm}
                  onClick={fecharModalConfirmacao}
                >
                  Cancelar
                </button>
                <button
                  className={modalConfirmacao.tipo === 'excluir' ? styles.btnDeleteConfirm : styles.btnApproveConfirm}
                  onClick={modalConfirmacao.tipo === 'excluir' ? executarExclusao : executarAprovacao}
                >
                  {modalConfirmacao.tipo === 'excluir' ? 'Sim, Excluir' : 'Sim, Aprovar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOVO MODAL: LIMITE DE COTAÇÕES ATINGIDO */}
        {modalLimiteAtingido && (
          <div className={styles.modalOverlayConfirm} onClick={() => setModalLimiteAtingido(false)}>
            <div className={styles.modalContentConfirm} onClick={(e) => e.stopPropagation()}>
              <h3>Limite de Cotações Atingido</h3>
              <p>
                Você já possui <strong>3 cotações pendentes</strong> no painel de comparativo.
                Aprove ou exclua uma delas antes de criar uma nova cotação, para manter a
                comparação de custo-benefício organizada.
              </p>
              <div className={styles.modalActionsConfirm}>
                <button className={styles.btnCancelConfirm} onClick={() => setModalLimiteAtingido(false)}>
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    );
  }