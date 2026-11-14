import React from 'react';
import { useTheme } from '../../components/Context/ThemeContext'; // Ajuste o caminho se necessário (mesma profundidade do import do CSS abaixo)
import styles from '../../components/footer/styles.module.css'; // Ajuste o caminho se necessário

const Footer = () => {
    const { theme } = useTheme();
    const currentYear = new Date().getFullYear();

    return (
        <footer className={`${styles.footer} ${theme === 'dark' ? styles.darkTheme : ''}`}>
            <div className={styles.footerContent}>
                <span className={styles.footerText}>
                    &copy; {currentYear} ConstruStock. Todos os direitos reservados.
                </span>
                <div className={styles.footerLinks}>
                    <a href="#suporte">Suporte</a>
                    <a href="#termos">Termos de Uso</a>
                    <a href="#privacidade">Privacidade</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;