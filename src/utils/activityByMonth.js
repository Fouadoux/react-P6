export const activityByMonth = (data) => {
    const tab = data.reduce((acc, cur) => {
        const day = cur.date.getDate()
        const week = Math.ceil(day / 7)
        acc[`S${week}`] += cur.distance
        return acc
    }, { S1: 0, S2: 0, S3: 0, S4: 0 })

    return [
        { week: "S1", distance: tab.S1 },
        { week: "S2", distance: tab.S2 },
        { week: "S3", distance: tab.S3 },
        { week: "S4", distance: tab.S4 },
    ]
}