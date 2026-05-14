import {useState} from "react";
import {activityByMonth} from "../../../../utils/activityByMonth.js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'

export default function BarChartByMonth({data}){
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [currentMonth, setCurrentMonth] = useState(yearMonth)
    const dataByMonth = activityByMonth(data, currentMonth)

    const changeMonth = (offset) => {
        const date = new Date(currentMonth + "-01")
        date.setMonth(date.getMonth() + offset)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        setCurrentMonth(`${year}-${month}`)
    }

    const avgDistance = dataByMonth.length
        ? Math.round(dataByMonth.reduce((sum, w) => sum + w.distance, 0) / dataByMonth.length)
        : 0

    const [year, month] = currentMonth.split("-")
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const formatDate = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    const periodLabel = `${formatDate(firstDay)} - ${formatDate(lastDay)}`

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
                            onClick={() => changeMonth(-1)}
                            className="w-6 h-6 border border-[#717171] rounded-[10px] bg-white cursor-pointer flex justify-center text-sm text-gray-600 hover:bg-gray-50"
                        >‹</button>
                        <span className="flex items-center text-[12px] text-[#111111]">{periodLabel}</span>
                        <button
                            onClick={() => changeMonth(1)}
                            className="w-6 h-6 border border-[#717171] rounded-[10px] bg-white cursor-pointer flex justify-center text-sm text-gray-600 hover:bg-gray-50"
                        >›</button>
                    </div>
                </div>
                <p className="text-[12px] text-[#707070] mt-1 m-0">
                    Total des kilomètres 4 dernières semaines
                </p>


            </div>



            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dataByMonth} barSize={40} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
                        domain={[0, 'auto']}
                        ticks={[0, 10, 20, 30, 'auto']}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#707070", fontSize: 10, fontFamily: "Inter" }}
                        width={16}
                    />
                    <Bar dataKey="distance" fill="#B6BDFC" radius={[6, 6, 0, 0]} barSize={14} />
                </BarChart>
            </ResponsiveContainer>

            {/* Légende */}
            <div className="flex items-center gap-1 pt-3">
                <span className="w-2 h-2 rounded-full bg-[#7987FF] inline-block" />
                <span className="text-[12px] text-[#707070]">Km</span>
            </div>
        </div>
    )
}