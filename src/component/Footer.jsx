export default function Footer() {
    return (
        <footer className="flex items-center justify-between px-[100px] py-[10px] w-full bg-white">

            {/* Gauche */}
            <div className="flex items-center gap-[9px]">
                <span className="text-[14px] text-[#111111]">©Sportsee</span>
                <span className="text-[14px] text-[#111111]">Tous droits réservés</span>
            </div>

            {/* Droite */}
            <div className="flex items-center gap-[16px]">
                <span className="text-[14px] text-[#111111]">Conditions générales</span>
                <span className="text-[14px] text-[#111111]">Contact</span>
                <img src="/icon2.svg" alt="Sportsee" />
            </div>

        </footer>
    )
}
