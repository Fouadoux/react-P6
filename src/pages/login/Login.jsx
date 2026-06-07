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
        <div className="flex min-h-screen">

            {/* Colonne gauche */}
            <div className="flex flex-col w-1/2 bg-[#EEEEF8] px-13 py-10">

                {/* Logo */}
                <img src="/Logo.png" alt="SportSee" className="w-fit" />

                {/* Card formulaire */}
                <div className="bg-white rounded-3xl p-13 w-125 mx-auto mt-20">


                {/* Titre */}
                <h1 className="text-[36px] font-bold text-[#0B23F4] leading-tight mb-10">
                    Transformez <br /> vos stats en résultats
                </h1>

                <form onSubmit={handleSubmit} className="flex flex-col">

                    {/* Sous-titre */}
                    <h2 className="text-[22px] font-semibold text-[#111111] mb-6">
                        Se connecter
                    </h2>

                    {/* Champs */}
                    <div className="flex flex-col gap-5 mb-8">
                        <div className="flex flex-col gap-2">
                            <label className="text-[14px] text-[#707070]">Adresse email</label>
                            <input
                                type="text"
                                required
                                value={username ?? ""}
                                onChange={e => setUsername(e.target.value)}
                                className="border border-gray-300 rounded-[10px] px-4 py-4.5 text-[14px] outline-none focus:border-[#0B23F4]"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[14px] text-[#707070]">Mot de passe</label>
                            <input
                                type="password"
                                required
                                value={password ?? ""}
                                onChange={(e) => setPassword(e.target.value)}
                                className="border border-gray-300 rounded-[10px] px-4 py-4.5 text-[14px] outline-none focus:border-[#0B23F4]"
                            />
                        </div>
                    </div>

                    {/* Bouton */}
                    <button
                        type="submit"
                        className="w-full bg-[#0B23F4] text-white text-[16px] font-medium rounded-xl py-4.5 cursor-pointer hover:bg-[#0a1fd8] mb-6"
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
            {/* Colonne droite */}
            <div className="w-1/2 relative overflow-hidden">
                <img
                    src="/background_picture.svg"
                    alt=""
                    className="w-full h-full object-cover object-center"
                    style={{ minHeight: "1024px" }}
                />
                {/* Carte texte en bas à droite */}
                <div className="absolute bottom-6 right-6 bg-white rounded-2xl p-4 max-w-[288px] h-[62]">
                    <p className="text-[12px] text-[#0B23F4]">
                        Analysez vos performances en un clin d'œil, suivez vos progrès et atteignez vos objectifs.
                    </p>
                </div>
            </div>

        </div>
    )
}
