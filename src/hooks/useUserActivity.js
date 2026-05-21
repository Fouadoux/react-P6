import {useEffect, useState} from "react";
import {UserActivity} from "../models/UserActivity.js";
import {getUserActivity} from "../service/profileService.js";
import useAuth from "./useAuth.js";

export default function useUserActivity(startDate, endDate) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token } = useAuth()

    useEffect(() => {
        async function loadData() {
            try{
                setLoading(true);
                setError(null);
                const data= await getUserActivity(token,startDate, endDate);
                if(!data){
                    throw Error('Activity Profile not found');
                }
                setData(data.map(session => new UserActivity(session)))
            }catch (err){
                if (err.name !== "AbortError") {
                    setError(err.message);
                }
            }finally {
                setLoading(false);
            }
        }
        loadData();
    },[token,startDate, endDate])
    return {data,loading,error}
}