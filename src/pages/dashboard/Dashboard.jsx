import UserCard from "./component/UserCard.jsx";
import BarChartByMonth from "./component/BarChartByMonth.jsx";
import ComposedChartByWeek from "./component/ComposedChartByWeek.jsx";
import RadialChartWeek from "./component/RadialChartWeek.jsx";
import Header from "../../component/Header.jsx";
import Footer from "../../component/Footer.jsx";
import {getEndOfWeek, getMonday} from "../../utils/dateUtils.js";
import {getUserActivity, getUserProfile} from "../../service/service.js";
import {createUserProfile} from "../../models/UserProfile.js";
import {createUserActivity} from "../../models/UserActivity.js";
import useAuth from "../../hooks/useAuth.js";

import {redirect} from "react-router";

export async function clientLoader() {
    const token =  localStorage.getItem("token")
    const monday = getMonday()
    const endOfWeek = getEndOfWeek(monday)

    let profile = null
    let activity = null

    try {
        const profileData = await getUserProfile(token)
        profile = createUserProfile(profileData)
    } catch (err) {
        console.error("Erreur profil:", err.message)
        return redirect("/not-found")
    }

    try {
        const activityData = await getUserActivity(token, monday, endOfWeek)
        activity = activityData.map(session => createUserActivity(session))
    } catch (err) {
        console.error("Erreur activité:", err.message)
    }

    return { profile, activity }
}

export default function Dashboard({ loaderData }) {
    const { profile, activity } = loaderData
    return (
        <div className="flex flex-col gap-27 min-h-screen mx-auto">
            <Header />
            <UserCard data={profile} />
            <div className="flex flex-col gap-y-17.75 m-auto">
                    <div className="flex flex-col gap-y-8">
                        <h2 className="flex items-center text-[22px] h-6.75">Vos dernières performances</h2>
                        <div className="flex flex-row gap-x-6">
                            <BarChartByMonth />
                            <ComposedChartByWeek data={activity} />
                        </div>
                    </div>
                    <RadialChartWeek goal={profile.weeklyGoal} data={activity} />
            </div>
            <Footer />
        </div>
    )
}