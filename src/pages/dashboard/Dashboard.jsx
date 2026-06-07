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

export async function clientLoader() {

    const token = localStorage.getItem("token")
    const monday = getMonday()
    const endOfWeek = getEndOfWeek(monday)

    const [profileData, activityData] = await Promise.all([
        getUserProfile(token),
        getUserActivity(token, monday, endOfWeek)
    ])

    return {
        profile: createUserProfile(profileData),
        activity: activityData.map(session => createUserActivity(session))
    }
}

export default function Dashboard({ loaderData }) {
    const { profile, activity } = loaderData
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <div className="flex flex-col gap-y-17.75 flex-1 py-27">
                <UserCard data={profile} />
                <div className="flex flex-col gap-y-17.75 m-auto">
                    <div className="flex flex-col gap-y-8">
                        <h2 className="text-xl font-bold mb-1">Vos dernières performances</h2>
                        <div className="flex flex-row gap-x-6">
                            <BarChartByMonth />
                            <ComposedChartByWeek data={activity} />
                        </div>
                    </div>
                    <RadialChartWeek goal={profile.weeklyGoal} data={activity} />
                </div>
            </div>
            <Footer />
        </div>
    )
}