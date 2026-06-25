export default function ProfileCard({ data }) {
    const memberSince = data.createdAt.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })

    const heightM = Math.floor(data.height / 100)
    const heightCm = data.height % 100

    return (
        <div className="flex flex-col gap-4 w-127">

            {/* Header profil */}
            <div
                className="flex flex-row items-center gap-6 bg-white rounded-[10px] px-8 py-6"
                style={{ boxShadow: "0px 4px 84px -40px rgba(157, 167, 251, 0.4)" }}
            >
                {data.profilePicture ? (
                        <div className="overflow-hidden rounded-[10px] shrink-0">
                    <img
                        src={data.profilePicture}
                        alt={`${data.firstName} ${data.lastName}`}
                        className="w-26 h-29.25 rounded-[10px] object-cover shrink-0 transition-transform duration-300 hover:scale-150"
                        style={{ boxShadow: "0px 4px 84px -40px rgba(157, 167, 251, 0.4)" }}
                    />
                        </div>
                ) : (
                    <div
                        className="w-26 h-29.25 rounded-[10px] bg-gray-100 flex items-center justify-center text-gray-400 text-2xl font-medium shrink-0"
                        style={{ boxShadow: "0px 4px 84px -40px rgba(157, 167, 251, 0.4)" }}
                    >
                        {data.firstName[0]}{data.lastName[0]}
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    <p
                        className="font-medium text-[#111111]"
                        style={{ fontFamily: "Inter", fontSize: 22, lineHeight: "27px" }}
                    >
                        {data.firstName} {data.lastName}
                    </p>
                    <p
                        className="font-normal text-[#707070]"
                        style={{ fontFamily: "Inter", fontSize: 14, lineHeight: "17px" }}
                    >
                        Membre depuis le {memberSince}
                    </p>
                </div>
            </div>

            {/* Votre profil */}
            <div
                className="flex flex-col gap-8 bg-white rounded-[10px] pt-10 px-7 pb-15"
                style={{ boxShadow: "0px 4px 84px -40px rgba(157, 167, 251, 0.4)" }}
            >
                <div className="flex flex-col gap-6">
                    <p
                        className="font-medium text-[#111111]"
                        style={{ fontFamily: "Inter", fontSize: 22, lineHeight: "27px" }}
                    >
                        Votre profil
                    </p>
                    <hr className="border-[#E7E7E7] w-full" />
                </div>

                <div className="flex flex-col gap-6">
                    {[
                        { label: "Âge", value: `${data.age}` },
                        { label: "Genre", value: data.gender ?? "—" },
                        { label: "Taille", value: `${heightM}m${String(heightCm).padStart(2, "0")}` },
                        { label: "Poids", value: `${data.weight}kg` },
                    ].map(({ label, value }) => (
                        <p
                            key={label}
                            className="font-medium text-[#707070]"
                            style={{ fontFamily: "Inter", fontSize: 16, lineHeight: "19px" }}
                        >
                            {label} : {value}
                        </p>
                    ))}
                </div>
            </div>

        </div>
    )
}
