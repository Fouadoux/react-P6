import {mockUserProfile} from "../mock/mockUserProfile.js";
import {mockUserActivity} from "../mock/mockUserActivity.js";

export const getUserProfile = async () => {
    return Promise.resolve(mockUserProfile)
}

export const getUserActivity = async (startWeek, endWeek) => {
    return Promise.resolve(mockUserActivity)
}

export async function loginApi(username, password) {
    return Promise.resolve("fake-token")
}