import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TrendingUp, AlertTriangle } from 'lucide-react';
import { api } from "../services/api.js";
import { useTheme } from "../components/Context/ThemeContext";
import styles from '../styles/Categorias.module.css';

const Categorias = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();

    const [topCards, setTopCards] = useState({
        totalProdutos: 0,
        valorTotal: "0",
        categoriasAtivas: 0,
        alertas: 0
    });

    const [categorias, setCategorias] = useState([]);

    useEffect(() => {

        async function carregarCategorias() {

            try {

                const response = await api.get("/produtos/categorias");

                // ------------------------------------------------------------------
                // CÓDIGO TEMPORÁRIO: Simulação de crescimento para testar o visual
                // ------------------------------------------------------------------
                const categoriasComCrescimento = response.data.map(cat => {
                    // Gera um número aleatório entre 1 e 25 só para você ver na tela
                    const valorAleatorio = Math.floor(Math.random() * 25) + 1;

                    return {
                        ...cat,
                        // Aqui estamos injetando a propriedade que o frontend espera
                        crescimento: `+${valorAleatorio}%`
                    };
                });

                setCategorias(categoriasComCrescimento); // Usamos a lista simulada
                // ------------------------------------------------------------------

                // cálculos automáticos dos cards
                const totalCategorias = response.data.length;

                const totalProdutos = response.data.reduce((acc, cat) => {
                    return acc + Number(cat.produtos || 0);
                }, 0);

                const valorTotal = response.data.reduce((acc, cat) => {
                    return acc + Number(cat.valor || 0);
                }, 0);

                const totalAlertas = response.data.reduce((acc, cat) => {
                    return acc + Number(cat.alertas || 0);
                }, 0);

                setTopCards({
                    totalProdutos,
                    valorTotal: valorTotal.toLocaleString("pt-BR"),
                    categoriasAtivas: totalCategorias,
                    alertas: totalAlertas
                });

            } catch (error) {

                console.log(error);

            }

        }

        carregarCategorias();

    }, []);

    const handleCategoriaClick = (categoriaId) => {

        navigate(`/categorias/${categoriaId}`);

    };

    return (
        <div
            className={`
                ${styles.container}
                ${theme === "dark" ? styles.darkTheme : ""}
            `}
        >

            {/* Cabeçalho */}
            <div className={styles.header}>
                <h1 className={styles.title}>Categorias & Relatórios</h1>

                <p className={styles.subtitle}>
                    Analise o desempenho do inventário por categorias de materiais de construção.
                </p>
            </div>

            {/* Top Cards */}
            <div className={styles.topCards}>

                <div className={styles.topCard}>

                    <div className={styles.topCardHeader}>

                        <div className={styles.topCardIcon}>
                            <Box size={20} color="#64748b" />
                        </div>

                        {/* <span className={styles.topCardGrowth}>
                            +12%
                        </span> */}

                    </div>

                    <h3 className={styles.topCardValue}>
                        {topCards.totalProdutos}
                    </h3>

                    <p className={styles.topCardText}>
                        Total de Produtos
                    </p>

                </div>

                <div className={styles.topCard}>

                    <div className={styles.topCardHeader}>

                        <div className={styles.topCardIcon}>
                            <TrendingUp size={20} color="#64748b" />
                        </div>

                    </div>

                    <h3 className={styles.topCardValue}>
                        R$ {topCards.valorTotal}
                    </h3>

                    <p className={styles.topCardText}>
                        Valor em Estoque
                    </p>

                </div>

                <div className={styles.topCard}>

                    <div className={styles.topCardHeader}>

                        <div className={styles.topCardIcon}>
                            <Box size={20} color="#64748b" />
                        </div>

                    </div>

                    <h3 className={styles.topCardValue}>
                        {topCards.categoriasAtivas}
                    </h3>

                    <p className={styles.topCardText}>
                        Categorias Ativas
                    </p>

                </div>

                <div className={styles.topCard}>

                    <div className={styles.topCardHeader}>

                        <div className={styles.topCardIcon}>
                            <AlertTriangle size={20} color="#64748b" />
                        </div>

                    </div>

                    <h3 className={styles.topCardValue}>
                        {topCards.alertas}
                    </h3>

                    <p className={styles.topCardText}>
                        Alertas
                    </p>

                </div>

            </div>

            {/* Seção */}
            <div className={styles.sectionHeader}>

                <h2 className={styles.sectionTitle}>
                    Categorias de Materiais
                </h2>

                <span className={styles.sectionSubtitle}>
                    Clique em uma categoria para ver o relatório detalhado
                </span>

                <button
                    onClick={() => navigate("/categorias/CadastrarCategoria")}
                    className={styles.newButton}
                >
                    + Nova Categoria
                </button>

            </div>

            {/* Grid */}
            <div className={styles.grid}>

                {categorias.map((cat) => (

                    <div
                        key={cat.id}
                        onClick={() => handleCategoriaClick(cat.id)}
                        className={styles.card}
                    >

                        <div className={styles.cardHeader}>

                            <div
                                className={styles.iconBox}
                                style={{
                                    backgroundColor: `${cat.cor}20`
                                }}
                            >
                                <Box size={24} color={cat.cor} />
                            </div>

                            <span className={styles.alertBadge}>
                                <AlertTriangle size={12} />
                                {cat.alertas || 0}
                            </span>

                        </div>

                        <h3 className={styles.cardTitle}>
                            {cat.nome}
                        </h3>

                        <p className={styles.cardProducts}>
                            {cat.produtos || 0} produtos
                        </p>

                        <p className={styles.stockText}>
                            Valor em estoque
                        </p>

                        <div className={styles.stockRow}>

                            <span className={styles.stockValue}>
                                R$ {Number(cat.valor || 0).toLocaleString("pt-BR")}
                            </span>

                        </div>

                        <div className={styles.growthRow}>

                            <TrendingUp size={14} />

                            <span>
                                {cat.crescimento || "+0%"} este mês
                            </span>

                        </div>

                    </div>

                ))}

            </div>

        </div>
    );
};

export default Categorias;