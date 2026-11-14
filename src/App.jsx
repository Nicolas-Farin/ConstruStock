import "./styles/App.css";
import Header from './components/Header';
import TopHeader from './components/TopHeader';
import { AppRoutes } from "./routes";
import { useLocation } from "react-router-dom";

function App() {

  const location = useLocation();

  const hiddenRoutes = ["/login", "/cadastro"];
  const hideLayout = hiddenRoutes.includes(location.pathname);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      {!hideLayout && <Header />}

      {/* Área principal */}
      <div
        style={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f4f7fe',
          minWidth: 0, // evita que filhos largos estourem a largura
          height: '100vh', // trava a altura, igual ao wrapper externo
        }}
      >
        {/* TopHeader */}
        {!hideLayout && <TopHeader />}

        {/* Conteúdo das páginas — única área com scroll */}
        <main
          className="pageContent"
          style={{
            flexGrow: 1,
            overflowY: 'auto',
            minHeight: 0, // essencial: permite o flex-item encolher e ativar o scroll interno
          }}
        >
          <AppRoutes />
        </main>
      </div>
    </div>
  );
}

export default App;