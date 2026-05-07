export default function UserCard({data}) {

    const dateFormatted = new Date(data.profile.createdAt).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric"
    })

    return (<div className="flex items-center mx-auto gap-5 bg-[#f0f2f8] rounded-2xl px-7 py-5 w-5xl">

        {/* Photo */}
        <img
            src={data.profile.profilePicture}
            alt=""
            className="w-[72px] h-[72px] rounded-xl object-cover shrink-0"
        />

        {/* Nom + date */}
        <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-semibold text-[#1a1a2e] m-0">
                {data.profile.firstName} {data.profile.lastName}
            </h1>
            <p className="text-[13px] text-[#7a7e96] m-0">
                Membre depuis le {dateFormatted}
            </p>
        </div>

        {/* Label */}
        <p className="text-[13px] text-[#7a7e96] shrink-0 m-0">
            Distance totale parcourue
        </p>

        {/* Badge km */}
        <div className="flex items-center gap-2.5 bg-[#2d3ae8] rounded-[14px] px-[22px] py-[14px] shrink-0">

                <span className="text-[18px] font-bold text-white whitespace-nowrap">
                {data.statistics.totalDistance} km</span>
        </div>

    </div>)
}