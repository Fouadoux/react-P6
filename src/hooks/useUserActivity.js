import {useEffect, useState} from "react";
import {mockUserActivity} from "../mock/mockUserActivity.js";

export default function useUserActivity(){
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadData() {
            try{
                setLoading(true);
                setError(null);
                const data= await mockUserActivity;
                setData(data);
                if(!data){
                    throw Error('Activity Profile not found');
                }
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