import { createContext, useState } from "react"

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('token'))
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const login = () => setIsAuthenticated(true)

    const logout = async () => {
        await fetch("http://localhost:8000/api/login",
            {method: "POST",credentials: "include"})
        setIsAuthenticated(false)
    }

    return (
        <AuthContext.Provider value={{token,login,logout}}>
            {children}
        </AuthContext.Provider>
    )
}
