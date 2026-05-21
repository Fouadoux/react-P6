import * as userApi from "../api/userApi.js";

export const getUserProfile = (token) => {
    return userApi.getUserProfile(token);
}

export const getUserActivity = (token, startWeek, endWeek) => {
    return userApi.getUserActivity(token, startWeek, endWeek)
}