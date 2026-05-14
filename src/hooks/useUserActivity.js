import {useEffect, useState} from "react";
import {UserActivity} from "../models/UserActivity.js";
import {getUserActivity} from "../service/profileServiceMock.js";

export default function useUserActivity(){
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadData() {
            try{
                setLoading(true);
                setError(null);
                const data= await getUserActivity();
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
    },[])
    return {data,loading,error}
}