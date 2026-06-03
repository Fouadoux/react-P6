export const activityByFourWeeks = (data, startPeriod) => {
    const weeks = { S1: 0, S2: 0, S3: 0, S4: 0 }

    data.forEach(session => {
        const diff = Math.floor((session.date - startPeriod) / (1000 * 60 * 60 * 24 * 7))
        const weekNum = diff + 1
        if (weekNum >= 1 && weekNum <= 4) {
            weeks[`S${weekNum}`] += session.distance
        }
    })

    return [
        { week: "S1", distance: weeks.S1 },
        { week: "S2", distance: weeks.S2 },
        { week: "S3", distance: weeks.S3 },
        { week: "S4", distance: weeks.S4 },
    ]
}