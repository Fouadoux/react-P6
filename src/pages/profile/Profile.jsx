import useUserActivity from "../../hooks/useUserActivity.js";
import useUserProfile from "../../hooks/useUserProfile.js";
import Header from "../../component/Header.jsx";
import {useMemo} from "react";
import Statistical from "./component/Statistical.jsx";
import ProfileCard from "./component/ProfileCard.jsx";
import Footer from "../../component/Footer.jsx";

export default function Profile() {

    const endDate = useMemo(() => {
        return new Date()
    }, [])

    const { data: profile, loading: loadingProfile, error: errorProfile } = useUserProfile()
    const { data: sessions, loading: loadingSessions, error: errorSessions } = useUserActivity(
        profile?.createdAt ?? null,
        profile ? endDate : null
    )

    if (loadingProfile || loadingSessions) return <p>Chargement...</p>
    if (errorProfile || errorSessions) return <p>Erreur</p>
    if (!profile || !sessions) return null

    return (
        <>
            <div className="flex flex-col gap-27">
            <Header />
            <div className="flex flex-row gap-14.25 mx-auto">
                <ProfileCard data={profile}  />
                <Statistical data={sessions} createdAt={profile.createdAt}
                             totalDistance={profile.totalDistance}
                             totalDuration={profile.totalDuration}/>
            </div>
                <Footer />
            </div>
        </>

    )
}
