import {mockUserProfile} from "../mock/mockUserProfile.js";
import {mockUserActivity} from "../mock/mockUserActivity.js";

export const getUserProfile = (token) => {
    return mockUserProfile
}

export const getUserActivity = (token, startWeek, endWeek) => {
    return mockUserActivity
}

export async function loginApi(username, password) {
    return "fake-token"
}