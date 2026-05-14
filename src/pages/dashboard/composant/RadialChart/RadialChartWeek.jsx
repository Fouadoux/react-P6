import { PieChart, Pie, Legend } from 'recharts'
import {activityByWeek} from "../../../../utils/activityByWeek.js";

export default function RadialChartWeek({data, goal}) {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))

    const dataByDay = activityByWeek(data, monday)

    const distance = dataByDay.length
        ? Math.round(dataByDay.reduce((sum, w) => sum + w.distance, 0))
        : 0

    const duration = dataByDay.length
        ? Math.round(dataByDay.reduce((sum, w) => sum + w.duration, 0))
        : 0

    const run = dataByDay.filter(w => w.distance > 0).length

    const remaining = Math.max(goal - run, 0)
    const pieData = [
        { name: `${run} réalisées`, value: run, fill: "#2b2be8" },
        { name: `${remaining} restants`, value: remaining, fill: "#c7c7f0" },
    ]

    const firstDay = monday
    const lastDay = new Date(monday)
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

                    <PieChart width={220} height={220}>
                        <Pie
                            data={pieData}
                            dataKey="value"
                            cx={100}
                            cy={100}
                            innerRadius={65}
                            outerRadius={95}
                            startAngle={90}
                            endAngle={-270}
                        />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 13, color: "#aaa" }}
                        />
                    </PieChart>
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