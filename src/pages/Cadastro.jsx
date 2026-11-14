import React from 'react';
import Styles from '../styles/cadastro.module.css'; // Ajuste o nome se necessário
import logoCapacete from '../imgs/logo.png';

import {
    BarChart3,
    Truck,
    Package,
    Building2,
    User,
    Mail,
    Phone,
    Briefcase,
    Lock,
    Eye
} from 'lucide-react';

const Register = () => {

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Integração de cadastro via API.");
    };

    return (
        <div className={Styles['login-container']}>

            {/* Lado Esquerdo - Informativo (Mantido igual à sua base) */}
            <section className={Styles['hero-side']}>

                <div className={Styles['logo-container']}>
                    <div className={Styles['logo-placeholder']}>
                        <img src={logoCapacete} alt="ConstruStock Logo" />
                        <span className={Styles['icon-helmet']}></span>
                    </div>

                    <span className={Styles['company-name']}>
                        ConstruStock
                    </span>
                </div>

                <h1>
                    Gerencie seu <span className={Styles['text-orange']}>Inventário</span> de construção com <span className={Styles['text-orange']}>inteligência</span>
                </h1>

                <p>
                    Controle completo do seu armazém com rastreamento em tempo real,
                    relatórios avançados e gestão simplificada.
                </p>

                <div className={Styles['features-grid']}>

                    <div className={Styles['feature-item']}>

                        <span className={Styles['feature-icon']}>
                            <BarChart3 size={24} />
                        </span>

                        <div className={Styles['feature-text']}>
                            <h4>Relatórios Detalhados</h4>
                            <p>Análises em tempo real</p>
                        </div>

                    </div>

                    <div className={Styles['feature-item']}>

                        <span className={Styles['feature-icon']}>
                            <Truck size={24} />
                        </span>

                        <div className={Styles['feature-text']}>
                            <h4>Rastreamento Logístico</h4>
                            <p>Controle de entregas</p>
                        </div>

                    </div>

                    <div className={Styles['feature-item']}>

                        <span className={Styles['feature-icon']}>
                            <Package size={24} />
                        </span>

                        <div className={Styles['feature-text']}>
                            <h4>Gestão de Estoque</h4>
                            <p>Inventário automatizado</p>
                        </div>

                    </div>

                    <div className={Styles['feature-item']}>

                        <span className={Styles['feature-icon']}>
                            <Building2 size={24} />
                        </span>

                        <div className={Styles['feature-text']}>
                            <h4>Multi-Filiais</h4>
                            <p>Gestão centralizada</p>
                        </div>

                    </div>

                </div>

            </section>

            {/* Lado Direito - Formulário de Cadastro */}
            <section className={Styles['login-side']}>
                <div className={Styles['login-card']}>
                    <h2>Criar Conta</h2>
                    <p className={Styles.subtitle}>Registre-se para acessar a plataforma de gestão.</p>

                    <form onSubmit={handleSubmit}>
                        <div className={Styles['form-row']}>
                            <div className={Styles['form-group']}>
                                <label>Nome Completo</label>
                                <div className={Styles['input-wrapper']}>
                                    <User size={18} className={Styles['input-icon']} />
                                    <input type="text" placeholder="Seu nome" required />
                                </div>
                            </div>

                            <div className={Styles['form-group']}>
                                <label>Email</label>
                                <div className={Styles['input-wrapper']}>
                                    <Mail size={18} className={Styles['input-icon']} />
                                    <input type="email" placeholder="seu@email.com" required />
                                </div>
                            </div>
                        </div>

                        <div className={Styles['form-row']}>
                            <div className={Styles['form-group']}>
                                <label>Telefone</label>
                                <div className={Styles['input-wrapper']}>
                                    <Phone size={18} className={Styles['input-icon']} />
                                    <input type="text" placeholder="(00) 00000-0000" required />
                                </div>
                            </div>

                            <div className={Styles['form-group']}>
                                <label>Empresa</label>
                                <div className={Styles['input-wrapper']}>
                                    <Building2 size={18} className={Styles['input-icon']} />
                                    <input type="text" placeholder="Nome da empresa" required />
                                </div>
                            </div>
                        </div>

                        <div className={Styles['form-group']}>
                            <label>Função</label>
                            <div className={Styles['input-wrapper']}>
                                <Briefcase size={18} className={Styles['input-icon']} />
                                <select required className={Styles['select-field']}>
                                    <option value="" disabled selected>Selecione sua função</option>
                                    <option value="gerente">Gerente</option>
                                    <option value="estoquista">Estoquista</option>
                                    <option value="compras">Compras</option>
                                </select>
                            </div>
                        </div>

                        <div className={Styles['form-row']}>
                            <div className={Styles['form-group']}>
                                <label>Senha</label>
                                <div className={Styles['input-wrapper']}>
                                    <Lock size={18} className={Styles['input-icon']} />
                                    <input type="password" placeholder="Crie uma senha" required />
                                    <Eye size={18} className={Styles['input-icon-right']} />
                                </div>
                            </div>

                            <div className={Styles['form-group']}>
                                <label>Confirmar Senha</label>
                                <div className={Styles['input-wrapper']}>
                                    <Lock size={18} className={Styles['input-icon']} />
                                    <input type="password" placeholder="Confirme a senha" required />
                                    <Eye size={18} className={Styles['input-icon-right']} />
                                </div>
                            </div>
                        </div>

                        <div className={Styles['terms-row']}>
                            <label className={Styles['checkbox-container']}>
                                <input type="checkbox" required />
                                <span>Aceito os <a href="#termos">Termos</a> e <a href="#privacidade">Política de Privacidade</a></span>
                            </label>
                        </div>

                        <button type="submit" className={Styles['btn-login']}>
                            Criar Conta
                        </button>
                    </form>

                    <p className={Styles['create-account']}>
                        Já tem uma conta? <a href="/login">Fazer login</a>
                    </p>
                </div>

                <footer className={Styles['login-footer']}>
                    © 2026 ConstruStock. Todos os direitos reservados.
                </footer>
            </section>
        </div>
    );
};

export default Register;