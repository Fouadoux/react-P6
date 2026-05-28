import useUserProfile from "../../hooks/useUserProfile.js";
import UserCard from "./component/UserCard.jsx";
import BarChartByMonth from "./component/BarChartByMonth.jsx";
import ComposedChartByWeek from "./component/ComposedChartByWeek.jsx";
import RadialChartWeek from "./component/RadialChartWeek.jsx";
import Header from "../../component/Header.jsx";
import Footer from "../../component/Footer.jsx";

export default function Dashboard() {

    const {data: dataProfile, loading: loadingProfile, error: errorProfile} = useUserProfile();
    if (loadingProfile) return <p>Chargement...</p>
    if (errorProfile) return <p>Une erreur est survenue</p>
    if (!dataProfile) return null;
    console.log("goal =>", dataProfile);


    return (
<>

    <div className="flex flex-col gap-y-27">
        <Header  />
    <UserCard data={dataProfile}/>
        <div className="flex flex-col gap-y-17.75 m-auto">
            <div className="flex flex-col gap-y-8">
                <h2 className="text-xl font-bold mb-1">Vos dernières performances</h2>
                <div className="flex flex-row gap-x-6">
            <BarChartByMonth />
            <ComposedChartByWeek />
                </div>
            </div>
        <RadialChartWeek goal={dataProfile.weeklyGoal} />
        </div>
        <Footer />
    </div>
</>
)
}