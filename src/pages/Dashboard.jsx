import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../contexts/authContext.jsx'
import { api } from "../services/api.js";

// --- Bibliotecas Externas ---
import jsPDF from "jspdf";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import {
    LayoutDashboard, Package, Grid, Archive, Users, Settings, FileText,
    Search, Bell, RefreshCw, Download, Plus, Box, AlertCircle, ArrowDownRight,
    ArrowUpRight, TrendingUp, DollarSign, ArrowDownAZ, ArrowUpZA, SortAsc,
    SortDesc, Filter, ChevronLeft, ChevronRight, ChevronDown, Sheet, Star, CheckCircle, XCircle, List
} from 'lucide-react';

// --- Componentes Internos & Contextos ---
import Footer from '../components/footer';
// import TopHeader from '../components/topHeader';
import { useTheme } from '../components/Context/ThemeContext'; // <-- Ajuste o caminho se necessário

// --- Estilos & Dados ---
import styles from '../styles/DashBoard.module.css';
import * as XLSX from 'xlsx';
// import * as mockData from '../data/mockData';

const Dashboard = () => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { usuario, logout } = useAuth();

    function sair() {
        logout();
        navigate("/login")
    }

    // =========================================================================
    // 1. ESTADOS (Controles da Tela)
    // =========================================================================
    // Controles de Busca e Filtro (Agora como ARRAYS para múltiplas escolhas)
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedSuppliers, setSelectedSuppliers] = useState([]);
    const [mostrarEstoqueBaixo, setMostrarEstoqueBaixo] = useState(false);
    const [filtroStatus, setFiltroStatus] = useState('todos');
    // Controles de Abertura dos Menus Customizados
    const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
    const [isSupplierMenuOpen, setIsSupplierMenuOpen] = useState(false);
    // Controle de Ordenação
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    // Controles de Paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 10;
    const [monthlyMovementDataState, setMonthlyMovementDataState] = useState([]);
    const [weeklySalesDataState, setWeeklySalesDataState] = useState([]);
    const [inventoryDataState, setInventoryDataState] = useState([]);
    const [erro, setErro] = useState("");
    const [summaryCardsData, setSummaryCardsData] = useState([]);
    const [categoryDataState, setCategoryDataState] = useState([]);
    const [lowStockAlertsState, setLowStockAlertsState] = useState([]);
    const [produtosData, setProdutosData] = useState([]);

    const [activeSupplierPopover, setActiveSupplierPopover] = useState(null);

    // 1. Crie um novo estado para controlar a direção (começa abrindo para baixo)
    const [popoverDirection, setPopoverDirection] = useState('down');
    const [filterMenuDirection, setFilterMenuDirection] = useState('down');

    const toggleSupplierPopover = (id, event) => {
        if (String(activeSupplierPopover) === String(id)) {
            setActiveSupplierPopover(null);
            return;
        }

        const botaoClicado = event.currentTarget.getBoundingClientRect();
        const espacoDisponivelAbaixo = window.innerHeight - botaoClicado.bottom;

        // CORRIGIDO: o popover pode chegar a ~220px (limite do CSS .dropdownMenu),
        // então precisa de bem mais que 10px de folga pra não cortar
        if (espacoDisponivelAbaixo < 240) {
            setPopoverDirection('up');
        } else {
            setPopoverDirection('down');
        }

        setActiveSupplierPopover(id);
    };

    const toggleTopCategoryMenu = (e) => {
        if (!isCategoryMenuOpen) {
            const botao = e.currentTarget.getBoundingClientRect();
            const espacoDisponivelAbaixo = window.innerHeight - botao.bottom;

            // Se o espaço abaixo for menor que 260px, manda abrir para cima
            setFilterMenuDirection(espacoDisponivelAbaixo < 260 ? 'up' : 'down');
        }
        setIsCategoryMenuOpen(!isCategoryMenuOpen);
        setIsSupplierMenuOpen(false); // Fecha o outro se estiver aberto
    };

    const toggleTopSupplierMenu = (e) => {
        if (!isSupplierMenuOpen) {
            const botao = e.currentTarget.getBoundingClientRect();
            const espacoDisponivelAbaixo = window.innerHeight - botao.bottom;

            // Se o espaço abaixo for menor que 260px, manda abrir para cima
            setFilterMenuDirection(espacoDisponivelAbaixo < 260 ? 'up' : 'down');
        }
        setIsSupplierMenuOpen(!isSupplierMenuOpen);
        setIsCategoryMenuOpen(false); // Fecha o outro se estiver aberto
    };


    // Estados de Dados (Mock)
    // const [summaryCardsData, setSummaryCardsData] = useState(mockData.summaryCards);
    // const [categoryDataState, setCategoryDataState] = useState(mockData.categoryData);
    // const [lowStockAlertsState, setLowStockAlertsState] = useState(mockData.lowStockAlerts);
    // const [inventoryDataState, setInventoryDataState] = useState(mockData.inventoryData);
    // const [weeklySalesDataState, setWeeklySalesDataState] = useState(mockData.weeklySalesData);
    // const [monthlyMovementDataState, setMonthlyMovementDataState] = useState(mockData.monthlyMovementData);

    // Outros Estados e Referências
    const chartsContainerRef = useRef(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // =========================================================================
    // 2. FUNÇÕES AUXILIARES E DE AÇÃO
    // =========================================================================

    const renderIcon = (iconName) => {
        switch (iconName) {
            case 'box': return <Box size={20} color="#6366f1" />;
            case 'alert': return <AlertCircle size={20} color="#ef4444" />;
            case 'in': return <ArrowDownRight size={20} color="#10b981" />;
            case 'out': return <ArrowUpRight size={20} color="#f97316" />;
            case 'sales': return <TrendingUp size={20} color="#3b82f6" />;
            case 'money': return <DollarSign size={20} color="#8b5cf6" />;
            default: return <Box size={20} />;
        }
    };

    // ATUALIZADO: mesma lógica de 5 status do RelatorioCategoria.jsx
    const getStockStatus = (qty, minStock, maxStock) => {
        const atual = Number(qty) || 0;
        const minimo = Number(minStock) || 0;
        const maximo = Number(maxStock) || 0;

        if (atual === 0) {
            return { text: 'Sem estoque', className: styles.semEstoque };
        }
        if (atual < minimo) {
            return { text: 'Baixo estoque', className: styles.lowStock };
        }
        if (maximo > 0 && atual > maximo) {
            return { text: 'Acima da capacidade', className: styles.acimaCapacidade };
        }
        if (maximo > 0 && atual >= maximo * 0.75) {
            return { text: 'Estoque elevado', className: styles.estoqueElevado };
        }
        return { text: 'Em estoque', className: styles.inStock };
    };

    // Função para Limpar todos os filtros de uma vez
    const handleLimparFiltros = () => {
        setSearchTerm('');
        setSelectedCategories([]); // Limpa as categorias
        setSelectedSuppliers([]);  // Limpa os fornecedores
        setSortConfig({ key: null, direction: 'asc' });
        setPaginaAtual(1);
        setIsCategoryMenuOpen(false);
        setIsSupplierMenuOpen(false);
        setMostrarEstoqueBaixo(false);
        setFiltroStatus('todos');
    };

    // Função genérica para adicionar ou remover item das listas de filtro
    const toggleSelection = (setState, item) => {
        setState(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    const carregarDadosDashboard = async () => {
        try {
            const [respostaProdutos, respostaMovimentacoes] = await Promise.all([
                api.get("/produtos"),
                api.get("/produtos/movimentacoes").catch(() => ({ data: [] }))
            ]);

            const itens = respostaProdutos.data || [];

            // NOVO: ordena cronologicamente (a API devolve as mais recentes primeiro) — necessário
            // para os cálculos de saldo líquido (devolução abatendo venda) ficarem corretos
            const movimentacoes = (respostaMovimentacoes.data || []).slice().sort(
                (a, b) => new Date(String(a.criado_em).replace(' ', 'T')) - new Date(String(b.criado_em).replace(' ', 'T'))
            );

            setProdutosData(itens);

            // Auxiliar para extrair o ID do documento/pedido com segurança
            const getDocId = (mov) => {
                const doc = mov.numero_documento ?? mov.documento ?? mov.pedido_id ?? mov.id_pedido;
                return doc !== null && doc !== undefined && doc !== '' ? String(doc).trim() : null;
            };

            // 1. Mapeia os IDs de todos os pedidos cancelados (trata variações de tipo e casing)
            const pedidosCanceladosIds = new Set(
                movimentacoes
                    .filter(mov => {
                        const tipo = String(mov.tipo || '').trim().toLowerCase();
                        return tipo === 'estorno venda' || tipo === 'estorno' || tipo === 'cancelamento';
                    })
                    .map(getDocId)
                    .filter(Boolean)
            );

            const inventory = itens.map(item => {
                const catName = item.categoria_nome ? String(item.categoria_nome).trim() : "Sem categoria";
                const supName = item.fornecedor_nome ? String(item.fornecedor_nome).trim() : "Sem fornecedor";

                return {
                    id: item.id,
                    product: item.nome,
                    category: catName,
                    sku: item.sku || "N/A",
                    qty: Number(item.estoque_atual) || 0,
                    supplier: supName,
                    price: `R$ ${Number(item.preco_venda || 0).toFixed(2)}`,
                    maxStock: Number(item.estoque_maximo) || 0, // antes eta 100
                    minStock: Number(item.estoque_minimo) || 0,
                    fornecedores: item.fornecedores || [],
                    ativo: Number(item.produto_ativo) !== 0
                };
            });

            setInventoryDataState(inventory);

            // =========================================================
            // SUMMARY CARDS
            // =========================================================
            const totalProdutos = itens.length;
            const estoqueBaixo = itens.filter(item => Number(item.estoque_atual || 0) < Number(item.estoque_minimo || 0)).length;
            const totalEstoque = itens.reduce((acc, item) => acc + Number(item.estoque_atual || 0), 0);
            const valorTotal = itens.reduce(
                (acc, item) => acc + (Number(item.estoque_atual || 0) * Number(item.preco_custo || 0)),
                0
            );
            const valorTotalFormatado = new Intl.NumberFormat('pt-BR', {
                style: 'currency', currency: 'BRL'
            }).format(valorTotal);

            // Entradas: APENAS movimentações manuais/compras (tipo 'Entrada')
            const totalEntradas = movimentacoes
                .filter(mov => String(mov.tipo || '').trim().toLowerCase() === 'entrada')
                .reduce((acc, mov) => acc + Number(mov.quantidade || 0), 0);

            // Saídas: Saídas manuais + Vendas de pedidos que NÃO foram cancelados
            // const totalSaidas = movimentacoes
            const totalSaidasBruto = movimentacoes
                .filter(mov => {
                    const tipo = String(mov.tipo || '').trim().toLowerCase();
                    if (tipo === 'saida') return true;
                    if (tipo === 'venda') {
                        const docId = getDocId(mov);
                        return !docId || !pedidosCanceladosIds.has(docId);
                    }
                    return false;
                })
                .reduce((acc, mov) => acc + Number(mov.quantidade || 0), 0);

            const totalDevolvido = movimentacoes
                .filter(mov => {
                    if (String(mov.tipo || '').trim().toLowerCase() !== 'devolução') return false;
                    const docId = getDocId(mov);
                    return !docId || !pedidosCanceladosIds.has(docId);
                })
                .reduce((acc, mov) => acc + Number(mov.quantidade || 0), 0);

            const totalSaidas = Math.max(0, totalSaidasBruto - totalDevolvido);

            setSummaryCardsData([
                { id: 1, title: "Produtos", value: totalProdutos, icon: "box", change: "", changeType: "positive", subtitle: "Produtos cadastrados" },
                { id: 2, title: "Estoque Baixo", value: estoqueBaixo, icon: "alert", change: "", changeType: "negative", subtitle: "Itens Abaixo do mínimo" },
                { id: 3, title: "Total em Estoque", value: totalEstoque, icon: "in", change: "", changeType: "positive", subtitle: "Quantidade total" },
                { id: 4, title: "Entradas", value: totalEntradas, icon: "in", change: "", changeType: "positive", subtitle: "Total de entradas registradas" },
                { id: 5, title: "Saídas", value: totalSaidas, icon: "out", change: "", changeType: "negative", subtitle: "Total de saídas registradas" },
                { id: 6, title: "Valor Total", value: valorTotalFormatado, icon: "money", change: "", changeType: "positive", subtitle: "Valor do estoque" }
            ]);

            // =========================================================
            // CATEGORIAS & ALERTAS
            // =========================================================
            const categoriasAgrupadas = {};
            itens.forEach(item => {
                const categoria = item.categoria_nome || "Sem categoria";
                categoriasAgrupadas[categoria] = (categoriasAgrupadas[categoria] || 0) + 1;
            });
            const cores = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6", "#ef4444", "#14b8a6"];
            const categoriasFormatadas = Object.entries(categoriasAgrupadas).map(([name, value], index) => ({
                name, value, color: cores[index % cores.length]
            }));
            setCategoryDataState(categoriasFormatadas);

            const alertas = itens
                .filter(item => Number(item.estoque_atual || 0) < Number(item.estoque_minimo || 0))
                .map(item => ({
                    product: item.nome,
                    current: Number(item.estoque_atual) || 0,
                    max: Number(item.estoque_maximo) || 100,
                    min: Number(item.estoque_minimo) || 0
                }));
            setLowStockAlertsState(alertas);

            // =========================================================
            // MOVIMENTAÇÃO MENSAL
            // =========================================================
            const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            const movimentacaoMensalData = meses.map(mes => ({ name: mes, Entradas: 0, Saidas: 0, Vendas: 0 }));

            movimentacoes.forEach(mov => {
                if (!mov.criado_em) return;
                const dataMov = new Date(String(mov.criado_em).replace(' ', 'T'));
                if (isNaN(dataMov.getTime())) return;

                const mesIndex = dataMov.getMonth();
                const tipo = String(mov.tipo || '').trim().toLowerCase();
                const docId = getDocId(mov);

                if (tipo === 'entrada') {
                    movimentacaoMensalData[mesIndex].Entradas += Number(mov.quantidade || 0);
                } else if (tipo === 'saida') {
                    movimentacaoMensalData[mesIndex].Saidas += Number(mov.quantidade || 0);
                } else if (tipo === 'venda') {
                    // Contabiliza APENAS vendas de pedidos ativos
                    if (!docId || !pedidosCanceladosIds.has(docId)) {
                        movimentacaoMensalData[mesIndex].Vendas += Number(mov.quantidade || 0);
                    }
                }
                else if (tipo === 'devolução') {
                    if (!docId || !pedidosCanceladosIds.has(docId)) {
                        movimentacaoMensalData[mesIndex].Vendas = Math.max(0, movimentacaoMensalData[mesIndex].Vendas - Number(mov.quantidade || 0));
                    }
                }
            });
            setMonthlyMovementDataState(movimentacaoMensalData);

            // =========================================================
            // VENDAS DA SEMANA
            // =========================================================
            const diasSemanaData = [
                { name: "Seg", Vendas: 0, SaidasManuais: 0 }, { name: "Ter", Vendas: 0, SaidasManuais: 0 },
                { name: "Qua", Vendas: 0, SaidasManuais: 0 }, { name: "Qui", Vendas: 0, SaidasManuais: 0 },
                { name: "Sex", Vendas: 0, SaidasManuais: 0 }, { name: "Sáb", Vendas: 0, SaidasManuais: 0 },
                { name: "Dom", Vendas: 0, SaidasManuais: 0 }
            ];

            const mapaDias = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

            const hoje = new Date();
            const diaAtual = hoje.getDay();
            const diffParaSegunda = diaAtual === 0 ? 6 : diaAtual - 1;

            const inicioDaSemana = new Date(hoje);
            inicioDaSemana.setDate(hoje.getDate() - diffParaSegunda);
            inicioDaSemana.setHours(0, 0, 0, 0);

            const fimDaSemana = new Date(inicioDaSemana);
            fimDaSemana.setDate(inicioDaSemana.getDate() + 6);
            fimDaSemana.setHours(23, 59, 59, 999);

            movimentacoes.forEach(mov => {
                if (!mov.criado_em) return;
                const tipo = String(mov.tipo || '').trim().toLowerCase();

                if (tipo === 'venda' || tipo === 'saida' || tipo === 'devolução') {
                    const dataMov = new Date(String(mov.criado_em).replace(' ', 'T'));
                    if (isNaN(dataMov.getTime())) return;

                    if (dataMov >= inicioDaSemana && dataMov <= fimDaSemana) {
                        const indiceArray = mapaDias[dataMov.getDay()];

                        if (indiceArray !== undefined) {
                            if (tipo === 'venda') {
                                const docId = getDocId(mov);
                                // Só soma no gráfico semanal se o pedido NÃO foi cancelado
                                if (!docId || !pedidosCanceladosIds.has(docId)) {
                                    diasSemanaData[indiceArray].Vendas += Number(mov.quantidade || 0);
                                }
                            } else if (tipo === 'saida') {
                                diasSemanaData[indiceArray].SaidasManuais += Number(mov.quantidade || 0);
                            }
                            else if (tipo === 'devolução') {
                                const docId = getDocId(mov);
                                if (!docId || !pedidosCanceladosIds.has(docId)) {
                                    diasSemanaData[indiceArray].Vendas = Math.max(0, diasSemanaData[indiceArray].Vendas - Number(mov.quantidade || 0));
                                }
                            }

                        }
                    }
                }
            });

            setWeeklySalesDataState(diasSemanaData);

        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
            setErro("Erro ao carregar dashboard.");
        }
    };

    useEffect(() => {
        carregarDadosDashboard();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);

        await carregarDadosDashboard();

        setTimeout(() => {
            setIsRefreshing(false);
        }, 500);
    };

    // =========================================================================
    // 3. LÓGICA DE FILTRAGEM E PAGINAÇÃO (Múltiplas escolhas)
    // =========================================================================



    // Extrair categorias únicas (Ignoramos o "Todas" pois array vazio já significa Todas)
    const categories = useMemo(() => {
        const uniqueCategories = Array.from(
            new Set(inventoryDataState.map(item => item.category))
        );
        return uniqueCategories.sort();
    }, [inventoryDataState]);

    const opcoesFornecedoresFiltro = useMemo(() => {
        const mapaFornecedores = new Set();

        inventoryDataState.forEach(item => {
            if (item.fornecedores && item.fornecedores.length > 0) {
                item.fornecedores.forEach(f => {
                    // Garante compatibilidade se 'f' for um objeto {nome: '...'} ou uma string direta
                    const nome = typeof f === 'object' ? f.nome : f;
                    if (nome) mapaFornecedores.add(String(nome).trim());
                });
            }
        });

        // Transforma em Array, ordena de A-Z e coloca o "Sem fornecedor" como primeira opção
        const listaOrdenada = Array.from(mapaFornecedores).sort((a, b) => a.localeCompare(b));
        return ["Sem fornecedor", ...listaOrdenada];
    }, [inventoryDataState]);

    const filteredAndSortedData = useMemo(() => {
        console.log("Filtro Status está como:", filtroStatus);
        // let processedData = inventoryDataState.filter(row => row.qty < 40);
        let processedData = [...inventoryDataState];

        // 1. Filtro de Texto
        if (searchTerm.trim() !== '') {
            const lowerSearch = searchTerm.toLowerCase();
            processedData = processedData.filter(item =>
                item.product.toLowerCase().includes(lowerSearch) ||
                item.sku.toLowerCase().includes(lowerSearch)
            );
        }

        // 2. Filtro de Categorias (Aceita MÚLTIPLAS ao mesmo tempo)
        if (selectedCategories.length > 0) {
            processedData = processedData.filter(item => selectedCategories.includes(item.category));
        }

        // =========================================================
        // Filtro de Fornecedores Atualizado
        // =========================================================
        if (selectedSuppliers.length > 0) {
            processedData = processedData.filter(item => {
                const temFornecedores = item.fornecedores && item.fornecedores.length > 0;

                // Se o usuário filtrou por "Sem fornecedor" e o produto realmente não tem nenhum
                if (selectedSuppliers.includes("Sem fornecedor") && !temFornecedores) {
                    return true;
                }

                // Se o produto tem fornecedores, verifica se algum deles foi selecionado no filtro
                if (temFornecedores) {
                    return item.fornecedores.some(f => {
                        const nomeFornecedor = typeof f === 'object' ? f.nome : f;
                        return selectedSuppliers.some(sel =>
                            String(nomeFornecedor).toLowerCase().includes(sel.toLowerCase())
                        );
                    });
                }

                return false;
            });
        }

        if (filtroStatus !== 'todos') {
            processedData = processedData.filter(item => {
                if (filtroStatus === 'ativos') return item.ativo === true;
                if (filtroStatus === 'inativos') return item.ativo === false;
                return true;
            });
        }

        // 4. Ordenação
        if (sortConfig.key) {
            processedData.sort((a, b) => {
                if (sortConfig.key === 'name') {
                    return sortConfig.direction === 'asc'
                        ? a.product.localeCompare(b.product)
                        : b.product.localeCompare(a.product);
                }
                if (sortConfig.key === 'stock') {
                    return sortConfig.direction === 'asc'
                        ? a.qty - b.qty
                        : b.qty - a.qty;
                }
                // ---- LÓGICA DE RELEVÂNCIA ----
                if (sortConfig.key === 'relevance') {
                    // Usamos || a.qty para evitar erro matemático (divisão por zero) 
                    // caso algum item venha sem a propriedade maxStock no mockData
                    const maxA = a.maxStock || a.qty || 1;
                    const maxB = b.maxStock || b.qty || 1;

                    const relevanciaA = (maxA - a.qty) / maxA;
                    const relevanciaB = (maxB - b.qty) / maxB;

                    // Diferente do nome/estoque, a relevância geralmente queremos ver a MAIOR primeiro (desc)
                    return sortConfig.direction === 'desc'
                        ? relevanciaB - relevanciaA
                        : relevanciaA - relevanciaB;
                }
                return 0;
            });
        }

        // 5. Filtro de Estoque Baixo
        if (mostrarEstoqueBaixo) {
            processedData = processedData.filter(
                item => item.qty < item.minStock
            );
        }

        return processedData;
    }, [searchTerm, selectedCategories, mostrarEstoqueBaixo, selectedSuppliers, sortConfig, inventoryDataState, filtroStatus]);

    const totalPaginas = Math.ceil(filteredAndSortedData.length / itensPorPagina);
    const indiceInicial = (paginaAtual - 1) * itensPorPagina;
    const itensExibidosNaTela = filteredAndSortedData.slice(indiceInicial, indiceInicial + itensPorPagina);

    useEffect(() => {
        setPaginaAtual(1);
    }, [searchTerm, selectedCategories, mostrarEstoqueBaixo, selectedSuppliers, sortConfig, inventoryDataState, filtroStatus]);

    const handleSortName = () => {
        setSortConfig(prev => ({
            key: 'name',
            direction: prev.key === 'name' && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleSortStock = () => {
        setSortConfig(prev => ({
            key: 'stock',
            direction: prev.key === 'stock' && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Função para alternar o status do filtro
    const handleToggleFiltroStatus = () => {
        if (filtroStatus === 'todos') setFiltroStatus('ativos');
        else if (filtroStatus === 'ativos') setFiltroStatus('inativos');
        else setFiltroStatus('todos');
    };

    // Função auxiliar para renderizar ícone e texto dinamicamente no botão
    const getBotaoFiltroStatus = () => {
        switch (filtroStatus) {
            case 'ativos':
                return { icone: <CheckCircle size={16} />, texto: 'Ativos' };
            case 'inativos':
                return { icone: <XCircle size={16} />, texto: 'Inativos' };
            default:
                return { icone: <List size={16} />, texto: 'Status' };
        }
    };
    const statusContent = getBotaoFiltroStatus();

    const handleSortRelevance = () => {
        setSortConfig(prev => ({
            key: 'relevance',
            // Para relevância, o padrão mais lógico é começar do Maior (desc) para o Menor
            direction: prev.key === 'relevance' && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleChartClick = (entry) => {
        if (!entry || !entry.name) return;

        // Aproveitamos a sua função toggleSelection que já existe!
        // Se clicar, ele adiciona ou remove a categoria do filtro da tabela
        toggleSelection(setSelectedCategories, entry.name);

        // Opcional: Rolar a página para baixo até a tabela
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    // =========================================================================
    // 4. EXPORTAÇÃO DE PDF E ESTILOS GERAIS
    // =========================================================================

    const exportToPDF = async () => {
        const input = chartsContainerRef.current;
        if (!input) return;

        // ========================= FORÇAR TEMA CLARO =========================
        const appContainer = input.closest(`.${styles.appContainer}`);
        const isCurrentlyDark = appContainer && appContainer.classList.contains(styles.darkDashboard);

        if (isCurrentlyDark) {
            appContainer.classList.remove(styles.darkDashboard);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;

        // ========================= HEADER =========================
        doc.setFillColor(30, 43, 60);
        doc.rect(0, 0, pageWidth, 30, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("ConstruStock", margin, 15);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        const currentDate = new Date().toLocaleDateString("pt-BR");
        doc.text("Relatório Geral de Estoque e Desempenho", margin, 22);
        doc.text(`Gerado em: ${currentDate}`, pageWidth - 50, 22);

        // ========================= PREPARAÇÃO =========================
        const originalOverflow = input.style.overflow;
        const originalHeight = input.style.height;
        const originalWidth = input.style.width;

        input.style.overflow = "visible";
        input.style.height = "auto";

        const animatedElements = input.querySelectorAll('*');
        animatedElements.forEach(el => {
            el.style.animation = 'none';
            el.style.transition = 'none';
            el.style.transform = 'none';
        });

        const svgs = input.querySelectorAll("svg");
        const originalSvgStyles = [];

        svgs.forEach(svg => {
            const rect = svg.getBoundingClientRect();
            originalSvgStyles.push({
                width: svg.style.width,
                height: svg.style.height
            });
            svg.style.width = `${rect.width}px`;
            svg.style.height = `${rect.height}px`;
        });

        try {
            await new Promise(resolve => setTimeout(resolve, 400));

            // ========================= CAPTURA =========================
            const canvas = await html2canvas(input, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                scrollX: 0,
                scrollY: -window.scrollY
            });

            const imgData = canvas.toDataURL('image/png');
            const maxWidth = pageWidth - (margin * 2);
            const maxHeight = pageHeight - 45;
            const ratio = canvas.width / canvas.height;

            let imgWidth = maxWidth;
            let imgHeight = imgWidth / ratio;

            if (imgHeight > maxHeight) {
                const resizeRatio = maxHeight / imgHeight;
                imgHeight *= resizeRatio;
                imgWidth *= resizeRatio;
            }

            const xPosition = (pageWidth - imgWidth) / 2;

            doc.addImage(imgData, 'PNG', xPosition, 35, imgWidth, imgHeight);

            // ========================= NOVA PÁGINA (TABELA) =========================
            doc.addPage();
            doc.setTextColor(30, 43, 60);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("Produtos com Estoque Baixo", margin, 20);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("Listagem detalhada dos itens (Ordem Alfabética).", margin, 27);

            // ========================= TABELA (COM ORDENAÇÃO) =========================
            const tableColumn = ["Produto", "Categoria", "SKU", "Quantidade", "Fornecedor", "Status", "Preço"];

            // 1. Criar cópia e ordenar alfabeticamente pelo nome do produto
            const dadosOrdenados = [...filteredAndSortedData].sort((a, b) =>
                a.product.localeCompare(b.product)
            );

            // 2. Mapear os dados ordenados
            const tableRows = dadosOrdenados.map(item => {
                // const statusText = item.qty >= 40 ? 'Em Estoque' : 'Estoque Baixo';
                const statusText = item.qty >= item.minStock ? 'Em Estoque' : 'Estoque Baixo';
                return [item.product, item.category, item.sku, item.qty.toString(), item.supplier, statusText, item.price];
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 35,
                theme: 'striped',
                headStyles: { fillColor: [30, 43, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 9, cellPadding: 4 },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 5) {
                        if (data.cell.raw === 'Estoque Baixo') {
                            data.cell.styles.textColor = [239, 68, 68];
                        } else {
                            data.cell.styles.textColor = [16, 185, 129];
                        }
                    }
                }
            });

            // ========================= DOWNLOAD =========================
            doc.save(`ConstruStock_Relatorio_${currentDate.replace(/\//g, '-')}.pdf`);

        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
        } finally {
            input.style.overflow = originalOverflow;
            input.style.height = originalHeight;
            input.style.width = originalWidth;

            animatedElements.forEach(el => {
                el.style.animation = '';
                el.style.transition = '';
                el.style.transform = '';
            });

            svgs.forEach((svg, index) => {
                svg.style.width = originalSvgStyles[index].width;
                svg.style.height = originalSvgStyles[index].height;
            });

            if (isCurrentlyDark) {
                appContainer.classList.add(styles.darkDashboard);
            }
        }
    };

    const renderCustomLegend = (props) => {
        const { payload } = props;
        return (
            <ul style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '4px 4px',
                padding: '0',
                margin: '20px 0 0 0',
                listStyle: 'none',
                justifyItems: 'start'
            }}>
                {payload.map((entry, index) => (
                    <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                        <span style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: entry.color,
                            borderRadius: '3px',
                            display: 'inline-block',
                            flexShrink: 0
                        }}></span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                            {entry.value}
                        </span>
                    </li>
                ))}
            </ul>
        );
    };

    const isDarkMode = theme === 'dark';

    const themeStyles = {
        bgDropdown: isDarkMode ? '#1e293b' : '#ffffff',
        border: isDarkMode ? '#334155' : '#e2e8f0',
        textMain: isDarkMode ? '#f8fafc' : '#334155',
        textMuted: isDarkMode ? '#94a3b8' : '#64748b',
        inputBg: isDarkMode ? '#0f172a' : '#ffffff',
        btnActiveBg: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
        btnActiveBorder: isDarkMode ? '#3b82f6' : '#bfdbfe',
        btnActiveText: isDarkMode ? '#60a5fa' : '#1d4ed8',
        btnInactiveBg: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
        btnInactiveText: isDarkMode ? 'rgba(255, 255, 255, 0.75)' : '#6e7a8b',
        iconBg: isDarkMode ? '#334155' : '#f1f5f9',
    };

    // Encontre onde suas variáveis estão e adicione isso:
    const totalCategoria = categoryDataState.reduce((acc, item) => acc + item.value, 0);

    // Cole logo no início do seu componente:
    const [exibirModalExport, setExibirModalExport] = useState(false);
    const containerExportRef = useRef(null);

    // Fechar o modal ao clicar fora dele
    useEffect(() => {
        const clickFora = (e) => {
            if (containerExportRef.current && !containerExportRef.current.contains(e.target)) {
                setExibirModalExport(false);
            }
        };
        document.addEventListener('mousedown', clickFora);
        return () => document.removeEventListener('mousedown', clickFora);
    }, []);

    const BotaoExportar = ({ dadosParaExportar }) => {
        // Estado para controlar a abertura do modal
        const [modalAberto, setModalAberto] = useState(false);

        // Referência para detectar cliques fora do componente
        const containerRef = useRef(null);

        // Efeito para fechar o modal ao clicar fora dele
        useEffect(() => {
            const lidarComCliqueFora = (event) => {
                if (containerRef.current && !containerRef.current.contains(event.target)) {
                    setModalAberto(false);
                }
            };

            document.addEventListener('mousedown', lidarComCliqueFora);
            return () => {
                document.removeEventListener('mousedown', lidarComCliqueFora);
            };
        }, []);

        // Função do PDF (Substitua pela sua função já criada)
        const exportarPDF = () => {
            console.log('Executando a função de PDF...');
            // suaFuncaoDePdf();
            setModalAberto(false);
        };

        // Função do Excel
        const exportarExcel = () => {
            if (!dadosParaExportar || dadosParaExportar.length === 0) {
                alert("Não há dados para exportar.");
                return;
            }

            // 1. Cria a planilha com os dados recebidos via props
            const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);

            // 2. Cria o arquivo (Workbook) e adiciona a planilha
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio");

            // 3. Faz o download do arquivo
            XLSX.writeFile(workbook, "Relatorio_Exportado.xlsx");

            // 4. Fecha o modal
            setModalAberto(false);
        };

        return (
            <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>

                {/* Botão Principal */}
                <button
                    onClick={() => setModalAberto(!modalAberto)}
                    style={{
                        padding: '10px 20px',
                        cursor: 'pointer',
                        width: '180px', // Largura do botão
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                    }}
                >
                    Exportar Dados
                </button>

                {/* Modal Dropdown */}
                {modalAberto && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: '100%', // Assume a mesma largura do container (180px)
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: '4px' // Um pequeno respiro entre o botão e o modal
                    }}>

                        <button
                            onClick={exportarPDF}
                            style={{
                                padding: '10px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                borderBottom: '1px solid #eee'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            📄 Exportar em PDF
                        </button>

                        <button
                            onClick={exportarExcel}
                            style={{
                                padding: '10px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                cursor: 'pointer'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            📊 Exportar em Excel
                        </button>

                    </div>
                )}
            </div>
        );
    };

    // ========================= EXPORTAR PARA EXCEL (COM ID, CORES E TODOS OS ITENS) =========================
    const exportToExcel = async () => {
        if (!inventoryDataState || inventoryDataState.length === 0) {
            alert("Não há dados para exportar.");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Estoque_Geral');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 8 },
            { header: 'Produto', key: 'Produto', width: 35 },
            { header: 'Categoria', key: 'Categoria', width: 20 },
            { header: 'SKU', key: 'SKU', width: 15 },
            { header: 'Quantidade', key: 'Quantidade', width: 12 },
            { header: 'Fornecedor', key: 'Fornecedor', width: 20 },
            { header: 'Status', key: 'Status', width: 15 },
            { header: 'Preço', key: 'Preço', width: 15 }
        ];

        // 1. Criar cópia e ordenar alfabeticamente pelo nome do produto
        const dadosOrdenados = [...inventoryDataState].sort((a, b) =>
            a.product.localeCompare(b.product)
        );

        // 2. Usar o array "dadosOrdenados" no lugar do "inventoryDataState"
        const dadosFormatados = dadosOrdenados.map(item => ({
            id: item.id,
            Produto: item.product,
            Categoria: item.category,
            SKU: item.sku,
            Quantidade: item.qty,
            Fornecedor: item.supplier,
            // Status: item.qty >= 40 ? 'Em Estoque' : 'Estoque Baixo',
            Status: item.qty >= item.minStock ? 'Em Estoque' : 'Estoque Baixo',
            Preço: item.price
        }));

        worksheet.addRows(dadosFormatados);

        // 3. ESTILIZAÇÃO DO CABEÇALHO
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '1A365D' }
            };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // 4. ESTILIZAÇÃO DAS LINHAS E CORES DE STATUS
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.eachCell((cell, colNumber) => {
                    cell.alignment = { vertical: 'middle' };

                    if (colNumber === 7) {
                        if (cell.value === 'Estoque Baixo') {
                            cell.font = { color: { argb: 'FFDC2626' }, bold: true };
                        } else if (cell.value === 'Em Estoque') {
                            cell.font = { color: { argb: 'FF059669' }, bold: true };
                        }
                    }

                    if (colNumber === 1) {
                        cell.alignment = { horizontal: 'center' };
                    }
                });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const dataHoje = new Date().toLocaleDateString("pt-BR").replace(/\//g, '-');
        saveAs(blob, `Relatorio_Estoque_${dataHoje}.xlsx`);

        // Fechar modal caso exista a função
        if (typeof setExibirModalExport === 'function') {
            setExibirModalExport(false);
        }
    };



    // ========================================================================================================================================================================
    // 5. RENDERIZAÇÃO DA INTERFACE
    // ========================================================================================================================================================================

    return (
        <div className={`${styles.appContainer} ${theme === 'dark' ? styles.darkDashboard : ''}`}>


            {/* MAIN CONTENT */}
            <main className={styles.mainContent}>
                {
                    erro && (
                        <p style={{ color: 'red' }}>{erro}</p>
                    )
                }
                {/* <TopHeader /> */}

                <div className={`
          ${styles.dashboardBody}
          ${styles.pageEnter}
          ${isRefreshing ? styles.refreshAnimation : ''}
        `}>

                    <div className={styles.pageTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1>Dashboard</h1>
                            <p>Visão geral do estoque e movimentações</p>
                        </div>
                        <div className={styles.headerActions}>
                            <button
                                className={styles.btnOutline}
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                            >
                                <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
                                {isRefreshing ? 'Atualizando...' : 'Atualizar'}
                            </button>

                            {/* ========================================================= */}
                            {/* NOVO CONTAINER DE EXPORTAR COM MODAL */}
                            {/* ========================================================= */}
                            <div ref={containerExportRef} style={{ position: 'relative', display: 'inline-block' }}>

                                {/* O SEU BOTÃO ORIGINAL ADAPTADO PARA ABRIR O MODAL */}
                                <button
                                    className={styles.btnOutline}
                                    onClick={() => setExibirModalExport(!exibirModalExport)}
                                    style={{ width: '100%' }} // Garante que o botão dita a largura total do container
                                >
                                    <Download size={16} /> Exportar
                                </button>

                                {exibirModalExport && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 8px)',
                                        left: 0,
                                        right: 0,
                                        width: '100%',
                                        backgroundColor: theme === 'dark' ? '#1E2B3C' : '#FFFFFF',
                                        border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                                        borderRadius: '8px',
                                        boxShadow: theme === 'dark' ? '0 10px 15px -3px rgba(0, 0, 0, 0.5)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                        zIndex: 50,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        padding: '4px',
                                        overflow: 'hidden'
                                    }}>

                                        {/* OPÇÃO PDF */}
                                        <button
                                            onClick={exportToPDF}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: '8px',
                                                cursor: 'pointer',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                color: theme === 'dark' ? '#D1D5DB' : '#374151',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                width: '100%',
                                                borderRadius: '6px',
                                                transition: 'all 0.2s ease-in-out'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(249, 115, 22, 0.1)' : '#fff7ed';
                                                e.currentTarget.style.color = '#ea580c';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = theme === 'dark' ? '#D1D5DB' : '#374151';
                                            }}
                                        >
                                            {/* O tamanho é passado direto para o componente do ícone */}
                                            <FileText size={16} /> PDF
                                        </button>

                                        {/* LINHA DIVISÓRIA SUTIL */}
                                        <div style={{
                                            height: '1px',
                                            backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                                            width: '100%',
                                            margin: '2px 0'
                                        }}></div>

                                        {/* OPÇÃO EXCEL */}
                                        <button
                                            onClick={exportToExcel}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: '8px',
                                                cursor: 'pointer',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                color: theme === 'dark' ? '#D1D5DB' : '#374151',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                width: '100%',
                                                borderRadius: '6px',
                                                transition: 'all 0.2s ease-in-out'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(249, 115, 22, 0.1)' : '#fff7ed';
                                                e.currentTarget.style.color = '#ea580c';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = theme === 'dark' ? '#D1D5DB' : '#374151';
                                            }}
                                        >
                                            {/* O tamanho é passado direto para o componente do ícone */}
                                            <Sheet size={16} /> Excel
                                        </button>

                                    </div>
                                )}
                            </div>
                            {/* ========================================================= */}

                            <button className={styles.btnPrimary}>
                                <a href="/produtos/cadastrar"><Plus size={16} /> Novo Produto </a>
                            </button>
                        </div>
                    </div>

                    <div ref={chartsContainerRef} className={isRefreshing ? styles.refreshing : ''}>
                        <div className={styles.statsGrid}>
                            {summaryCardsData.map((card) => (
                                <div className={styles.statCard} key={card.id}>
                                    <div className={styles.statCardHeader}>
                                        <span>{card.title}</span>
                                        <div className={styles.iconWrapper}>{renderIcon(card.icon)}</div>
                                    </div>
                                    <div className={styles.statValue}>{card.value}</div>

                                    <div className={styles.statFooter}>
                                        <span
                                            className={
                                                card.changeType === 'positive'
                                                    ? styles.textPositive
                                                    : styles.textNegative
                                            }
                                        >
                                            {card.change}
                                        </span>

                                        <span className={styles.textMuted}>
                                            {card.subtitle}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.chartsGrid}>
                            <div className={styles.chartCard}>
                                <h3 className={styles.chartTitle}>Movimentação Mensal de Estoque</h3>
                                <div className={styles.chartWrapper}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={monthlyMovementDataState}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <RechartsTooltip
                                                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                                                contentStyle={{
                                                    backgroundColor: '#1e293b',
                                                    border: '1px solid #334155',
                                                    borderRadius: '8px',
                                                    color: '#fff'
                                                }}
                                                itemStyle={{ color: '#fff' }}
                                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                            />
                                            {/* 👇 AS 3 LINHAS DO GRÁFICO 👇 */}
                                            <Area type="monotone" dataKey="Entradas" name="Entradas" stroke="#10b981" fillOpacity={0.1} fill="#10b981" isAnimationActive={false} />
                                            <Area type="monotone" dataKey="Saidas" name="Saídas" stroke="#f97316" fillOpacity={0.1} fill="#f97316" isAnimationActive={false} />
                                            <Area type="monotone" dataKey="Vendas" name="Vendas" stroke="#3b82f6" fillOpacity={0.1} fill="#3b82f6" isAnimationActive={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className={styles.chartCard}>
                                <h3 className={styles.chartTitle}>Produtos por Categoria</h3>
                                <div className={styles.chartWrapper}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryDataState}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                isAnimationActive={false}
                                                onClick={handleChartClick}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {categoryDataState.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.color}
                                                        // Opcional: Deixar a fatia meio transparente se ela não estiver selecionada
                                                        opacity={selectedCategories.length === 0 || selectedCategories.includes(entry.name) ? 1 : 0.3}
                                                    />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                                                itemStyle={{ color: '#f8fafc' }}
                                                formatter={(value, name) => {
                                                    // Calcula a porcentagem e deixa com 1 casa decimal (ex: 25.5%)
                                                    const porcentagem = ((value / totalCategoria) * 100).toFixed(1);

                                                    // Retorna o valor original e a porcentagem do lado
                                                    return [`${value} (${porcentagem}%)`, name];
                                                }}
                                            />
                                            <Legend content={renderCustomLegend} verticalAlign="bottom" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className={styles.chartsGrid}>
                            <div className={styles.chartCard}>
                                <h3 className={styles.chartTitle}>Vendas da Semana</h3>
                                <div className={styles.chartWrapper}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={weeklySalesDataState} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#718096' }} dy={10} angle={-45} textAnchor="end" height={60} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <RechartsTooltip
                                                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                                                contentStyle={{
                                                    backgroundColor: '#1e293b',
                                                    border: '1px solid #334155',
                                                    borderRadius: '8px',
                                                    color: '#fff'
                                                }}
                                                itemStyle={{ color: '#fff' }}
                                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                            />
                                            {/* 👇 AQUI ESTÃO AS DUAS BARRAS 👇 */}
                                            <Bar dataKey="Vendas" name="Vendas (Pedidos)" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={50} isAnimationActive={false} />
                                            <Bar dataKey="SaidasManuais" name="Saídas (Ajustes/Perdas)" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={50} isAnimationActive={false} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className={styles.chartCard} style={{ display: 'flex', flexDirection: 'column' }}>
                                <h3 className={styles.chartTitle} style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={18} /> Alertas de Estoque Baixo
                                </h3>
                                <div className={styles.alertScrollArea}>
                                    {lowStockAlertsState.length > 0 ? (
                                        lowStockAlertsState.map((alert, index) => (
                                            <div key={index} className={styles.alertBox}>
                                                <div className={styles.alertItem}>
                                                    <span>{alert.product}</span>
                                                    {/* Trocamos a exibição para mostrar o Atual vs Mínimo */}
                                                    <span className={styles.textMuted}>
                                                        Atual: {alert.current} | Mín: {alert.min}
                                                    </span>
                                                </div>
                                                <div className={styles.progressBarBg}>
                                                    {/* A barra de progresso continua usando o max para dar a noção do tamanho do tanque */}
                                                    <div
                                                        className={styles.progressBarFill}
                                                        style={{ width: `${(alert.current / alert.max) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        // Mensagem extra caso não tenha nenhum item com estoque baixo
                                        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '20px' }}>
                                            Todos os itens estão acima do estoque mínimo! 🎉
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* INVENTORY TABLE */}
                    {/* ========================================================= */}
                    <div className={styles.tableContainer} data-card="tabela">
                        <h3 className={styles.chartTitleTable}>Tabela de Produtos</h3>
                        <div className={styles.tableHeader}>

                            {/* Controles de Filtro e Ordenação */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>

                                {/* Multi-select de Categorias */}
                                <div style={{ position: 'relative' }}>
                                    <button
                                        className={`${styles.btnOutline} ${selectedCategories.length > 0 ? styles.btnActive : ''}`}
                                        onClick={(e) => {
                                            if (!isCategoryMenuOpen) {
                                                const botaoRect = e.currentTarget.getBoundingClientRect();

                                                // 🎯 AGORA SIM: Busca o card grande correto pelo atributo data-card
                                                const cardPai = e.currentTarget.closest('[data-card="tabela"]');

                                                if (cardPai) {
                                                    const cardRect = cardPai.getBoundingClientRect();
                                                    const espacoDisponivelNoCard = cardRect.bottom - botaoRect.bottom;

                                                    // Se o espaço dentro do card for menor que 280px, abre para cima
                                                    setFilterMenuDirection(espacoDisponivelNoCard < 280 ? 'up' : 'down');
                                                } else {
                                                    const espacoTela = window.innerHeight - botaoRect.bottom;
                                                    setFilterMenuDirection(espacoTela < 280 ? 'up' : 'down');
                                                }
                                            }
                                            setIsCategoryMenuOpen(!isCategoryMenuOpen);
                                            setIsSupplierMenuOpen(false);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        Categorias {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                                        <ChevronDown size={16} />
                                    </button>

                                    {isCategoryMenuOpen && (
                                        <div
                                            className={styles.dropdownMenu}
                                        // style={{
                                        //     position: 'absolute',
                                        //     top: filterMenuDirection === 'down' ? 'calc(100% + 5px)' : 'auto',
                                        //     bottom: filterMenuDirection === 'up' ? 'calc(100% + 5px)' : 'auto',
                                        //     left: 0,
                                        //     zIndex: 100,
                                        //     minWidth: '220px',
                                        //     maxHeight: '234px',
                                        //     overflowY: 'auto',
                                        //     padding: '6px',
                                        //     display: 'block',
                                        //     boxSizing: 'border-box'
                                        // }}
                                        >
                                            {categories.map(category => (
                                                <label key={category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', margin: '2px 0', cursor: 'pointer', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
                                                    <span style={{ fontSize: '14px', color: themeStyles.textMain, textAlign: 'left', paddingRight: '12px' }}>{category}</span>
                                                    <input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleSelection(setSelectedCategories, category)} style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }} />
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Multi-select de Fornecedores */}
                                <div style={{ position: 'relative' }}>
                                    <button
                                        className={`${styles.btnOutline} ${selectedSuppliers.length > 0 ? styles.btnActive : ''}`}
                                        onClick={(e) => {
                                            if (!isSupplierMenuOpen) {
                                                const botaoRect = e.currentTarget.getBoundingClientRect();

                                                // 🎯 AGORA SIM: Busca o card grande correto pelo atributo data-card
                                                const cardPai = e.currentTarget.closest('[data-card="tabela"]');

                                                if (cardPai) {
                                                    const cardRect = cardPai.getBoundingClientRect();
                                                    const espacoDisponivelNoCard = cardRect.bottom - botaoRect.bottom;

                                                    setFilterMenuDirection(espacoDisponivelNoCard < 280 ? 'up' : 'down');
                                                } else {
                                                    const espacoTela = window.innerHeight - botaoRect.bottom;
                                                    setFilterMenuDirection(espacoTela < 280 ? 'up' : 'down');
                                                }
                                            }
                                            setIsSupplierMenuOpen(!isSupplierMenuOpen);
                                            setIsCategoryMenuOpen(false);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        Fornecedores {selectedSuppliers.length > 0 && `(${selectedSuppliers.length})`}
                                        <ChevronDown size={16} />
                                    </button>

                                    {isSupplierMenuOpen && (
                                        <div
                                            className={styles.dropdownMenu}
                                        // style={{
                                        //     position: 'absolute',
                                        //     top: filterMenuDirection === 'down' ? 'calc(100% + 5px)' : 'auto',
                                        //     bottom: filterMenuDirection === 'up' ? 'calc(100% + 5px)' : 'auto',
                                        //     left: 0,
                                        //     zIndex: 100,
                                        //     minWidth: '220px',
                                        //     maxHeight: '234px',
                                        //     overflowY: 'auto',
                                        //     padding: '6px',
                                        //     display: 'block',
                                        //     boxSizing: 'border-box'
                                        // }}
                                        >
                                            {opcoesFornecedoresFiltro.map((sup) => (
                                                <label key={sup} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', margin: '2px 0', cursor: 'pointer', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
                                                    <span style={{ fontSize: '14px', color: themeStyles.textMain, textAlign: 'left', paddingRight: '12px' }}>{sup}</span>
                                                    <input type="checkbox" checked={selectedSuppliers.includes(sup)} onChange={() => toggleSelection(setSelectedSuppliers, sup)} style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }} />
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Campo de Busca */}
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} color={theme.textMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        className={styles.searchInput}
                                        placeholder="Pesquisar produto ou SKU..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ paddingLeft: '32px' }}
                                    />
                                </div>

                                <button
                                    className={`${styles.btnOutline} ${filtroStatus !== 'todos' ? styles.btnSortActive : ''}`}
                                    onClick={handleToggleFiltroStatus}
                                    title="Filtrar por Status do Produto"
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {statusContent.icone}
                                    <span>{statusContent.texto}</span>
                                </button>

                                <button
                                    className={`${styles.btnOutline} ${mostrarEstoqueBaixo ? styles.btnSortActive : ''}`}
                                    onClick={() => setMostrarEstoqueBaixo(!mostrarEstoqueBaixo)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <Filter size={16} />
                                    Estoque Baixo
                                </button>

                                {/* Botões de Ordenação */}
                                <button
                                    className={`${styles.btnOutline} ${sortConfig.key === 'name' ? styles.btnSortActive : ''}`}
                                    onClick={handleSortName}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {sortConfig.key === 'name' && sortConfig.direction === 'desc' ? (
                                        <><ArrowUpZA size={16} /> Z-A</>
                                    ) : (
                                        <><ArrowDownAZ size={16} /> A-Z</>
                                    )}
                                </button>

                                <button
                                    className={`${styles.btnOutline} ${sortConfig.key === 'stock' ? styles.btnSortActive : ''}`}
                                    onClick={handleSortStock}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {sortConfig.key === 'stock' && sortConfig.direction === 'desc' ? (
                                        <><SortDesc size={16} /> Maior Estoque</>
                                    ) : (
                                        <><SortAsc size={16} /> Menor Estoque</>
                                    )}
                                </button>

                                {/* Botão Limpar Filtros */}
                                {(searchTerm !== '' ||
                                    selectedCategories.length > 0 ||
                                    selectedSuppliers.length > 0 ||
                                    mostrarEstoqueBaixo ||
                                    filtroStatus !== 'todos' ||
                                    sortConfig.key !== null) && (
                                        <button
                                            className={styles.btnOutline}
                                            onClick={handleLimparFiltros}
                                            style={{ color: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 0, 0, 0.035)' }}
                                        >
                                            <Filter size={16} /> Limpar
                                        </button>
                                    )}
                            </div>
                        </div>

                        {/* Renderização da Tabela */}
                        {itensExibidosNaTela.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ color: themeStyles.textMuted }}>Produto</th>
                                        <th style={{ color: themeStyles.textMuted }}>Categoria</th>
                                        <th style={{ color: themeStyles.textMuted }}>SKU</th>
                                        <th style={{ color: themeStyles.textMuted }}>Quantidade</th>
                                        <th style={{ color: themeStyles.textMuted }}>Fornecedores</th> {/* <- COLUNA DE VOLTA */}
                                        <th style={{ color: themeStyles.textMuted }}>Status</th>
                                        <th style={{ color: themeStyles.textMuted }}>Preço</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itensExibidosNaTela.map((row) => {
                                        // 1. Extrai os nomes dos fornecedores do array de objetos que vem da sua API
                                        const listaFornecedores = row.fornecedores?.map(f => f.nome) || [];

                                        {/* Log temporário para debugar */ }
                                        {
                                            (() => {
                                                // console.log("2. Verificando Popover -> Ativo:", activeSupplierPopover, "| ID da Linha:", row.id, "| Bateu?:", String(activeSupplierPopover) === String(row.id));
                                                return null;
                                            })()
                                        }

                                        {/* Seu Popover Flutuante original */ }
                                        {
                                            String(activeSupplierPopover) === String(row.id) && (
                                                <div className={styles.dropdownMenu}>
                                                    {/* conteúdo */}
                                                </div>
                                            )
                                        }

                                        return (
                                            <tr key={row.id} className={styles.tableRow}>
                                                <td>{row.product}</td>
                                                <td>{row.category}</td>
                                                <td>{row.sku}</td>
                                                <td>{row.qty}</td>

                                                {/* CÉLULA DE FORNECEDORES COM POPOVER FLUTUANTE */}
                                                <td style={{ position: 'relative' }}>
                                                    {listaFornecedores.length === 0 ? (
                                                        <span style={{ color: themeStyles.textMuted, fontSize: '13px' }}>Sem fornecedor</span>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className={styles.btnOutline}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleSupplierPopover(row.id, e);
                                                                }}
                                                                style={{
                                                                    padding: '4px 8px',
                                                                    fontSize: '12px',
                                                                    cursor: 'pointer',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: 'transparent',
                                                                    border: `1px solid ${themeStyles.border}`,
                                                                    color: themeStyles.textMain
                                                                }}
                                                            >
                                                                Mostrar ({listaFornecedores.length})
                                                            </button>

                                                            {String(activeSupplierPopover) === String(row.id) && (
                                                                <div className={`${styles.dropdownMenu} ${popoverDirection === 'up' ? styles.dropUp : ''}`}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        left: 0,
                                                                        zIndex: 100,
                                                                        minWidth: '180px',
                                                                        padding: '10px',
                                                                        backgroundColor: themeStyles.bgDropdown,
                                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                                        borderRadius: '6px',
                                                                        cursor: 'default'
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: `1px solid ${themeStyles.border}`, paddingBottom: '6px' }}>
                                                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: themeStyles.textMuted }}>Fornecedores</span>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveSupplierPopover(null);
                                                                            }}
                                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '120px', overflowY: 'auto' }}>
                                                                        {listaFornecedores.map((sup, idx) => (
                                                                            <li key={idx} style={{ fontSize: '13px', color: themeStyles.textMain, padding: '4px 0' }}>
                                                                                {sup}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </td>

                                                <td>
                                                    <span className={getStockStatus(row.qty, row.minStock, row.maxStock).className}>
                                                        {getStockStatus(row.qty, row.minStock, row.maxStock).text}
                                                    </span>
                                                </td>
                                                <td>{row.price}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: themeStyles.textMuted }}>
                                Nenhum produto encontrado com os filtros selecionados.
                            </div>
                        )}

                        {/* CONTROLES DE PAGINAÇÃO */}
                        {totalPaginas > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '20px 0', borderTop: `1px solid ${themeStyles.border}` }}>
                                <button
                                    className={styles.btnOutline}
                                    onClick={() => setPaginaAtual(paginaAtual - 1)}
                                    disabled={paginaAtual === 1}
                                    style={{ opacity: paginaAtual === 1 ? 0.5 : 1, cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <ChevronLeft size={16} /> Anterior
                                </button>
                                <span style={{ fontSize: '14px', color: themeStyles.textMuted }}>
                                    Página <strong style={{ color: themeStyles.textMain }}>{paginaAtual}</strong> de <strong style={{ color: themeStyles.textMain }}>{totalPaginas}</strong>
                                </span>
                                <button
                                    className={styles.btnOutline}
                                    onClick={() => setPaginaAtual(paginaAtual + 1)}
                                    disabled={paginaAtual === totalPaginas}
                                    style={{ opacity: paginaAtual === totalPaginas ? 0.5 : 1, cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    Próxima <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    <Footer />
                </div>
            </main>
        </div>
    );
};

export default Dashboard;