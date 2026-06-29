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
        <header className="flex items-center justify-between mt-8.75 w-285 h-12.25 mx-auto">

            <img src="/Logo.svg" alt="SportSee" />

            <nav className="flex items-center gap-10 px-12 rounded-2xl h-12.25 bg-white ">
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
                <div className="w-px h-[17px] bg-[#707070]" />

                <button
                    onClick={handleLogout}
                    className="text-[14px] w- text-[#0B23F4] bg-transparent border-none cursor-pointer hover:underline p-0"
                >
                    Se déconnecter
                </button>
            </nav>

        </header>
    )
}
