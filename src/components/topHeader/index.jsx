// Arquivo: index.jsx (Seu componente TopHeader)
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../Context/ThemeContext';
import { useNotification } from '../Context/NotificationContext';
import styles from './styles.module.css';
import { Bell, Sun, Moon, User, LogOut } from 'lucide-react';
import { api } from "../../services/api.js";
import { useAuth } from "../../contexts/authContext.jsx";

const TopHeader = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    // MODIFICADO: Puxando a nova função limparSininho ao invés de limparNotificacoes
    const { notificacoes, limparSininho, marcarComoLida } = useNotification();

    // FILTRO INTELIGENTE DO SININHO:
    // Apenas mostra se a notificação NÃO for lida E for criada HOJE.
    const notificacoesNaoLidas = notificacoes.filter(notif => {
        if (notif.lida) return false; // Se já clicou no X ou em Limpar, não exibe no sininho

        const dataNotifRaw = notif.criado_em || notif.data || notif.createdAt;
        if (!dataNotifRaw) return true;

        const dataNotif = new Date(dataNotifRaw).toLocaleDateString('pt-BR');
        const hoje = new Date().toLocaleDateString('pt-BR');

        return dataNotif === hoje; // Se virou o dia (data != hoje), some do sininho!
    });

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
    const dropdownRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [resultados, setResultados] = useState([]);
    const [bancoDeDados, setBancoDeDados] = useState([]);

    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);
    const formatRouteName = (name) => {
        const decoded = decodeURIComponent(name).replace(/-/g, ' ');
        return decoded.charAt(0).toUpperCase() + decoded.slice(1);
    };

    useEffect(() => {
        function handleClickFora(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setNotificacoesAbertas(false);
            }
        }
        document.addEventListener("mousedown", handleClickFora);
        return () => document.removeEventListener("mousedown", handleClickFora);
    }, []);

    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            const buscaFiltrada = bancoDeDados.filter((item) =>
                item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.categoria_nome || "").toLowerCase().includes(searchQuery.toLowerCase())
            );
            setResultados(buscaFiltrada);
        } else {
            setResultados([]);
        }
    }, [searchQuery, bancoDeDados]);

    const handleAction = (path) => {
        navigate(path);
        setSearchQuery('');
        setIsUserMenuOpen(false);
    };

    useEffect(() => {
        async function carregarProdutos() {
            try {
                const response = await api.get("/produtos");
                setBancoDeDados(response.data);
            } catch (error) {
                console.log("Erro ao carregar produtos:", error);
            }
        }
        carregarProdutos();
    }, []);

    async function handleLogout() {
        await logout();
        setIsUserMenuOpen(false);
        navigate("/login");
    }

    async function excluirProduto(id) {
        const confirmar = window.confirm("Deseja realmente excluir este produto?");
        if (!confirmar) return;

        try {
            await api.delete(`/produtos/${id}`);
            setBancoDeDados(prev => prev.filter(produto => produto.id !== id));
            setResultados(prev => prev.filter(produto => produto.id !== id));
            alert("Produto excluído com sucesso!");
        } catch (error) {
            console.log(error);
            alert("Erro ao excluir produto.");
        }
    }

    return (
        <header className={`${styles.topHeader} ${theme === 'dark' ? styles.darkHeader : ''}`}>

            {/* ESQUERDA: Rotas */}
            <div className={styles.headerBreadcrumb}>
                <span className={styles.textMuted}>
                    <Link to="/" className={styles.breadcrumbLink}>Dashboard</Link>
                    {pathnames.map((value, index) => {
                        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                        const isLast = index === pathnames.length - 1;
                        return (
                            <span key={to}>
                                {' > '}
                                {isLast ? (
                                    <b className={styles.breadcrumbActive}>{formatRouteName(value)}</b>
                                ) : (
                                    <Link to={to} className={styles.breadcrumbLink}>{formatRouteName(value)}</Link>
                                )}
                            </span>
                        );
                    })}
                </span>
            </div>

            {/* CENTRO: Busca */}
            <div className={styles.searchContainer}>
                <input
                    type="text"
                    placeholder="Buscar produto ou categoria..."
                    className={styles.searchInput}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {resultados.length > 0 && (
                    <div className={styles.searchResults}>
                        {resultados.map(item => (
                            <div key={item.id} className={styles.searchItem}>
                                <div>
                                    <strong>{item.nome}</strong>
                                    <span className={styles.categoryBadge}>{item.categoria_nome || "Sem categoria"}</span>
                                </div>
                                <div className={styles.searchActions}>
                                    <button onClick={() => handleAction(`/produtos/${item.id}`)} className={styles.btnActionText}>Detalhes</button>
                                    <button onClick={() => handleAction(`/produtos/${item.id}/editar`)} className={styles.btnActionText}>Editar</button>
                                    <button onClick={() => excluirProduto(item.id)} className={styles.btnActionText} style={{ color: '#ef4444' }}>Excluir</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* DIREITA: Temas e Usuário */}
            <div className={styles.headerActions}>
                <button onClick={toggleTheme} className={styles.themeToggleBtn}>
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} color="#f97316" />}
                </button>

                <div className={styles.iconDivider}></div>

                {/* =========================================
                    AQUI COMEÇA A ESTRUTURA DO SININHO 
                    ========================================= */}
                <div className={styles.bellWrapper} ref={dropdownRef}>
                    <button
                        className={styles.bellButton}
                        onClick={() => setNotificacoesAbertas(!notificacoesAbertas)}
                    >
                        <Bell size={20} color="#718096" />
                        {notificacoesNaoLidas.length > 0 && (
                            <span className={styles.badge}>{notificacoesNaoLidas.length}</span>
                        )}
                    </button>

                    {notificacoesAbertas && (
                        <div className={`${styles.dropdownCard} ${theme === 'dark' ? styles.darkTheme : ''}`}>
                            <div className={styles.dropdownHeader}>
                                <h4 style={{ margin: 0, fontSize: '1rem' }}>Notificações</h4>
                                {/* O COMENTÁRIO FOI MOVIDO PARA CÁ PARA EVITAR O ERRO */}
                                {/* MODIFICADO: Chama limparSininho para apenas mascarar/ler em vez de apagar do banco */}
                                {notificacoesNaoLidas.length > 0 && (
                                    <button onClick={limparSininho} className={styles.clearBtn}>Limpar</button>
                                )}
                            </div>

                            <div className={styles.dropdownBody}>
                                {notificacoesNaoLidas.length === 0 ? (
                                    <p style={{ padding: '16px', color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                                        Nenhuma notificação nova.
                                    </p>
                                ) : (
                                    notificacoesNaoLidas.map((notif) => (
                                        <a key={notif.id} href={notif.link} className={styles.notifItem}>

                                            <div className={styles.notifContent}>
                                                <strong>{notif.titulo}</strong>
                                                <p>{notif.descricao}</p>
                                            </div>

                                            <button
                                                className={styles.deleteNotifBtn}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    marcarComoLida(notif.id);
                                                }}
                                                title="Marcar como lida"
                                            >
                                                X
                                            </button>
                                        </a>
                                    ))
                                )}
                            </div>

                            <div style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
                                <a href="/historico-notificacoes" style={{ fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
                                    Ver histórico completo
                                </a>
                            </div>

                        </div>
                    )}
                </div>
                {/* =========================================
                    FIM DA ESTRUTURA DO SININHO 
                    ========================================= */}

                <div className={styles.userSection}>
                    <div className={styles.userProfile} onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                        <div className={styles.userAvatar}>JD</div>
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>João da Silva</span>
                            <span className={styles.userRole}>Gerente</span>
                        </div>
                    </div>

                    {isUserMenuOpen && (
                        <>
                            <div className={styles.modalOverlay} onClick={() => setIsUserMenuOpen(false)} />
                            <div className={styles.userDropdown}>
                                <div className={styles.dropdownItem}><User size={18} /> Ver perfil</div>
                                <div className={styles.dropdownItem} onClick={toggleTheme}>
                                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />} Tema {theme === 'light' ? 'Escuro' : 'Claro'}
                                </div>
                                <div className={styles.dropdownDivider}></div>
                                <div className={`${styles.dropdownItem} ${styles.logoutItem}`} onClick={handleLogout}>
                                    <LogOut size={18} /> Sair da conta
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopHeader;