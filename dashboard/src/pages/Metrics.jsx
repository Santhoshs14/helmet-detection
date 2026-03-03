/* eslint-disable no-unused-vars */
import { useState, useMemo } from 'react';
import { Activity, Users, ShieldAlert, Crosshair, BarChart3, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import useStatsWebSocket from '../hooks/useWebSocket';

export default function Metrics() {
    const { stats, isConnected } = useStatsWebSocket();
    const totalViolations = stats.violations.length;

    const compRate = stats.total_monitored === 0
        ? 0
        : Math.max(0, 100 - ((totalViolations / stats.total_monitored) * 100)).toFixed(1);

    // Process violations into chart data (group by minute)
    const chartData = useMemo(() => {
        if (!stats.violations.length) return [];

        const grouped = {};
        // Reverse array so oldest is first
        [...stats.violations].reverse().forEach(v => {
            // "2026-03-01 12:45:30" -> "12:45"
            const time = v.timestamp.split(' ')[1].substring(0, 5);
            grouped[time] = (grouped[time] || 0) + 1;
        });

        // Convert to array
        return Object.entries(grouped).map(([time, count]) => ({
            time,
            infractions: count
        })).slice(-15); // Show last 15 minutes of data
    }, [stats.violations]);

    // Live Frame Data for Pie Chart
    const livePieData = [
        { name: 'Helmet Detected', value: stats.current_helmets, color: '#10b981' },
        { name: 'No Helmet', value: stats.current_no_helmets, color: '#ef4444' },
    ];

    const animationConfig = {
        initial: { opacity: 0, scale: 0.95, y: 10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        transition: { duration: 0.4 }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar"
        >
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <Activity className="text-indigo-400 w-6 h-6" />
                        </div>
                        Analytics Terminal
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">Global system compliance and telemetry</p>
                </div>
            </header>

            {/* Top Main Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div {...animationConfig} transition={{ delay: 0.1 }} className="glass-panel border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] bg-gradient-to-bl from-white to-transparent w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
                    <Users className="text-slate-400 w-7 h-7 mb-6" />
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Total Monitored</p>
                    <h3 className="text-5xl font-black text-white decoration-slate-800 tracking-tighter">{stats.total_monitored.toLocaleString()}</h3>
                </motion.div>

                <motion.div {...animationConfig} transition={{ delay: 0.2 }} className="glass-panel border-white/5 rounded-3xl p-6 shadow-[inset_0_1px_0_0_rgba(244,63,94,0.1),0_10px_30px_rgba(244,63,94,0.05)] relative overflow-hidden group">
                    <ShieldAlert className="text-rose-500 w-7 h-7 mb-6" />
                    <p className="text-rose-400/80 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Total Infractions</p>
                    <h3 className="text-5xl font-black text-rose-500 tracking-tighter">{totalViolations}</h3>
                </motion.div>

                <motion.div {...animationConfig} transition={{ delay: 0.3 }} className="glass-panel border-white/5 rounded-3xl p-6 shadow-[inset_0_1px_0_0_rgba(16,185,129,0.1),0_10px_30px_rgba(16,185,129,0.05)] relative overflow-hidden group col-span-1 lg:col-span-2">
                    <div className="flex justify-between items-start h-full">
                        <div className="flex flex-col h-full justify-between">
                            <Crosshair className="text-emerald-400 w-7 h-7 mb-6" />
                            <div>
                                <p className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">System Compliance Edge</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-5xl font-black text-emerald-400 tracking-tighter">{compRate}<span className="text-3xl">%</span></h3>
                                </div>
                            </div>
                        </div>

                        {/* Circular Progress CSS SVG */}
                        <div className="relative w-32 h-32 float-right group-hover:rotate-[360deg] transition-all duration-[2s] ease-in-out">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                {/* Background Circle */}
                                <path className="fill-none stroke-[#1a233a] stroke-[3]" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                {/* Value Circle */}
                                <path className="fill-none stroke-emerald-500 stroke-[3] transition-all duration-1000 ease-in-out" strokeLinecap="round" strokeDasharray={`${compRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">+</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Charts & Live Diagnostics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Historical Timeline */}
                <motion.div {...animationConfig} transition={{ delay: 0.4 }} className="glass-panel border-white/5 rounded-3xl p-6 shadow-xl col-span-1 lg:col-span-2 flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-center border-b border-[#1a233a] pb-4 mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <BarChart3 className="text-indigo-400 w-5 h-5" /> Area Timeline
                        </h3>
                        <span className="text-xs bg-[#1a233a] text-slate-400 px-3 py-1 rounded-full font-mono">15m Window</span>
                    </div>

                    <div className="flex-1 w-full relative">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorInfractions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1a233a" vertical={false} />
                                    <XAxis
                                        dataKey="time"
                                        stroke="#64748b"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={10}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#060a13', border: '1px solid #1a233a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                        itemStyle={{ color: '#f43f5e', fontWeight: 'bold' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="infractions"
                                        stroke="#f43f5e"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorInfractions)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
                                <Activity className="w-8 h-8 opacity-50" />
                                <span className="text-xs uppercase tracking-widest font-bold">Awaiting telemetry data...</span>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* 2. Live Frame Analysis Target */}
                <motion.div {...animationConfig} transition={{ delay: 0.5 }} className="glass-panel border-white/5 rounded-3xl p-6 shadow-xl flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-center border-b border-[#1a233a] pb-4 mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Crosshair className="text-amber-400 w-5 h-5" /> Live Target Scan
                        </h3>
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                    </div>

                    <div className="flex-1 w-full relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={livePieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {livePieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#060a13', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Center info */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-white">{stats.current_helmets + stats.current_no_helmets}</span>
                            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Targets</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-6 bg-[#060a13] p-4 rounded-2xl border border-[#1a233a]">
                        <div className="flex flex-col items-center flex-1 border-r border-[#1a233a]">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Secure</span>
                            <span className="text-2xl font-black text-emerald-400">{stats.current_helmets}</span>
                        </div>
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-[10px] font-bold text-rose-500/80 uppercase tracking-widest mb-1">Hostile</span>
                            <span className="text-2xl font-black text-rose-500">{stats.current_no_helmets}</span>
                        </div>
                    </div>
                </motion.div>

            </div>
        </motion.div>
    );
}
