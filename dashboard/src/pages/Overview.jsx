/* eslint-disable no-unused-vars */
import { Activity, ShieldCheck, AlertCircle, Camera, CheckCircle2, Siren } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useStatsWebSocket from '../hooks/useWebSocket';

export default function Overview() {
    const { stats, isConnected } = useStatsWebSocket();
    const navigate = useNavigate();

    const recentViolations = stats.violations.slice(0, 4);
    const complianceRate = stats.total_monitored === 0 ? 100 : Math.max(0, 100 - ((stats.violations.length / stats.total_monitored) * 100)).toFixed(1);

    const animationConfig = {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4 }
    };

    return (
        <motion.div {...animationConfig} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar relative">
            {/* Background ambient glow */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00f2fe]/5 rounded-full blur-[120px] pointer-events-none" />

            <header className="flex justify-between items-end relative z-10">
                <div>
                    <h1 className="text-4xl font-heading font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">Command Center</h1>
                    <p className="text-slate-400 text-sm font-medium tracking-wide">Real-time system overview and sensor telemetry</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-xl flex items-center gap-2 border text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(0,0,0,0.2)] backdrop-blur-md ${isConnected ? 'bg-[#00ff87]/10 border-[#00ff87]/20 text-[#00ff87]' : 'bg-[#ff0844]/10 border-[#ff0844]/20 text-[#ff0844]'}`}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00ff87] shadow-[0_0_10px_rgba(0,255,135,0.8)] animate-pulse' : 'bg-[#ff0844] shadow-[0_0_10px_rgba(255,8,68,0.8)]'}`} />
                        {isConnected ? 'Telemetry Active' : 'Offline'}
                    </div>
                </div>
            </header>

            {/* Top Cards Array */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-3xl flex items-center gap-5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00f2fe]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-14 h-14 rounded-2xl bg-[#00f2fe]/10 border border-[#00f2fe]/20 flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(0,242,254,0.1)]">
                        <Camera className="w-6 h-6 text-[#00f2fe]" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Feeds</p>
                        <h3 className="text-3xl font-heading font-black text-white mt-1">1 <span className="text-sm text-[#00ff87] font-bold ml-1 tracking-normal font-sans shadow-sm">Online</span></h3>
                    </div>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-3xl flex items-center gap-5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00ff87]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-14 h-14 rounded-2xl bg-[#00ff87]/10 border border-[#00ff87]/20 flex items-center justify-center relative z-10 shadow-[inset_0_0_15px_rgba(0,255,135,0.1)]">
                        <ShieldCheck className="w-6 h-6 text-[#00ff87]" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Compliance</p>
                        <h3 className="text-3xl font-heading font-black text-white mt-1">{complianceRate}% <span className="text-sm text-slate-400 font-bold ml-1 tracking-normal font-sans">Avg</span></h3>
                    </div>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="glass-panel border-[#ff0844]/20 p-6 rounded-3xl flex items-center gap-5 relative overflow-hidden group shadow-[0_0_20px_rgba(255,8,68,0.05)] hover:shadow-[0_0_25px_rgba(255,8,68,0.1)] transition-shadow duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#ff0844]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-14 h-14 rounded-2xl bg-[#ff0844]/10 border border-[#ff0844]/20 flex items-center justify-center relative z-10 shadow-[inset_0_0_15px_rgba(255,8,68,0.1)]">
                        <AlertCircle className="w-6 h-6 text-[#ff0844]" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-[#ff0844]/80 uppercase tracking-widest">Today's Infractions</p>
                        <h3 className="text-3xl font-heading font-black text-[#ff0844] mt-1">{stats.violations.length} <span className="text-sm text-[#ff0844]/60 font-bold ml-1 tracking-normal font-sans">Flags</span></h3>
                    </div>
                </motion.div>
            </div>

            {/* Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left side: Quick Activity Stream */}
                <div className="glass-panel rounded-3xl col-span-1 lg:col-span-2 flex flex-col min-h-[400px] relative z-10">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                            <Siren className="w-5 h-5 text-[#00f2fe]" /> Recent Detections
                        </h3>
                        <button onClick={() => navigate('/logs')} className="text-xs font-bold text-[#00f2fe] hover:text-white uppercase tracking-widest transition-colors">
                            View Archive &rarr;
                        </button>
                    </div>

                    <div className="flex-1 p-6 overflow-hidden">
                        {recentViolations.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center opacity-70 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-[#00ff87]/5 border border-[#00ff87]/10 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,255,135,0.05)]">
                                    <CheckCircle2 className="w-8 h-8 text-[#00ff87]" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest border border-[#00ff87]/10 bg-[#00ff87]/5 px-4 py-1.5 rounded-full text-[#00ff87]/80">System Secure / No incidents</span>
                            </motion.div>
                        ) : (
                            <div className="space-y-4">
                                {recentViolations.map((v, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        key={i}
                                        className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-[#00f2fe]/30 hover:bg-[#00f2fe]/5 transition-all duration-300 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-[#ff0844]/10 flex items-center justify-center border border-[#ff0844]/20 shadow-[0_0_10px_rgba(255,8,68,0.1)]">
                                                <AlertCircle className="w-5 h-5 text-[#ff0844]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">No Helmet Detected</p>
                                                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{v.timestamp}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {v.plate ? (
                                                <p className="font-mono font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-lg text-xs inline-block border border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
                                                    {v.plate}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 border border-white/5 px-3 py-1 rounded-lg">Unreadable</p>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right side: Mini Live Feed */}
                <div className="glass-panel rounded-3xl flex flex-col p-6 cursor-pointer hover:border-[#00f2fe]/40 hover:shadow-[0_0_30px_rgba(0,242,254,0.15)] transition-all duration-300 relative group z-10" onClick={() => navigate('/dashboard')}>
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-[#00f2fe]" /> Node Alpha
                        </h3>
                        <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff87] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00ff87] shadow-[0_0_10px_rgba(0,255,135,0.8)]"></span>
                        </span>
                    </div>

                    <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-center group-hover:border-[#00f2fe]/30 transition-colors duration-300">
                        {/* High-tech Scanning CSS Animation Overlay */}
                        <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(0,242,254,0.05)_50%,transparent_100%)] h-[200%] w-full animate-[scan_3s_linear_infinite] pointer-events-none" />

                        {/* Static Placeholder showing we have an active feed */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,242,254,0.1)_0,transparent_100%)]" />

                        <div className="text-center z-10 group-hover:scale-110 transition-transform duration-500">
                            <div className="w-14 h-14 rounded-full border border-[#00f2fe]/30 bg-[#00f2fe]/10 flex items-center justify-center shadow-[0_0_25px_rgba(0,242,254,0.2)] mx-auto mb-4 backdrop-blur-md">
                                <Activity className="w-6 h-6 text-[#00f2fe]" />
                            </div>
                            <span className="text-[10px] font-bold text-[#00f2fe] uppercase tracking-widest bg-[#00f2fe]/10 px-4 py-1.5 rounded-full border border-[#00f2fe]/20">Link Established</span>
                        </div>
                    </div>
                </div>

            </div>
        </motion.div>
    );
}
