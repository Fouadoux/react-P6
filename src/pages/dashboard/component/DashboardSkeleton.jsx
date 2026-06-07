export default function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-y-6 animate-pulse">

            {/* Header */}
            <div className="flex justify-between items-center px-1">
                <div className="h-7 w-28 rounded-md bg-gray-200" />
                <div className="flex gap-3 items-center">
                    <div className="h-4 w-20 rounded-md bg-gray-200" />
                    <div className="h-9 w-9 rounded-full bg-gray-200" />
                </div>
            </div>

            {/* UserCard */}
            <div className="m-auto flex items-center justify-between rounded-[20px] px-13 py-8 w-263 h-45.25 bg-white border border-gray-100">
                <div className="flex items-center gap-9.5">
                    <div className="w-26 h-29.25 rounded-[10px] bg-gray-200 shrink-0" />
                    <div className="flex flex-col gap-2.5">
                        <div className="h-5.5 w-44 rounded-md bg-gray-200" />
                        <div className="h-3.5 w-56 rounded-md bg-gray-200" />
                    </div>
                </div>
                <div className="flex items-center gap-4.5">
                    <div className="h-3.5 w-36 rounded-md bg-gray-200" />
                    <div className="w-45.75 h-22.5 rounded-[10px] bg-gray-200" />
                </div>
            </div>

            {/* Section title */}
            <div className="flex flex-col gap-1.5 px-1 m-auto w-263">
                <div className="h-5 w-60 rounded-md bg-gray-200" />
            </div>

            {/* Charts row */}
            <div className="flex gap-6 m-auto">

                {/* BarChartByMonth */}
                <div className="bg-white rounded-[10px] px-10 pt-4 pb-6" style={{ width: 445 }}>
                    <div className="flex justify-between items-center mb-2">
                        <div className="h-5.5 w-40 rounded-md bg-gray-200" />
                        <div className="flex gap-2 items-center">
                            <div className="h-5 w-5 rounded bg-gray-200" />
                            <div className="h-3.5 w-24 rounded-md bg-gray-200" />
                            <div className="h-5 w-5 rounded bg-gray-200" />
                        </div>
                    </div>
                    <div className="h-3 w-52 rounded-md bg-gray-200 mb-6" />
                    {/* Bars */}
                    <div className="flex items-end gap-4 h-55 px-2 mb-3">
                        {[120, 80, 160, 100, 60].map((h, i) => (
                            <div key={i} className="flex flex-col justify-end items-center gap-2 flex-1">
                                <div className="w-3.5 rounded-md bg-gray-200" style={{ height: h }} />
                                <div className="h-3 w-7 rounded-md bg-gray-200" />
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-gray-200" />
                        <div className="h-3 w-6 rounded-md bg-gray-200" />
                    </div>
                </div>

                {/* ComposedChartByWeek */}
                <div className="bg-white rounded-[10px] px-10 pt-4 pb-6" style={{ width: 583 }}>
                    <div className="flex justify-between items-center mb-2">
                        <div className="h-5.5 w-32 rounded-md bg-gray-200" />
                        <div className="flex gap-2 items-center">
                            <div className="h-5 w-5 rounded bg-gray-200" />
                            <div className="h-3.5 w-28 rounded-md bg-gray-200" />
                            <div className="h-5 w-5 rounded bg-gray-200" />
                        </div>
                    </div>
                    <div className="h-3 w-56 rounded-md bg-gray-200 mb-6" />
                    {/* Double bars */}
                    <div className="flex items-end gap-3.5 h-55 px-2 mb-3">
                        {[[70, 110], [50, 90], [90, 140], [60, 100], [80, 130], [45, 85], [65, 120]].map(([min, max], i) => (
                            <div key={i} className="flex flex-col justify-end items-center gap-2 flex-1">
                                <div className="flex gap-0.5 items-end">
                                    <div className="w-3.5 rounded-md bg-gray-200" style={{ height: min }} />
                                    <div className="w-3.5 rounded-md bg-gray-200" style={{ height: max }} />
                                </div>
                                <div className="h-3 w-6 rounded-md bg-gray-200" />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 items-center">
                        {[24, 52, 52].map((w, i) => (
                            <div key={i} className="flex gap-1 items-center">
                                <div className={`rounded-full bg-gray-200 ${i === 2 ? 'w-4 h-2 rounded' : 'w-2 h-2'}`} />
                                <div className="h-3 rounded-md bg-gray-200" style={{ width: w }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RadialChartWeek section title */}
            <div className="flex flex-col gap-2 m-auto w-263">
                <div className="h-5 w-40 rounded-md bg-gray-200" />
                <div className="h-3.5 w-52 rounded-md bg-gray-200" />
            </div>

            {/* RadialChartWeek */}
            <div className="flex gap-4 m-auto w-263">

                {/* Donut card */}
                <div className="bg-white rounded-2xl p-6 flex-1">
                    <div className="h-5.5 w-44 rounded-md bg-gray-200 mb-2" />
                    <div className="h-3.5 w-52 rounded-md bg-gray-200 mb-4" />
                    <div className="flex justify-center items-center py-4 relative">
                        <div className="w-55 h-55 rounded-full bg-gray-200" />
                        <div className="absolute w-25 h-25 rounded-full bg-white" />
                    </div>
                </div>

                {/* Stats cards */}
                <div className="flex flex-col gap-4 flex-1">
                    <div className="bg-white rounded-2xl p-6 flex-1">
                        <div className="h-3.5 w-32 rounded-md bg-gray-200 mb-3" />
                        <div className="flex items-baseline gap-2">
                            <div className="h-9 w-20 rounded-md bg-gray-200" />
                            <div className="h-4 w-16 rounded-md bg-gray-200" />
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 flex-1">
                        <div className="h-3.5 w-20 rounded-md bg-gray-200 mb-3" />
                        <div className="flex items-baseline gap-2">
                            <div className="h-9 w-20 rounded-md bg-gray-200" />
                            <div className="h-4 w-20 rounded-md bg-gray-200" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-center py-3">
                <div className="h-3.5 w-48 rounded-md bg-gray-200" />
            </div>

        </div>
    )
}
