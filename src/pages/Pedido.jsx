import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  ArrowLeft,
  CreditCard,
  User,
  Calendar,
  ShoppingCart,
  Filter
} from 'lucide-react';
import { useTheme } from "../components/Context/ThemeContext";
import { useToast } from "../components/Context/ToastContext";
import { useNotification } from "../components/Context/NotificationContext";
import { useNavigate } from 'react-router-dom';
import { api } from "../services/api.js";
import styles from '../styles/pedido.module.css';

export default function PedidoDetalhe() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { addNotification } = useNotification();

  // produtos
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');

  // carrinho
  const [carrinho, setCarrinho] = useState([]);
  const [cliente, setCliente] = useState('');
  const [dataExpedicao, setDataExpedicao] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formaPagamento, setFormaPagamento] = useState('Cartão de Crédito');
  const [parcelas, setParcelas] = useState(1); // NOVO

  // puxar produtos reais
  useEffect(() => {
    api.get("/produtos")
      .then((resposta) => {
        const produtosFormatados = resposta.data.map(prod => ({
          id: prod.id,
          nome: prod.nome,
          preco: Number(prod.preco_venda),
          categoria: prod.categoria || "Outros",
          estoque: prod.estoque_atual
        }));
        setProdutosDisponiveis(produtosFormatados);
      })
      .catch(() => {
        addToast("Erro ao carregar produtos.", "error");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const adicionarAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(item => item.id === produto.id);
    const qtdAtual = itemExistente ? itemExistente.quantidade : 0;

    if (qtdAtual + 1 > produto.estoque) {
      addToast(`Quantidade indisponível. Estoque atual: ${produto.estoque}`, "error");
      return;
    }

    if (itemExistente) {
      setCarrinho(
        carrinho.map(item =>
          item.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        )
      );
    } else {
      setCarrinho([...carrinho, { ...produto, quantidade: 1 }]);
    }
  };

  const alterarQuantidade = (id, novaQtd, estoqueMax) => {
    const qtd = parseInt(novaQtd) || 1;

    if (qtd < 1) return;

    if (qtd > estoqueMax) {
      addToast(`Você não pode adicionar mais do que o estoque (${estoqueMax}).`, "error");
      return;
    }

    setCarrinho(
      carrinho.map(item =>
        item.id === id ? { ...item, quantidade: qtd } : item
      )
    );
  };

  const removerDoCarrinho = (id) => {
    setCarrinho(carrinho.filter(item => item.id !== id));
  };

  const valorTotalPedido = carrinho.reduce((acc, item) => {
    return acc + (item.preco * item.quantidade);
  }, 0);

  // ==========================================
  // 1. FINALIZAR PEDIDO (SALVANDO NA API NO INVES DE LOCALSTORAGE)
  // ==========================================
  const finalizarPedido = async () => {
    if (!cliente) {
      addToast("Por favor, digite o nome do cliente.", "error");
      return;
    }
    if (carrinho.length === 0) {
      addToast("O carrinho está vazio.", "error");
      return;
    }

    try {
      const novoPedido = {
        cliente: cliente,
        forma_pagamento: formaPagamento,
        parcelas: formaPagamento === 'Cartão de Crédito' ? parcelas : 1, // NOVO
        valor_total: valorTotalPedido,
        status: 'Pendente',
        itens: carrinho.map(item => ({
          produto_id: item.id,
          quantidade: item.quantidade,
          preco_venda: item.preco,
          subtotal: item.preco * item.quantidade
        }))
      };

      // 1. Salva o pedido E o back-end já abate o estoque automaticamente!
      await api.post('/pedidos', novoPedido);

      // APAGUE TODO AQUELE BLOCO DO "Promise.all(... api.patch(...checkout...))"
      // POIS ELE NÃO É MAIS NECESSÁRIO!

      setParcelas(1);

      // 3. Sucesso!
      addToast("Pedido criado com sucesso!", "success");

      addNotification(
        "Novo Pedido Registrado",
        `O pedido de ${cliente} no valor de R$ ${valorTotalPedido.toFixed(2)} foi criado.`,
        "/pedidos"
      );

      // 👇 SEGUNDA NOTIFICAÇÃO (Vai acender a bolinha na aba de Produtos)
      addNotification(
        "Estoque Atualizado",
        `Os produtos do pedido do(a) ${cliente} foram baixados do estoque.`,
        "/produtos"
      );

      navigate('/pedidos');

    } catch (error) {
      // Isso vai capturar a mensagem exata que o Back-end enviou (ex: "Estoque insuficiente")
      const mensagemErro = error.response?.data?.erro || "Erro ao finalizar pedido.";

      addToast(mensagemErro, "error"); // Mostra o erro real na notificação vermelha
      console.error("Detalhes do erro:", error.response?.data || error);
    }
  };

  const produtosFiltrados = produtosDisponiveis.filter(prod => {
    const matchNome = prod.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaFiltro === '' || prod.categoria === categoriaFiltro;
    return matchNome && matchCategoria;
  });

  const handleFormaPagamentoChange = (valor) => {
    setFormaPagamento(valor);
    if (valor !== 'Cartão de Crédito') {
      setParcelas(1); // reseta parcelamento se não for cartão de crédito
    }
  };

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`}>
      <div className={styles.header}>
        <h1>Atendimento ao Vivo</h1>
      </div>

      <div className={styles.painelGeral}>
        {/* produtos */}
        <div className={styles.colunaProdutos}>
          <h2>Buscar Produtos</h2>
          <div className={styles.filtrosBarra}>
            <div className={styles.searchBox}>
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className={styles.filterBox}>
              <Filter size={18} />
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="Mineral">Mineral</option>
                <option value="4564">4564</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div className={styles.gridProdutosCatalogo}>
            {produtosFiltrados.map(prod => (
              <div key={prod.id} className={styles.cardProdutoCatalogo}>
                <div>
                  <h4>{prod.nome}</h4>
                  <p className={styles.meta}>
                    Estoque: {prod.estoque} {" | "} {prod.categoria}
                  </p>
                </div>
                <div className={styles.precoEBotao}>
                  <span>R$ {Number(prod.preco).toFixed(2)}</span>
                  <button
                    onClick={() => adicionarAoCarrinho(prod)}
                    className={styles.btnAdicionar}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* checkout */}
        <div className={styles.colunaCheckout}>
          <h2>
            <ShoppingCart size={18} /> Resumo do Pedido
          </h2>
          <div className={styles.formCliente}>
            <div className={styles.inputGroup}>
              <label>
                <User size={14} /> Cliente
              </label>
              <input
                type="text"
                placeholder="Nome do cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                required
              />
            </div>
            <div className={styles.linhaDuplaForm}>
              <div className={styles.inputGroup}>
                <label>
                  <Calendar size={14} /> Data
                </label>
                <input
                  type="date"
                  value={dataExpedicao}
                  onChange={(e) => setDataExpedicao(e.target.value)}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>
                  <CreditCard size={14} /> Pagamento
                </label>
                <select
                  value={formaPagamento}
                  onChange={(e) => handleFormaPagamentoChange(e.target.value)}
                >
                  <option>Cartão de Crédito</option>
                  <option>Cartão de Débito</option>
                  <option>Pix</option>
                  <option>Dinheiro</option>
                </select>
              </div>
            </div>

            {/* NOVO: só aparece quando for Cartão de Crédito */}
            {formaPagamento === 'Cartão de Crédito' && (
              <div className={styles.inputGroup} style={{ marginTop: '12px' }}>
                <label>
                  <CreditCard size={14} /> Parcelas (sem juros)
                </label>
                <select
                  value={parcelas}
                  onChange={(e) => setParcelas(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num}x de R$ {(valorTotalPedido / num).toFixed(2)}
                      {num === 1 ? ' (à vista)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className={styles.listaCarrinho}>
            <h3>Itens ({carrinho.length})</h3>
            {carrinho.length === 0 ? (
              <p className={styles.carrinhoVazio}>Nenhum item adicionado.</p>
            ) : (
              carrinho.map(item => (
                <div key={item.id} className={styles.itemCarrinhoRow}>
                  <div className={styles.itemCarrinhoInfo}>
                    <strong>{item.nome}</strong>
                    <span>R$ {Number(item.preco).toFixed(2)}</span>
                  </div>
                  <div className={styles.itemCarrinhoAcoes}>
                    <input
                      type="number"
                      value={item.quantidade}
                      onChange={(e) => alterarQuantidade(item.id, e.target.value, item.estoque)}
                      className={styles.inputQtd}
                    />
                    <span className={styles.subtotalItem}>
                      R$ {(item.preco * item.quantidade).toFixed(2)}
                    </span>
                    <button
                      className={styles.btnRemoverItem}
                      onClick={() => removerDoCarrinho(item.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.checkoutFooter}>
            <div className={styles.totalBox}>
              <span>TOTAL</span>
              <h2>R$ {valorTotalPedido.toFixed(2)}</h2>
              {formaPagamento === 'Cartão de Crédito' && parcelas > 1 && (
                <p className={styles.parcelaInfo}>
                  em {parcelas}x de R$ {(valorTotalPedido / parcelas).toFixed(2)}
                </p>
              )}
            </div>
            <button className={styles.btnFinalizar} onClick={finalizarPedido}>
              Finalizar Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}