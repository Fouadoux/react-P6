import {useEffect, useState} from "react";
import {mockUserProfile} from "../mock/mockUserProfile.js";

export default function useUserProfile() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const data = await mockUserProfile;
                if (!data) {
                    throw Error('User Profile not found');
                }
                setData(data)
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