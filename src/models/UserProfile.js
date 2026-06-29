export function createUserProfile(data) {
    return {
        firstName: data.profile.firstName,
        lastName: data.profile.lastName,
        createdAt: new Date(data.profile.createdAt),
        age: data.profile.age,
        gender: data.profile.gender,
        weight: data.profile.weight,
        height: data.profile.height,
        profilePicture: data.profile.profilePicture,
        totalDistance: data.statistics.totalDistance,
        totalSessions: data.statistics.totalSessions,
        totalDuration: data.statistics.totalDuration,
        weeklyGoal: data.profile.weeklyGoal || 0,
    }
}