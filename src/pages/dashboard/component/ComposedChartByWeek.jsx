import {useMemo, useState} from "react"
import {
    ComposedChart, Bar, Line, XAxis, YAxis,
    CartesianGrid, ResponsiveContainer,
} from 'recharts'
import {getUserActivity} from "../../../service/service.js";
import {activityByWeek} from "../../../utils/activityByWeek.js";
import useAuth from "../../../hooks/useAuth.js";
import {createUserActivity} from "../../../models/UserActivity.js";
import {getEndOfWeek, getMonday, getWeekWithOffset} from "../../../utils/dateUtils.js";
import Spinner from "../../../component/Spinner.jsx";

export default function ComposedChartByWeek({data}) {

    const {token} = useAuth()
    const [currentWeek, setCurrentWeek] = useState(getMonday())
    const [lineHovered, setLineHovered] = useState(false)
    const [dataByDay, setDataByDay] = useState(data)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const endOfWeek = useMemo(() => {
        return getEndOfWeek(currentWeek)
    }, [currentWeek])

    if (error || !data) return (
        <div className="bg-white rounded-[10px] px-10 pt-4 pb-6 flex flex-col justify-center items-center"
             style={{ width: 445, height: 400, boxShadow: "0px 4px 84px -40px rgba(157, 167, 251, 0.4)" }}
        >
            <p className="text-[#F4320B] text-[14px] font-medium">Erreur de chargement</p>
            <p className="text-[#707070] text-[12px] mt-1">Les données ne sont pas disponibles</p>
        </div>
    )


    const chartData = dataByDay ? activityByWeek(dataByDay, currentWeek, endOfWeek) : []

    const changeWeek = async (offset) => {
        const date = getWeekWithOffset(currentWeek, offset)
        const newEndOfWeek = getEndOfWeek(date)
        setCurrentWeek(date)
        setLoading(true)
        try {
            const newData = await getUserActivity(token, date, newEndOfWeek)
            setDataByDay(newData.map(session => createUserActivity(session)))
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const avgHeartRate = dataByDay ? dataByDay.length
        ? Math.round(dataByDay.reduce((sum, w) => sum + w.average, 0) / dataByDay.length)
        : 0 : []
    const maxValue = dataByDay ? Math.max(...dataByDay.map(d => d.max)) : 187

    const firstDay = new Date(currentWeek)
    const lastDay = new Date(currentWeek)
    lastDay.setDate(lastDay.getDate() + 6)
    const formatDate = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    const periodLabel = `${formatDate(firstDay)} - ${formatDate(lastDay)}`

    return (
        <div className="bg-white rounded-[10px] px-10 pt-4 pb-6 h-121"
             style={{ width: 583, boxShadow: "0px 4px 84px -40px rgba(157, 167, 251, 0.4)" }}
        >
            {/* Header — 103px de haut, padding-bottom 8px */}
            <div className="flex flex-row items-center pb-2 w-full h-[103px]">

                {/* Frame 2567 — justify-between, padding-bottom 32px */}
                <div className="flex flex-row justify-between items-center pb-8 w-full h-[95px]">

                    {/* Frame 2568 — colonne, 63px de haut */}
                    <div className="flex flex-col justify-between items-start h-[63px]">
                        <div /> {/* spacer */}
                        <p className="text-[22px] font-medium text-[#F4320B] m-0 leading-[27px]">
                            {avgHeartRate} BPM
                        </p>
                        <p className="text-[12px] text-[#707070] m-0 leading-[15px]">
                            Fréquence cardiaque moyenne
                        </p>
                    </div>

                    {/* Frame 2570 — navigation semaine */}
                    <div className="flex flex-row justify-between items-center py-3.5 gap-0.5 w-[150px] h-[52px] rounded-[10px]">
                        <button onClick={() => changeWeek(-1)}>
                            <img src="/left.svg" alt="suivant" className="w-6 h-6" />
                        </button>
                        <span className="flex items-center text-[12px] text-[#111111]">{periodLabel}</span>
                        <button
                            onClick={() => changeWeek(1)}
                            disabled={currentWeek.toDateString() === getMonday().toDateString()}
                            className={currentWeek.toDateString() === getMonday().toDateString() ? "opacity-30" : ""}
                        >
                            <img src="/rigth.svg" alt="suivant" className="w-6 h-6" />
                        </button>
                    </div>

                </div>
            </div>

            {/* Chart */}
            {loading || !dataByDay ?
                <Spinner /> :
                <div
                    className="..."
                    onMouseEnter={() => setLineHovered(true)}
                    onMouseLeave={() => setLineHovered(false)}
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={chartData}>
                            <CartesianGrid vertical={false} stroke="#F1F1F1" strokeDasharray="4 4" />
                            <XAxis
                                dataKey="dayLabel"
                                axisLine={{ stroke: "#717171" }}
                                tickLine={false}
                                tick={{ fill: "#707070", fontSize: 12, dy:15 }}
                            />
                            <YAxis
                                domain={[130, maxValue + 5]}
                                allowDataOverflow={true}
                                ticks={[130, 145, 160,maxValue + 5]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#707070", fontSize: 10, dy:0 }}
                                width={18}
                            />


                            <Bar dataKey="min" fill="#FCC1B6" radius={[30, 30, 30, 30]} barSize={14} name="min" />
                            <Bar dataKey="max" fill="#F4320B" radius={[30, 30, 30, 30]} barSize={14} name="max" />

                            <Line
                                type="monotone"
                                dataKey="average"
                                stroke={lineHovered ? "#3b3bdb" : "#F2F3FF"}
                                strokeWidth={3}
                                dot={{ fill: "#0B23F4", r: 4, stroke: "#FFFFFF", strokeWidth: 1 }}
                                activeDot={{ r: 5, fill: "#0B23F4", stroke: "#FFF", strokeWidth: 1 }}
                                name="average"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            }

            {/* Legend */}
            <div className="flex items-center gap-4 pt-5">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#FCC1B6] inline-block" />
                    <span className="text-[12px] text-[#707070]">Min</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#F4320B] inline-block" />
                    <span className="text-[12px] text-[#707070]">Max BPM</span>
                </div>
                <div className="flex items-center gap-1">
                <span className="relative inline-flex items-center w-4 h-4">
                    <span className="absolute w-2.75 h-px bg-[#B6BDFC] left-0 top-1/2" />
                    <span className="absolute w-1.75 h-1.75 rounded-full bg-[#0B23F4] border border-white left-0.5 top-1/2 -translate-y-1/2" />
                </span>
                    <span className="text-[12px] text-[#707070]">Moy BPM</span>
                </div>
            </div>
        </div>
    )
}
