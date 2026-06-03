

export const getMonday = (date = new Date()) => {
    const day = date.getDay()
    const monday = new Date(date)
    monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
    return monday
}

export const getEndOfWeek = (monday) => {
    const end = new Date(monday)
    end.setDate(monday.getDate() + 6)
    return end
}

export const getWeekWithOffset = (monday, offset) => {
    const date = new Date(monday)
    date.setDate(date.getDate() + offset * 7)
    return date
}

export const getStartOfMonth = (yearMonth) => {
    const [year, month] = yearMonth.split("-")
    return new Date(year, month - 1, 1)
}

export const getEndOfMonth = (yearMonth) => {
    const [year, month] = yearMonth.split("-")
    return new Date(year, month, 0)
}

export const getMonthWithOffset = (yearMonth, offset) => {
    const date = new Date(yearMonth + "-01")
    date.setMonth(date.getMonth() + offset)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
}