import {useEffect, useState} from "react";
import {createUserProfile} from "../models/UserProfile.js";
import {getUserProfile} from "../service/profileService.js";
import useAuth from "./useAuth.js";

export default function useUserProfile() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { token } = useAuth()

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const data = await getUserProfile(token);
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
    }, [token])

return {data, loading, error};
}