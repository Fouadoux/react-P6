export default function Statistical({ data, createdAt, totalDistance, totalDuration }) {
    const totalCalories = data.reduce((sum, w) => sum + w.caloriesBurned, 0)

    const totalMinutes = totalDuration
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60


    const repos =
        Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24)) -
        new Set(data.map((s) => new Date(s.date).toDateString())).size

    const sessionCount = data.length

    const stats = [
        {
            label: "Temps total couru",
            value: (
                <>
                    <span className="text-[22px] font-bold">{hours}h</span>{" "}
                    <span className="text-[16px] text-white/60">{minutes}min</span>
                </>
            ),
        },
        {
            label: "Calories brûlées",
            value: (
                <>
                    <span className="text-[22px] font-bold">{totalCalories.toLocaleString()}</span>{" "}
                    <span className="text-[16px] text-white/60">cal</span>
                </>
            ),
        },
        {
            label: "Distance totale parcourue",
            value: (
                <>
                    <span className="text-[22px] font-bold">{totalDistance}</span>{" "}
                    <span className="text-[16px] text-white/60">km</span>
                </>
            ),
        },
        {
            label: "Nombre de jours de repos",
            value: (
                <>
                    <span className="text-[22px] font-bold">{repos}</span>{" "}
                    <span className="text-[16px] text-white/60">jours</span>
                </>
            ),
        },
        {
            label: "Nombre de sessions",
            value: (
                <>
                    <span className="text-[22px] font-bold">{sessionCount}</span>{" "}
                    <span className="text-[16px] text-white/60">sessions</span>
                </>
            ),
        },
    ]

    return (
        <div className=" w-143.75 h-128">
            <h1 className="text-[22px] font-bold text-gray-900">Vos statistiques</h1>
            <p className="text-gray-400 mt-1 mb-8 text-sm">
                depuis le {new Date(createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>

            <div className="grid grid-cols-2 gap-5">
                {stats.map(({ label, value }) => (
                    <div key={label} className="bg-blue-700 rounded-2xl px-7.5 py-5 flex flex-col gap-4.75">
                        <p className="text-white/70 text-[14px] flex items-center h-4.25">{label}</p>
                        <p className="text-white h-6.75">{value}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}