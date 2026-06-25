import {useState} from "react";
import {loginApi} from "../../service/service.js";
import useAuth from "../../hooks/useAuth.js";
import {useNavigate} from "react-router";

export default function Login() {

    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState(false)
    const navigate = useNavigate()
    const { login } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            setError(false)
            await loginApi(username, password)
            login()
            navigate("/dashboard")
        } catch (error) {
            setError(true)
            console.error(error.message)
        }
    }

    return (
        <div className="flex min-h-screen">

            {/* Colonne gauche */}
            <div className="flex flex-col shrink-0 bg-[#F2F3FF] pt-[55px] pb-[55px] pl-[100px] pr-0 gap-[151px]" style={{ width: "632px" }}>

                {/* Logo */}
                <img src="/Logo.png" alt="SportSee" className="w-fit" />

                {/* Card formulaire */}
                <div className="bg-white rounded-[20px] w-[398px] flex flex-col justify-center items-start gap-[40px]" style={{ padding: "40px 40px 80px" }}>

                    {/* Titre */}
                    <h1 className="text-[28px] font-semibold text-[#0B23F4] leading-[34px]">
                        Transformez <br /> vos stats en résultats
                    </h1>

                    {/* Formulaire */}
                    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-[24px] w-full">

                        {/* Sous-titre */}
                        <h2 className="text-[22px] font-medium text-[#111111] w-full leading-[27px]">
                            Se connecter
                        </h2>

                        {/* Champs */}
                        <div className="flex flex-col gap-[8px] w-full">
                            <div className="flex flex-col gap-[8px]">
                                <label className="text-[14px] text-[#707070] leading-[17px]">Adresse email</label>
                                <input
                                    type="text"
                                    required
                                    value={username ?? ""}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full h-[58px] border border-[0.5px] border-[#717171] rounded-[10px] px-5 text-[14px] outline-none focus:border-[#0B23F4] bg-white"
                                />
                            </div>
                            <div className="flex flex-col gap-[8px]">
                                <label className="text-[14px] text-[#707070] leading-[17px]">Mot de passe</label>
                                <input
                                    type="password"
                                    required
                                    value={password ?? ""}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-[58px] border border-[0.5px] border-[#717171] rounded-[10px] px-5 text-[14px] outline-none focus:border-[#0B23F4] bg-white"
                                />
                            </div>
                        </div>

                        {error &&
                            <p className="text-center text-sm text-red-600 w-full">Email ou mot de passe inconnue</p>
                        }

                        {/* Bouton */}
                        <button
                            type="submit"
                            className="w-full h-[51px] bg-[#0B23F4] text-[#E7E7E7] text-[16px] font-medium rounded-[10px] cursor-pointer hover:bg-[#0a1fd8]"
                        >
                            Se connecter
                        </button>

                        {/* Mot de passe oublié */}
                        <p className="text-[14px] text-[#111111] text-center cursor-pointer hover:text-[#0B23F4]">
                            Mot de passe oublié ?
                        </p>

                    </form>

                </div>
            </div>

            {/* Colonne droite — prend tout l'espace restant */}
            <div className="flex-1 relative overflow-hidden">
                <img
                    src="/background_picture.svg"
                    alt=""
                    className="w-full h-full object-cover object-center"
                    style={{ minHeight: "1024px" }}
                />
                {/* Carte texte en bas à droite */}
                <div className="absolute bottom-6 right-6 bg-white rounded-2xl p-4 max-w-[288px]">
                    <p className="text-[12px] text-[#0B23F4]">
                        Analysez vos performances en un clin d'œil, suivez vos progrès et atteignez vos objectifs.
                    </p>
                </div>
            </div>

        </div>
    )
}
