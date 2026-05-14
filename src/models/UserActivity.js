export class UserActivity {
    constructor(data) {
        this.date= new Date(data.date);
        this.distance=data.distance;
        this.duration=data.duration;
        this.min = data.heartRate?.min
        this.max = data.heartRate?.max
        this.average = data.heartRate?.average
        this.caloriesBurned=data.caloriesBurned;
    }
}