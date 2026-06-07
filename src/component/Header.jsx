import { NavLink, useNavigate } from "react-router"
import { useContext } from "react"
import {AuthContext} from "../context/AuthContext.jsx";

export default function Header() {
    const { logout } = useContext(AuthContext)
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate("/")
    }

    return (
        <header className="flex items-center justify-between px-13 pt-9 w-285 m-auto">

            <img src="/Logo.svg" alt="SportSee" />

            <nav className="flex items-center gap-10 w-115.25 px-12 rounded-2xl bg-white whitespace-nowrap">
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `text-[14px] no-underline ${isActive ? "text-[#0B23F4]" : "text-[#111111] hover:text-[#0B23F4]"}`
                    }
                >
                    Dashboard
                </NavLink>
                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        `text-[14px] no-underline ${isActive ? "text-[#0B23F4]" : "text-[#111111] hover:text-[#0B23F4]"}`
                    }
                >
                    Mon profil
                </NavLink>

                <div className="w-px h-[40px] bg-[#707070]" />

                <button
                    onClick={handleLogout}
                    className="text-[14px] text-[#0B23F4] bg-transparent border-none cursor-pointer hover:underline p-0"
                >
                    Se déconnecter
                </button>
            </nav>
        </header>
    )
}
