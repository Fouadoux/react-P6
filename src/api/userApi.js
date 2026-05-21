const BASE_URL = "http://localhost:8000"

export const getUserProfile = async (token) => {
    const response = await fetch(`${BASE_URL}/api/user-info`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    if (!response.ok) {
        throw new Error("Erreur lors de la récupération du profil")
    }
    return response.json()
}

export const getUserActivity = async (token, startWeek, endWeek) => {
    const response = await fetch(`${BASE_URL}/api/user-activity?startWeek=${startWeek}&endWeek=${endWeek}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    if (!response.ok) {
        throw new Error("Erreur lors de la récupération de l'activité")
    }
    return response.json()
}