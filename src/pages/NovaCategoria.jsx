import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Save, ArrowLeft, Palette, AlertTriangle, TrendingUp } from 'lucide-react';
import styles from '../styles/NovaCategoria.module.css';
import { api } from "../services/api";
import { useTheme } from "../components/Context/ThemeContext";

// Importações dos contextos de notificação e toast
import { useNotification } from "../components/Context/NotificationContext.jsx";
import { useToast } from '../components/Context/ToastContext';

const NovaCategoria = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { addNotification } = useNotification();
    const { addToast } = useToast();

    const [categoria, setCategoria] = useState({
        nome: '',
        descricao: '',
        cor: '#f97316',
        status: 'ativa'
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCategoria((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/produtos/categorias', categoria);

            addToast('Categoria cadastrada com sucesso!', 'success');

            addNotification(
                "Nova Categoria",
                `A categoria ${categoria.nome} foi adicionada.`,
                "/categorias"
            );

            setTimeout(() => {
                navigate('/categorias');
            }, 1500);

        } catch (error) {
            console.error("Erro ao cadastrar categoria:", error);
            addToast('Erro ao cadastrar categoria.', 'error');
            addNotification(
                "Erro de Cadastro",
                "Não foi possível salvar a nova categoria.",
                ""
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`}>

            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1>Nova Categoria</h1>
                    <p>Cadastre uma nova categoria para organização do estoque.</p>
                </div>

                {/* <button
                    className={styles.backButton}
                    onClick={() => navigate('/categorias')}
                >
                    <ArrowLeft size={18} />
                    Voltar
                </button> */}
            </div>

            {/* Grid Principal: Dividido em 2 colunas */}
            <div className={styles.contentGrid}>

                {/* COLUNA ESQUERDA: Formulário */}
                <div className={styles.leftColumn}>
                    <form className={styles.card} onSubmit={handleSubmit}>
                        <div className={styles.cardHeader}>
                            <Package size={24} />
                            <h2>Informações da Categoria</h2>
                        </div>

                        {/* Nome */}
                        <div className={styles.inputGroup}>
                            <label>Nome da Categoria *</label>
                            <input
                                type="text"
                                name="nome"
                                placeholder="Ex: Ferramentas"
                                value={categoria.nome}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Descrição */}
                        <div className={styles.inputGroup}>
                            <label>Descrição</label>
                            <textarea
                                name="descricao"
                                placeholder="Descreva a categoria"
                                rows="3"
                                value={categoria.descricao}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Linha (Cor e Status) */}
                        <div className={styles.row}>
                            <div className={styles.inputGroup}>
                                <label>
                                    <Palette size={16} />
                                    Cor da Categoria
                                </label>
                                <div className={styles.colorRow}>
                                    <input
                                        type="color"
                                        name="cor"
                                        value={categoria.cor}
                                        onChange={handleChange}
                                        className={styles.colorInput}
                                    />
                                    <span className={styles.colorCode}>
                                        {categoria.cor}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Status *</label>
                                <select
                                    name="status"
                                    value={categoria.status}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="ativa">Ativa</option>
                                    <option value="inativa">Inativa</option>
                                </select>
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.cancelButton}
                                onClick={() => navigate('/categorias')}
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                className={styles.saveButton}
                                disabled={loading}
                            >
                                <Save size={18} />
                                {loading ? 'Salvando...' : 'Salvar Categoria'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* COLUNA DIREITA: Pré-visualização do Card */}
                <div className={styles.rightColumn}>
                    <div className={styles.previewContainer}>
                        <h3 className={styles.previewSectionTitle}>
                            Pré-visualização do Card
                        </h3>
                        <p className={styles.previewHelperText}>
                            É assim que a categoria aparecerá na tela de Categorias.
                        </p>

                        {/* Card idêntico ao da tela de categorias */}
                        <div className={styles.categoryCardPreview}>
                            <div className={styles.cardPreviewHeader}>
                                <div
                                    className={styles.iconBox}
                                    style={{
                                        backgroundColor: `${categoria.cor}20`,
                                        color: categoria.cor
                                    }}
                                >
                                    <Package size={24} />
                                </div>
                                <div className={styles.alertBadgePreview}>
                                    <AlertTriangle size={14} /> 0
                                </div>
                            </div>

                            <div className={styles.cardPreviewBody}>
                                <h4>{categoria.nome || 'Nome da Categoria'}</h4>
                                <span>0 produtos</span>
                            </div>

                            <div className={styles.cardPreviewFooter}>
                                <div className={styles.stockValue}>
                                    <span>Valor em estoque</span>
                                    <strong>R$ 0</strong>
                                </div>
                                <div className={styles.trendIndicator}>
                                    <TrendingUp size={14} /> <span>+0% este mês</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default NovaCategoria;