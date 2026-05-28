    const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

    export const activityByWeek   = (data, startWeek, endWeek) => {


        const start = new Date(startWeek)
        const end = new Date(endWeek)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 0, 0, 0)


        // Construire un tableau de 7 jours
        return days.map((day, index) => {
            const currentDay = new Date(start)
            currentDay.setDate(start.getDate() + index)

            const session = data.find(activity =>
                activity.date.toDateString() === currentDay.toDateString()
            )

            return {
                dayLabel: day,
                min: session?.min ?? 130,
                max: session?.max ?? 130,
                average: session?.average ?? 130,
                distance: session?.distance ?? 0,
                duration: session?.duration ?? 0,
            }
        })
    }