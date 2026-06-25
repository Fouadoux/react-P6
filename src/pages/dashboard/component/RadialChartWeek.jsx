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

    if (error) return (
        <div className="bg-white rounded-2xl p-6 flex flex-col justify-center items-center h-40">
            <p className="text-[#F4320B] text-[14px] font-medium">Erreur de chargement</p>
            <p className="text-[#707070] text-[12px] mt-1">Les données ne sont pas disponibles</p>
        </div>
    )

    const chartData = dataByDay ? activityByWeek(dataByDay, currentWeek, endOfWeek) : []

    const distance = chartData.length
        ? Math.round(chartData.reduce((sum, w) => sum + w.distance, 0))
        : 0

    const duration = chartData.length
        ? Math.round(chartData.reduce((sum, w) => sum + w.duration, 0)) //supprimer le rounded
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
            <h2 className="text-[22px] font-medium">Cette semaine</h2>
            <p className="text-[16px] text-gray-400 mb-8">{periodLabel}</p>

            <div className="flex gap-7.5">
                {/* Card gauche — Donut */}
                <div className="bg-white rounded-[10px] px-8 py-4 w-[450px] h-[342px]">
                    <p className="text-lg font-bold flex flex-row ">
                        <span className="text-blue-600 text-[28px] font-semibold mt-[1px] ml-[6px]">x{run}</span>
                        <span className="text-blue-300 text-base font-normal pl-[6px] flex items-center"> sur objectif de {goal}</span>
                    </p>
                    <p className="text-sm text-gray-400 ml-[6px]">Courses hebdomadaire réalisées</p>

                    {loading || !dataByDay ?
                       <Spinner/> :
                        <div className="relative flex justify-center mt-15 ml-[24px]">
                            <PieChart width={162} height={162} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    cx={81}
                                    cy={81}
                                    innerRadius={40}
                                    outerRadius={80}
                                    startAngle={123}
                                    endAngle={483}
                                    paddingAngle={1}
                                    strokeWidth={0}
                                    stroke="none"
                                    cornerRadius={3}
                                />
                            </PieChart>

                            {/*/!* Légende "x restants" — en haut à droite *!/*/}
                            <div className="absolute -top-1 right-18 flex items-center gap-1">
                                <span className="w-1.75 h-1.75 rounded-full bg-[#B6BDFC] shrink-0" />
                                <span className="text-[10px] text-[#707070]">{remaining} restants</span>
                            </div>

                            {/* Légende "x réalisées" — en bas à gauche */}
                            <div className="absolute bottom-6.75 left-10.75 flex items-center gap-1">
                                <span className="w-1.75 h-1.75 rounded-full bg-[#0B23F4] shrink-0" />
                                <span className="text-[10px] text-[#707070]">{run} réalisées</span>
                            </div>
                        </div>
                    }
                </div>

                {/* Cards droite */}
                <div className="flex flex-col gap-4 w-143 ">
                    <div className="bg-white rounded-[10px] py-5 px-7.5">
                        <p className="text-sm text-gray-400 mt-[-2px] pb-[14px]">Durée d'activité</p>
                        <p className="text-[22px] text-blue-600 font-medium pl-[1px]">
                            {duration} <span className="text-base font-normal text-blue-300">minutes</span>
                        </p>
                    </div>
                    <div className="bg-white rounded-[10px] py-5 px-7.5">
                        <p className="text-sm text-gray-400 mt-[-5px] pb-[14px]">Distance</p>
                        <p className="text-[22px] text-[#F4320B] font-medium pl-[0px]">
                            {distance} <span className="text-base font-normal text-[#F4320B] opacity-60">kilomètres</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
