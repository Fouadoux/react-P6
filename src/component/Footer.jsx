export default function Footer() {
    return (
        <footer className="mt-20 flex items-center justify-between px-30 py-2.5 w-full bg-white">
            {/* Gauche */}
            <div className="flex items-center gap-2.25">
                <span className="text-[14px] text-[#111111]">©Sportsee</span>
                <span className="text-[14px] text-[#111111]">Tous droits réservés</span>
            </div>

            {/* Droite */}
            <div className="flex items-center gap-4">
                <span className="text-[14px] text-[#111111]">Conditions générales</span>
                <span className="text-[14px] text-[#111111]">Contact</span>
                <img src="/icon2.svg" alt="Sportsee" />
            </div>

        </footer>
    )
}
