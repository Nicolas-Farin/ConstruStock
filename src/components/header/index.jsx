import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';
import {
  LayoutDashboard, Box, Folder, Warehouse,
  Truck, ShoppingCart, BarChart3, Users,
  Settings, ChevronLeft, ChevronRight, HardHat, List,
} from 'lucide-react';

import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../Context/ThemeContext';
import { useNotification } from '../Context/NotificationContext';

const SIDEBAR_STORAGE_KEY = 'sidebar:collapsed';

const Sidebar = () => {
  const { theme } = useTheme();
  const location = useLocation();

  // Lê o valor salvo no localStorage já na primeira renderização
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const salvo = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return salvo === 'true'; // localStorage sempre guarda string
  });

  const { notificacoes, marcarLidasDaRota } = useNotification();

  useEffect(() => {
    marcarLidasDaRota(location.pathname);
  }, [location.pathname]);

  // Sempre que isCollapsed mudar, salva no localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: 'Estoque', icon: <Warehouse size={20} />, path: '/estoque' },
    { name: 'Produtos', icon: <Box size={20} />, path: '/produtos' },
    { name: 'Categorias', icon: <Folder size={20} />, path: '/categorias' },
    { name: 'Fornecedores', icon: <Users size={20} />, path: '/fornecedores' },
    { name: 'Cotações', icon: <Truck size={20} />, path: '/cotacoes' },
    { name: 'Pedidos', icon: <ShoppingCart size={20} />, path: '/pedidos' },
    { name: 'Relatórios', icon: <BarChart3 size={20} />, path: '/relatorios' },
  ];

  const verificarNotificacaoPendente = (path) => {
    if (path === '/') {
      return notificacoes.some(notif => !notif.lida && (notif.link === '/' || !notif.link));
    }
    return notificacoes.some(notif => !notif.lida && notif.link?.startsWith(path));
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${theme === 'dark' ? styles.darkTheme : ''}`}>
      <div className={styles.logoContainer}>
        <div className={styles.logoIcon}>
          <HardHat size={24} color="#fff" />
        </div>
        {!isCollapsed && <h2 className={styles.logoText}>ConstruStock</h2>}
      </div>

      <nav className={styles.nav}>
        <ul className={styles.menuList}>
          {menuItems.map((item) => {
            const temBolinha = verificarNotificacaoPendente(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.menuItem} ${location.pathname === item.path ? styles.active : ''}`}
                title={isCollapsed ? item.name : ''}
              >
                <span className={styles.icon}>{item.icon}</span>

                {!isCollapsed && (
                  <span className={styles.linkText}>{item.name}</span>
                )}

                {!isCollapsed && temBolinha && (
                  <span className={styles.dot}></span>
                )}
              </Link>
            );
          })}
        </ul>
      </nav>

      <div className={styles.footer}>
        <button
          className={styles.collapseBtn}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!isCollapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;