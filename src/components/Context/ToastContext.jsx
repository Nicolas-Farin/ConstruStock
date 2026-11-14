import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import styles from '../../styles/Toast.module.css';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Função para adicionar um Toast na tela atual
  const addToast = (message, type = 'success') => {
    // Normaliza: só 'error' explícito vira vermelho. Qualquer outra coisa
    // (undefined, 'warning', 'info', typo, etc.) cai em 'success' — nunca
    // fica sem classe/cor definida.
    const tipoSeguro = type === 'error' ? 'error' : 'success';

    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type: tipoSeguro }]);

    // Remove automaticamente após 4 segundos
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  // Função MAGICA para exibir Toast na PRÓXIMA tela (após redirecionar)
  const addToastAndRedirect = (message, type, url) => {
    const tipoSeguro = type === 'error' ? 'error' : 'success';
    sessionStorage.setItem('pendingToast', JSON.stringify({ message, type: tipoSeguro }));
    window.location.href = url; // Redireciona o usuário
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Quando o app carrega, verifica se há um Toast pendente no sessionStorage
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingToast');
    if (pending) {
      const { message, type } = JSON.parse(pending);
      addToast(message, type); // já passa pela normalização de novo dentro do addToast
      sessionStorage.removeItem('pendingToast');
    }
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, addToastAndRedirect }}>
      {children}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
            {toast.type === 'success' ? <CheckCircle size={24} /> : <XCircle size={24} />}
            <span className={styles.message}>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className={styles.closeBtn}>
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);