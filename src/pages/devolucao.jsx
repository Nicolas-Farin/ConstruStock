import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  PackageMinus,
  RotateCcw,
  AlertCircle,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from "../services/api.js";
import { useTheme } from "../components/Context/ThemeContext";
import { useToast } from "../components/Context/ToastContext";
import { useNotification } from "../components/Context/NotificationContext.jsx";
import styles from '../styles/devolucao.module.css';

export default function Devolucao() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { addNotification } = useNotification();

  const [termoBusca, setTermoBusca] = useState('');
  const [todosPedidos, setTodosPedidos] = useState([]);
  const [carregandoBusca, setCarregandoBusca] = useState(true);

  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [carregandoPedido, setCarregandoPedido] = useState(false);

  const [quantidades, setQuantidades] = useState({});
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function carregarPedidos() {
      try {
        const resposta = await api.get('/pedidos');
        setTodosPedidos(resposta.data);
      } catch (error) {
        console.error(error);
        addToast("Erro ao carregar pedidos.", "error");
      } finally {
        setCarregandoBusca(false);
      }
    }
    carregarPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resultadosBusca = termoBusca.trim().length === 0
    ? []
    : todosPedidos.filter(p => {
        if (p.status === 'Cancelado') return false;
        const termo = termoBusca.toLowerCase();
        return (
          String(p.id).includes(termo) ||
          (p.cliente || '').toLowerCase().includes(termo)
        );
      });

  async function selecionarPedido(id) {
    setCarregandoPedido(true);
    setTermoBusca('');
    try {
      const resposta = await api.get(`/devolucoes/pedido/${id}`);
      setPedidoSelecionado(resposta.data);
      setQuantidades({});
      setMotivo('');
    } catch (error) {
      addToast(error.response?.data?.erro || "Erro ao carregar o pedido selecionado.", "error");
    } finally {
      setCarregandoPedido(false);
    }
  }

  function trocarPedido() {
    setPedidoSelecionado(null);
    setQuantidades({});
    setMotivo('');
  }

  function calcularDisponivel(item) {
    return Math.max(0, Number(item.quantidade) - Number(item.quantidade_devolvida || 0));
  }

  function handleQuantidadeChange(produtoId, valor, disponivel) {
    let qtd = parseInt(valor);
    if (isNaN(qtd) || qtd < 0) qtd = 0;
    if (qtd > disponivel) {
      qtd = disponivel;
      addToast(`Quantidade máxima disponível para devolução: ${disponivel}.`, "error");
    }
    setQuantidades(prev => ({ ...prev, [produtoId]: qtd }));
  }

  function devolverTudo(item) {
    const disponivel = calcularDisponivel(item);
    setQuantidades(prev => ({ ...prev, [item.produto_id]: disponivel }));
  }

  const itensParaDevolucao = pedidoSelecionado?.itens
    ?.map(item => ({ ...item, quantidadeDevolver: Number(quantidades[item.produto_id] || 0) }))
    .filter(item => item.quantidadeDevolver > 0) || [];

  const valorTotalDevolucao = itensParaDevolucao.reduce(
    (acc, item) => acc + (item.preco_venda * item.quantidadeDevolver), 0
  );

  async function confirmarDevolucao() {
    if (!pedidoSelecionado) return;

    if (itensParaDevolucao.length === 0) {
      addToast("Selecione ao menos um item e a quantidade a devolver.", "error");
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        pedido_id: pedidoSelecionado.id,
        motivo: motivo.trim(),
        itens: itensParaDevolucao.map(item => ({
          produto_id: item.produto_id,
          quantidade: item.quantidadeDevolver
        }))
      };

      await api.post('/devolucoes', payload);

      addToast("Devolução registrada e estoque atualizado com sucesso!", "success");
      addNotification(
        "Devolução Registrada",
        `${itensParaDevolucao.length} item(ns) do pedido #${pedidoSelecionado.id} foram devolvidos ao estoque.`,
        "/pedidos"
      );

      navigate('/pedidos');
    } catch (error) {
      addToast(error.response?.data?.erro || "Erro ao registrar devolução.", "error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`}>
      <div className={styles.header}>
        <button className={styles.btnVoltar} onClick={() => navigate('/pedidos')}>
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div>
          <h1>Registrar Devolução</h1>
          <p>Devolva itens de um pedido já realizado de volta ao estoque</p>
        </div>
      </div>

      {!pedidoSelecionado ? (
        <div className={styles.buscaCard}>
          <label className={styles.buscaLabel}>Buscar pedido por número ou cliente</label>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Ex: 12 ou João da Silva..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              autoFocus
            />
          </div>

          {carregandoBusca ? (
            <p className={styles.mensagemVazia}>Carregando pedidos...</p>
          ) : termoBusca.trim().length === 0 ? (
            <p className={styles.mensagemVazia}>Digite para buscar um pedido.</p>
          ) : resultadosBusca.length === 0 ? (
            <p className={styles.mensagemVazia}>Nenhum pedido encontrado para "{termoBusca}".</p>
          ) : (
            <div className={styles.listaResultados}>
              {resultadosBusca.map(ped => (
                <button
                  key={ped.id}
                  className={styles.itemResultado}
                  onClick={() => selecionarPedido(ped.id)}
                >
                  <div>
                    <strong>Pedido #{ped.id}</strong>
                    <span className={styles.resultadoCliente}>
                      <User size={13} /> {ped.cliente}
                    </span>
                  </div>
                  <div className={styles.resultadoDireita}>
                    <span className={styles.resultadoValor}>
                      R$ {Number(ped.valor_total).toFixed(2)}
                    </span>
                    <span className={`${styles.resultadoStatus} ${ped.status === 'Confirmado' ? styles.statusConfirmado : styles.statusPendente}`}>
                      {ped.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : carregandoPedido ? (
        <p className={styles.mensagemVazia}>Carregando itens do pedido...</p>
      ) : (
        <>
          <div className={styles.pedidoInfoCard}>
            <div>
              <span className={styles.pedidoInfoLabel}>Pedido</span>
              <strong>#{pedidoSelecionado.id}</strong>
            </div>
            <div>
              <span className={styles.pedidoInfoLabel}><User size={13} /> Cliente</span>
              <strong>{pedidoSelecionado.cliente}</strong>
            </div>
            <div>
              <span className={styles.pedidoInfoLabel}><Calendar size={13} /> Data</span>
              <strong>{new Date(pedidoSelecionado.criado_em).toLocaleDateString('pt-BR')}</strong>
            </div>
            <div>
              <span className={styles.pedidoInfoLabel}>Status</span>
              <strong>{pedidoSelecionado.status}</strong>
            </div>
            <button className={styles.btnTrocarPedido} onClick={trocarPedido}>
              Trocar pedido
            </button>
          </div>

          <div className={styles.tableCard}>
            <h2><PackageMinus size={18} /> Itens do Pedido</h2>
            <table className={styles.tabela}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Vendido</th>
                  <th>Já devolvido</th>
                  <th>Disponível</th>
                  <th>Qtd. a devolver</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {pedidoSelecionado.itens.map(item => {
                  const disponivel = calcularDisponivel(item);
                  const qtdInformada = Number(quantidades[item.produto_id] || 0);
                  const subtotalItem = qtdInformada * item.preco_venda;

                  return (
                    <tr key={item.produto_id}>
                      <td><strong>{item.produto_nome || `Produto #${item.produto_id}`}</strong></td>
                      <td>{item.quantidade}</td>
                      <td>{item.quantidade_devolvida || 0}</td>
                      <td>
                        {disponivel === 0 ? (
                          <span className={styles.badgeTotal}>Totalmente devolvido</span>
                        ) : (
                          disponivel
                        )}
                      </td>
                      <td>
                        <div className={styles.qtdInputWrapper}>
                          <input
                            type="number"
                            min="0"
                            max={disponivel}
                            disabled={disponivel === 0}
                            value={quantidades[item.produto_id] ?? ''}
                            placeholder="0"
                            onChange={(e) => handleQuantidadeChange(item.produto_id, e.target.value, disponivel)}
                            className={styles.inputQtd}
                          />
                          {disponivel > 0 && (
                            <button
                              type="button"
                              className={styles.btnMax}
                              onClick={() => devolverTudo(item)}
                            >
                              Máx.
                            </button>
                          )}
                        </div>
                      </td>
                      <td><strong>R$ {subtotalItem.toFixed(2)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.footerResumo}>
            <div className={styles.motivoBox}>
              <label><FileText size={14} /> Motivo da devolução (opcional)</label>
              <textarea
                rows={4}
                placeholder="Ex: material sobrou da obra, produto com defeito, etc."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>

            <div className={styles.resumoCard}>
              <h4>Resumo da Devolução</h4>

              {itensParaDevolucao.length === 0 ? (
                <p className={styles.mensagemVazia}>Informe a quantidade dos itens a devolver.</p>
              ) : (
                <div className={styles.resumoLista}>
                  {itensParaDevolucao.map(item => (
                    <div key={item.produto_id} className={styles.resumoItem}>
                      <span>{item.quantidadeDevolver}x {item.produto_nome}</span>
                      <span>R$ {(item.preco_venda * item.quantidadeDevolver).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.resumoDivider}></div>

              <div className={styles.valorTotalFinal}>
                <span>TOTAL A DEVOLVER</span>
                <h2>R$ {valorTotalDevolucao.toFixed(2)}</h2>
              </div>

              <div className={styles.avisoEstoque}>
                <AlertCircle size={14} />
                <span>Os itens devolvidos retornarão automaticamente ao estoque.</span>
              </div>

              <button
                className={styles.btnConfirmar}
                onClick={confirmarDevolucao}
                disabled={enviando || itensParaDevolucao.length === 0}
              >
                <RotateCcw size={18} />
                {enviando ? 'Processando...' : 'Confirmar Devolução'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}