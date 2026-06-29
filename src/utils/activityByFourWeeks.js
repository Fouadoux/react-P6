export const activityByFourWeeks = (data, startPeriod) => {
    const weeks = { S1: 0, S2: 0, S3: 0, S4: 0 }

    data.forEach(session => {
        const diff = Math.floor((session.date - startPeriod) / (1000 * 60 * 60 * 24 * 7))
        const weekNum = diff + 1
        if (weekNum >= 1 && weekNum <= 4) {
            weeks[`S${weekNum}`] += session.distance
        }
    })

    const formatDate = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })

    return [1, 2, 3, 4].map(num => {
        const start = new Date(startPeriod)
        start.setDate(start.getDate() + (num - 1) * 7)
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        return {
            week: `S${num}`,
            weekLabel: `${formatDate(start)} au ${formatDate(end)}`,
            distance: parseFloat(weeks[`S${num}`].toFixed(1))
        }
    })
}