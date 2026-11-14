import React, { useState, useEffect } from 'react';
import { api } from "../services/api";
import { useTheme } from "../components/Context/ThemeContext";
import {
    Package, Database, CheckCircle, AlertTriangle,
    TrendingUp, AlertOctagon, Layers, XCircle, Activity
} from 'lucide-react';
import styles from '../styles/VolumeEstoque.module.css';

const VolumeEstoque = () => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);

    // Dados consolidados
    const [dashboardData, setDashboardData] = useState({
        totalProdutos: 0,
        capacidadeMaxima: 10000,
        totalOcupado: 0,
        espacoLivre: 0,
        porcentagemOcupada: 0,
        totalAlertas: 0
    });

    // Listas para os cards inferiores
    const [topProdutos, setTopProdutos] = useState([]);
    const [baixoEstoque, setBaixoEstoque] = useState([]);
    const [esgotados, setEsgotados] = useState([]);

    useEffect(() => {
        const carregarDados = async () => {
            try {
                const response = await api.get('/produtos');
                const produtos = response.data;

                console.log("DADOS DA API:", produtos[0]);

                // 1. FILTRO PRINCIPAL: Pega apenas os produtos com status 'Ativo'
                // (Se no seu banco a propriedade for diferente, como 'ativo' minúsculo ou um booleano, ajuste aqui)
                const produtosAtivos = produtos.filter(produto => Number(produto.produto_ativo) === 1);

                // 2. Calcula o estoque e a ocupação APENAS com os produtos ativos
                const totalEstoque = produtosAtivos.reduce((acc, prod) => acc + (Number(prod.estoque_atual) || 0), 0);
                const capacidadeMaxima = 10000;
                const espacoLivre = capacidadeMaxima - totalEstoque;
                const porcentagem = ((totalEstoque / capacidadeMaxima) * 100).toFixed(1);

                // 3. Maiores Volumes: Ordena os ativos por estoque atual e corta os 5 primeiros
                const maioresVolumes = [...produtosAtivos]
                    .sort((a, b) => (Number(b.estoque_atual) || 0) - (Number(a.estoque_atual) || 0))
                    .slice(0, 5);

                // 4. Atenção Requerida: Estoque > 0 E menor ou igual ao estoque mínimo
                // (Assumindo que o campo no banco se chama 'estoque_minimo'. Se for diferente, ajuste abaixo)
                const atencaoRequerida = produtosAtivos.filter(
                    produto => Number(produto.estoque_atual) > 0 && Number(produto.estoque_atual) <= Number(produto.estoque_minimo)
                );

                // 5. Produtos Esgotados: Apenas ativos que estão com estoque 0
                const produtosEsgotados = produtosAtivos.filter(
                    produto => Number(produto.estoque_atual) === 0
                );

                // Atualiza as listas da tela
                setTopProdutos(maioresVolumes);
                setBaixoEstoque(atencaoRequerida);
                setEsgotados(produtosEsgotados);

                // 6. Atualiza os cards superiores
                setDashboardData({
                    totalProdutos: produtosAtivos.length, // Agora mostra só o total de ativos
                    capacidadeMaxima,
                    totalOcupado: totalEstoque,
                    espacoLivre: espacoLivre > 0 ? espacoLivre : 0,
                    porcentagemOcupada: Number(porcentagem),
                    totalAlertas: atencaoRequerida.length + produtosEsgotados.length // Corrigido o nome das variáveis
                });

            } catch (error) {
                console.error("Erro ao carregar dados de volume:", error);
            } finally {
                setLoading(false);
            }
        };

        carregarDados();
    }, []);

    let corBarra = '#10b981'; // Verde
    if (dashboardData.porcentagemOcupada >= 80) corBarra = '#eab308'; // Amarelo
    if (dashboardData.porcentagemOcupada >= 95) corBarra = '#ef4444'; // Vermelho

    return (
        <div className={`${styles.pageContainer} ${theme === 'dark' ? styles.darkTheme : ''}`}>

            {/* Cabeçalho da Página (Fora dos cards) */}
            <div className={styles.pageHeader}>
                <h2>Controle de Armazém</h2>
                <p>Acompanhe a capacidade física, movimentações e alertas de reposição do inventário.</p>
            </div>

            {loading ? (
                <p className={styles.loading}>Processando inteligência do estoque...</p>
            ) : (
                <>
                    {/* Linha 1: Cards de Resumo */}
                    <div className={styles.summaryGrid}>
                        <div className={styles.summaryCard}>
                            <div className={styles.summaryIconBox} style={{ color: '#8b5cf6', backgroundColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : '#f3e8ff' }}>
                                <Layers size={20} />
                            </div>
                            <h3 className={styles.summaryValue}>{dashboardData.totalProdutos}</h3>
                            <span className={styles.summaryTitle}>Total de Produtos (Ativos)</span>
                        </div>

                        <div className={styles.summaryCard}>
                            <div className={styles.summaryIconBox} style={{ color: '#3b82f6', backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }}>
                                <Package size={20} />
                            </div>
                            <h3 className={styles.summaryValue}>{dashboardData.totalOcupado.toLocaleString('pt-BR')}</h3>
                            <span className={styles.summaryTitle}>Unidades em Estoque</span>
                        </div>

                        <div className={styles.summaryCard}>
                            <div className={styles.summaryIconBox} style={{ color: '#10b981', backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5' }}>
                                <Database size={20} />
                            </div>
                            <h3 className={styles.summaryValue}>{dashboardData.capacidadeMaxima.toLocaleString('pt-BR')}</h3>
                            <span className={styles.summaryTitle}>Capacidade Máxima</span>
                        </div>

                        <div className={styles.summaryCard}>
                            <div className={styles.summaryIconBox} style={{ color: '#ef4444', backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' }}>
                                <Activity size={20} />
                            </div>
                            <h3 className={styles.summaryValue}>{dashboardData.totalAlertas}</h3>
                            <span className={styles.summaryTitle}>Alertas (Baixo/Esgotado)</span>
                        </div>
                    </div>

                    {/* Linha 2: Card da Barra de Progresso */}
                    <div className={styles.mainCard}>
                        <div className={styles.mainCardHeader}>
                            <div className={styles.mainCardTitle}>
                                <CheckCircle size={20} color={corBarra} />
                                <h3>Ocupação Física do Armazém</h3>
                            </div>
                            <div className={styles.espacoLivre}>
                                Espaço Livre: <strong>{dashboardData.espacoLivre.toLocaleString('pt-BR')} un</strong>
                            </div>
                        </div>

                        <div className={styles.progressContainer}>
                            <div className={styles.progressHeader}>
                                <span>Progresso de Ocupação</span>
                                <span style={{ color: corBarra, fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {dashboardData.porcentagemOcupada}%
                                </span>
                            </div>
                            <div className={styles.progressBarBg}>
                                <div
                                    className={styles.progressBarFill}
                                    style={{ width: `${Math.min(dashboardData.porcentagemOcupada, 100)}%`, backgroundColor: corBarra }}
                                ></div>
                            </div>

                            {dashboardData.porcentagemOcupada >= 100 && (
                                <div className={styles.alertaMaximo}>
                                    <AlertTriangle size={20} />
                                    <p>Capacidade máxima atingida! Considere expandir o armazenamento ou realizar queima de estoque.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Linha 3: Grid de Detalhamento (3 Colunas) */}
                    <div className={styles.detailsGrid}>

                        {/* Lista 1: Maiores Volumes */}
                        <div className={styles.detailCard}>
                            <div className={styles.detailCardHeader}>
                                <div className={styles.detailTitle}>
                                    <TrendingUp size={18} color="#3b82f6" />
                                    <h4>Maiores Volumes</h4>
                                </div>
                                <span>Top 5 itens ocupando espaço</span>
                            </div>
                            <div className={styles.detailList}>
                                {topProdutos.map(produto => (
                                    <div key={produto.id} className={styles.detailItem}>
                                        <span className={styles.itemName}>{produto.nome}</span>
                                        <span className={styles.itemBadgeBlue}>{produto.estoque_atual} un</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Lista 2: Baixo Estoque */}
                        <div className={styles.detailCard}>
                            <div className={styles.detailCardHeader}>
                                <div className={styles.detailTitle}>
                                    <AlertOctagon size={18} color="#f59e0b" />
                                    <h4>Atenção Requerida</h4>
                                </div>
                                <span>Itens no limite do estoque mínimo</span>
                            </div>
                            <div className={styles.detailList}>
                                {baixoEstoque.length > 0 ? baixoEstoque.map(produto => (
                                    <div key={produto.id} className={styles.detailItem}>
                                        <span className={styles.itemName}>{produto.nome}</span>
                                        <span className={styles.itemBadgeWarning}>{produto.estoque_atual} un</span>
                                    </div>
                                )) : <p className={styles.emptyText}>Sem itens em baixo estoque.</p>}
                            </div>
                        </div>

                        {/* Lista 3: Esgotados */}
                        <div className={styles.detailCard}>
                            <div className={styles.detailCardHeader}>
                                <div className={styles.detailTitle}>
                                    <XCircle size={18} color="#ef4444" />
                                    <h4>Produtos Esgotados</h4>
                                </div>
                                <span>Itens zerados no sistema</span>
                            </div>
                            <div className={styles.detailList}>
                                {esgotados.length > 0 ? esgotados.map(produto => (
                                    <div key={produto.id} className={styles.detailItem}>
                                        <span className={styles.itemName}>{produto.nome}</span>
                                        <span className={styles.itemBadgeDanger}>Zerado</span>
                                    </div>
                                )) : <p className={styles.emptyText}>Nenhum produto esgotado.</p>}
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
};

export default VolumeEstoque;