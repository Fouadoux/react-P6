    const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

    export const activityByWeek = (data, monday) => {
        const start = new Date(monday)
        const sunday = new Date(start)
        sunday.setDate(sunday.getDate() + 6)

        start.setHours(0, 0, 0, 0)
        sunday.setHours(23, 0, 0, 0)
        // Filtrer les sessions de la semaine
        const filtered = data.filter(activity => {
            return activity.date >= start && activity.date <= sunday
        })

        // Construire un tableau de 7 jours
        return days.map((day, index) => {
            const currentDay = new Date(start)
            currentDay.setDate(currentDay.getDate() + index)

            const session = filtered.find(activity =>
                activity.date.toDateString() === currentDay.toDateString()
            )

            return {
                day,
                min: session?.min ?? 0,
                max: session?.max ?? 0,
                average: session?.average ?? 0,
                distance: session?.distance ?? 0,
                duration: session?.duration ?? 0,
            }
        })
    }