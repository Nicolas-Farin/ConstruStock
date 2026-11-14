import React, { useState, useEffect } from 'react';
import {
    Building2,
    User,
    Phone,
    Search,
    RefreshCw,
    Trash2,
    TriangleAlert,
    UserPlus,
    Pencil
} from "lucide-react";

import { useTheme } from "../components/Context/ThemeContext";
import { useToast } from "../components/Context/ToastContext";
import { useNotification } from "../components/Context/NotificationContext";
import styles from '../styles/ListarFornecedores.module.css';

export default function ListarFornecedores() {
    const { theme } = useTheme();
    const { addToast } = useToast();
    const { addNotification } = useNotification();

    // Estados da página
    const [fornecedores, setFornecedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [busca, setBusca] = useState('');
    const [fornecedorSelecionado, setFornecedorSelecionado] = useState(null);

    const [modoEdicao, setModoEdicao] = useState(false);   // NOVO
    const [formEdicao, setFormEdicao] = useState({});      // NOVO
    const [salvandoEdicao, setSalvandoEdicao] = useState(false); // NOVO

    // NOVO: estado do modal de confirmação de exclusão
    const [modalExcluir, setModalExcluir] = useState({
        isOpen: false,
        fornecedor: null
    });

    const abrirModal = (fornecedor) => {
        setFornecedorSelecionado(fornecedor);
        setModoEdicao(false); // NOVO
    };

    const fecharModal = () => {
        setFornecedorSelecionado(null);
        setModoEdicao(false); // NOVO
    };

    const handleExcluirClick = (fornecedor) => {
        setFornecedorSelecionado(null); // fecha o modal de detalhes
        setModalExcluir({ isOpen: true, fornecedor });
    };

    const fecharModalExcluir = () => {
        setModalExcluir({ isOpen: false, fornecedor: null });
    };

    // ==========================================
    // NOVO: EDIÇÃO DE FORNECEDOR
    // ==========================================
    const iniciarEdicao = (fornecedor) => {
        setFormEdicao({
            nome: fornecedor.nome || '',
            nome_fantasia: fornecedor.nome_fantasia || '',
            responsavel: fornecedor.responsavel || '',
            email: fornecedor.email || '',
            telefone: fornecedor.telefone || '',
            celular: fornecedor.celular || '',
            inscricao_estadual: fornecedor.inscricao_estadual || '',
            endereco: fornecedor.endereco || '',
            numero: fornecedor.numero || '',
            cep: fornecedor.cep || '',
            observacoes: fornecedor.observacoes || ''
        });
        setModoEdicao(true);
    };

    const cancelarEdicao = () => {
        setModoEdicao(false);
        setFormEdicao({});
    };

    const handleChangeEdicao = (campo, valor) => {
        setFormEdicao(prev => ({ ...prev, [campo]: valor }));
    };

    const salvarEdicao = async () => {
        if (!fornecedorSelecionado) return;

        if (!formEdicao.nome || !formEdicao.email) {
            addToast("Nome e Email são obrigatórios.", "error");
            return;
        }

        setSalvandoEdicao(true);
        try {
            const response = await fetch(
                `http://localhost:3000/produtos/fornecedores/${fornecedorSelecionado.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        empresa: formEdicao.nome,
                        nome_fantasia: formEdicao.nome_fantasia,
                        responsavel: formEdicao.responsavel,
                        email: formEdicao.email,
                        telefone: formEdicao.telefone,
                        celular: formEdicao.celular,
                        inscricaoEstadual: formEdicao.inscricao_estadual,
                        endereco: formEdicao.endereco,
                        numero: formEdicao.numero,
                        cep: formEdicao.cep,
                        observacoes: formEdicao.observacoes
                    })
                }
            );

            if (!response.ok) {
                const dadosErro = await response.json().catch(() => ({}));
                throw new Error(dadosErro.erro || "Erro ao atualizar fornecedor.");
            }

            const fornecedorAtualizado = await response.json();

            setFornecedores(prev => prev.map(f => f.id === fornecedorAtualizado.id ? fornecedorAtualizado : f));
            setFornecedorSelecionado(fornecedorAtualizado);
            setModoEdicao(false);

            addToast("Fornecedor atualizado com sucesso!", "success");
            addNotification(
                "Fornecedor Atualizado",
                `Os dados do fornecedor ${fornecedorAtualizado.nome} foram atualizados.`,
                "/fornecedores"
            );
        } catch (error) {
            addToast(error.message || "Erro ao atualizar fornecedor.", "error");
        } finally {
            setSalvandoEdicao(false);
        }
    };

    const formatarTelefone = (telefone) => {
        if (!telefone) return "Não informado";

        const numero = telefone.replace(/\D/g, "");

        if (numero.length === 11) {
            return numero.replace(
                /(\d{2})(\d{5})(\d{4})/,
                "($1) $2-$3"
            );
        }

        if (numero.length === 10) {
            return numero.replace(
                /(\d{2})(\d{4})(\d{4})/,
                "($1) $2-$3"
            );
        }

        return telefone;
    };



    const formatarCNPJ = (cnpj) => {
        if (!cnpj) return "Não informado";

        const numero = cnpj.replace(/\D/g, "");

        if (numero.length !== 14) return cnpj;

        return numero.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            "$1.$2.$3/$4-$5"
        );
    };

    // Função para buscar os fornecedores no Backend
    const carregarFornecedores = async () => {
        setLoading(true);
        setErro(null);
        try {
            const response = await fetch("http://localhost:3000/produtos/fornecedores");
            if (!response.ok) {
                throw new Error("Não foi possível carregar os dados do servidor.");
            }
            const data = await response.json();
            setFornecedores(data);
        } catch (error) {
            console.error("Erro ao buscar fornecedores:", error);
            setErro("Falha ao conectar com o servidor. Verifique se o backend está ativo.");
            addToast("Erro ao carregar fornecedores.", "error"); // NOVO
        } finally {
            setLoading(false);
        }
    };

    const executarExclusao = async () => {
        const fornecedor = modalExcluir.fornecedor;
        if (!fornecedor) return;

        try {
            const response = await fetch(
                `http://localhost:3000/produtos/fornecedores/${fornecedor.id}`,
                { method: "DELETE" }
            );

            if (!response.ok) {
                const dadosErro = await response.json().catch(() => ({}));
                throw new Error(dadosErro.erro || "Erro ao excluir fornecedor.");
            }

            setFornecedores((prev) =>
                prev.filter(f => f.id !== fornecedor.id)
            );

            addToast("Fornecedor excluído com sucesso.", "success");
            addNotification(
                "Fornecedor Removido",
                `O fornecedor ${fornecedor.nome} foi excluído do sistema.`,
                "/fornecedores"
            );
        } catch (error) {
            addToast(error.message || "Erro ao excluir fornecedor.", "error");
        } finally {
            fecharModalExcluir();
        }
    };

    useEffect(() => {
        carregarFornecedores();
    }, []);

    const fornecedoresFiltrados = fornecedores.filter(f => {
        const nome = (f.nome || "").toLowerCase();
        const cnpj = String(f.cnpj || "").replace(/\D/g, "");
        const termo = busca.toLowerCase().trim();
        const termoNumero = busca.replace(/\D/g, "");

        const matchNome = nome.includes(termo);
        const matchCnpj = termoNumero.length > 0 && cnpj.includes(termoNumero); // NOVO: só compara CNPJ se houver dígitos

        return matchNome || matchCnpj;
    });

    return (
        <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`}>

            {/* Cabeçalho */}
            <div className={styles.header}>
                <div>
                    <h1>Fornecedores</h1>
                    <p>Consulte e gerencie todos os fornecedores cadastrados.</p>
                </div>

                <div className={styles.headerDireita}>
                    <button className={styles.btnSecundario} onClick={() => window.location.href = '/fornecedores/cadastrarfornecedor'}>
                        <UserPlus size={18} />
                        <span>Novo Fornecedor</span>
                    </button>

                    <button
                        onClick={carregarFornecedores}
                        className={styles.btnAtualizar}
                        title="Atualizar Lista"
                    >
                        <RefreshCw
                            size={18}
                            className={loading ? styles.girar : ""}
                        />
                    </button>
                </div>
            </div>

            {/* Pesquisa */}
            <div className={styles.searchBarWrapper}>
                <Search size={20} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Buscar por nome ou CNPJ..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {/* Loading */}
            {loading && (
                <div className={styles.statusInfo}>
                    <RefreshCw size={24} className={styles.girar} />
                    <p>Carregando fornecedores...</p>
                </div>
            )}

            {/* Erro */}
            {!loading && erro && (
                <div className={`${styles.statusInfo} ${styles.erroBox}`}>
                    <p>{erro}</p>
                    <button
                        onClick={carregarFornecedores}
                        className={styles.btnTentarNovamente}
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {/* Lista */}
            {!loading && !erro && (
                fornecedoresFiltrados.length === 0 ? (
                    <div className={styles.statusInfo}>
                        <p>Nenhum fornecedor encontrado.</p>
                    </div>
                ) : (
                    <div className={styles.listaGrid}>
                        {fornecedoresFiltrados.map((item) => (
                            <div key={item.id} className={styles.fornecedorCard}>

                                {/* Cabeçalho do Card */}
                                <div className={styles.cardHeader}>
                                    <div className={styles.empresaInfo}>
                                        <div className={styles.avatarEmpresa}>
                                            <Building2 size={28} />
                                        </div>
                                        <div>
                                            <h3>{item.nome}</h3>
                                            <span>{item.nome_fantasia || "Sem nome fantasia"}</span>
                                            <small>CNPJ: {formatarCNPJ(item.cnpj)}</small>
                                        </div>
                                    </div>
                                    <span
                                        className={
                                            Number(item.ativo) === 1
                                                ? styles.badgeAtivo
                                                : styles.badgeInativo
                                        }
                                    >
                                        {Number(item.ativo) === 1 ? "Ativo" : "Inativo"}
                                    </span>
                                </div>

                                {/* Informações Resumidas */}
                                <div className={styles.cardResumo}>
                                    <div className={styles.infoLinha}>
                                        <User size={16} />
                                        <span>{item.responsavel || "Sem responsável"}</span>
                                    </div>
                                    <div className={styles.infoLinha}>
                                        <Phone size={16} />
                                        <span>{formatarTelefone(item.telefone)}</span>
                                    </div>
                                    <div className={styles.infoLinha}>
                                        <span>📍</span>
                                        {/* Substituído a exibição da cidade pelo endereço geral */}
                                        <span>{item.endereco || "Endereço não informado"}</span>
                                    </div>
                                </div>

                                {/* Botão */}
                                <div className={styles.cardAcoes}>
                                    <button
                                        className={styles.btnDetalhes}
                                        onClick={() => abrirModal(item)}
                                    >
                                        Visualizar fornecedor
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {fornecedorSelecionado && (
                <div className={styles.modalOverlay} onClick={fecharModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.btnFechar} onClick={fecharModal}>✕</button>

                        {!modoEdicao ? (
                            <>
                                <h2>{fornecedorSelecionado.nome}</h2>
                                <h4>{fornecedorSelecionado.nome_fantasia}</h4>

                                <div className={styles.modalGrid}>
                                    <div><strong>CNPJ</strong><p>{formatarCNPJ(fornecedorSelecionado.cnpj)}</p></div>
                                    <div><strong>Responsável</strong><p>{fornecedorSelecionado.responsavel || "-"}</p></div>
                                    <div><strong>Email</strong><p>{fornecedorSelecionado.email || "-"}</p></div>
                                    <div><strong>Telefone</strong><p>{formatarTelefone(fornecedorSelecionado.telefone)}</p></div>
                                    <div><strong>Celular</strong><p>{formatarTelefone(fornecedorSelecionado.celular)}</p></div>
                                    <div><strong>Inscrição Estadual</strong><p>{fornecedorSelecionado.inscricao_estadual || "-"}</p></div>
                                    <div className={styles.enderecoCard}>
                                        <strong>Endereço</strong>
                                        <p>{fornecedorSelecionado.endereco || "-"}{fornecedorSelecionado.numero && `, ${fornecedorSelecionado.numero}`}</p>
                                    </div>
                                    <div><strong>CEP</strong><p>{fornecedorSelecionado.cep || "-"}</p></div>
                                </div>

                                <div className={styles.observacoesModal}>
                                    <strong>Observações</strong>
                                    <p>{fornecedorSelecionado.observacoes || "Nenhuma observação cadastrada."}</p>
                                </div>

                                <div className={styles.modalActions}>
                                    <button className={styles.btnEditar} onClick={() => iniciarEdicao(fornecedorSelecionado)}>
                                        <Pencil size={18} />
                                        Editar fornecedor
                                    </button>
                                    <button className={styles.btnExcluir} onClick={() => handleExcluirClick(fornecedorSelecionado)}>
                                        <Trash2 size={18} />
                                        Excluir fornecedor
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2>Editar Fornecedor</h2>
                                <h4>{fornecedorSelecionado.nome_fantasia}</h4>

                                <div className={styles.modalGrid}>
                                    <div>
                                        <strong>Nome / Razão Social</strong>
                                        <input type="text" className={styles.inputEdicao} value={formEdicao.nome} onChange={(e) => handleChangeEdicao('nome', e.target.value)} />
                                    </div>
                                    <div>
                                        <strong>Nome Fantasia</strong>
                                        <input type="text" className={styles.inputEdicao} value={formEdicao.nome_fantasia} onChange={(e) => handleChangeEdicao('nome_fantasia', e.target.value)} />
                                    </div>
                                    <div>
                                        <strong>Responsável</strong>
                                        <input type="text" className={styles.inputEdicao} value={formEdicao.responsavel} onChange={(e) => handleChangeEdicao('responsavel', e.target.value)} />
                                    </div>
                                    <div>
                                        <strong>Email</strong>
                                        <input type="email" className={styles.inputEdicao} value={formEdicao.email} onChange={(e) => handleChangeEdicao('email', e.target.value)} />
                                    </div>
                                    <div>
                                        <strong>Telefone</strong>
                                        <input type="text" className={styles.inputEdicao} value={formEdicao.telefone} onChange={(e) => handleChangeEdicao('telefone', e.target.value)} />
                                    </div>
                                    <div>
                                        <strong>Celular</strong>
                                        <input type="text" className={styles.inputEdicao} value={formEdicao.celular} onChange={(e) => handleChangeEdicao('celular', e.target.value)} />
                                    </div>
                                    <div>
                                        <strong>Inscrição Estadual</strong>
                                        <input type="text" className={styles.inputEdicao} value={formEdicao.inscricao_estadual} onChange={(e) => handleChangeEdicao('inscricao_estadual', e.target.value)} />
                                    </div>
                                    <div>
                                        <strong>CEP</strong>
                                        <input type="text" className={styles.inputEdicao} value={formEdicao.cep} onChange={(e) => handleChangeEdicao('cep', e.target.value)} />
                                    </div>
                                    <div className={styles.enderecoCard}>
                                        <strong>Endereço</strong>
                                        <input type="text" className={styles.inputEdicao} value={formEdicao.endereco} onChange={(e) => handleChangeEdicao('endereco', e.target.value)} />
                                    </div>
                                    <div>
                                        <strong>Número</strong>
                                        <input type="text" className={styles.inputEdicao} value={formEdicao.numero} onChange={(e) => handleChangeEdicao('numero', e.target.value)} />
                                    </div>
                                </div>

                                <div className={styles.observacoesModal}>
                                    <strong>Observações</strong>
                                    <textarea className={styles.textareaEdicao} rows={3} value={formEdicao.observacoes} onChange={(e) => handleChangeEdicao('observacoes', e.target.value)} />
                                </div>

                                <div className={styles.modalActions}>
                                    <button className={styles.btnCancelConfirm} onClick={cancelarEdicao} disabled={salvandoEdicao}>
                                        Cancelar
                                    </button>
                                    <button className={styles.btnEditar} onClick={salvarEdicao} disabled={salvandoEdicao}>
                                        {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {modalExcluir.isOpen && (
                <div className={styles.modalOverlayConfirm} onClick={fecharModalExcluir}>
                    <div className={styles.modalContentConfirm} onClick={(e) => e.stopPropagation()}>
                        <h3>Confirmar Exclusão</h3>
                        <p>
                            Tem certeza de que deseja excluir o fornecedor{" "}
                            <strong>{modalExcluir.fornecedor?.nome}</strong>? Esta ação não
                            poderá ser desfeita.
                        </p>
                        <div className={styles.modalActionsConfirm}>
                            <button className={styles.btnCancelConfirm} onClick={fecharModalExcluir}>
                                Cancelar
                            </button>
                            <button className={styles.btnDeleteConfirm} onClick={executarExclusao}>
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}