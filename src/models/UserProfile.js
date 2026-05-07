export  class UserProfile {
    constructor(data) {
        this.firstName = data.profile.firstName;
        this.lastName = data.profile.lastName;
        this.createdAt= new Date(data.profile.createdAt);
        this.age=data.profile.age;
        this.weight=data.profile.weight;
        this.height=data.profile.height;
        this.profilePicture=data.profile.profilePicture;
        this.totalDistance=data.statistics.totalDistance;
        this.totalSessions=data.statistics.totalSessions;
        this.totalDuration=data.statistics.totalDuration;
    }
}