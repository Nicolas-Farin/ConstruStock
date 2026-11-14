import { useState, useEffect, useContext, createContext } from "react";
import { api } from "../services/api";

const AuthContext = createContext({});

export function AuthProvider({ children }) {

    const [usuario, setUsuario] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        const usuarioSalvo = localStorage.getItem("usuario");

        if (usuarioSalvo) {
            setUsuario(JSON.parse(usuarioSalvo));
        }

        setCarregando(false);
    }, []);

    async function login(email, senha) {

        try {

            console.log("Tentando login...");

            const resposta = await api.post("/auth/login", {
                email,
                senha
            });

            console.log("RESPOSTA:", resposta.data);

            const usuarioLogado = resposta.data.usuario;

            localStorage.setItem(
                "usuario",
                JSON.stringify(usuarioLogado)
            );

            setUsuario(usuarioLogado);

            return {
                sucesso: true
            };

        } catch (erro) {

            console.log("ERRO COMPLETO:", erro);

            return {
                sucesso: false,
                mensagem: "Erro ao fazer login."
            };

        }
    }

    async function logout() {
        localStorage.removeItem("usuario");
        setUsuario(null);
    }

    async function cadastrar(nome, email, senha) {

        try {

            await api.post("/auth", {
                nome,
                email,
                senha
            });

            return {
                sucesso: true
            };

        } catch (erro) {

            return {
                sucesso: false,
                mensagem: "Erro ao cadastrar usuário."
            };

        }
    }

    const estaLogado = usuario !== null;

    return (
        <AuthContext.Provider
            value={{
                usuario,
                login,
                logout,
                cadastrar,
                estaLogado,
                carregando
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}