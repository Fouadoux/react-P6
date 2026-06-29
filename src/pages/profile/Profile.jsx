import Statistical from "./component/Statistical.jsx";
import ProfileCard from "./component/ProfileCard.jsx";
import {getUserActivity, getUserProfile} from "../../service/service.js";
import {createUserProfile} from "../../models/UserProfile.js";
import {createUserActivity} from "../../models/UserActivity.js";
import {redirect} from "react-router";


export async function clientLoader() {
    const token = localStorage.getItem("token")

    let profile = null
    let activity = []

    try {
        const profileData = await getUserProfile(token)
        profile = createUserProfile(profileData)
    } catch (err) {
        console.error("Erreur profil:", err.message)
        return redirect("/not-found")
    }

    try {
        const startDate = profile.createdAt instanceof Date && !isNaN(profile.createdAt)
            ? profile.createdAt
            : null
        const endDate = new Date()
        const activityData = await getUserActivity(token, startDate, endDate)
        activity = activityData.map(session => createUserActivity(session))
    } catch (err) {
        console.error("Erreur activité:", err.message)
    }

    return { profile, activity }
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