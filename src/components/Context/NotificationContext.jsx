import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from "../../services/api.js";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  // 1. Removido o LocalStorage! Agora começa vazio e o useEffect busca direto do banco de dados (SQLite).
  const [notificacoes, setNotificacoes] = useState([]);

  useEffect(() => {
    carregarNotificacoes();
  }, []);

  async function carregarNotificacoes() {
    try {
      const response = await api.get('/notificacoes');
      const dataHoje = new Date().toLocaleDateString();

      const notificacoesFormatadas = response.data.map(notif => {
        // 1. Pega a data correta
        const dataCriacao = notif.criado_em || notif.data || notif.createdAt || new Date().toISOString();

        // 2. Converte a data da notificação para o formato "DD/MM/YYYY"
        const dataNotif = new Date(dataCriacao).toLocaleDateString();

        // 3. SE a data da notificação for diferente de hoje, forçamos ela a ser "lida"
        const jaFoiLida = notif.lida === 1 || notif.lida === true;
        const isAntiga = dataNotif !== dataHoje;

        return {
          ...notif,
          lida: isAntiga ? true : jaFoiLida, // <-- Mantive a sua lógica de forçar a leitura das antigas
          data: dataCriacao
        };
      });

      setNotificacoes(notificacoesFormatadas);
    } catch (error) {
      console.error("Erro ao buscar notificações do banco:", error);
    }
  }

  async function removerMultiplasNotificacoes(ids) {
    try {
      await api.post('/notificacoes/batch-delete', { ids });
      setNotificacoes((prev) => prev.filter(notif => !ids.includes(notif.id)));
    } catch (error) {
      console.error("Erro ao remover múltiplas notificações:", error);
    }
  }

  async function addNotification(titulo, descricao, link) {
    try {
      const dataAtual = new Date().toISOString();

      const response = await api.post('/notificacoes', {
        titulo,
        descricao,
        link,
        data: dataAtual,
        lida: false
      });

      // Formata o objeto retornado para garantir consistência com o restante do app
      const novaNotificacao = {
        ...response.data,
        lida: false,
        data: response.data.criado_em || response.data.data || dataAtual
      };

      setNotificacoes((prev) => [novaNotificacao, ...prev]);
    } catch (error) {
      console.error("Erro ao salvar notificação:", error);
    }
  }

  const marcarComoLida = async (id) => {
    setNotificacoes((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, lida: true } : notif
      )
    );

    try {
      await api.patch(`/notificacoes/${id}`, { lida: true });
    } catch (error) {
      console.error(`Erro ao atualizar status da notificação ${id}:`, error);
    }
  };

  async function removerNotificacao(id) {
    try {
      await api.delete(`/notificacoes/${id}`);
      setNotificacoes((prev) => prev.filter(notif => notif.id !== id));
    } catch (error) {
      console.error("Erro ao remover notificação:", error);
    }
  }

  function marcarLidasDaRota(caminhoAtual) {
    // Mantido comentado conforme o seu código original
  }

  // Essa função deleta tudo do banco (ideal para usar apenas em um botão extremo na tela de Histórico)
  async function limparNotificacoes() {
    try {
      await api.delete('/notificacoes');
      setNotificacoes([]);
    } catch (error) {
      console.error("Erro ao limpar notificações:", error);
    }
  }

  // =================================================================
  // NOVA FUNÇÃO: Limpa apenas visualmente o sininho (Marca como Lida)
  // =================================================================
  async function limparSininho() {
    try {
      // Chama a rota criada no backend
      await api.patch('/notificacoes/marcar-todas-lidas');

      // Atualiza o estado visual mudando 'lida' para true
      setNotificacoes((prev) => prev.map(notif => ({ ...notif, lida: true })));
    } catch (error) {
      console.error("Erro ao limpar o sininho:", error);
    }
  }

  function temNotificacaoPendente(rotasManuais) {
    const rotasParaVerificar = Array.isArray(rotasManuais) ? rotasManuais : [rotasManuais];
    return notificacoes.some(notif => !notif.lida && rotasParaVerificar.includes(notif.link));
  }

  return (
    <NotificationContext.Provider value={{
      notificacoes,
      addNotification,
      limparNotificacoes,
      limparSininho, // <-- Exportando a nova função para o TopHeader!
      removerNotificacao,
      removerMultiplasNotificacoes,
      marcarLidasDaRota,
      temNotificacaoPendente,
      marcarComoLida
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);