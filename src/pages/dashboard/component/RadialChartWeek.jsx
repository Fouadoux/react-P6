import { PieChart, Pie } from 'recharts'
import useUserActivity from "../../../hooks/useUserActivity.js";
import {activityByWeek} from "../../../utils/activityByWeek.js";
import {useMemo} from "react";
import Spinner from "../../../component/Spinner.jsx";


export default function RadialChartWeek({goal}) {

    const currentWeek = useMemo(() => {
        const now = new Date()
        const day = now.getDay()
        const monday = new Date(now)
        monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
        return monday
    }, [])

    const endOfWeek = useMemo(() => {
        const date = new Date(currentWeek)
        date.setDate(date.getDate() + 6)
        return date
    }, [currentWeek])

    const { data: dataByDay, loading, error } = useUserActivity(currentWeek, endOfWeek)
    if (error) return <p>Erreur : {error}</p>
    console.log("RadialChartWeek data ",goal)
    const chartData = dataByDay ? activityByWeek(dataByDay, currentWeek, endOfWeek) : []

    const distance = chartData.length
        ? Math.round(chartData.reduce((sum, w) => sum + w.distance, 0))
        : 0

    const duration = chartData.length
        ? Math.round(chartData.reduce((sum, w) => sum + w.duration, 0))
        : 0

    const run = chartData.filter(w => w.distance > 0).length

    const remaining = Math.max(goal - run, 0)
    const pieData = [
        { name: `${run} réalisées`, value: run, fill: "#2b2be8" },
        { name: `${remaining} restants`, value: remaining, fill: "#c7c7f0" },
    ]

    const firstDay = currentWeek
    const lastDay = new Date(currentWeek)
    lastDay.setDate(lastDay.getDate() + 6)
    const formatDate = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    const periodLabel = `Du ${formatDate(firstDay)} au ${formatDate(lastDay)}`



    return (
        <div className="" >
            {/* Titre */}
            <h2 className="text-xl font-bold mb-1">Cette semaine</h2>
            <p className="text-sm text-gray-400 mb-6">{periodLabel}</p>

            <div className="flex gap-4">
                {/* Card gauche — Donut */}
                <div className="bg-white rounded-2xl p-6 flex-1">
                    <p className="text-lg font-bold mb-1">
                        <span className="text-blue-600 text-2xl">x{run}</span>
                        <span className="text-blue-300 text-base font-normal"> sur objectif de {goal}</span>
                    </p>
                    <p className="text-sm text-gray-400 mb-4">Courses hebdomadaire réalisées</p>

                    {loading || !dataByDay ?
                       <Spinner/> :
                        <div className="relative flex justify-center ">
                            <PieChart width={220} height={220}>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    cx={100}
                                    cy={100}
                                    innerRadius={50}
                                    outerRadius={95}
                                    startAngle={135}
                                    endAngle={495}
                                    paddingAngle={0}
                                    strokeWidth={0}
                                    stroke="none"
                                    cornerRadius={2}
                                />
                            </PieChart>

                            {/* Légende "x restants" — en haut à droite */}
                            <div className="absolute top-2 right-[80px] flex items-center gap-2">
                                <span className="w-[7px] h-[7px] rounded-full bg-[#B6BDFC] shrink-0" />
                                <span className="text-[10px] text-[#707070]">{remaining} restants</span>
                            </div>

                            {/* Légende "x réalisées" — en bas à gauche */}
                            <div className="absolute bottom-2 left-[80px] flex items-center gap-2">
                                <span className="w-[7px] h-[7px] rounded-full bg-[#0B23F4] shrink-0" />
                                <span className="text-[10px] text-[#707070]">{run} réalisées</span>
                            </div>
                        </div>
                    }
                </div>

                {/* Cards droite */}
                <div className="flex flex-col gap-4 flex-1">
                    <div className="bg-white rounded-2xl p-6">
                        <p className="text-sm text-gray-400 mb-2">Durée d'activité</p>
                        <p className="text-3xl font-bold text-blue-600">
                            {duration} <span className="text-base font-normal text-blue-300">minutes</span>
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl p-6">
                        <p className="text-sm text-gray-400 mb-2">Distance</p>
                        <p className="text-3xl font-bold text-[#F4320B]">
                            {distance} <span className="text-base font-normal text-[#F4320B] opacity-60">kilomètres</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
