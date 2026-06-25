import {useEffect, useState} from "react";
import {createUserProfile} from "../models/UserProfile.js";
import {getUserProfile} from "../service/service.js";

export default function useUserProfile() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const data = await getUserProfile();
                if (!data) {
                    throw Error('User Profile not found');
                }
                setData(createUserProfile(data));
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(err.message);
                }
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [])

return {data, loading, error};
}