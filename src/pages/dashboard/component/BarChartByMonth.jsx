import {useMemo, useState} from "react";
import {activityByFourWeeks} from "../../../utils/activityByFourWeeks.js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import useUserActivity from "../../../hooks/useUserActivity.js";
import {
    getEndOfWeek,
    getMonday,
    getWeekWithOffset
} from "../../../utils/dateUtils.js";
import NotFound from "../../notFound/NotFound.jsx";

export default function BarChartByMonth(){
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [currentPeriodStart, setCurrentPeriodStart] = useState(() => getWeekWithOffset(getMonday(), -3))

    const startPeriod = currentPeriodStart

    const endPeriod = useMemo(() => {
        return getEndOfWeek(getWeekWithOffset(currentPeriodStart, 3))
    }, [currentPeriodStart])

    const { data: data, loading, error } = useUserActivity(startPeriod, endPeriod)
    if (error) return <NotFound />
    const dataByFourWeeks = data ? activityByFourWeeks(data, startPeriod) : []

    const changePeriod = (offset) => {
        setCurrentPeriodStart(getWeekWithOffset(currentPeriodStart, offset * 4))
    }

    const avgDistance = dataByFourWeeks.length
        ? Math.round(dataByFourWeeks.reduce((sum, w) => sum + w.distance, 0) / dataByFourWeeks.length)
        : 0



    const formatDate = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    const periodLabel = `${formatDate(startPeriod)} - ${formatDate(endPeriod)}`

    return (
        <div
            className="bg-white rounded-[10px] px-10 pt-4 pb-6"
            style={{ width: 445, boxShadow: "0px 4px 84px -40px rgba(157, 167, 251, 0.4)" }}
        >
            {/* Header — tout sur une ligne */}
            <div className="flex flex-col h-25">
                <div className="flex flex-row justify-between items-center py-2.5 h-12">
                <p className="text-[22px] font-medium text-[#0B23F4] m-0 ">
                    {avgDistance}km en moyenne
                </p>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => changePeriod(-1)}
                        >
                            <img src="/left.svg" alt="suivant" className="w-6 h-6" />
                        </button>
                        <span className="flex items-center text-[12px] text-[#111111]">{periodLabel}</span>
                        <button
                            onClick={() => changePeriod(1)}
                            disabled={currentPeriodStart.toDateString() === getWeekWithOffset(getMonday(), -3).toDateString()}
                            className={currentPeriodStart.toDateString() === yearMonth ? "opacity-30" : ""}
                        >
                            <img src="/rigth.svg" alt="suivant" className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                <p className="text-[12px] text-[#707070] mt-1 m-0">
                    Total des kilomètres 4 dernières semaines
                </p>


            </div>



            {/* Chart */}
            {loading || !dataByFourWeeks ?
                <div className="flex items-center justify-center w-full h-75">
                    <div className="w-10 h-10 border-4 border-[#901C1C] border-t-transparent rounded-full animate-spin" />
                </div> :
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dataByFourWeeks} barSize={40} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid
                        vertical={false}
                        stroke="#F1F1F1"
                        strokeDasharray=""
                    />
                    <XAxis
                        dataKey="week"
                        axisLine={{ stroke: "#e0e0e0" }}
                        tickLine={false}
                        tick={{ fill: "#707070", fontSize: 12, fontFamily: "Inter" }}
                    />
                    <YAxis
                        domain={[0, 30]}
                        ticks={[0, 10, 20, 30]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#707070", fontSize: 10, fontFamily: "Inter" }}
                        width={16}
                    />
                    <Bar dataKey="distance" fill="#B6BDFC" radius={[6, 6, 6, 6]} barSize={14} />
                </BarChart>
            </ResponsiveContainer>
            }

            {/* Légende */}
            <div className="flex items-center gap-1 pt-3">
                <span className="w-2 h-2 rounded-full bg-[#7987FF] inline-block" />
                <span className="text-[12px] text-[#707070]">Km</span>
            </div>
        </div>
    )
}
