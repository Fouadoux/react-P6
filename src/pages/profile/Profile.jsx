import Header from "../../component/Header.jsx";
import Statistical from "./component/Statistical.jsx";
import ProfileCard from "./component/ProfileCard.jsx";
import Footer from "../../component/Footer.jsx";
import {getUserActivity, getUserProfile} from "../../service/service.js";
import {createUserProfile} from "../../models/UserProfile.js";
import {createUserActivity} from "../../models/UserActivity.js";


export async function clientLoader() {
    const token = localStorage.getItem("token")

    const profileData = await getUserProfile(token)
    const startDate = profileData?.profile?.createdAt ?? null
    const endDate = new Date()

    const activityData = await getUserActivity(token, startDate, endDate)

    return {
        profile: createUserProfile(profileData),
        activity: activityData.map(session => createUserActivity(session))
    }
}

export default function Profile({ loaderData }) {
    const { profile, activity } = loaderData
    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex flex-row gap-14.25 mx-auto flex-1 py-27">
                <ProfileCard data={profile} />
                <Statistical data={activity} createdAt={profile.createdAt}
                             totalDistance={profile.totalDistance}
                             totalDuration={profile.totalDuration}/>
            </div>
        </div>
    )
}
