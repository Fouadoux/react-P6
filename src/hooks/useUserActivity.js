import {useEffect, useState} from "react";
import {createUserActivity} from "../models/UserActivity.js";
import {getUserActivity} from "../service/service.js";

export default function useUserActivity(startDate, endDate) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!startDate || !endDate) return
        async function loadData() {
            try{
                setLoading(true);
                setError(null);
                const data= await getUserActivity(startDate, endDate);
                if(!data){
                    throw Error('Activity Profile not found');
                }
                setData(data.map(session => createUserActivity(session)))
            }catch (err){
                if (err.name !== "AbortError") {
                    setError(err.message);
                }
            }finally {
                setLoading(false);
            }
        }
        loadData();
    },[startDate, endDate])
    return {data,loading,error}
}