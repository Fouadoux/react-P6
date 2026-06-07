import { useContext } from "react"
import { Navigate, Outlet } from "react-router"
import { AuthContext } from "../context/AuthContext.jsx"

export default function ProtectedRoute() {
    const { token } = useContext(AuthContext)

    if (!token) return <Navigate to="/" replace />

    return <Outlet />
}
