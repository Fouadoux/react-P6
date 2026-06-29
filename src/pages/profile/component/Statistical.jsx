export default function Statistical({ data, createdAt, totalDistance, totalDuration }) {
    const hasActivity = data.length > 0

    const totalCalories = hasActivity ? data.reduce((sum, w) => sum + w.caloriesBurned, 0) : null
    const sessionCount = hasActivity ? data.length : null

    const totalMinutes = totalDuration
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    const repos =
        Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24)) -
        new Set(data.map((s) => new Date(s.date).toDateString())).size

    const unavailable = (
        <span className="text-[14px] text-white/50 italic">Données indisponibles</span>
    )

    const stats = [
        {
            label: "Temps total couru",
            value: (
                <>
                    <span className="text-[22px] font-medium">{hours}h</span>{" "}
                    <span className="text-[16px] text-white/60">{minutes}min</span>
                </>
            ),
        },
        {
            label: "Calories brûlées",
            value: hasActivity ? (
                <>
                    <span className="text-[22px] font-medium">{totalCalories.toLocaleString()}</span>{" "}
                    <span className="text-[16px] text-white/60">cal</span>
                </>
            ) : unavailable,
        },
        {
            label: "Distance totale parcourue",
            value: (
                <>
                    <span className="text-[22px] font-medium">{Math.round(totalDistance)}</span>{" "}
                    <span className="text-[16px] text-white/60">km</span>
                </>
            ),
        },
        {
            label: "Nombre de jours de repos",
            value: (
                <>
                    <span className="text-[22px] font-medium">{repos}</span>{" "}
                    <span className="text-[16px] text-white/60">jours</span>
                </>
            ),
        },
        {
            label: "Nombre de sessions",
            value: hasActivity ? (
                <>
                    <span className="text-[22px] font-medium">{sessionCount}</span>{" "}
                    <span className="text-[16px] text-white/60">sessions</span>
                </>
            ) : unavailable,
        },
    ]

    return (
        <div className="w-143.75 h-128">
            <h1 className="text-[22px] font-bold text-gray-900 h-[27px] flex items-center">Vos statistiques</h1>
            <p className="text-gray-400 mt-[2px] mb-[31px] text-sm">
                depuis le {createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>

            <div className="grid grid-cols-2 gap-5">
                {stats.map(({ label, value }) => (
                    <div key={label} className="bg-blue-700 rounded-[10px] px-7.5 py-5 flex flex-col gap-4.75">
                        <p className="text-white/70 text-[14px] flex items-center h-4.25">{label}</p>
                        <p className="text-white h-6.75">{value}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}