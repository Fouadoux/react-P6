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