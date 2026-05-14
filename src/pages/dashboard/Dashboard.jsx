import useUserActivity from "../../hooks/useUserActivity.js";
import useUserProfile from "../../hooks/useUserProfile.js";
import UserCard from "./composant/UserCard/UserCard.jsx";
import BarChartByMonth from "./composant/BarChart/BarChartByMonth.jsx";
import ComposedChartByWeek from "./composant/ComposedChart/ComposedChartByWeek.jsx";
import RadialChartWeek from "./composant/RadialChart/RadialChartWeek.jsx";
import Header from "../../component/Header/Header.jsx";

export default function Dashboard() {

    const {data: dataActivity, loading: loadingActivity, error: errorActivity} = useUserActivity();
    const {data: dataProfile, loading: loadingProfile, error: errorProfile} = useUserProfile();
    if (loadingActivity || loadingProfile) return <p>Chargement...</p>
    console.log(errorProfile)
    console.log(errorActivity)
    if (errorActivity || errorProfile) return <p>Une erreur est survenue</p>
    if (!dataActivity) return null;
    if (!dataProfile) return null;



    return (
<>

    <div className="flex flex-col gap-y-27">
        <Header  />
    <UserCard data={dataProfile}/>
        <div className="flex flex-col gap-y-17.75 m-auto">
            <div className="flex flex-col gap-y-8">
                <h2 className="text-xl font-bold mb-1">Vos dernières performances</h2>
                <div className="flex flex-row gap-x-6">
            <BarChartByMonth data={dataActivity} />
            <ComposedChartByWeek data={dataActivity} />
                </div>
            </div>
        <RadialChartWeek data={dataActivity} goal={dataProfile.weeklyGoal} />
        </div>
    </div>
</>
)
}