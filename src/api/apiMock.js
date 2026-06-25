import {mockUserProfile} from "../mock/mockUserProfile.js";
import {mockUserActivity} from "../mock/mockUserActivity.js";

export const getUserProfile = async (token) => {
    return Promise.resolve(mockUserProfile)
}

export const getUserActivity = async (token, startWeek, endWeek) => {
    return Promise.resolve(mockUserActivity)
}

export async function loginApi(username, password) {
    return Promise.resolve("fake-token")
}