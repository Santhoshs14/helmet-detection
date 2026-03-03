/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { Database, Search, SlidersHorizontal, ChevronRight, X, AlertOctagon, Download, Calendar, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useStatsWebSocket from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

export default function Violations() {
    const { stats } = useStatsWebSocket();
    const { token } = useAuth();
    const [search, setSearch] = useState('');
    const [selectedViolation, setSelectedViolation] = useState(null);

    // Apply filters and search
    const filteredLogs = stats.violations.filter(v =>
        (v.plate?.toLowerCase() || '').includes(search.toLowerCase()) ||
        v.timestamp.includes(search)
    );

    const handleExport = async () => {
        try {
            const response = await fetch(`${API_URL}/violations/export`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'violations_report.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to export violations:', error);
            alert('Failed to export report');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col p-8 h-full overflow-hidden relative"
        >
            <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-3">
                        <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                            <Database className="text-rose-500 w-6 h-6" />
                        </div>
                        Enforcement Archive
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">Immutable log of system-flagged compliance failures</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search plate or timestamp..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2.5 glass-panel border-white/5 rounded-xl text-sm font-mono text-slate-200 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all w-64 shadow-sm"
                        />
                    </div>
                </div>
            </header>

            <div className="flex-1 glass-panel border-white/5 rounded-3xl flex flex-col shadow-xl overflow-hidden min-h-0 relative">
                <div className="overflow-x-auto h-full overflow-y-auto no-scrollbar relative w-full">
                    <table className="w-full text-sm text-left align-top">
                        <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-[#0a0f1c]/95 backdrop-blur-xl sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 border-b border-[#1a233a] whitespace-nowrap">Timestamp</th>
                                <th className="px-6 py-4 border-b border-[#1a233a]">Classification</th>
                                <th className="px-6 py-4 border-b border-[#1a233a]">Captured Plate (ALPR)</th>
                                <th className="px-6 py-4 border-b border-[#1a233a]">Confidence</th>
                                <th className="px-6 py-4 border-b border-[#1a233a] text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a233a]/50 h-full">
                            <AnimatePresence>
                                {filteredLogs.length === 0 ? (
                                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <td colSpan="5" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3 opacity-50">
                                                <Database className="w-8 h-8 text-slate-500" />
                                                <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">No records found</span>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    filteredLogs.map((v, i) => (
                                        <motion.tr
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            key={`${v.timestamp}-${i}`}
                                            onClick={() => setSelectedViolation(v)}
                                            className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono text-xs">{v.timestamp}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                    No Helmet
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {v.plate ? (
                                                    <div className="font-mono bg-black/40 border-white/5 px-3 py-1.5 rounded inline-block text-amber-500 font-black tracking-[0.2em] shadow-inner text-sm/none">
                                                        {v.plate}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded">Missing</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-[#1a233a] rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${v.confidence * 100}%` }} />
                                                    </div>
                                                    <span className="font-mono text-xs text-slate-400">{(v.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-indigo-500/10 rounded border border-indigo-500/20 hover:bg-indigo-500/20 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ml-auto">
                                                    Details <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Detail Drawer Overlay */}
                <AnimatePresence>
                    {selectedViolation && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20"
                                onClick={() => setSelectedViolation(null)}
                            />
                            <motion.div
                                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="absolute top-0 right-0 h-full w-full max-w-md bg-[#0d1321] border-l border-[#1a233a] z-30 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col"
                            >
                                <div className="p-6 border-b border-[#1a233a] flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <AlertOctagon className="w-5 h-5 text-rose-500" /> Event Details
                                    </h3>
                                    <button
                                        onClick={() => setSelectedViolation(null)}
                                        className="text-slate-500 hover:text-white transition-colors bg-[#1a233a]/50 hover:bg-[#1a233a] p-1.5 rounded-lg"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                    <div className="w-full h-48 bg-[#060a13] rounded-2xl border border-[#1a233a] flex flex-col items-center justify-center shadow-inner relative overflow-hidden group">
                                        {selectedViolation.image_path ? (
                                            <img
                                                src={`${API_URL}/violations/${selectedViolation.image_path}`}
                                                alt="Violation Evidence Snapshot"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <>
                                                <ShieldAlert className="w-12 h-12 text-slate-700 group-hover:scale-110 transition-transform duration-500" />
                                                <span className="text-xs font-mono text-slate-500 mt-4 tracking-widest uppercase">Visual Evidence Missing</span>
                                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-[#060a13] rounded-xl p-4 border border-[#1a233a]">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> Timestamp
                                            </p>
                                            <p className="font-mono text-sm text-white">{selectedViolation.timestamp}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-[#060a13] rounded-xl p-4 border border-[#1a233a]">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Plate Detection</p>
                                                {selectedViolation.plate ? (
                                                    <p className="font-mono text-amber-500 font-black tracking-widest">{selectedViolation.plate}</p>
                                                ) : (
                                                    <p className="font-mono text-slate-600 font-bold">UNREADABLE</p>
                                                )}
                                            </div>
                                            <div className="bg-[#060a13] rounded-xl p-4 border border-[#1a233a]">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">AI Confidence</p>
                                                <p className="font-mono text-indigo-400 font-bold">{(selectedViolation.confidence * 100).toFixed(1)}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 border-t border-[#1a233a] flex gap-3">
                                    <button className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition duration-200 text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                        Flag for Review
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        className="bg-[#1a233a] hover:bg-[#1a233a]/80 text-white p-3 rounded-xl transition duration-200 tooltip-trigger"
                                        title="Export All Violations as CSV"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
