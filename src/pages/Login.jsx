import React, { useState } from 'react';
import Styles from '../styles/login.module.css';
import logoCapacete from '../imgs/logo.png';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../contexts/authContext.jsx'

import {
  BarChart3,
  Truck,
  Package,
  Building2
} from 'lucide-react';

const Login = () => {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const { login } = useAuth();

  async function entrar(event) {
    event.preventDefault();
    setErro("");
    const resultado = await login(email, senha)

    if (resultado.sucesso) {
      navigate("/") // DashBoard
    } else {
      setErro(resultado.mensagem)
    }
  }

  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   console.log("Integração com MySQL via API será feita aqui futuramente.");
  // };

  return (
    <div className={Styles['login-container']}>

      {/* Lado Esquerdo - Informativo */}
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
          Gestão <span className={Styles['text-orange']}>Inteligente</span> de <span className={Styles['text-orange']}>Estoque</span> para a Construção Civil
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

      {/* Lado Direito - Formulário */}
      <section className={Styles['login-side']}>

        <div className={Styles['login-card']}>

          <h2>Bem-vindo de Volta</h2>

          <p className={Styles.subtitle}>
            Acesse o painel de gestão de estoque.
          </p>

          <form onSubmit={entrar}>

            <div className={Styles['form-group']}>

              <label htmlFor="email">E-mail</label>

              <div className={Styles['input-wrapper']}>
                <input
                  type="email"
                  id="email"
                  placeholder="seu@email.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

            </div>

            <div className={Styles['form-group']}>

              <label htmlFor="password">Senha</label>

              <div className={Styles['input-wrapper']}>
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  required
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                />
              </div>

            </div>

            <div className={Styles['options-row']}>

              <label className={Styles['remember-me']}>
                <input type="checkbox" />
                Lembrar de mim
              </label>

              <a
                href="#forgot"
                className={Styles['forgot-password']}
              >
                Esqueceu a senha?
              </a>

            </div>

            <button
              type="submit"
              className={Styles['btn-login']}
            >
              Entrar
            </button>

            {erro && (
              <p style={{ color: "red", marginTop: "10px" }}>
                {erro}
              </p>
            )}

          </form>
          <p className={Styles['create-account']}>
            Não tem uma conta? <a href="/cadastro">Criar conta</a>
          </p>

        </div>


        <footer className={Styles['login-footer']}>
          © 2026 ConstruStock. Todos os direitos reservados.
        </footer>

      </section>

    </div>
  );
};

export default Login;