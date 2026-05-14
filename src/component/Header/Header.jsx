import { NavLink } from "react-router-dom"

export default function Header() {
    return (
        <header className="flex items-center justify-between px-13 pt-9 w-285 m-auto">

            <img src="/Logo.png" alt="SportSee"  />

            <nav className="flex items-center gap-10 w-115.25 px-12 rounded-2xl bg-white">
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `text-[14px] no-underline ${isActive ? "text-[#0B23F4]" : "text-[#111111] hover:text-[#0B23F4]"}`
                    }
                >
                    Dashboard
                </NavLink>
                <NavLink
                    to="/profil"
                    className={({ isActive }) =>
                        `text-[14px] no-underline ${isActive ? "text-[#0B23F4]" : "text-[#111111] hover:text-[#0B23F4]"}`
                    }
                >
                    Mon profil
                </NavLink>

                <div className="w-px h-[40px] bg-[#707070]" />

                <NavLink
                    to="/logout"
                    className="text-[14px] text-[#0B23F4] no-underline hover:underline"
                >
                    Se déconnecter
                </NavLink>
            </nav>
        </header>
    )
}