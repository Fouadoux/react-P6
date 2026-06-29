import { useContext, useEffect, useRef } from "react"
import { Navigate, Outlet, useLocation } from "react-router"
import { AuthContext } from "../context/AuthContext.jsx"
import Footer from "./Footer.jsx";
import Header from "./Header.jsx";

export default function ProtectedRoute() {
    const { token } = useContext(AuthContext)
    const location = useLocation()
    const ref = useRef(null)

    useEffect(() => {
        if (ref.current) {
            ref.current.style.animation = "none"
            ref.current.offsetHeight
            ref.current.style.animation = "fadeIn 2s ease-out both"
        }
    }, [location.pathname])

    if (!token) return <Navigate to="/" replace />

    return (
        <>
            <Header />
            <div ref={ref}>
                <Outlet />
            </div>
            <Footer />
        </>
    )
}