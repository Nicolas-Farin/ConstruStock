import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Filter, Calendar, Package, Grid } from 'lucide-react';
import { api } from "../services/api.js";
import { useTheme } from '../components/Context/ThemeContext.jsx';
import styles from '../styles/Relatorio.module.css';

export default function HistoricoAnalises() {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);

    // Dados brutos da API (guardamos para não ter que buscar de novo ao filtrar)
    const [rawMovimentacoes, setRawMovimentacoes] = useState([]);
    const [rawProdutos, setRawProdutos] = useState([]);

    // Controles de Filtro
    const [semanaSelecionada, setSemanaSelecionada] = useState("");
    const [filtroCategoria, setFiltroCategoria] = useState("");
    const [filtroProduto, setFiltroProduto] = useState("");

    useEffect(() => {
        carregarDadosBase();
    }, []);

    // 1. Busca os dados apenas uma vez
    const carregarDadosBase = async () => {
        try {
            setLoading(true);

            // Busca produtos (para pegar as categorias e nomes) e as movimentações simultaneamente
            const [responseMov, responseProd] = await Promise.all([
                api.get('/produtos/movimentacoes').catch(() => ({ data: [] })),
                api.get('/produtos').catch(() => ({ data: [] }))
            ]);

            setRawMovimentacoes(responseMov.data);
            setRawProdutos(responseProd.data);

        } catch (error) {
            console.error("Erro ao carregar os dados:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Extrai categorias e produtos únicos para os Dropdowns
    const listasFiltro = useMemo(() => {
        const categorias = [...new Set(rawProdutos.map(p => p.categoria_nome).filter(Boolean))];
        const produtos = rawProdutos.map(p => ({ id: p.id, nome: p.nome })).filter(p => p.nome);
        return { categorias, produtos };
    }, [rawProdutos]);

    // 3. Filtra e processa os dados matemáticos sempre que um filtro mudar
    const semanasDisponiveis = useMemo(() => {
        if (!rawMovimentacoes.length) return [];

        // --- PASSO A: Aplicar Filtros de Categoria e Produto ---
        const movsFiltradas = rawMovimentacoes.filter(mov => {
            const produtoReferencia = rawProdutos.find(p => p.id === mov.produto_id) || {};
            const catMov = produtoReferencia.categoria_nome || mov.categoria_nome || "";
            const nomeMov = produtoReferencia.nome || mov.produto_nome || "";

            if (filtroCategoria && catMov !== filtroCategoria) return false;
            // Verifica o nome ou o ID dependendo de como a API retorna
            if (filtroProduto && String(mov.produto_id) !== filtroProduto && nomeMov !== filtroProduto) return false;

            return true;
        });

        // --- PASSO B: Agrupar as movimentadas filtradas por Semanas ---
        const formatarData = (data) => {
            const dia = data.getDate().toString().padStart(2, '0');
            const mes = (data.getMonth() + 1).toString().padStart(2, '0');
            return `${dia}/${mes}`;
        };

        const historicoSemanas = {};
        const nomeDosDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

        const movimentacoesOrdenadas = [...movsFiltradas].sort((a, b) => {
            return new Date(a.criado_em.replace(' ', 'T')) - new Date(b.criado_em.replace(' ', 'T'));
        });

        movimentacoesOrdenadas.forEach(mov => {
            // 1. Incluímos o 'Estorno Venda' na validação do IF
            if (mov.tipo === 'Venda' || mov.tipo === 'Saida' || mov.tipo === 'Entrada' || mov.tipo === 'Estorno Venda' || mov.tipo === 'Devolução') {
                const dataMov = new Date(mov.criado_em.replace(' ', 'T'));

                const diaAtual = dataMov.getDay();
                const diffParaSegunda = diaAtual === 0 ? 6 : diaAtual - 1;

                const segundaFeira = new Date(dataMov);
                segundaFeira.setDate(dataMov.getDate() - diffParaSegunda);

                const domingo = new Date(segundaFeira);
                domingo.setDate(segundaFeira.getDate() + 6);

                const labelSemana = `${formatarData(segundaFeira)} a ${formatarData(domingo)}`;

                if (!historicoSemanas[labelSemana]) {
                    historicoSemanas[labelSemana] = {
                        Seg: { Entradas: 0, Vendas: 0, Saidas: 0 },
                        Ter: { Entradas: 0, Vendas: 0, Saidas: 0 },
                        Qua: { Entradas: 0, Vendas: 0, Saidas: 0 },
                        Qui: { Entradas: 0, Vendas: 0, Saidas: 0 },
                        Sex: { Entradas: 0, Vendas: 0, Saidas: 0 },
                        Sáb: { Entradas: 0, Vendas: 0, Saidas: 0 },
                        Dom: { Entradas: 0, Vendas: 0, Saidas: 0 }
                    };
                }

                const diaStr = nomeDosDias[diaAtual];

                if (mov.tipo === 'Entrada') {
                    historicoSemanas[labelSemana][diaStr].Entradas += Number(mov.quantidade);
                } else if (mov.tipo === 'Venda') {
                    historicoSemanas[labelSemana][diaStr].Vendas += Number(mov.quantidade);
                } else if (mov.tipo === 'Saida') {
                    historicoSemanas[labelSemana][diaStr].Saidas += Number(mov.quantidade);
                } else if (mov.tipo === 'Estorno Venda' || mov.tipo === 'Devolução') {
                    // Cancelamento total ou devolução parcial: os dois reduzem a venda líquida do dia
                    historicoSemanas[labelSemana][diaStr].Vendas = Math.max(0, historicoSemanas[labelSemana][diaStr].Vendas - Number(mov.quantidade));
                }
            }
        });

        // Transformar objeto em Array final pro gráfico
        const arrayAgrupado = Object.entries(historicoSemanas).map(([semana, dias]) => ({
            semana: semana,
            dadosDoGrafico: [
                { name: "Seg", Entradas: dias.Seg.Entradas, Vendas: dias.Seg.Vendas, SaidasManuais: dias.Seg.Saidas },
                { name: "Ter", Entradas: dias.Ter.Entradas, Vendas: dias.Ter.Vendas, SaidasManuais: dias.Ter.Saidas },
                { name: "Qua", Entradas: dias.Qua.Entradas, Vendas: dias.Qua.Vendas, SaidasManuais: dias.Qua.Saidas },
                { name: "Qui", Entradas: dias.Qui.Entradas, Vendas: dias.Qui.Vendas, SaidasManuais: dias.Qui.Saidas },
                { name: "Sex", Entradas: dias.Sex.Entradas, Vendas: dias.Sex.Vendas, SaidasManuais: dias.Sex.Saidas },
                { name: "Sáb", Entradas: dias.Sáb.Entradas, Vendas: dias.Sáb.Vendas, SaidasManuais: dias.Sáb.Saidas },
                { name: "Dom", Entradas: dias.Dom.Entradas, Vendas: dias.Dom.Vendas, SaidasManuais: dias.Dom.Saidas }
            ]
        }));

        // Se o usuário não escolheu semana ou a semana atual sumiu por causa do filtro, pega a última
        if (arrayAgrupado.length > 0 && !arrayAgrupado.find(s => s.semana === semanaSelecionada)) {
            setSemanaSelecionada(arrayAgrupado[arrayAgrupado.length - 1].semana);
        }

        return arrayAgrupado;
    }, [rawMovimentacoes, rawProdutos, filtroCategoria, filtroProduto, semanaSelecionada]);

    // Resgata os dados exatos para renderizar na tela baseados na semana escolhida
    const dadosGraficoAtual = useMemo(() => {
        const semanaEnc = semanasDisponiveis.find(item => item.semana === semanaSelecionada);
        return semanaEnc ? semanaEnc.dadosDoGrafico : [];
    }, [semanasDisponiveis, semanaSelecionada]);


    if (loading) {
        return <div className={styles.container}>Carregando análises detalhadas...</div>;
    }

    return (
        <div className={`${styles.container} ${theme === 'dark' ? 'dark-mode' : ''}`}>

            {/* Cabeçalho */}
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Relatório de Movimentações</h2>
                    <p className={styles.subtitle}>Analise entradas, vendas e saídas manuais do seu estoque.</p>
                </div>
            </div>

            {/* Painel de Filtros (NOVO DESIGN) */}
            <div className={styles.filtersCard}>
                <div className={styles.filterTitle}>
                    <Filter size={18} />
                    <span>Filtros de Análise</span>
                </div>

                <div className={styles.filtersGrid}>
                    {/* Filtro: Semana */}
                    <div className={styles.filterGroup}>
                        <label className={styles.label}><Calendar size={14} /> Semana</label>
                        <select className={styles.selectInput} value={semanaSelecionada} onChange={(e) => setSemanaSelecionada(e.target.value)}>
                            {semanasDisponiveis.length === 0 && <option value="">Sem dados...</option>}
                            {semanasDisponiveis.map((item, index) => (
                                <option key={index} value={item.semana}>Semana {item.semana}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro: Categoria */}
                    <div className={styles.filterGroup}>
                        <label className={styles.label}><Grid size={14} /> Categoria</label>
                        <select className={styles.selectInput} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                            <option value="">Todas as Categorias</option>
                            {listasFiltro.categorias.map((cat, idx) => (
                                <option key={idx} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro: Produto */}
                    <div className={styles.filterGroup}>
                        <label className={styles.label}><Package size={14} /> Produto Específico</label>
                        <select className={styles.selectInput} value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)}>
                            <option value="">Todos os Produtos</option>
                            {listasFiltro.produtos.map((prod) => (
                                <option key={prod.id} value={prod.id}>{prod.nome}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* O Cartão do Gráfico */}
            <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>
                    Desempenho: {semanaSelecionada ? `Semana ${semanaSelecionada}` : 'Sem dados para o filtro'}
                </h3>

                {semanasDisponiveis.length === 0 ? (
                    <div className={styles.emptyState}>Nenhuma movimentação registrada para estes filtros.</div>
                ) : (
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dadosGraficoAtual} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--chart-text)' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-text)' }} />

                                <RechartsTooltip
                                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                                    contentStyle={{
                                        backgroundColor: 'var(--tooltip-bg)',
                                        border: '1px solid var(--tooltip-border)',
                                        borderRadius: '8px',
                                        color: 'var(--tooltip-text)'
                                    }}
                                />

                                <Legend wrapperStyle={{ paddingTop: '20px' }} />

                                {/* TRÊS BARRAS AGORA: Entradas, Vendas e Saídas */}
                                <Bar dataKey="Entradas" name="Entradas (Estoque)" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="Vendas" name="Vendas (Pedidos)" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="SaidasManuais" name="Saídas (Ajustes/Perdas)" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}