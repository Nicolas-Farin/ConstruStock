import db from '../database.js'; // Ajuste o caminho conforme necessário

/**
 * Verifica se o armazém suporta receber a quantidade solicitada
 * @param {number} quantidadeSendoAdicionada - Quantidade de itens que está tentando entrar no estoque
 * @returns {object} { temEspaco: boolean, mensagem: string }
 */
export async function verificarCapacidade(quantidadeSendoAdicionada) {
    try {
        // 1. Pega a capacidade máxima
        const config = await db.get(`SELECT valor FROM configuracoes WHERE chave = 'capacidade_maxima_estoque'`);
        const capacidadeMaxima = config ? parseInt(config.valor) : 10000;

        // 2. Pega o total já ocupado
        const resultado = await db.get(`SELECT SUM(estoque_atual) as total_ocupado FROM produtos`);
        const totalOcupado = resultado.total_ocupado || 0;

        // 3. Verifica se a soma ultrapassa o limite
        const totalAposAdicao = totalOcupado + Number(quantidadeSendoAdicionada);

        if (totalAposAdicao > capacidadeMaxima) {
            const espacoRestante = capacidadeMaxima - totalOcupado;
            return {
                temEspaco: false,
                mensagem: `Capacidade máxima atingida! Você está tentando adicionar ${quantidadeSendoAdicionada} itens, mas só há espaço para mais ${espacoRestante} itens.`
            };
        }

        return { temEspaco: true, mensagem: 'Espaço disponível.' };
    } catch (error) {
        console.error("Erro ao verificar capacidade de estoque:", error);
        throw new Error("Falha ao validar capacidade de estoque.");
    }
}