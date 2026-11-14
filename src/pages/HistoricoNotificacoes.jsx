import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../components/Context/NotificationContext';
import { useTheme } from "../components/Context/ThemeContext";
import { Bell, Trash2, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import styles from "../styles/HistoricoNotificacoes.module.css";

const HistoricoNotificacoes = () => {
    const { notificacoes, removerNotificacao, removerMultiplasNotificacoes } = useNotification();
    const { theme } = useTheme();

    // Estados para seleção e Modal
    const [selecionadas, setSelecionadas] = useState([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [idsParaExcluir, setIdsParaExcluir] = useState([]);

    const formatarHora = (dataString) => {
        const data = new Date(dataString);
        return new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit', minute: '2-digit'
        }).format(data);
    };

    const agruparNotificacoes = () => {
        const grupos = {};
        notificacoes.forEach(notif => {
            const dataNotif = notif.criado_em || notif.data || notif.createdAt;

            if (!dataNotif) {
                if (!grupos["Antigas"]) grupos["Antigas"] = [];
                grupos["Antigas"].push(notif);
                return;
            }

            const objData = new Date(dataNotif);
            const hoje = new Date();

            // Zerando as horas para comparar apenas os dias
            const dataSemHora = new Date(objData.getFullYear(), objData.getMonth(), objData.getDate());
            const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
            const diffDias = Math.floor((hojeSemHora - dataSemHora) / (1000 * 60 * 60 * 24));

            const dataExtensa = new Intl.DateTimeFormat('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            }).format(objData);

            let chaveGrupo = "";
            if (diffDias === 0) chaveGrupo = `Hoje - ${dataExtensa}`;
            else if (diffDias === 1) chaveGrupo = `Ontem - ${dataExtensa}`;
            else chaveGrupo = dataExtensa.charAt(0).toUpperCase() + dataExtensa.slice(1);

            if (!grupos[chaveGrupo]) grupos[chaveGrupo] = [];
            grupos[chaveGrupo].push(notif);
        });
        return grupos;
    };

    const notificaçõesAgrupadas = agruparNotificacoes();

    // ==========================================
    // Funções de Seleção e Exclusão
    // ==========================================
    const toggleSelecao = (id) => {
        setSelecionadas(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const selecionarTodas = () => {
        if (selecionadas.length === notificacoes.length) {
            setSelecionadas([]); // Desmarca tudo
        } else {
            setSelecionadas(notificacoes.map(n => n.id)); // Marca tudo
        }
    };

    const abrirModalExclusao = (id = null) => {
        if (id) {
            setIdsParaExcluir([id]);
        } else {
            setIdsParaExcluir(selecionadas);
        }
        setModalAberto(true);
    };

    const confirmarExclusao = async () => {
        if (idsParaExcluir.length === 1) {
            await removerNotificacao(idsParaExcluir[0]);
        } else if (idsParaExcluir.length > 1) {
            await removerMultiplasNotificacoes(idsParaExcluir);
        }

        setSelecionadas(prev => prev.filter(id => !idsParaExcluir.includes(id)));
        setIdsParaExcluir([]);
        setModalAberto(false);
    };

    return (
        <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <div className={styles.iconWrapper}>
                        <Bell size={24} className={styles.titleIcon} />
                    </div>
                    <div>
                        <h1 className={styles.title}>Histórico de Notificações</h1>
                        <p className={styles.subtitle}>
                            Acompanhe e gerencie todos os avisos, alertas e atualizações do sistema.
                        </p>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    {notificacoes.length > 0 && (
                        <div className={styles.selectionControls}>
                            <label className={styles.selectAllBtn}>
                                <input
                                    type="checkbox"
                                    checked={selecionadas.length > 0 && selecionadas.length === notificacoes.length}
                                    onChange={selecionarTodas}
                                    className={styles.customCheckbox}
                                />
                                Selecionar Tudo
                            </label>

                            {selecionadas.length > 0 && (
                                <button
                                    className={styles.bulkDeleteBtn}
                                    onClick={() => abrirModalExclusao()}
                                >
                                    <Trash2 size={16} />
                                    Excluir ({selecionadas.length})
                                </button>
                            )}
                        </div>
                    )}
                    <div className={styles.stats}>
                        <span>Total: <strong>{notificacoes.length}</strong></span>
                    </div>
                </div>
            </header>

            <div className={styles.listContainer}>
                {notificacoes.length === 0 ? (
                    <div className={styles.emptyState}>
                        <CheckCircle size={48} className={styles.emptyIcon} />
                        <h3>Tudo limpo por aqui!</h3>
                        <p>Você não possui nenhuma notificação no seu histórico no momento.</p>
                    </div>
                ) : (
                    Object.keys(notificaçõesAgrupadas).map((grupo) => (
                        <div key={grupo} className={styles.groupContainer}>
                            <h2 className={styles.groupHeader}>{grupo}</h2>

                            <div className={styles.groupList}>
                                {notificaçõesAgrupadas[grupo].map((notif) => (
                                    <div key={notif.id} className={`${styles.card} ${!notif.lida ? styles.unread : styles.read} ${selecionadas.includes(notif.id) ? styles.cardSelected : ''}`}>

                                        <div className={styles.checkboxWrapper}>
                                            <input
                                                type="checkbox"
                                                checked={selecionadas.includes(notif.id)}
                                                onChange={() => toggleSelecao(notif.id)}
                                                className={styles.customCheckbox}
                                            />
                                        </div>

                                        <div className={styles.cardContent}>
                                            <div className={styles.cardHeader}>
                                                <h3 className={styles.notifTitle}>{notif.titulo}</h3>
                                                {/* Exibe selo NOVA se a notificação não foi lida */}
                                                {!notif.lida && <span className={styles.badgeNew}>Nova</span>}
                                            </div>
                                            <p className={styles.notifDesc}>{notif.descricao}</p>

                                            <div className={styles.cardFooter}>
                                                <span className={styles.metaItem}>
                                                    <Clock size={14} />
                                                    {notif.criado_em || notif.data || notif.createdAt ? formatarHora(notif.criado_em || notif.data || notif.createdAt) : '--:--'}
                                                </span>
                                                {notif.link && (
                                                    <Link to={notif.link} className={styles.linkAction}>
                                                        <ExternalLink size={14} />
                                                        Acessar página
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.cardActions}>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={() => abrirModalExclusao(notif.id)}
                                                title="Excluir"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL DE CONFIRMAÇÃO */}
            {modalAberto && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}>Confirmar Exclusão</h2>
                        <p className={styles.modalText}>
                            Tem certeza de que deseja excluir
                            {idsParaExcluir.length === 1 ? " esta notificação?" : ` as ${idsParaExcluir.length} notificações selecionadas?`}
                            <br /><br />Esta ação não poderá ser desfeita.
                        </p>

                        <div className={styles.modalButtons}>
                            <button
                                className={styles.btnCancel}
                                onClick={() => setModalAberto(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className={styles.btnConfirm}
                                onClick={confirmarExclusao}
                            >
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoricoNotificacoes;