import useUserActivity from "../../hooks/useUserActivity.js";
import useUserProfile from "../../hooks/useUserProfile.js";
import UserCard from "./composant/UserCard/UserCard.jsx";
import BarChartByMonth from "./composant/BarChart/BarChartByMonth.jsx";
import {activityByMonth} from "../../utils/activityByMonth.js";

export default function Dashboard() {

    const {data: dataActivity, loading: loadingActivity, error: errorActivity} = useUserActivity();
    const {data: dataProfile, loading: loadingProfile, error: errorProfile} = useUserProfile();
    if (loadingActivity || loadingProfile) return <p>Chargement...</p>
    if (errorActivity || errorProfile) return <p>Une erreur est survenue</p>
    if (!dataActivity) return null;
    if (!dataProfile) return null;

    const dataByMonth = activityByMonth(dataActivity);

    return (
<>
        <h1>Dashboard</h1>

    <UserCard data={dataProfile}/>
    <BarChartByMonth data={dataActivity} />
</>
)
}