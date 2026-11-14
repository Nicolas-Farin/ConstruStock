import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../components/Context/ThemeContext";
import { api } from "../services/api";
import styles from "../styles/DetalhesProduto.module.css";
import {
    Edit,
    AlertTriangle,
    XCircle,
    CheckCircle,
    BarChart2,
    Package,
    Truck,
    MapPin,
    Phone,
    Mail,
    Search,
    Filter,
    Layers
} from "lucide-react";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

export default function DetalhesProduto() {
    const { theme } = useTheme();
    const { id } = useParams();
    const navigate = useNavigate();

    const [produto, setProduto] = useState(null);
    const [erro, setErro] = useState("");

    const [movimentacoes, setMovimentacoes] = useState([]);
    const [buscaMovimentacao, setBuscaMovimentacao] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("Todos");

    async function carregarProduto() {
        try {
            setErro("");
            const resposta = await api.get(`/produtos/${id}`);
            setProduto(resposta.data);
        } catch (error) {
            setErro("Erro ao carregar os detalhes do produto.");
        }
    }

    async function carregarMovimentacoes() {
        console.log("ENTREI EM carregarMovimentacoes");

        try {
            const response = await api.get(
                `/produtos/${id}/movimentacoes`
            );

            console.log("MOVIMENTAÇÕES:", response.data);

            // Exemplo caso seu backend envie dentro de uma chave:
            //  Substitua na sua função carregarMovimentacoes:
            setMovimentacoes(
                Array.isArray(response.data)
                    ? response.data
                    : (response.data.movimentacoes || response.data.dados || [])
            );

        } catch (error) {
            console.log("ERRO MOVIMENTAÇÕES:", error);
        }
    }

    useEffect(() => {
        console.log("USE EFFECT EXECUTOU");

        carregarProduto();
        carregarMovimentacoes();
    }, [id]);

    const movimentacoesFiltradas = useMemo(() => {
        // Se 'movimentacoes' não for um array válido, retorna array vazio para não quebrar
        if (!Array.isArray(movimentacoes)) return [];

        return movimentacoes.filter((mov) => {
            const textoBusca = buscaMovimentacao.toLowerCase().trim();

            // SE A BUSCA ESTIVER VAZIA, ADMITE TODOS. 
            // Se tiver texto, faz a checagem segura com o opcional chaining ?.
            const correspondeBusca =
                textoBusca === "" ||
                mov.usuario_nome?.toLowerCase().includes(textoBusca) ||
                mov.fornecedor_nome?.toLowerCase().includes(textoBusca) ||
                mov.numero_documento?.toLowerCase().includes(textoBusca) ||
                mov.motivo?.toLowerCase().includes(textoBusca);

            const correspondeTipo =
                filtroTipo === "Todos" ||
                mov.tipo?.toLowerCase() === filtroTipo.toLowerCase();

            return correspondeBusca && correspondeTipo;
        });
    }, [movimentacoes, buscaMovimentacao, filtroTipo]);

    const unidadeMedida = useMemo(() => {
        if (!produto) return "un";
        return produto.tipo_unidade || produto.tipoUnidade || produto.unidade_medida || "un";
    }, [produto]);

    const porcentagemEstoque = useMemo(() => {
        if (!produto) return 0;
        const qtd = Number(produto.estoque_atual) || 0;
        const max = Number(produto.estoque_maximo) || 0;

        if (max <= 0) return 0;
        const porcentagem = (qtd / max) * 100;

        // Antes: return Math.max(0, Math.min(porcentagem, 100));
        // Agora: permite que a porcentagem passe de 100
        return Math.max(0, porcentagem);
    }, [produto]);

    const corEstoque = useMemo(() => {
        if (!produto) return "#22c55e";

        const qtd = Number(produto.estoque_atual) || 0;
        const min = Number(produto.estoque_minimo) || 0;
        const max = Number(produto.estoque_maximo) || 0;

        // 1. Azul: Passou da capacidade máxima
        if (max > 0 && qtd > max) return "#3b82f6";

        // 2. Verde (Exceção): Mínimo e Máximo são iguais e o estoque está exatamente neles
        if (min === max && qtd === min && qtd > 0) return "#22c55e";

        // 3. Vermelho: Abaixo do Mínimo
        if (qtd < min) return "#ef4444";

        // 4. Amarelo: Exatamente no Mínimo
        if (qtd === min && min > 0) return "#f59e0b";

        // 5. Verde: Atingiu o Máximo cravado
        if (qtd === max && max > 0) return "#22c55e";

        // 6. Amarelo: Entre Mínimo e Máximo, mas abaixo de 50% (pouca quantidade)
        if (porcentagemEstoque < 60) return "#f59e0b";

        // 7. Verde: Estoque saudável (Acima de 50% e abaixo do Máximo)
        return "#22c55e";
    }, [produto, porcentagemEstoque]);

    const statusTexto = useMemo(() => {
        if (!produto) return "Normal";

        const qtd = Number(produto.estoque_atual) || 0;
        const min = Number(produto.estoque_minimo) || 0;
        const max = Number(produto.estoque_maximo) || 0;

        if (max > 0 && qtd > max) return "Acima do Máximo";
        if (min === max && qtd === min && qtd > 0) return "Saudável";
        if (qtd < min) return "Estoque Crítico";
        if (qtd === min && min > 0) return "No Limite Mínimo";
        if (qtd === max && max > 0) return "Capacidade Máxima";
        if (porcentagemEstoque < 50) return "Necessita Reposição";

        return "Saudável";
    }, [produto, porcentagemEstoque]);

    const lucroUnitario = useMemo(() => {
        if (!produto) return "0.00";
        const venda = Number(produto.preco_venda) || 0;
        const custo = Number(produto.preco_custo) || 0;
        return (venda - custo).toFixed(2);
    }, [produto]);

    const dadosGrafico = useMemo(() => {
        if (!Array.isArray(movimentacoes) || movimentacoes.length === 0) return [];

        const agrupado = {};

        movimentacoes.forEach((mov) => {
            const dataObj = new Date(mov.criado_em);
            // Formata a data para "DD/MM" para ficar enxuto no eixo X
            const dataFormatada = `${dataObj.getDate().toString().padStart(2, '0')}/${(dataObj.getMonth() + 1).toString().padStart(2, '0')}`;

            if (!agrupado[dataFormatada]) {
                agrupado[dataFormatada] = {
                    data: dataFormatada,
                    entradas: 0,
                    saidas: 0,
                    timestamp: dataObj.setHours(0, 0, 0, 0) // Usado para ordenar cronologicamente
                };
            }

            const qtd = Number(mov.quantidade) || 0;

            if (mov.tipo === "Entrada") {
                agrupado[dataFormatada].entradas += qtd;
            } else if (mov.tipo === "Saida" || mov.tipo === "Venda") {
                agrupado[dataFormatada].saidas += qtd;
            }
        });

        // Converte o objeto em array e ordena da data mais antiga para a mais recente
        const dadosOrdenados = Object.values(agrupado).sort((a, b) => a.timestamp - b.timestamp);

        // Retorna apenas os últimos 7 itens (últimos 7 dias com movimentação)
        return dadosOrdenados.slice(-7);
    }, [movimentacoes]);

    if (erro) {
        return (
            <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`}>
                <div className={styles.erro}>{erro}</div>
            </div>
        );
    }

    if (!produto) {
        return (
            <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`}>
                <p style={{ padding: '2rem', textAlign: 'center' }}>Carregando detalhes do produto...</p>
            </div>
        );
    }

    return (
        <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`}>

            <header className={styles.heroSection}>
                <div className={styles.heroOverlay}></div>
                <div className={styles.heroContent}>
                    <div className={styles.heroLeft}>
                        <h1 className={styles.heroTitle}>{produto.nome}</h1>
                        <p className={styles.heroSubtitle}>
                            Visualize informações completas do produto, estoque, movimentações e fornecedor cadastrado.
                        </p>

                        <div className={styles.heroBadges}>
                            <span className={styles.statusBadge} style={{ background: corEstoque }}>
                                {statusTexto}
                            </span>
                            <span className={styles.secondaryBadge}>
                                SKU: {produto.sku}
                            </span>
                            <span className={styles.secondaryBadge}>
                                Unidade: {unidadeMedida}
                            </span>
                        </div>
                    </div>

                    <div className={styles.heroRight}>
                        <div className={styles.stockCircle}>
                            <strong>{porcentagemEstoque.toFixed(0)}%</strong>
                            <span>Capacidade</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className={styles.productHeaderCard}>
                <div className={styles.productMainInfo}>
                    <div className={styles.imagePlaceholder}>
                        {produto.imagem_principal ? (
                            <img
                                src={`http://localhost:3000/uploads/${produto.imagem_principal}`}
                                alt={produto.nome}
                                className={styles.productImage}
                            />
                        ) : (
                            <Package size={40} color="#94a3b8" />
                        )}
                    </div>
                    <div>
                        <div className={styles.titleRow}>
                            <h1>{produto.nome}</h1>
                        </div>
                        <p>Categoria: <span>{produto.categoria_nome || "Geral"}</span> | SKU: <span>{produto.sku}</span> | Medida: <span>{unidadeMedida}</span></p>
                    </div>
                </div>
                <div className={styles.actionButtons}>
                    <button
                        className={styles.btnOutline}
                        onClick={() => navigate(`/produtos/${id}/editar`)}
                    >
                        <Edit size={16} /> Editar Produto
                    </button>
                </div>
            </div>

            <div className={styles.grid}>
                {/* COLUNA ESQUERDA */}
                <div className={styles.leftColumn}>

                    {/* STATUS DO ESTOQUE */}
                    <div className={styles.card}>
                        <div className={styles.cardHeaderFlex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className={styles.cardTitle}><Package size={20} /> Status do Estoque</div>
                            <span style={{ backgroundColor: corEstoque, color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                {statusTexto}
                            </span>
                        </div>

                        <div className={styles.stockOverview} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0' }}>
                            <div>
                                <p style={{ margin: '0 0 6px 0' }} className={styles.stockLabel}>Estoque Atual</p>
                                <h2 style={{ color: corEstoque, fontSize: '2.5rem', fontWeight: 'bold', margin: '0' }}>
                                    {produto.estoque_atual} <span className={styles.unitSpan} style={{ fontSize: '1.2rem', fontWeight: 'normal', marginLeft: '4px' }}>{unidadeMedida}</span>
                                </h2>
                            </div>

                            {/* CÍRCULO EM SVG COM ALTERNÂNCIA DE TEMA DINÂMICO */}
                            <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
                                    {/* Linha de fundo adaptável ao tema claro/escuro */}
                                    <circle
                                        cx="45"
                                        cy="45"
                                        r="38"
                                        stroke={theme === 'dark' ? '#26354e' : '#e2e8f0'}
                                        strokeWidth="6"
                                        fill="transparent"
                                    />
                                    <circle
                                        cx="45"
                                        cy="45"
                                        r="38"
                                        stroke={corEstoque}
                                        strokeWidth="6"
                                        fill="transparent"
                                        strokeDasharray={2 * Math.PI * 38}
                                        strokeDashoffset={2 * Math.PI * 38 * (1 - Math.min(porcentagemEstoque, 100) / 100)}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                                    />
                                </svg>
                                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                                    <strong style={{ color: corEstoque, fontSize: '1.3rem', fontWeight: 'bold', lineHeight: '1' }}>{porcentagemEstoque.toFixed(0)}%</strong>
                                    <span style={{ color: corEstoque, fontSize: '0.75rem', fontWeight: '500', marginTop: '2px' }}>
                                        {statusTexto === "Estoque Baixo" ? "Saúde" : statusTexto === "Necessita Reposição" ? "Alerta" : "Saúde"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* BARRA DE PROGRESSO (Estilos inline de cores removidos para respeitar o CSS) */}
                        <div className={styles.progressBarContainer} style={{ margin: '20px 0' }}>
                            <div className={styles.progressLabels} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                                <span>0</span>
                                <span>Nível de Estoque</span>
                                <span>{produto.estoque_maximo || 0}</span>
                            </div>
                            <div className={styles.barraEstoque} style={{ height: '8px', borderRadius: '4px', width: '100%', overflow: 'hidden' }}>
                                <div
                                    className={styles.progresso}
                                    style={{
                                        // Adicione o Math.min(porcentagemEstoque, 100) aqui:
                                        width: `${Math.min(porcentagemEstoque, 100)}%`,
                                        background: corEstoque,
                                        height: '100%',
                                        borderRadius: '4px',
                                        transition: 'width 0.4s ease'
                                    }}
                                ></div>
                            </div>
                            <div className={styles.progressMinMax} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '6px' }}>
                                <span>Mín: {produto.estoque_minimo || 0} {unidadeMedida}</span>
                                <span>Máx: {produto.estoque_maximo || 0} {unidadeMedida}</span>
                            </div>
                        </div>

                        <div className={styles.statsGrid}>
                            <div className={styles.statBox}>
                                <AlertTriangle size={20} color="#64748b" />
                                <div><p>Estoque Mínimo</p><strong>{produto.estoque_minimo || 0} ({unidadeMedida})</strong></div>
                            </div>
                            <div className={styles.statBox}>
                                <BarChart2 size={20} color="#64748b" />
                                <div><p>Estoque Máximo</p><strong>{produto.estoque_maximo || 0} ({unidadeMedida})</strong></div>
                            </div>
                            <div className={styles.statBox}>
                                <Package size={20} color="#64748b" />
                                <div><p>Preço Custo</p><strong>R$ {produto.preco_custo ? Number(produto.preco_custo).toFixed(2).replace('.', ',') : "0,00"}</strong></div>
                            </div>
                            <div className={styles.statBox}>
                                <CheckCircle size={20} color="#22c55e" />
                                <div><p>Preço Venda</p><strong>R$ {produto.preco_venda ? Number(produto.preco_venda).toFixed(2).replace('.', ',') : "0,00"}</strong></div>
                            </div>
                            <div className={styles.statBox}>
                                <Layers size={20} color="#3b82f6" />
                                <div><p>Lucro Unitário</p><strong>R$ {lucroUnitario.replace('.', ',')}</strong></div>
                            </div>
                            <div className={styles.statBox}>
                                {/* RENDERIZAÇÃO CONDICIONAL DO ÍCONE AQUI */}
                                {produto.produto_ativo == 1 || produto.produto_ativo === true || produto.produto_ativo === '1' ? (
                                    <CheckCircle size={20} color="#22c55e" />
                                ) : (
                                    <XCircle size={20} color="#ef4444" />
                                )}
                                <div>
                                    <p>Item Ativo</p>
                                    <strong>
                                        {produto.produto_ativo == 1 || produto.produto_ativo === true || produto.produto_ativo === '1' ? "Sim" : "Não"}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ANÁLISE DE ESTOQUE */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}><BarChart2 size={20} /> Análise de Estoque</div>
                        <p className={styles.subtitle}>Visualização do movimento e tendências de estoque</p>

                        <div className={styles.chartPlaceholder} style={{ width: '100%', height: 300, marginTop: '20px', backgroundColor: 'transparent', border: 'none' }}>
                            {dadosGrafico.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                            stroke={theme === 'dark' ? '#334155' : '#e2e8f0'}
                                        />
                                        <XAxis
                                            dataKey="data"
                                            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }}
                                            contentStyle={{
                                                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                                                borderRadius: '8px',
                                                border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                                                color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                            }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        <Bar dataKey="saidas" name="Saídas (ou Vendas)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                    Nenhum dado de movimentação para exibir no gráfico.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUNA DIREITA */}
                <div className={styles.rightColumn}>

                    {/* ALERTAS */}
                    <div className={styles.card}>
                        <div className={styles.cardHeaderFlex}>
                            <div className={styles.cardTitle}><AlertTriangle size={20} /> Alertas</div>
                            <span className={styles.badgeDangerFilled}>
                                {Number(produto.estoque_atual) < Number(produto.estoque_minimo) ? "1 ativo" : "0 ativos"}
                            </span>
                        </div>

                        <div className={styles.alertList}>
                            {Number(produto.estoque_atual) < Number(produto.estoque_minimo) ? (
                                <div className={`${styles.alertItem} ${styles.alertDanger}`}>
                                    <AlertTriangle size={20} />
                                    <div>
                                        <strong>Estoque Abaixo do Mínimo</strong>
                                        <p>O estoque atual está abaixo do mínimo recomendado ({produto.estoque_minimo} {unidadeMedida}).</p>
                                    </div>
                                </div>
                            ) : Number(produto.estoque_atual) === Number(produto.estoque_minimo) ? (
                                <div className={`${styles.alertItem} ${styles.alertWarning}`} style={{ display: 'flex', gap: '12px', padding: '12px', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '8px' }}>
                                    <AlertTriangle size={20} />
                                    <div>
                                        <strong>Estoque no Limite</strong>
                                        <p>O estoque atingiu exatamente a margem mínima ({produto.estoque_minimo} {unidadeMedida}).</p>
                                    </div>
                                </div>
                            ) : (
                                <div className={`${styles.alertItem} ${styles.alertSuccess}`}>
                                    <CheckCircle size={20} color="#22c55e" />
                                    <div>
                                        <strong>Nenhum alerta crítico</strong>
                                        <p>Os níveis atuais de estoque estão operando de forma saudável.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DETALHES DO PRODUTO */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}>Detalhes do Produto</div>
                        <div className={styles.detailsList}>
                            <div className={styles.detailItem}>
                                <Package size={16} />
                                <div><p>SKU</p><strong>{produto.sku}</strong></div>
                            </div>
                            <div className={styles.detailItem}>
                                <Layers size={16} />
                                <div><p>Tipo de Unidade</p><strong>{unidadeMedida.toUpperCase()}</strong></div>
                            </div>
                            <div className={styles.detailItem}>
                                <Package size={16} />
                                <div><p>Marca</p><strong>{produto.marca || "Não Informada"}</strong></div>
                            </div>
                            <div className={styles.detailItem}>
                                <MapPin size={16} />
                                <div><p>Localização no Depósito</p><strong>{produto.localizacao || "Não informada"}</strong></div>
                            </div>
                        </div>
                        <hr className={styles.divider} />
                        <div className={styles.description}>
                            <strong>Descrição do Produto</strong>
                            <p>{produto.descricao || "Nenhuma descrição informada para este produto."}</p>
                        </div>
                    </div>

                    {/* INFORMAÇÕES DO FORNECEDOR */}
                    <div className={styles.card}>
                        <div className={styles.cardTitle}>Informações do Fornecedor</div>
                        <div className={styles.supplierHeader}>
                            <div className={styles.supplierIcon}><Truck size={24} /></div>
                            <div>
                                <strong>{produto.fornecedor_nome || "Distribuidora Central"}</strong>
                                <span className={styles.badgeSuccess}>Homologado</span>
                            </div>
                        </div>
                        <div className={styles.supplierContact}>
                            <p><Phone size={14} /> {produto.fornecedor_telefone || "(11) 3456-7890"}</p>
                            <p><Mail size={14} /> {produto.fornecedor_email || "pedidos@distribuidoracentral.com.br"}</p>
                            <p><MapPin size={14} /> {produto.fornecedor_endereco || "Av. das Nações Unidas, 1500 - São Paulo, SP"}</p>
                        </div>
                    </div>


                </div>
            </div>

            {/* HISTÓRICO DE MOVIMENTAÇÃO */}
            <div className={styles.tableCardSection}>
                <div className={styles.cardHistorico}>
                    <div className={styles.cardTitle}>Histórico de Movimentação</div>
                    <p className={styles.subtitle}>Registro de todas as movimentações recentes deste material</p>

                    <div className={styles.tableControls}>
                        <div className={styles.searchBar} style={{ flex: 1 }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por notas, usuário ou fornecedor..."
                                value={buscaMovimentacao}
                                onChange={(e) =>
                                    setBuscaMovimentacao(e.target.value)
                                }
                            />
                        </div>
                        <select
                            className={styles.btnFilter}
                            value={filtroTipo}
                            onChange={(e) =>
                                setFiltroTipo(e.target.value)
                            }
                        >
                            <option>Todos</option>
                            <option>Entrada</option>
                            <option>Saida</option>
                            <option>Venda</option>
                        </select>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Tipo</th>
                                    <th>Quantidade</th>
                                    <th>Usuário</th>
                                    <th>Fornecedor</th>
                                </tr>
                            </thead>
                            <tbody>

                                {movimentacoesFiltradas.length > 0 ? (

                                    movimentacoesFiltradas.map((mov) => {

                                        const data = new Date(mov.criado_em);

                                        return (

                                            <tr key={mov.id}>

                                                <td>
                                                    {data.toLocaleDateString("pt-BR")}
                                                    <br />

                                                    <span>
                                                        {data.toLocaleTimeString(
                                                            "pt-BR",
                                                            {
                                                                hour: "2-digit",
                                                                minute: "2-digit"
                                                            }
                                                        )}
                                                    </span>
                                                </td>

                                                <td>

                                                    <span
                                                        className={
                                                            mov.tipo === "Entrada"
                                                                ? styles.badgeSuccess
                                                                : styles.badgeDanger
                                                        }
                                                    >
                                                        {mov.tipo}
                                                    </span>

                                                </td>

                                                <td
                                                    className={
                                                        mov.tipo === "Entrada"
                                                            ? styles.textSuccess
                                                            : styles.textDanger
                                                    }
                                                >
                                                    {mov.tipo === "Entrada"
                                                        ? "+"
                                                        : "-"}

                                                    {mov.quantidade}

                                                    {" "}

                                                    {unidadeMedida}
                                                </td>

                                                <td>
                                                    {mov.usuario_nome || "Sistema"}
                                                </td>

                                                <td>
                                                    {mov.fornecedor_nome || "-"}
                                                </td>

                                            </tr>

                                        );

                                    })

                                ) : (

                                    <tr>

                                        <td
                                            colSpan="5"
                                            style={{
                                                textAlign: "center",
                                                padding: "30px"
                                            }}
                                        >
                                            Nenhuma movimentação encontrada.
                                        </td>

                                    </tr>

                                )}

                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}