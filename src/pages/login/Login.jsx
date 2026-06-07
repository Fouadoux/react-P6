import {useState} from "react";
import {loginApi} from "../../service/service.js";
import useAuth from "../../hooks/useAuth.js";
import {useNavigate} from "react-router";

export default function Login() {


    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const navigate = useNavigate()
    const { login } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const token = await loginApi(username, password)
            login(token)
            navigate("/dashboard")
        } catch (error) {
            console.error(error.message)
        }
    }

    return (
        <div className="min-h-screen bg-[#EEEEF8] px-[52px] py-[40px]">

            {/* Logo */}
            <img src="/Logo.png" alt="SportSee" />

            {/* Card */}
            <div className="bg-white rounded-[24px] p-[52px] w-[500px] mx-auto mt-[80px]">

                {/* Titre */}
                <h1 className="text-[36px] font-bold text-[#0B23F4] leading-tight mb-[40px]">
                    Transformez <br /> vos stats en résultats
                </h1>

                <form onSubmit={handleSubmit} className="flex flex-col">

                    {/* Sous-titre */}
                    <h2 className="text-[22px] font-semibold text-[#111111] mb-[24px]">
                        Se connecter
                    </h2>

                    {/* Champs */}
                    <div className="flex flex-col gap-[20px] mb-[32px]">
                        <div className="flex flex-col gap-[8px]">
                            <label className="text-[14px] text-[#707070]">Username</label>
                            <input
                                type="text"
                                required
                                value={username ?? ""}
                                onChange={e => setUsername(e.target.value)}
                                className="border border-gray-300 rounded-[10px] px-[16px] py-[18px] text-[14px] outline-none focus:border-[#0B23F4]"
                            />
                        </div>
                        <div className="flex flex-col gap-[8px]">
                            <label className="text-[14px] text-[#707070]">Mot de passe</label>
                            <input
                                type="password"
                                required
                                value={password ?? ""}
                                onChange={(e) => setPassword(e.target.value)}
                                className="border border-gray-300 rounded-[10px] px-[16px] py-[18px] text-[14px] outline-none focus:border-[#0B23F4]"
                            />
                        </div>
                    </div>

                    {/* Bouton */}
                    <button
                        type="submit"
                        className="w-full bg-[#0B23F4] text-white text-[16px] font-medium rounded-[12px] py-[18px] cursor-pointer hover:bg-[#0a1fd8] mb-[24px]"
                    >
                        Se connecter
                    </button>

                    {/* Mot de passe oublié */}
                    <p className="text-[14px] text-[#111111] cursor-pointer hover:text-[#0B23F4]">
                        Mot de passe oublié ?
                    </p>

                </form>
            </div>
        </div>
    )
}
