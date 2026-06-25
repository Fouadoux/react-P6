import { createContext, useState } from "react"

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const login = () => setIsAuthenticated(true)

    const logout = async () => {
        await fetch("http://localhost:8000/api/logout",
            {method: "POST",credentials: "include"})
        setIsAuthenticated(false)
    }

    return (
        <AuthContext.Provider value={{isAuthenticated,login,logout}}>
            {children}
        </AuthContext.Provider>
    )
}
