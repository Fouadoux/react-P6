const BASE_URL = "http://localhost:8000"

export const getUserProfile = async (token) => {
    const response = await fetch(`${BASE_URL}/api/user-info`, {
        headers: {
            credentials: "include"
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
            credentials: "include"
        }
    })
    if (!response.ok) {
      console.log("Erreur lors de la récupération de l'activité")
        return null
    }
    return response.json()
}

export async function loginApi(username, password) {
    const response = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })

    if (!response.ok) throw new Error("Identifiants incorrects")

    const data = await response.json()
    return data.token
}