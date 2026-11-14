import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    User,
    Mail,
    Phone,
    MapPin,
    Package,
    Truck,
    Clock3,
    BadgeDollarSign,
    FileText,
    Save,
    ShieldCheck,
    Box,
    Hash,
    Wallet
} from 'lucide-react';

import { useTheme } from "../components/Context/ThemeContext";
import styles from '../styles/CadastrarFornecedor.module.css';

import { useNotification } from "../components/Context/NotificationContext.jsx";
import { useToast } from '../components/Context/ToastContext';

// Funções de Máscara (UX)
const maskCNPJ = (value) => {
    return value
        .replace(/\D/g, '') // Remove o que não é número
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18); // Limita o tamanho máximo
};

const maskPhone = (value) => {
    let v = value.replace(/\D/g, '');
    if (v.length <= 10) {
        return v
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 14);
    }
    return v
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 15);
};

// Nova Máscara para o CEP
const maskCEP = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .slice(0, 9);
};

export default function CadastrarFornecedor() {
    const { theme } = useTheme();
    const { addNotification } = useNotification();
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Adicionados celular e cep no estado inicial
    const [fornecedor, setFornecedor] = useState({
        empresa: '',
        cnpj: '',
        inscricaoEstadual: '',
        responsavel: '',
        email: '',
        telefone: '',
        celular: '',
        cep: '',
        endereco: '',
        categoria: '',
        condicaoPagamento: '',
        prazo: '',
        produtos: '',
        observacoes: ''
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        let { name, value } = e.target;

        if (name === 'cnpj') value = maskCNPJ(value);
        if (name === 'telefone' || name === 'celular') value = maskPhone(value); // Máscara atende telefone e celular
        if (name === 'cep') value = maskCEP(value); // Máscara pro CEP
        if (name === 'inscricaoEstadual') value = value.replace(/\D/g, '');

        setFornecedor({
            ...fornecedor,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("http://localhost:3000/produtos/fornecedores", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(fornecedor)
            });

            let data = {};
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            }

            if (response.ok) {
                addToast("Fornecedor cadastrado com sucesso!", "success");

                addNotification(
                    "Novo Fornecedor",
                    `A empresa "${fornecedor.empresa}" foi cadastrada com sucesso.`,
                    "/fornecedores"
                );

                // Reset ajustado para incluir celular e cep
                setFornecedor({
                    empresa: '', cnpj: '', inscricaoEstadual: '', responsavel: '',
                    email: '', telefone: '', celular: '', cep: '', endereco: '', categoria: '',
                    condicaoPagamento: '', prazo: '', produtos: '', observacoes: ''
                });

                setTimeout(() => {
                    navigate('/cotacoes');
                }, 1500);

            } else {
                const errorMessage = data.erro || "Erro desconhecido";
                addToast(`Erro do servidor: ${errorMessage}`, "error");

                addNotification(
                    "Falha no Cadastro",
                    errorMessage,
                    ""
                );
            }
        } catch (error) {
            console.error("Erro na requisição:", error);
            addToast("Erro ao conectar com o servidor.", "error");

            addNotification(
                "Erro de Conexão",
                "Verifique se o backend está ligado.",
                ""
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`${styles.container} ${theme === 'dark' ? styles.darkTheme : ''}`}>

            <div className={styles.header}>
                <h1>Cadastrar Novo Fornecedor</h1>
                <p>Adicione parceiros comerciais e gerencie fornecedores do estoque.</p>
            </div>

            <div className={styles.layoutGrid}>

                {/* FORMULÁRIO */}
                <form className={styles.formArea} onSubmit={handleSubmit}>

                    <section className={styles.card}>
                        <h2>Informações Básicas e Fiscais</h2>

                        <div className={styles.grid3}>
                            <div className={styles.formGroup}>
                                <label>Empresa (Razão Social) *</label>
                                <div className={styles.inputWrapper}>
                                    <Building2 size={18} className={styles.icon} />
                                    <input
                                        type="text"
                                        name="empresa"
                                        value={fornecedor.empresa}
                                        placeholder="Ex: Votorantim S.A"
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>CNPJ *</label>
                                <div className={styles.inputWrapper}>
                                    <BadgeDollarSign size={18} className={styles.icon} />
                                    <input
                                        type="text"
                                        name="cnpj"
                                        value={fornecedor.cnpj}
                                        placeholder="00.000.000/0000-00"
                                        onChange={handleChange}
                                        required
                                        maxLength={18}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Inscrição Estadual (IE)</label>
                                <div className={styles.inputWrapper}>
                                    <Hash size={18} className={styles.icon} />
                                    <input
                                        type="text"
                                        name="inscricaoEstadual"
                                        value={fornecedor.inscricaoEstadual}
                                        placeholder="Apenas números"
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.grid3}>
                            <div className={styles.formGroup}>
                                <label>Responsável</label>
                                <div className={styles.inputWrapper}>
                                    <User size={18} className={styles.icon} />
                                    <input
                                        type="text"
                                        name="responsavel"
                                        value={fornecedor.responsavel}
                                        placeholder="Nome do contato"
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Email *</label>
                                <div className={styles.inputWrapper}>
                                    <Mail size={18} className={styles.icon} />
                                    <input
                                        type="email"
                                        name="email"
                                        value={fornecedor.email}
                                        placeholder="vendas@fornecedor.com"
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Telefone</label>
                                <div className={styles.inputWrapper}>
                                    <Phone size={18} className={styles.icon} />
                                    <input
                                        type="text"
                                        name="telefone"
                                        value={fornecedor.telefone}
                                        placeholder="(00) 0000-0000"
                                        onChange={handleChange}
                                        maxLength={15}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Nova linha de Grid para Celular e CEP */}
                        <div className={styles.grid3}>
                            <div className={styles.formGroup}>
                                <label>Celular / WhatsApp</label>
                                <div className={styles.inputWrapper}>
                                    <Phone size={18} className={styles.icon} />
                                    <input
                                        type="text"
                                        name="celular"
                                        value={fornecedor.celular}
                                        placeholder="(00) 00000-0000"
                                        onChange={handleChange}
                                        maxLength={15}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>CEP</label>
                                <div className={styles.inputWrapper}>
                                    <MapPin size={18} className={styles.icon} />
                                    <input
                                        type="text"
                                        name="cep"
                                        value={fornecedor.cep}
                                        placeholder="00000-000"
                                        onChange={handleChange}
                                        maxLength={9}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Endereço Completo</label>
                            <div className={styles.inputWrapper}>
                                <MapPin size={18} className={styles.icon} />
                                <input
                                    type="text"
                                    name="endereco"
                                    value={fornecedor.endereco}
                                    placeholder="Rua, Número, Bairro, Cidade - UF"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className={styles.grid3}>
                            <div className={styles.formGroup}>
                                <label>Categoria Principal</label>
                                <div className={styles.inputWrapper}>
                                    <Package size={18} className={styles.icon} />
                                    <select
                                        name="categoria"
                                        value={fornecedor.categoria}
                                        onChange={handleChange}
                                    >
                                        <option value="">Selecione a categoria</option>
                                        <option value="cimento">Cimento e Argamassa</option>
                                        <option value="eletrica">Materiais Elétricos</option>
                                        <option value="hidraulica">Materiais Hidráulicos</option>
                                        <option value="ferramentas">Ferramentas</option>
                                        <option value="diversos">Diversos</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Prazo Médio de Entrega</label>
                                <div className={styles.inputWrapper}>
                                    <Clock3 size={18} className={styles.icon} />
                                    <input
                                        type="text"
                                        name="prazo"
                                        value={fornecedor.prazo}
                                        placeholder="Ex: 5 dias úteis"
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Condição de Pagamento</label>
                                <div className={styles.inputWrapper}>
                                    <Wallet size={18} className={styles.icon} />
                                    <input
                                        type="text"
                                        name="condicaoPagamento"
                                        value={fornecedor.condicaoPagamento}
                                        placeholder="Ex: Boleto 30/60 dias"
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Principais Produtos</label>
                            <div className={styles.inputWrapper}>
                                <Truck size={18} className={styles.icon} />
                                <input
                                    type="text"
                                    name="produtos"
                                    value={fornecedor.produtos}
                                    placeholder="Ex: cimento CP II, tubos PVC, disjuntores..."
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Observações Adicionais</label>
                            <div className={styles.textareaWrapper}>
                                <FileText size={18} className={styles.iconTextarea} />
                                <textarea
                                    name="observacoes"
                                    value={fornecedor.observacoes}
                                    placeholder="Adicione informações relevantes sobre frete, regras de pedido mínimo, etc..."
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    <button type="submit" className={styles.btnSalvar} disabled={loading}>
                        <Save size={18} />
                        {loading ? "Salvando..." : "Cadastrar Fornecedor"}
                    </button>
                </form>
                {/* PREVIEW */}
                <aside className={styles.previewCard}>
                    <div className={styles.previewHeader}>
                        <Box size={18} />
                        <span>Preview do Fornecedor</span>
                    </div>

                    <h2>{fornecedor.empresa || "Nome da Empresa"}</h2>
                    <span className={styles.status}>Parceiro Ativo</span>

                    <div className={styles.previewInfos}>
                        <div className={styles.infoBox}>
                            <p>Categoria</p>
                            <strong>
                                {fornecedor.categoria
                                    ? fornecedor.categoria.charAt(0).toUpperCase() + fornecedor.categoria.slice(1)
                                    : "—"}
                            </strong>
                        </div>

                        <div className={styles.infoBox}>
                            <p>Pagamento</p>
                            <strong>{fornecedor.condicaoPagamento || "—"}</strong>
                        </div>
                    </div>

                    <div className={styles.previewResumo}>
                        <h3>Resumo</h3>
                        <p>
                            <ShieldCheck size={15} />
                            {fornecedor.cnpj ? `CNPJ: ${fornecedor.cnpj}` : "Aguardando CNPJ"}
                        </p>
                        <p>
                            <Truck size={15} />
                            Prazo: {fornecedor.prazo || "Não definido"}
                        </p>
                        <p>
                            <MapPin size={15} />
                            {fornecedor.endereco || "Sem endereço cadastrado"}
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}