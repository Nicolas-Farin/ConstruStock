// RelatorioCategoria.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react'; // adicionado useRef
import { useParams, useNavigate } from 'react-router-dom';
import { api } from "../services/api.js";
import { useTheme } from "../components/Context/ThemeContext.jsx"
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import {
    ChevronLeft,
    Download,
    Printer,
    FileText,
    FileSpreadsheet, // NOVO: ícone do Excel
    Plus, // NOVO: ícone do botão Novo Produto
    Package,
    TrendingUp,
    DollarSign,
    AlertCircle,
    Search,
    Filter,
    Calendar,
    ArrowDownAZ,
    ArrowUpZA,
    ArrowDownWideNarrow,
    ArrowUpWideNarrow,
    Boxes,
    PackageX,
    ChevronRight
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

import styles from '../styles/RelatorioCategoria.module.css';

// Função para renderizar o Status na Tabela
// Determina o status textual de um produto com base em min/max/atual
const obterStatusEstoqueTexto = (item) => {
    const atual = Number(item.estoque_atual) || 0;
    const minimo = Number(item.estoque_minimo) || 0;
    const maximo = Number(item.estoque_maximo) || 0;

    if (atual === 0) return 'Sem estoque';
    if (atual < minimo) return 'Baixo estoque';
    if (maximo > 0 && atual > maximo) return 'Acima da capacidade';
    if (maximo > 0 && atual >= maximo * 0.75) return 'Estoque elevado';
    return 'Em estoque';
};

const BADGE_CLASSE_POR_STATUS = {
    'Sem estoque': 'statusSemEstoque',
    'Baixo estoque': 'statusBaixoEstoque',
    'Acima da capacidade': 'statusAcimaCapacidade',
    'Estoque elevado': 'statusEstoqueElevado',
    'Em estoque': 'statusEmEstoque',
};

// Renderiza o badge visual na tabela
const renderizarStatus = (item) => {
    const texto = obterStatusEstoqueTexto(item);
    return (
        <span className={`${styles.statusBadge} ${styles[BADGE_CLASSE_POR_STATUS[texto]]}`}>
            {texto}
        </span>
    );
};

// Junta fornecedor principal + histórico de movimentações, sem duplicar nomes
const obterFornecedoresTexto = (item) => {
    const nomes = [];
    if (item.fornecedor_nome) nomes.push(item.fornecedor_nome);
    if (Array.isArray(item.fornecedores)) {
        item.fornecedores.forEach(f => {
            if (f?.nome && !nomes.includes(f.nome)) nomes.push(f.nome);
        });
    }
    return nomes.length > 0 ? nomes.join(', ') : 'N/A';
};

const RelatorioCategoria = () => {
    const { idCategoria } = useParams();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    const [itensCategoria, setItensCategoria] = useState([]);
    const [termoBusca, setTermoBusca] = useState('');
    const [mostrarBaixoEstoque, setMostrarBaixoEstoque] = useState(false);
    const [mostrarSemEstoque, setMostrarSemEstoque] = useState(false);
    const [paginaAtual, setPaginaAtual] = useState(1);

    const itensPorPagina = 10;

    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: 'asc'
    });
    const [carregando, setCarregando] = useState(true);
    const [categoriaInfo, setCategoriaInfo] = useState(null);

    // NOVO: controle do dropdown de exportação
    const [menuExportarAberto, setMenuExportarAberto] = useState(false);
    const exportarRef = useRef(null);

    // NOVO: força os gráficos a remontar (e remedir) antes de imprimir
    const [printKey, setPrintKey] = useState(0);

    useEffect(() => {
        function handleBeforePrint() {
            setPrintKey(prev => prev + 1);
        }
        window.addEventListener('beforeprint', handleBeforePrint);
        return () => window.removeEventListener('beforeprint', handleBeforePrint);
    }, []);

    useEffect(() => {
        function handleClickFora(event) {
            if (exportarRef.current && !exportarRef.current.contains(event.target)) {
                setMenuExportarAberto(false);
            }
        }
        document.addEventListener('mousedown', handleClickFora);
        return () => document.removeEventListener('mousedown', handleClickFora);
    }, []);

    useEffect(() => {
        async function carregarCategoria() {
            try {
                const response = await api.get("/produtos/categorias");
                const categoriaEncontrada = response.data.find(
                    cat => Number(cat.id) === Number(idCategoria)
                );
                setCategoriaInfo(categoriaEncontrada);
            } catch (error) {
                console.log(error);
            }
        }
        carregarCategoria();
    }, [idCategoria]);

    useEffect(() => {
        async function carregarProdutosCategoria() {
            try {
                const resposta = await api.get(
                    `/produtos/categorias/${idCategoria}/produtos`
                );
                setItensCategoria(resposta.data);
            } catch (error) {
                console.error("Erro ao carregar itens da categoria:", error);
            } finally {
                setCarregando(false);
            }
        }
        carregarProdutosCategoria();
    }, [idCategoria]);

    useEffect(() => {
        setPaginaAtual(1);
    }, [
        termoBusca,
        mostrarBaixoEstoque,
        mostrarSemEstoque,
        sortConfig
    ]);

    function handleSortNome() {
        setSortConfig((prev) => ({
            key: 'nome',
            direction: prev.key === 'nome' && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }

    function handleSortEstoque() {
        setSortConfig((prev) => ({
            key: 'estoque',
            direction: prev.key === 'estoque' && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }

    // Cálculos para os Cards de Resumo
    const resumo = useMemo(() => {
        const totalProdutos = itensCategoria.length;
        const qtdeEstoque = itensCategoria.reduce((acc, item) => acc + Number(item.estoque_atual || 0), 0);
        const valorInventario = itensCategoria.reduce((acc, item) => acc + (Number(item.estoque_atual || 0) * Number(item.preco_venda || 0)), 0);

        const produtoMaisVendido = itensCategoria.length > 0
            ? [...itensCategoria].sort((a, b) => b.estoque_atual - a.estoque_atual)[0].nome
            : "N/A";

        return { totalProdutos, qtdeEstoque, valorInventario, produtoMaisVendido };
    }, [itensCategoria]);

    // Classifica cada produto em UM único status, relativo ao mínimo/máximo dele mesmo
    const statusEstoqueDetalhado = useMemo(() => {
        const semEstoque = [];
        const baixoEstoque = [];
        const acimaCapacidade = [];
        const estoqueElevado = [];
        const saudavel = [];

        itensCategoria.forEach(item => {
            const atual = Number(item.estoque_atual) || 0;
            const minimo = Number(item.estoque_minimo) || 0;
            const maximo = Number(item.estoque_maximo) || 0;

            if (atual === 0) {
                semEstoque.push(item);
            } else if (atual < minimo) {
                baixoEstoque.push(item);
            } else if (maximo > 0 && atual > maximo) {
                acimaCapacidade.push(item);
            } else if (maximo > 0 && atual >= maximo * 0.75) {
                estoqueElevado.push(item);
            } else {
                saudavel.push(item);
            }
        });

        return { semEstoque, baixoEstoque, acimaCapacidade, estoqueElevado, saudavel };
    }, [itensCategoria]);

    // Margem de lucro média da categoria (ignora produtos sem preço de custo definido)
    const margemMedia = useMemo(() => {
        const margens = itensCategoria
            .map(i => {
                const custo = Number(i.preco_custo) || 0;
                const venda = Number(i.preco_venda) || 0;
                return custo > 0 ? ((venda - custo) / custo) * 100 : null;
            })
            .filter(m => m !== null);

        if (margens.length === 0) return 0;
        return margens.reduce((acc, m) => acc + m, 0) / margens.length;
    }, [itensCategoria]);

    // Produtos sendo vendidos abaixo do preço de custo
    const produtosComPrejuizo = useMemo(() => {
        return itensCategoria.filter(
            i => Number(i.preco_custo) > 0 && Number(i.preco_venda) < Number(i.preco_custo)
        ).length;
    }, [itensCategoria]);

    // 1. AJUSTADO: Mapeando os 3 dados dinamicamente por produto
    const dadosGraficoBarras = useMemo(() => {
        return [...itensCategoria]
            .sort((a, b) => b.estoque_atual - a.estoque_atual)
            .slice(0, 6)
            .map(item => ({
                name: item.nome.length > 12 ? item.nome.substring(0, 12) + '...' : item.nome,
                "Entradas": Number(item.entradas || 0),
                "Quantidade": Number(item.estoque_atual || 0),
                "Saídas": Number(item.saidas || 0)
            }));
    }, [itensCategoria]);

    const CORES = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6'];
    const dadosPizza = useMemo(() => {
        return itensCategoria.slice(0, 4).map((item, index) => ({
            name: item.nome,
            value: Number(item.estoque_atual || 0),
            color: CORES[index % CORES.length]
        }));
    }, [itensCategoria]);

    // Função de filtro para a Tabela
    const itensFiltradosTabela = [...itensCategoria]
        .filter(item => {
            const busca = (item.nome || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
                (item.sku || '').toLowerCase().includes(termoBusca.toLowerCase());

            const baixoEstoque =
                !mostrarBaixoEstoque ||
                Number(item.estoque_atual) < Number(item.estoque_minimo);
            const semEstoque = !mostrarSemEstoque || Number(item.estoque_atual) === 0;

            return busca && baixoEstoque && semEstoque;
        })
        .sort((a, b) => {
            if (sortConfig.key === 'nome') {
                return sortConfig.direction === 'asc'
                    ? a.nome.localeCompare(b.nome)
                    : b.nome.localeCompare(a.nome);
            }
            if (sortConfig.key === 'estoque') {
                return sortConfig.direction === 'asc'
                    ? a.estoque_atual - b.estoque_atual
                    : b.estoque_atual - a.estoque_atual;
            }
            return 0;
        });

    // ATUALIZADO: agora usa statusEstoqueDetalhado (consistente com cards, badges e exportações)
    const alertas = useMemo(() => {
        const alertasGerados = [];

        if (statusEstoqueDetalhado.baixoEstoque.length > 0) {
            alertasGerados.push({
                tipo: 'warning',
                titulo: 'Baixo estoque',
                descricao: `${statusEstoqueDetalhado.baixoEstoque.length} produto(s) estão abaixo do estoque mínimo.`
            });
        }

        if (statusEstoqueDetalhado.semEstoque.length > 0) {
            alertasGerados.push({
                tipo: 'danger',
                titulo: 'Produtos sem estoque',
                descricao: `${statusEstoqueDetalhado.semEstoque.length} produto(s) estão zerados no inventário.`
            });
        }

        if (statusEstoqueDetalhado.acimaCapacidade.length > 0) {
            alertasGerados.push({
                tipo: 'danger',
                titulo: 'Acima da capacidade máxima',
                descricao: `${statusEstoqueDetalhado.acimaCapacidade.length} produto(s) ultrapassaram o estoque máximo definido.`
            });
        }

        if (statusEstoqueDetalhado.estoqueElevado.length > 0) {
            alertasGerados.push({
                tipo: 'info',
                titulo: 'Estoque elevado',
                descricao: `${statusEstoqueDetalhado.estoqueElevado.length} produto(s) estão com estoque acima de 75% da capacidade máxima.`
            });
        }

        if (produtosComPrejuizo > 0) {
            alertasGerados.push({
                tipo: 'danger',
                titulo: 'Produtos vendidos com prejuízo',
                descricao: `${produtosComPrejuizo} produto(s) têm preço de venda abaixo do preço de custo.`
            });
        }

        if (alertasGerados.length === 0) {
            alertasGerados.push({
                tipo: 'success',
                titulo: 'Tudo certo',
                descricao: 'Nenhum alerta crítico encontrado nesta categoria.'
            });
        }

        return alertasGerados;

    }, [statusEstoqueDetalhado, produtosComPrejuizo]);

    // =========================================
    // AÇÕES DO CABEÇALHO (Exportar, Imprimir, PDF)
    // =========================================

    // Exporta a categoria inteira como CSV (abre direto no Excel/Sheets)
    // Converte cor hex (#f97316) em RGB, com fallback seguro para o jsPDF
    const hexParaRgb = (hex) => {
        const resultado = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '1e293b');
        if (!resultado) return [30, 41, 59];
        return [
            parseInt(resultado[1], 16),
            parseInt(resultado[2], 16),
            parseInt(resultado[3], 16)
        ];
    };

    // Exporta um Excel de verdade (.xlsx), com aba de Resumo + aba de Produtos
    const exportarExcel = async () => {
        if (itensCategoria.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ConstruStock';
        workbook.created = new Date();

        const corCategoria = 'FF' + (categoriaInfo?.cor || '#1e293b').replace('#', '').toUpperCase();

        // ============ ABA 1: RESUMO ============
        const resumoSheet = workbook.addWorksheet('Resumo');
        resumoSheet.columns = [{ width: 50 }, { width: 26 }];

        resumoSheet.mergeCells('A1:B1');
        const banner = resumoSheet.getCell('A1');
        banner.value = `Relatório: ${categoriaInfo?.nome || 'Categoria'}`;
        banner.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
        banner.alignment = { vertical: 'middle' };
        banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corCategoria } };
        resumoSheet.getRow(1).height = 30;

        resumoSheet.addRow([]);

        const adicionarSecao = (titulo) => {
            const row = resumoSheet.addRow([titulo]);
            resumoSheet.mergeCells(`A${row.number}:B${row.number}`);
            row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            row.height = 20;
        };

        let contadorLinha = 0;
        const adicionarLinha = (label, valor, formato) => {
            const row = resumoSheet.addRow([label, valor]);
            if (formato) row.getCell(2).numFmt = formato;
            if (contadorLinha % 2 === 0) {
                row.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                });
            }
            contadorLinha++;
        };

        // Fornecedores distintos (principal + histórico de movimentações)
        const fornecedoresSet = new Set();
        itensCategoria.forEach(i => {
            if (i.fornecedor_nome) fornecedoresSet.add(i.fornecedor_nome);
            if (Array.isArray(i.fornecedores)) {
                i.fornecedores.forEach(f => { if (f?.nome) fornecedoresSet.add(f.nome); });
            }
        });

        const produtoMenorEstoque = itensCategoria.length > 0
            ? [...itensCategoria].sort((a, b) => a.estoque_atual - b.estoque_atual)[0].nome
            : 'N/A';

        const valorCustoInventario = itensCategoria.reduce(
            (acc, i) => acc + Number(i.estoque_atual || 0) * Number(i.preco_custo || 0), 0
        );
        const lucroPotencial = resumo.valorInventario - valorCustoInventario;
        const precoMedioVenda = itensCategoria.length > 0
            ? itensCategoria.reduce((acc, i) => acc + Number(i.preco_venda || 0), 0) / itensCategoria.length
            : 0;

        // --- Seção: Visão Geral ---
        adicionarSecao('Visão Geral');
        adicionarLinha('Categoria', categoriaInfo?.nome || 'N/A');
        if (categoriaInfo?.descricao) {
            adicionarLinha('Descrição', categoriaInfo.descricao);
        }
        adicionarLinha('Total de Produtos', resumo.totalProdutos);
        adicionarLinha('Quantidade em Estoque', resumo.qtdeEstoque);
        adicionarLinha('Fornecedores Distintos', fornecedoresSet.size);
        resumoSheet.addRow([]);

        // --- Seção: Status do Estoque (relativo a mínimo/máximo de cada produto) ---
        adicionarSecao('Status do Estoque');
        adicionarLinha('Produtos Sem Estoque', statusEstoqueDetalhado.semEstoque.length);
        adicionarLinha('Produtos com Baixo Estoque (abaixo do mínimo)', statusEstoqueDetalhado.baixoEstoque.length);
        adicionarLinha('Produtos em Estoque Saudável', statusEstoqueDetalhado.saudavel.length);
        adicionarLinha('Produtos com Estoque Elevado (≥ 75% da capacidade)', statusEstoqueDetalhado.estoqueElevado.length);
        adicionarLinha('Produtos Acima da Capacidade Máxima', statusEstoqueDetalhado.acimaCapacidade.length);
        adicionarLinha('Produto com Maior Estoque', resumo.produtoMaisVendido);
        adicionarLinha('Produto com Menor Estoque', produtoMenorEstoque);
        resumoSheet.addRow([]);

        // --- Seção: Financeiro ---
        adicionarSecao('Financeiro');
        adicionarLinha('Valor do Inventário (Venda)', resumo.valorInventario, '"R$" #,##0.00');
        adicionarLinha('Valor do Inventário (Custo)', valorCustoInventario, '"R$" #,##0.00');
        adicionarLinha('Lucro Potencial do Estoque', lucroPotencial, '"R$" #,##0.00');
        adicionarLinha('Preço Médio de Venda', precoMedioVenda, '"R$" #,##0.00');
        adicionarLinha('Margem de Lucro Média', Number(margemMedia.toFixed(1)), '0.0"%"');
        adicionarLinha('Produtos Vendidos com Prejuízo', produtosComPrejuizo);
        resumoSheet.addRow([]);

        adicionarLinha('Gerado em', new Date().toLocaleString('pt-BR'));

        // ============ ABA 2: PRODUTOS ============
        const sheet = workbook.addWorksheet('Produtos', {
            views: [{ state: 'frozen', ySplit: 1 }]
        });

        sheet.columns = [
            { header: 'Produto', key: 'produto', width: 28 },
            { header: 'SKU', key: 'sku', width: 14 },
            { header: 'Quantidade', key: 'quantidade', width: 12 },
            { header: 'Estoque Mínimo', key: 'minimo', width: 16 },
            { header: 'Estoque Máximo', key: 'maximo', width: 16 },
            { header: 'Status', key: 'status', width: 22 },
            { header: 'Fornecedor(es)', key: 'fornecedor', width: 50 },
            { header: 'Preço de Custo', key: 'custo', width: 16 },
            { header: 'Preço de Venda', key: 'venda', width: 16 },
            { header: 'Margem (%)', key: 'margem', width: 12 },
        ];

        sheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        sheet.getRow(1).height = 22;

        itensCategoria.forEach((item, index) => {
            const custo = Number(item.preco_custo || 0);
            const venda = Number(item.preco_venda || 0);
            const margem = custo > 0 ? ((venda - custo) / custo) * 100 : 0;
            const status = obterStatusEstoqueTexto(item);

            const row = sheet.addRow({
                produto: item.nome,
                sku: item.sku || 'N/A',
                quantidade: Number(item.estoque_atual || 0),
                minimo: Number(item.estoque_minimo || 0),
                maximo: Number(item.estoque_maximo || 0),
                status,
                fornecedor: obterFornecedoresTexto(item),
                custo,
                venda,
                margem: Number(margem.toFixed(1))
            });

            if (index % 2 === 1) {
                row.eachCell({ includeEmpty: true }, cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                });
            }

            row.getCell('custo').numFmt = '"R$" #,##0.00';
            row.getCell('venda').numFmt = '"R$" #,##0.00';
            row.getCell('margem').numFmt = '0.0"%"';

            if (margem < 0) {
                row.getCell('margem').font = { bold: true, color: { argb: 'FFB91C1C' } };
            }

            const statusCell = row.getCell('status');
            statusCell.font = { bold: true };
            if (status === 'Sem estoque') {
                statusCell.font.color = { argb: 'FFB91C1C' };
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            } else if (status === 'Baixo estoque') {
                statusCell.font.color = { argb: 'FFB45309' };
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            } else if (status === 'Acima da capacidade') {
                statusCell.font.color = { argb: 'FF1D4ED8' };
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
            } else if (status === 'Estoque elevado') {
                statusCell.font.color = { argb: 'FF7C3AED' };
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
            } else {
                statusCell.font.color = { argb: 'FF15803D' };
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
            }
        });

        const valorTotalInventario = itensCategoria.reduce(
            (acc, i) => acc + (Number(i.estoque_atual || 0) * Number(i.preco_venda || 0)), 0
        );
        const totalRow = sheet.addRow({
            produto: 'TOTAL',
            quantidade: resumo.qtdeEstoque,
            venda: valorTotalInventario
        });
        totalRow.font = { bold: true };
        totalRow.getCell('venda').numFmt = '"R$" #,##0.00';
        totalRow.eachCell({ includeEmpty: true }, cell => {
            cell.border = { top: { style: 'medium', color: { argb: 'FF1E293B' } } };
        });

        sheet.autoFilter = { from: 'A1', to: `J${itensCategoria.length + 1}` };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_${(categoriaInfo?.nome || 'categoria').toLowerCase().replace(/\s+/g, '_')}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Aciona a janela de impressão nativa do navegador
    const imprimirRelatorio = () => {
        window.print();
    };

    // Gera um PDF formatado com resumo + tabela completa da categoria
    const baixarPDF = () => {
        if (itensCategoria.length === 0) return;

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const [r, g, b] = hexParaRgb(categoriaInfo?.cor);

        doc.setFillColor(r, g, b);
        doc.rect(0, 0, 210, 24, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(`Relatório: ${categoriaInfo?.nome || 'Categoria'}`, 14, 15);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(
            `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
            14, 32
        );

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Resumo", 14, 40);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const resumoLinhas = [
            `Total de Produtos: ${resumo.totalProdutos}   |   Quantidade em Estoque: ${resumo.qtdeEstoque}`,
            `Valor do Inventário: R$ ${resumo.valorInventario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}   |   Margem Média: ${margemMedia.toFixed(1)}%`,
            `Sem Estoque: ${statusEstoqueDetalhado.semEstoque.length}   |   Baixo Estoque: ${statusEstoqueDetalhado.baixoEstoque.length}   |   Estoque Elevado: ${statusEstoqueDetalhado.estoqueElevado.length}   |   Acima da Capacidade: ${statusEstoqueDetalhado.acimaCapacidade.length}`,
        ];
        resumoLinhas.forEach((linha, index) => {
            doc.text(linha, 14, 47 + (index * 6));
        });

        let proximoY = 47 + (resumoLinhas.length * 6) + 4;

        if (produtosComPrejuizo > 0) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(185, 28, 28);
            doc.text(`Atenção: ${produtosComPrejuizo} produto(s) vendidos com preço abaixo do custo (prejuízo).`, 14, proximoY);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");
            proximoY += 8;
        }

        autoTable(doc, {
            startY: proximoY + 4,
            head: [['Produto', 'SKU', 'Qtd.', 'Status', 'Fornecedor(es)', 'Preço']],
            body: itensCategoria.map(item => [
                item.nome,
                item.sku || 'N/A',
                item.estoque_atual,
                obterStatusEstoqueTexto(item),
                obterFornecedoresTexto(item),
                `R$ ${Number(item.preco_venda || 0).toFixed(2)}`
            ]),
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [30, 41, 59], textColor: 255 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 3) {
                    const valor = data.cell.raw;
                    if (valor === 'Sem estoque') {
                        data.cell.styles.textColor = [185, 28, 28];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (valor === 'Baixo estoque') {
                        data.cell.styles.textColor = [180, 83, 9];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (valor === 'Acima da capacidade') {
                        data.cell.styles.textColor = [29, 78, 216];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (valor === 'Estoque elevado') {
                        data.cell.styles.textColor = [124, 58, 237];
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [21, 128, 61];
                    }
                }
            },
            didDrawPage: () => {
                const paginaAtualPdf = doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(`Página ${paginaAtualPdf} · ConstruStock`, 105, 290, { align: 'center' });
            }
        });

        doc.save(`relatorio_${(categoriaInfo?.nome || 'categoria').toLowerCase().replace(/\s+/g, '_')}.pdf`);
    };

    if (carregando) {
        return <div style={{ padding: '24px' }}>Carregando dados da categoria...</div>;
    }

    const totalPaginas = Math.ceil(itensFiltradosTabela.length / itensPorPagina);

    const indiceInicial = (paginaAtual - 1) * itensPorPagina;
    const indiceFinal = indiceInicial + itensPorPagina;

    const itensPaginados = itensFiltradosTabela.slice(indiceInicial, indiceFinal);

    const possuiFiltrosAtivos =
        termoBusca.trim() !== '' ||
        mostrarBaixoEstoque ||
        mostrarSemEstoque ||
        sortConfig.key !== null;



    return (
        <div className={`${styles.container} ${styles.printArea} ${theme === 'dark' ? styles.dark : ''}`}>

            {/* ================= HEADER ================= */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button onClick={() => navigate(-1)} className={styles.backButton}>
                        <ChevronLeft size={24} color="#64748b" />
                    </button>
                    <div className={styles.titleWrapper}>
                        <div className={styles.iconWrapper}>
                            <Package size={24} color="#f97316" />
                        </div>
                        <div>
                            <h1 className={styles.title}>
                                Relatório: {categoriaInfo?.nome}
                            </h1>
                            <p className={styles.subtitle}>
                                Análise detalhada do inventário e desempenho
                            </p>
                        </div>
                    </div>
                </div>

                <div className={styles.headerActions}>

                    {itensCategoria.length > 0 && (
                        <>
                            {/* Dropdown de Exportação */}
                            <div className={styles.dropdownWrapper} ref={exportarRef}>
                                <button
                                    className={`${styles.btn} ${styles.btnSecondary}`}
                                    onClick={() => setMenuExportarAberto(prev => !prev)}
                                >
                                    <Download size={18} /> Exportar
                                </button>

                                {menuExportarAberto && (
                                    <div className={styles.dropdownMenu}>
                                        <button
                                            className={styles.dropdownItem}
                                            onClick={() => { baixarPDF(); setMenuExportarAberto(false); }}
                                        >
                                            <FileText size={16} /> PDF
                                        </button>
                                        <button
                                            className={styles.dropdownItem}
                                            onClick={() => { exportarExcel(); setMenuExportarAberto(false); }}
                                        >
                                            <FileSpreadsheet size={16} /> Excel
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                className={`${styles.btn} ${styles.btnSecondary}`}
                                onClick={imprimirRelatorio}
                            >
                                <Printer size={18} /> Imprimir
                            </button>
                        </>
                    )}

                    {/* Sempre visível, mesmo com a categoria vazia */}
                    <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => navigate(`/produtos/cadastrar?categoria=${idCategoria}`)}
                    >
                        <Plus size={18} /> Novo Produto
                    </button>
                </div>
            </div>

            {/* ================= CARDS DE RESUMO ================= */}
            <div className={styles.summaryGrid}>

                <div className={`${styles.summaryCard} ${styles.cardOrange}`}>
                    <div className={styles.summaryTop}>
                        <div className={styles.summaryIcon}>
                            <Package size={22} />
                        </div>

                        <span className={styles.summaryBadge}>
                            Categoria
                        </span>
                    </div>

                    <p className={styles.cardLabel}>Total de Produtos</p>

                    <h2 className={styles.cardValue}>
                        {resumo.totalProdutos}
                    </h2>

                    <span className={styles.cardFooter}>
                        Produtos cadastrados
                    </span>
                </div>

                <div className={`${styles.summaryCard} ${styles.cardBlue}`}>
                    <div className={styles.summaryTop}>
                        <div className={styles.summaryIcon}>
                            <Boxes size={22} />
                        </div>

                        <span className={styles.summaryBadge}>
                            Estoque
                        </span>
                    </div>

                    <p className={styles.cardLabel}>Quantidade em Estoque</p>

                    <h2 className={styles.cardValue}>
                        {resumo.qtdeEstoque}
                    </h2>

                    <span className={styles.cardFooter}>
                        Soma total de unidades
                    </span>
                </div>

                <div className={`${styles.summaryCard} ${styles.cardGreen}`}>
                    <div className={styles.summaryTop}>
                        <div className={styles.summaryIcon}>
                            <DollarSign size={22} />
                        </div>

                        <span className={styles.summaryBadge}>
                            Financeiro
                        </span>
                    </div>

                    <p className={styles.cardLabel}>Valor do Inventário</p>

                    <h2 className={styles.cardValue}>
                        R$ {resumo.valorInventario.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2
                        })}
                    </h2>

                    <span className={styles.cardFooter}>
                        Valor total em estoque
                    </span>
                </div>

                <div className={`${styles.summaryCard} ${styles.cardRed}`}>
                    <div className={styles.summaryTop}>
                        <div className={styles.summaryIcon}>
                            <AlertCircle size={22} />
                        </div>

                        <span className={styles.summaryBadge}>
                            Atenção
                        </span>
                    </div>

                    <p className={styles.cardLabel}>Itens Baixo Estoque</p>

                    <h2 className={styles.cardValue}>
                        {statusEstoqueDetalhado.baixoEstoque.length}
                    </h2>

                    <span className={styles.cardFooter}>
                        Precisam de reposição
                    </span>
                </div>

                <div className={`${styles.summaryCard} ${styles.cardPurple}`}>
                    <div className={styles.summaryTop}>
                        <div className={styles.summaryIcon}>
                            <TrendingUp size={22} />
                        </div>

                        <span className={styles.summaryBadge}>
                            Destaque
                        </span>
                    </div>

                    <p className={styles.cardLabel}>Maior Estoque</p>

                    <h2 className={`${styles.cardValue} ${styles.cardValueSmall}`}>
                        {resumo.produtoMaisVendido}
                    </h2>

                    <span className={styles.cardFooter}>
                        Produto com maior quantidade
                    </span>
                </div>

            </div>

            {/* ================= ÁREA DE GRÁFICOS (2x2) ================= */}
            <div className={styles.chartsGrid}>

                {/* Gráfico 1: Movimentação e Nível por Produto */}
                <div className={styles.card}>
                    <h3 className={styles.chartTitle}>Movimentação por Produto (Top 6)</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dadosGraficoBarras}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{
                                    fill: isDark ? '#94a3b8' : '#64748b',
                                    fontSize: 11
                                }} />
                                <YAxis axisLine={false} tickLine={false} tick={{
                                    fill: isDark ? '#94a3b8' : '#64748b',
                                    fontSize: 11
                                }} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Legend verticalAlign="top" height={36} iconType="circle" />

                                {/* 2. AJUSTADO: Agora renderiza 3 barras agrupadas por produto */}
                                <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar
                                    dataKey="Quantidade"
                                    fill={isDark ? "#60a5fa" : "#1e293b"}
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar dataKey="Saídas" fill="#f97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico 2: Distribuição de Estoque (Pizza) */}
                <div className={styles.card}>
                    <h3 className={styles.chartTitle}>Distribuição de Estoque (Top Itens)</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={dadosPizza} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {dadosPizza.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ================= TABELA DE PRODUTOS ================= */}
            <div className={styles.card} style={{ marginBottom: '24px' }}>
                <div className={styles.tableHeader}>
                    <h3 className={styles.tableTitle}>Produtos da Categoria</h3>

                    <div className={styles.filtersWrapper}>
                        {/* BUSCA */}
                        <div className={styles.searchWrapper}>
                            <Search size={16} color="#94a3b8" className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Buscar produtos..."
                                value={termoBusca}
                                onChange={(e) => setTermoBusca(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>

                        {/* FILTRO BAIXO ESTOQUE */}
                        <button
                            onClick={() => {
                                setMostrarBaixoEstoque((prev) => {
                                    const novoValor = !prev;

                                    if (novoValor) {
                                        setMostrarSemEstoque(false);
                                    }

                                    return novoValor;
                                });
                            }}
                            className={`${styles.btn} ${styles.btnSecondary} ${mostrarBaixoEstoque ? styles.filterActiveEstoque : ''}`}
                        >
                            <AlertCircle size={16} />
                            Baixo estoque
                        </button>

                        {/* FILTRO SEM ESTOQUE */}
                        <button
                            onClick={() => {
                                setMostrarSemEstoque((prev) => {
                                    const novoValor = !prev;

                                    if (novoValor) {
                                        setMostrarBaixoEstoque(false);
                                    }

                                    return novoValor;
                                });
                            }}
                            className={`${styles.btn} ${styles.btnSecondary} ${mostrarSemEstoque ? styles.filterActiveEstoque : ''}`}
                        >
                            <PackageX size={16} />
                            Sem estoque
                        </button>

                        {/* ORDENAR NOME */}
                        <button
                            onClick={handleSortNome}
                            className={`${styles.btn} ${styles.btnSecondary} ${sortConfig.key === 'nome' ? styles.filterActiveEstoqueOrder : ''}`}
                        >
                            {sortConfig.key === 'nome' && sortConfig.direction === 'desc' ? (
                                <ArrowUpZA size={16} />
                            ) : (
                                <ArrowDownAZ size={16} />
                            )}

                            {sortConfig.key === 'nome' && sortConfig.direction === 'desc'
                                ? 'Z-A'
                                : 'A-Z'}
                        </button>

                        {/* ORDENAR ESTOQUE */}
                        <button
                            onClick={handleSortEstoque}
                            className={`${styles.btn} ${styles.btnSecondary} ${sortConfig.key === 'estoque' ? styles.filterActiveEstoqueOrder : ''}`}
                        >
                            {sortConfig.key === 'estoque' && sortConfig.direction === 'desc' ? (
                                <ArrowUpWideNarrow size={16} />
                            ) : (
                                <ArrowDownWideNarrow size={16} />
                            )}

                            {sortConfig.key === 'estoque' && sortConfig.direction === 'desc'
                                ? 'Maior estoque'
                                : 'Menor estoque'}
                        </button>

                        {/* LIMPAR FILTROS */}
                        {possuiFiltrosAtivos && (
                            <button
                                onClick={() => {
                                    setTermoBusca('');
                                    setMostrarBaixoEstoque(false);
                                    setMostrarSemEstoque(false);
                                    setSortConfig({ key: null, direction: 'asc' });
                                }}
                                className={`${styles.btn} ${styles.btnSecondary}`}
                                style={{
                                    color: '#ef4444',
                                    borderColor: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'rgba(255, 0, 0, 0.035)'
                                }}
                            >
                                <Filter size={16} />
                                Limpar
                            </button>
                        )}
                    </div>
                </div>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>Produto</th>
                            <th className={styles.th}>SKU</th>
                            <th className={styles.th}>Quantidade</th>
                            <th className={styles.th}>Status</th>
                            <th className={styles.th}>Fornecedor(es)</th>
                            <th className={styles.th}>Preço</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itensPaginados.map((item, index) => (
                            <tr
                                key={item.id || index}
                                className={`
        ${styles.tr}
        ${Number(item.estoque_atual) < Number(item.estoque_minimo)
                                        ? styles.trLowStock
                                        : ''
                                    }
    `}
                            >
                                <td className={`${styles.td} ${styles.tdHighlight}`}>{item.nome}</td>
                                <td className={`${styles.td} ${styles.tdMuted}`}>{item.sku || 'N/A'}</td>
                                <td
                                    className={`${styles.td} ${Number(item.estoque_atual) < Number(item.estoque_minimo)
                                        ? styles.tdDanger
                                        : styles.tdNormal
                                        }
                                    `}
                                >
                                    {item.estoque_atual}
                                </td>
                                <td className={styles.td}>
                                    {renderizarStatus(item)}
                                </td>
                                <td className={`${styles.td} ${styles.tdMuted}`}>{obterFornecedoresTexto(item)}</td>
                                <td className={`${styles.td} ${styles.tdHighlight}`}>
                                    R$ {Number(item.preco_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {totalPaginas > 1 && (
                    <div className={styles.paginationContainer}>

                        <button
                            className={styles.paginationButton}
                            onClick={() => setPaginaAtual(prev => prev - 1)}
                            disabled={paginaAtual === 1}
                        >
                            <ChevronLeft size={16} />
                            Anterior
                        </button>

                        <span className={styles.paginationInfo}>
                            Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong>
                        </span>

                        <button
                            className={styles.paginationButton}
                            onClick={() => setPaginaAtual(prev => prev + 1)}
                            disabled={paginaAtual >= totalPaginas}
                        >
                            Próxima
                            <ChevronRight size={16} />
                        </button>

                    </div>
                )}
            </div>

            {/* ================= ALERTAS E NOTIFICAÇÕES ================= */}
            <div className={styles.card}>
                <div className={styles.alertsHeader}>
                    <div>
                        <h3 className={styles.alertsTitle}>
                            Alertas e Notificações
                        </h3>

                        <p className={styles.alertsSubtitle}>
                            Monitoramento inteligente da categoria
                        </p>
                    </div>

                    <div className={styles.alertCount}>
                        {alertas.length} alerta(s)
                    </div>
                </div>

                <div className={styles.alertsContainer}>

                    {alertas.map((alerta, index) => (
                        <div
                            key={index}
                            className={`
                    ${styles.alertBox}
                    ${alerta.tipo === 'warning' ? styles.alertYellow : ''}
                    ${alerta.tipo === 'danger' ? styles.alertRed : ''}
                    ${alerta.tipo === 'info' ? styles.alertBlue : ''}
                    ${alerta.tipo === 'success' ? styles.alertGreen : ''}
                `}
                        >

                            <div className={styles.alertIcon}>
                                <AlertCircle size={20} />
                            </div>

                            <div className={styles.alertContent}>
                                <h4 className={styles.alertTitle}>
                                    {alerta.titulo}
                                </h4>

                                <p className={styles.alertText}>
                                    {alerta.descricao}
                                </p>
                            </div>

                        </div>
                    ))}

                </div>
            </div>


        </div>


    );

};



export default RelatorioCategoria;