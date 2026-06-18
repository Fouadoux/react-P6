import {useMemo, useState} from "react";
import {activityByFourWeeks} from "../../../utils/activityByFourWeeks.js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip  } from 'recharts'
import useUserActivity from "../../../hooks/useUserActivity.js";
import {
    getEndOfWeek,
    getMonday,
    getWeekWithOffset
} from "../../../utils/dateUtils.js";
import Spinner from "../../../component/Spinner.jsx";

export default function BarChartByMonth(){
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [currentPeriodStart, setCurrentPeriodStart] = useState(() => getWeekWithOffset(getMonday(), -3))
    const [hovered, setHovered] = useState(false)
    const startPeriod = currentPeriodStart

    const endPeriod = useMemo(() => {
        return getEndOfWeek(getWeekWithOffset(currentPeriodStart, 3))
    }, [currentPeriodStart])

    const { data: data, loading, error } = useUserActivity(startPeriod, endPeriod)

    if (error) return (
        <div className="bg-white rounded-[10px] px-10 pt-4 pb-6 flex flex-col justify-center items-center"
             style={{ width: 445, height: 400, boxShadow: "0px 4px 84px -40px rgba(157, 167, 251, 0.4)" }}
        >
            <p className="text-[#F4320B] text-[14px] font-medium">Erreur de chargement</p>
            <p className="text-[#707070] text-[12px] mt-1">Les données ne sont pas disponibles</p>
        </div>
    )

    const dataByFourWeeks = data ? activityByFourWeeks(data, startPeriod) : []

    const changePeriod = (offset) => {
        setCurrentPeriodStart(getWeekWithOffset(currentPeriodStart, offset * 4))
    }

    const avgDistance = dataByFourWeeks.length
        ? Math.round(dataByFourWeeks.reduce((sum, w) => sum + w.distance, 0) / dataByFourWeeks.length)
        : 0



    const formatDate = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    const periodLabel = `${formatDate(startPeriod)} - ${formatDate(endPeriod)}`

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null
        return (
            <div className="bg-[#1C1C1C] rounded-lg px-4 py-3 shadow-md">
                <p className="text-[12px] text-white/70 mb-1">{payload[0]?.payload?.weekLabel}</p>
                <p className="text-[16px] font-bold text-white">{payload[0]?.value} km</p>
            </div>
        )
    }

    return (
        <div
            className="bg-white rounded-[10px] px-10 pt-4 pb-6 h-121"
            style={{ width: 445, boxShadow: "0px 4px 84px -40px rgba(157, 167, 251, 0.4)" }}
        >
            {/* Header */}
            <div className="flex flex-row items-center pb-2 w-full h-[103px]">
                <div className="flex flex-row justify-between items-center pb-8 w-full h-[95px]">

                    <div className="flex flex-col justify-between items-start h-[63px]">
                        <div />
                        <p className="text-[22px] font-medium text-[#0B23F4] m-0 leading-[27px]">
                            {avgDistance}km en moyenne
                        </p>
                        <p className="text-[12px] text-[#707070] m-0 leading-[15px]">
                            Total des kilomètres 4 dernières semaines
                        </p>
                    </div>

                    <div className="flex gap-1.5">
                        <button onClick={() => changePeriod(-1)}>
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
            </div>



            {/* Chart */}

            {loading || !dataByFourWeeks ? <Spinner /> :
                <div
                    className="bg-white rounded-[10px] pt-4 pb-6"
                    style={{ width: 360}}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={dataByFourWeeks}
                    barSize={40}
                    margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                >
                    <CartesianGrid
                        vertical={false}
                        stroke="#F1F1F1"
                        strokeDasharray=""
                    />
                    <XAxis
                        dataKey="week"
                        axisLine={{ stroke: "#717171" }}
                        tickLine={false}
                        tick={{ fill: "#707070", fontSize: 12 }}
                    />
                    <YAxis
                        domain={[0, 30]}
                        ticks={[0, 10, 20, 30]}
                        axisLine={{ stroke: "#717171" }}
                        tickLine={false}
                        tick={{ fill: "#707070", fontSize: 10 }}
                        width={25}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Bar dataKey="distance" fill={hovered ? "#0B23F4" : "#B6BDFC"} radius={[30, 30, 30, 30]} barSize={14} />
                </BarChart>
            </ResponsiveContainer>
                </div>
            }



            {/* Légende */}
            <div className="flex items-center gap-1 pt-3">
                <span className="w-2 h-2 rounded-full bg-[#7987FF] inline-block" />
                <span className="text-[12px] text-[#707070]">Km</span>
            </div>
        </div>
    )
}
