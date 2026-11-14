import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from '../contexts/authContext'

export default function rotasPublicas() {
    const { estaLogado, carregando } = useAuth
    
    if (carregando){
        return <p>Carregando...</p>
    }

    if(estaLogado){
        return <navigation to="/" />  //DashBoard
    }
    return <Outlet />
}