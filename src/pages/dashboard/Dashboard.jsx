import useUserProfile from "../../hooks/useUserProfile.js";
import UserCard from "./component/UserCard.jsx";
import BarChartByMonth from "./component/BarChartByMonth.jsx";
import ComposedChartByWeek from "./component/ComposedChartByWeek.jsx";
import RadialChartWeek from "./component/RadialChartWeek.jsx";
import Header from "../../component/Header.jsx";
import Footer from "../../component/Footer.jsx";
import DashboardSkeleton from "./component/DashboardSkeleton.jsx";
import useUserActivity from "../../hooks/useUserActivity.js";
import {useMemo} from "react";
import {getEndOfWeek, getMonday} from "../../utils/dateUtils.js";
import NotFound from "../notFound/NotFound.jsx";

export default function Dashboard() {


    
    const currentWeek = useMemo(() => {
        return getMonday()
    }, [])
    
    const endOfWeek = useMemo(() => {
        return getEndOfWeek(currentWeek)
    }, [currentWeek])

    const {data: dataProfile, loading: loadingProfile, error: errorProfile} = useUserProfile();
    const {data: dataActivity, loading: loadingActivity, error: errorActivity} = useUserActivity(currentWeek, endOfWeek);
    if (loadingProfile || loadingActivity ) return <DashboardSkeleton />
    if (errorProfile || errorActivity) return <NotFound />
    if (!dataProfile || !dataActivity) return null;

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
            <ComposedChartByWeek data={dataActivity} />
                </div>
            </div>
            <RadialChartWeek goal={dataProfile.weeklyGoal} data={dataActivity} />
        </div>
        <Footer />
    </div>
</>
)
}