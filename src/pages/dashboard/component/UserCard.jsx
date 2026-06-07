export default function UserCard({data}) {

    const dateFormatted = new Date(data.createdAt).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric"
    })

    return (
        <div className="m-auto flex items-center justify-between rounded-[20px] px-[52px] py-[32px] w-[1052px] h-[181px] bg-[linear-gradient(0deg,rgba(255,255,255,0)_-8.38%,#FFFFFF_100%)]">

            {/* Photo + Nom */}
            <div className="flex items-center gap-[38px]">
                <img
                    src={data.profilePicture}
                    alt=""
                    className="w-[104px] h-[117px] rounded-[10px] object-cover shrink-0 shadow-[0px_4px_84px_-40px_rgba(157,167,251,0.4)]"
                />
                <div className="flex flex-col gap-1">
                    <h1 className="text-[22px] font-medium text-[#111111] m-0 leading-[27px]">
                        {data.firstName} {data.lastName}
                    </h1>
                    <p className="text-[14px] text-[#707070] m-0 leading-[17px]">
                        Membre depuis le {dateFormatted}
                    </p>
                </div>
            </div>

            {/* Label + Badge */}
            <div className="flex items-center gap-[18px]">
                <p className="text-[14px] text-[#707070] m-0 leading-[17px]">
                    Distance totale parcourue
                </p>
                <div className="flex items-center justify-center bg-[#0B23F4] rounded-[10px] border border-[#0B23F4] w-[183px] h-[90px]">
                    <span className="text-[22px] font-medium text-white leading-[27px]">
                        {data.totalDistance} km
                    </span>
                </div>
            </div>
        </div>
    )
}
