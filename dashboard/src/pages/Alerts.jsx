/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, ShieldAlert, CheckCircle, Volume2, VolumeX, RefreshCw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

export default function Alerts() {
    const { token } = useAuth();
    const [rules, setRules] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rulesRes, alertsRes] = await Promise.all([
                fetch(`${API_URL}/alerts/rules`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/alerts`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            const rulesData = await rulesRes.json();
            const alertsData = await alertsRes.json();
            setRules(rulesData.rules);
            setAlerts(alertsData.alerts);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load alerts data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleRuleActive = async (rule) => {
        try {
            const updated = { is_active: !rule.is_active, play_sound: rule.play_sound };
            await fetch(`${API_URL}/alerts/rules/${rule.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updated)
            });
            setRules(rules.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
            toast.success(`Rule ${!rule.is_active ? 'enabled' : 'disabled'}`);
        } catch (e) {
            toast.error("Failed to update rule");
        }
    };

    const toggleRuleSound = async (rule) => {
        try {
            const updated = { is_active: rule.is_active, play_sound: !rule.play_sound };
            await fetch(`${API_URL}/alerts/rules/${rule.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updated)
            });
            setRules(rules.map(r => r.id === rule.id ? { ...r, play_sound: !r.play_sound } : r));
            toast.success(`Sound ${!rule.play_sound ? 'enabled' : 'disabled'} for rule`);
        } catch (e) {
            toast.error("Failed to update sound setting");
        }
    };

    const dismissAlert = async (id) => {
        try {
            await fetch(`${API_URL}/alerts/${id}/dismiss`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'dismissed' } : a));
            toast.success("Alert dismissed");
        } catch (e) {
            toast.error("Failed to dismiss alert");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col p-8 overflow-y-auto no-scrollbar"
        >
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <Bell className="text-amber-400 w-6 h-6" />
                        </div>
                        Alerts & Notifications
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">Configure alert rules and view system notification history</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0d1321] text-slate-300 rounded-xl border border-[#1a233a] hover:bg-[#1a233a] transition-all text-sm font-semibold"
                >
                    <RefreshCw className={`w-4 h-4 ${loading && "animate-spin"}`} /> Refresh
                </button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <div className="xl:col-span-1 flex flex-col gap-6">
                    <div className="bg-[#0d1321] rounded-3xl border border-[#1a233a] shadow-[0_8px_30px_rgba(0,0,0,0.3)] overflow-hidden">
                        <div className="p-6 border-b border-[#1a233a]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                                Alert Rules
                            </h2>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            {rules.map(rule => (
                                <div key={rule.id} className="bg-black/40 border-white/5 rounded-xl p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-200">{rule.name}</h3>
                                        {/* Status Toggle */}
                                        <button
                                            onClick={() => toggleRuleActive(rule)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${rule.is_active ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${rule.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Trigger when <span className="text-amber-400 font-bold">{rule.threshold_count}</span> violations occur within <span className="text-indigo-400 font-bold">{rule.time_window_minutes} mins</span>.
                                    </p>
                                    <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#1a233a]/50">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audio Cue</span>
                                        <button
                                            onClick={() => toggleRuleSound(rule)}
                                            className={`p-1.5 rounded-lg transition-colors ${rule.play_sound ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                                        >
                                            {rule.play_sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {rules.length === 0 && !loading && (
                                <p className="text-slate-500 text-sm italic">No alert rules configured.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* History Panel */}
                <div className="xl:col-span-2 flex flex-col gap-6">
                    <div className="bg-[#0d1321] rounded-3xl border border-[#1a233a] shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex-1 min-h-[500px] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-[#1a233a] flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Notification History
                            </h2>
                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {alerts.filter(a => a.status === 'new').length} New
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#0a0f1c] sticky top-0 z-10 border-b border-[#1a233a]">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-transparent">Time</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-transparent">Rule Triggered</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-transparent">Message</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-transparent text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.map((alert) => (
                                        <tr key={alert.id} className="border-b border-[#1a233a]/50 hover:bg-[#1a233a]/20 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-400">{alert.timestamp}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#1a233a]/50 text-indigo-400 border border-indigo-500/20">
                                                    {alert.rule_name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-300 font-medium">
                                                {alert.message}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {alert.status === 'new' ? (
                                                    <button
                                                        onClick={() => dismissAlert(alert.id)}
                                                        className="text-xs font-bold text-slate-500 hover:text-emerald-400 transition-colors flex items-center gap-1 ml-auto"
                                                    >
                                                        <CheckCircle className="w-4 h-4" /> DISMISS
                                                    </button>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1 justify-end">
                                                        <CheckCircle className="w-4 h-4 opacity-50" /> DISMISSED
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {alerts.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-medium italic">
                                                No alerts recorded yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
