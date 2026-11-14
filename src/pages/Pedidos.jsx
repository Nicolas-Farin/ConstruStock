import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  FileText,
  Filter,
  Undo2
} from 'lucide-react';

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { useTheme } from "../components/Context/ThemeContext";
import { api } from "../services/api.js";
import { useToast } from '../components/Context/ToastContext';
import { useNotification } from "../components/Context/NotificationContext.jsx";

import styles from '../styles/pedidos.module.css';

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const { theme } = useTheme();
  const { addToast } = useToast();
  const { addNotification } = useNotification();
  const [periodoSelecionado, setPeriodoSelecionado] = useState('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaProduto, setBuscaProduto] = useState(''); // Opcional: dependerá se a API retornar os itens listados

  const [modalConfirmacao, setModalConfirmacao] = useState({
    isOpen: false,
    pedido: null
  });

  // 👇 ADICIONE ESTES DOIS NOVOS ESTADOS AQUI 👇
  const [modalAprovacao, setModalAprovacao] = useState({
    isOpen: false,
    pedido: null
  });

  const [statusFiltro, setStatusFiltro] = useState('todos'); // Pode ser: 'todos', 'Pendente' ou 'Confirmado'

  // ==========================================
  // 1. BUSCAR PEDIDOS DA API (SUBSTITUI LOCALSTORAGE)
  // ==========================================
  const carregarPedidos = async () => {
    try {
      const response = await api.get('/pedidos');
      setPedidos(response.data);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      addToast("Erro ao carregar o histórico de pedidos.", "error");
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  // ==========================================
  // 2. EXPORTAR NOTA FISCAL
  // ==========================================
  const exportarNotaFiscal = async (id) => {
    try {
      // Busca os detalhes completos do pedido na API (incluindo os itens)
      const res = await api.get(`/pedidos/${id}`);
      const pedidoDetalhado = res.data;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [220, 80]
      });

      const largura = 80;

      doc.setFont("courier", "bold");
      doc.setFontSize(14);
      doc.text("CONSTRUSTOCK", largura / 2, 12, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont("courier", "normal");
      doc.text("CNPJ: 12.345./0001-27", largura / 2, 18, { align: 'center' });
      doc.text("Av. Industrial, 1500", largura / 2, 22, { align: 'center' });
      doc.text("São Paulo - SP", largura / 2, 26, { align: 'center' });

      doc.line(5, 30, 75, 30);

      const dataCriacao = new Date(pedidoDetalhado.criado_em);

      doc.text(`Pedido: #${pedidoDetalhado.id}`, 5, 36);
      doc.text(`Cliente: ${pedidoDetalhado.cliente}`, 5, 41);
      doc.text(dataCriacao.toLocaleDateString('pt-BR'), 5, 46);
      doc.text(dataCriacao.toLocaleTimeString('pt-BR'), 55, 46);
      doc.text(`Pagamento: ${pedidoDetalhado.forma_pagamento}`, 5, 51);

      let yBase;
      if (pedidoDetalhado.parcelas > 1) {
        const valorParcela = pedidoDetalhado.valor_total / pedidoDetalhado.parcelas;
        doc.text(`Parcelado em: ${pedidoDetalhado.parcelas}x de R$ ${valorParcela.toFixed(2)}`, 5, 56);
        doc.line(5, 60, 75, 60);
        yBase = 66;
      } else {
        doc.line(5, 55, 75, 55);
        yBase = 61;
      }

      let y = yBase;


      // Loop nos itens vindos do banco de dados
      if (pedidoDetalhado.itens) {
        pedidoDetalhado.itens.forEach((item) => {
          doc.setFont("courier", "bold");
          doc.text(item.produto_nome || `Produto #${item.produto_id}`, 5, y);
          y += 4;
          doc.setFont("courier", "normal");
          doc.text(`${item.quantidade} x R$ ${Number(item.preco_venda).toFixed(2)}`, 5, y);
          doc.text(`R$ ${Number(item.subtotal).toFixed(2)}`, 55, y);
          y += 6;
        });
      }

      doc.line(5, y, 75, y);
      y += 8;

      doc.setFont("courier", "bold");
      doc.setFontSize(11);
      doc.text(`TOTAL: R$ ${Number(pedidoDetalhado.valor_total).toFixed(2)}`, largura / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(8);
      doc.setFont("courier", "normal");
      doc.text("Obrigado pela preferencia!", largura / 2, y, { align: 'center' });
      y += 5;
      doc.text("Documento auxiliar", largura / 2, y, { align: 'center' });

      doc.save(`NF_${pedidoDetalhado.id}.pdf`);
    } catch (error) {
      console.error(error);
      addToast("Erro ao gerar nota fiscal.", "error");
    }
  };

  const handleReverterClick = (pedido) => {
    setModalConfirmacao({ isOpen: true, pedido });
  };

  const fecharModalConfirmacao = () => {
    setModalConfirmacao({ isOpen: false, pedido: null });
  };

  // ==========================================
  // 3. EXECUTAR REVERSÃO NA NOVA API
  // ==========================================
  const executarReversao = async () => {
    const pedidoParaReverter = modalConfirmacao.pedido;
    if (!pedidoParaReverter) return;

    try {
      // Faz apenas UMA chamada para a rota transacional que criamos
      await api.patch(`/pedidos/${pedidoParaReverter.id}/cancelar`);

      addToast("Pedido revertido e estoque restaurado com sucesso!", "success");
      addNotification("Estoque Restaurado", `O pedido #${pedidoParaReverter.id} foi revertido.`, "/pedidos");

      // Atualiza a lista buscando do banco novamente
      carregarPedidos();

    } catch (error) {
      addToast(error.response?.data?.erro || "Erro ao tentar restaurar o estoque.", "error");
      console.error(error);
    } finally {
      fecharModalConfirmacao();
    }
  };

  // ==========================================
  // 4. CONFIRMAR PEDIDO
  // ==========================================
  const confirmarPedido = async (id) => {
    try {
      await api.patch(`/pedidos/${id}/confirmar`); // Chama a rota no back-end
      addToast("Pedido confirmado com sucesso!", "success");

      // Atualiza a lista na tela para o status mudar para 'Confirmado'
      carregarPedidos();
    } catch (error) {
      console.error(error);
      addToast("Erro ao confirmar o pedido.", "error");
    }
  };

  const handleConfirmarClick = (pedido) => {
    setModalAprovacao({ isOpen: true, pedido });
  };

  const fecharModalAprovacao = () => {
    setModalAprovacao({ isOpen: false, pedido: null });
  };

  const executarConfirmacao = async () => {
    const pedidoParaConfirmar = modalAprovacao.pedido;
    if (!pedidoParaConfirmar) return;

    try {
      await api.patch(`/pedidos/${pedidoParaConfirmar.id}/confirmar`);

      addToast("Pedido confirmado com sucesso!", "success");
      addNotification(
        "Pedido Confirmado",
        `O pedido #${pedidoParaConfirmar.id} foi confirmado e a NF já pode ser emitida.`,
        "/pedidos"
      );

      carregarPedidos();
    } catch (error) {
      console.error(error);
      addToast("Erro ao confirmar o pedido.", "error");
    } finally {
      fecharModalAprovacao();
    }
  };

  // ==========================================
  // FILTROS DE DATA E BUSCA
  // ==========================================
  const pedidosFiltrados = pedidos.filter(pedido => {
    // 1. Busca por nome do cliente
    const matchCliente = pedido.cliente?.toLowerCase().includes(buscaCliente.toLowerCase());

    // 2. Ajuste de Data (Extrai apenas o YYYY-MM-DD do banco de dados)
    const dataAjustada = pedido.criado_em ? pedido.criado_em.split(' ')[0] : '';

    // Pega a data atual do sistema para os cálculos
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const diaAtual = String(hoje.getDate()).padStart(2, '0');
    const dataHojeStr = `${anoAtual}-${mesAtual}-${diaAtual}`;

    let matchData = true;

    if (periodoSelecionado === 'dia') {
      matchData = dataAjustada === dataHojeStr;

    } else if (periodoSelecionado === 'semana') {
      // Pega a data de 7 dias atrás
      const dataSeteDiasAtras = new Date();
      dataSeteDiasAtras.setDate(hoje.getDate() - 7);

      // Converte a data do pedido para comparar
      const dataPedido = new Date(dataAjustada);
      matchData = dataPedido >= dataSeteDiasAtras && dataPedido <= hoje;

    } else if (periodoSelecionado === 'mes') {
      // Verifica se a data começa com o "Ano-Mês" atual (ex: 2026-07)
      matchData = dataAjustada.startsWith(`${anoAtual}-${mesAtual}`);

    } else if (periodoSelecionado === 'ano') {
      // Verifica se a data começa com o "Ano" atual (ex: 2026)
      matchData = dataAjustada.startsWith(`${anoAtual}`);

    } else if (periodoSelecionado === 'personalizado' && dataInicio && dataFim) {
      matchData = (dataAjustada >= dataInicio && dataAjustada <= dataFim);
    }

    return matchCliente && matchData;
  });

  // ==========================================
  // DIVISÃO DAS LISTAS (PENDENTES E CONFIRMADOS)
  // ==========================================
  const pedidosPendentes = pedidosFiltrados.filter(p => p.status === 'Pendente');
  const pedidosConfirmados = pedidosFiltrados.filter(p => p.status === 'Confirmado');

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`}>
      <div className={styles.header}>
        <div>
          <h1>Histórico de Pedidos</h1>
          <p>Consulte vendas realizadas</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={styles.devolucaobtn}
            onClick={() => window.location.href = '/pedidos/devolucao'}
          >
            <Undo2 size={18} />
            Registrar Devolução
          </button>
          <button
            className={styles.btnNovoPedido}
            onClick={() => window.location.href = '/pedidos/pedido'}
          >
            <Plus size={18} />
            Adicionar Pedido
          </button>
        </div>
      </div>

      <div className={styles.painelFiltros}>
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

        <div className={styles.linhaBuscaTextual}>
          <div className={styles.inputBuscaIcon}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ==================== LISTA DE PENDENTES ==================== */}
      <h2
        style={{ fontSize: '18px', marginBottom: '15px', marginTop: '20px' }}
        className={styles.titulo}>
        Pedidos Pendentes ({pedidosPendentes.length})
      </h2>
      <div className={styles.tableCard}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Pagamento</th>
              <th>Total</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pedidosPendentes.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                  Nenhum pedido pendente encontrado.
                </td>
              </tr>
            ) : (
              pedidosPendentes.map(ped => (
                <tr key={ped.id}>
                  <td><span className={styles.idBadge}>#{ped.id}</span></td>
                  <td>{new Date(ped.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td><strong>{ped.cliente}</strong></td>
                  <td>
                    {ped.forma_pagamento}
                    {ped.parcelas > 1 && (
                      <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '4px' }}>
                        ({ped.parcelas}x)
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={styles.valorTotalFila}>
                      R$ {Number(ped.valor_total).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                      backgroundColor: '#f8d7da', color: '#721c24'
                    }}>
                      {ped.status}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className={styles.btnNf}
                      style={{ backgroundColor: '#28a745', color: '#fff', borderColor: '#28a745' }}
                      onClick={() => handleConfirmarClick(ped)}
                    >
                      Confirmar
                    </button>
                    <button className={styles.btnNf} onClick={() => handleReverterClick(ped)}>
                      Cancelar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== LISTA DE CONFIRMADOS ==================== */}
      <h2
        style={{ fontSize: '18px', marginBottom: '15px', marginTop: '30px' }}
        className={styles.titulo}>
        Pedidos Confirmados ({pedidosConfirmados.length})
      </h2>
      <div className={styles.tableCard}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Pagamento</th>
              <th>Total</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pedidosConfirmados.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                  Nenhum pedido confirmado encontrado.
                </td>
              </tr>
            ) : (
              pedidosConfirmados.map(ped => (
                <tr key={ped.id}>
                  <td><span className={styles.idBadge}>#{ped.id}</span></td>
                  <td>{new Date(ped.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td><strong>{ped.cliente}</strong></td>
                  <td>
                    {ped.forma_pagamento}
                    {ped.parcelas > 1 && (
                      <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '4px' }}>
                        ({ped.parcelas}x)
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={styles.valorTotalFila}>
                      R$ {Number(ped.valor_total).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                      backgroundColor: '#d4edda', color: '#155724'
                    }}>
                      {ped.status}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button className={styles.btnNf} onClick={() => exportarNotaFiscal(ped.id)}>
                      <FileText size={14} /> NF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalConfirmacao.isOpen && (
        <div className={styles.modalOverlayConfirm} onClick={fecharModalConfirmacao}>
          <div className={styles.modalContentConfirm} onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar Reversão</h3>
            <p>
              Tem certeza de que deseja Cancelar o pedido <strong>#{modalConfirmacao.pedido?.id}</strong>?
              Os produtos retornarão ao estoque e esta ação não poderá ser desfeita.
            </p>
            <div className={styles.modalActionsConfirm}>
              <button className={styles.btnCancelConfirm} onClick={fecharModalConfirmacao}>
                Cancelar
              </button>
              <button className={styles.btnDeleteConfirm} onClick={executarReversao}>
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👇 NOVO MODAL DE CONFIRMAÇÃO DE PEDIDO 👇 */}
      {modalAprovacao.isOpen && (
        <div className={styles.modalOverlayConfirm} onClick={fecharModalAprovacao}>
          <div className={styles.modalContentConfirm} onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar Pedido</h3>
            <p>
              Tem certeza de que deseja confirmar o pedido <strong>#{modalAprovacao.pedido?.id}</strong>?
              Após a confirmação, o pedido não poderá ser revertido e a Nota Fiscal será liberada.
            </p>
            <div className={styles.modalActionsConfirm}>
              <button className={styles.btnCancelConfirm} onClick={fecharModalAprovacao}>
                Cancelar
              </button>
              <button
                className={styles.btnDeleteConfirm}
                style={{ backgroundColor: '#28a745' }} // Tinta o botão de verde ao invés de vermelho
                onClick={executarConfirmacao}
              >
                Sim, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 👆 ------------------------------------ 👆 */}

    </div>
  );
}