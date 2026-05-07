export const activityByMonth = (data, yearMonth) => {
    const filterByMonth = data.filter(activity => activity.date.startsWith(yearMonth))

    const tab = filterByMonth.reduce((acc, cur) => {
        const day = new Date(cur.date).getDate()
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