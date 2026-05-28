export function createUserActivity(data) {
    return {
        date: new Date(data.date),
        distance: data.distance,
        duration: data.duration,
        min: data.heartRate?.min,
        max: data.heartRate?.max,
        average: data.heartRate?.average,
        caloriesBurned: data.caloriesBurned,
    }
}