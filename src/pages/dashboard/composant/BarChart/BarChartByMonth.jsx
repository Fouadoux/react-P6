import {useState} from "react";
import {activityByMonth} from "../../../../utils/activityByMonth.js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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
        <div className="bg-white rounded-2xl p-7 w-125">

            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <h2 className="text-[22px] font-bold text-[#3b3bff] m-0">
                    {avgDistance}km en moyenne
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="w-7 h-7 rounded-full border border-gray-200 bg-white cursor-pointer text-gray-500 flex items-center justify-center hover:bg-gray-50"
                    >
                        ‹
                    </button>
                    <span className="text-sm text-gray-500">{periodLabel}</span>
                    <button
                        onClick={() => changeMonth(1)}
                        className="w-7 h-7 rounded-full border border-gray-200 bg-white cursor-pointer text-gray-500 flex items-center justify-center hover:bg-gray-50"
                    >
                        ›
                    </button>
                </div>
            </div>

            {/* Sous-titre */}
            <p className="text-[13px] text-gray-400 mb-5">
                Total des kilomètres 4 dernières semaines
            </p>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dataByMonth} barSize={32}>
                    <CartesianGrid vertical={false} stroke="#f0f0f0" strokeDasharray="" />
                    <XAxis
                        dataKey="week"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#aaa", fontSize: 13 }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#aaa", fontSize: 13 }}
                    />
                    <Tooltip
                        cursor={{ fill: "rgba(0,0,0,0.04)" }}
                        contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                    />
                    <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={() => "Km"}
                        wrapperStyle={{ fontSize: 13, color: "#aaa", paddingTop: 12 }}
                    />
                    <Bar dataKey="distance" fill="#b3b3ff" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}