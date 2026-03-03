/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { Settings2, Cpu, Video, BellRing, ShieldCheck, DatabaseZap, RotateCcw, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

export default function Settings() {
    const { token } = useAuth();
    const [config, setConfig] = useState({
        resolution: '720p',
        fpsTarget: 30,
        compression: 60,
        confidence: 0.5,
        cooldown: 3.0,
        audioAlerts: true,
        autoExport: false,
    });

    const [isSaving, setIsSaving] = useState(false);

    // Geo-Tagging state
    const [cameras, setCameras] = useState([]);
    const [locations, setLocations] = useState([]);
    const [newLocName, setNewLocName] = useState('');

    useEffect(() => {
        const fetchGeoData = async () => {
            try {
                const [camRes, locRes] = await Promise.all([
                    fetch(`${API_URL}/cameras`),
                    fetch(`${API_URL}/locations`)
                ]);
                const camData = await camRes.json();
                const locData = await locRes.json();
                setCameras(camData.cameras || []);
                setLocations(locData.locations || []);
            } catch (e) { console.error("Failed to load geo config"); }
        }
        fetchGeoData();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Save updated camera mappings to backend
            await Promise.all(cameras.map(cam =>
                fetch(`${API_URL}/cameras/${cam.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ name: cam.name, location_id: cam.location_id })
                })
            ));
            toast.success("System configuration updated", {
                style: { borderRadius: '12px', background: '#0d1321', color: '#fff', border: '1px solid #1a233a' }
            });
        } catch (e) {
            toast.error("Failed to save changes");
        }
        setIsSaving(false);
    };

    const handleCameraChange = (camId, field, value) => {
        setCameras(cameras.map(c => c.id === camId ? { ...c, [field]: value } : c));
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setConfig({ ...config, [e.target.name]: value });
    };

    const handleAddLocation = async () => {
        if (!newLocName.trim()) return;
        try {
            const res = await fetch(`${API_URL}/locations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: newLocName, coordinates: "0,0" })
            });
            const data = await res.json();
            setLocations([...locations, { id: data.id, name: newLocName, coordinates: "0,0" }]);
            setNewLocName('');
            toast.success("Location alias added");
        } catch (e) {
            toast.error("Failed to add location");
        }
    };

    const triggerReset = async () => {
        try {
            const response = await fetch(`${API_URL}/reset`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Telemetry cache cleared successfully!", {
                    icon: '🗑️',
                    style: { borderRadius: '12px', background: '#0d1321', color: '#fff', border: '1px solid #1a233a' }
                });
            } else {
                toast.error("Failed to clear telemetry");
            }
        } catch (e) {
            toast.error("Network error clearing telemetry");
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar relative">
            {/* Ambient Title Glow */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

            <header className="flex justify-between items-end relative z-10">
                <div>
                    <h1 className="text-4xl font-heading font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2 flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)] backdrop-blur-md">
                            <Settings2 className="text-indigo-400 w-7 h-7" />
                        </div>
                        Config Parameters
                    </h1>
                    <p className="text-slate-400 text-sm font-medium tracking-wide">Fine-tune detection engine and hardware pipelines</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-70 hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:-translate-y-0.5"
                >
                    {isSaving ? <Loader /> : <><Save className="w-4 h-4" /> Save Params</>}
                </button>
            </header>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12 relative z-10">

                {/* Visual Processing */}
                <div className="glass-panel rounded-3xl p-7 hover:border-indigo-500/30 transition-colors duration-300">
                    <h3 className="text-lg font-heading font-bold text-white mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
                        <Video className="w-5 h-5 text-indigo-400" /> Frame Capture Pipeline
                    </h3>
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Resolution Scale</label>
                            <select name="resolution" value={config.resolution} onChange={handleChange} className="bg-black/40 border border-white/10 text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block w-full p-4 font-mono outline-none transition-all">
                                <option value="480p">SD - 640x480</option>
                                <option value="720p">HD - 1280x720</option>
                                <option value="1080p">FHD - 1920x1080</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                                Capture Framerate <span>{config.fpsTarget} FPS</span>
                            </label>
                            <input name="fpsTarget" type="range" min="15" max="60" value={config.fpsTarget} onChange={handleChange} className="w-full h-2 bg-[#1a233a] rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                                MJPEG Compression Quality <span>{config.compression}%</span>
                            </label>
                            <input name="compression" type="range" min="20" max="100" value={config.compression} onChange={handleChange} className="w-full h-2 bg-[#1a233a] rounded-lg appearance-none cursor-pointer accent-amber-500" />
                            <span className="text-xs text-slate-600 font-mono mt-1">Lower values reduce lag overhead</span>
                        </div>
                    </div>
                </div>

                {/* AI / Inference Rules */}
                <div className="bg-[#0d1321] border border-[#1a233a] rounded-3xl p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-[#1a233a] pb-4">
                        <Cpu className="w-5 h-5 text-emerald-400" /> AI Heuristics
                    </h3>
                    <div className="space-y-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                                Confidence Threshold <span>{config.confidence}</span>
                            </label>
                            <input name="confidence" type="range" min="0.1" max="0.95" step="0.05" value={config.confidence} onChange={handleChange} className="w-full h-2 bg-[#1a233a] rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                            <span className="text-xs text-slate-600 font-mono mt-1">Min probability to log violation</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                                Incident Cooldown <span className="text-indigo-400">{config.cooldown}s</span>
                            </label>
                            <input name="cooldown" type="range" min="1.0" max="10.0" step="0.5" value={config.cooldown} onChange={handleChange} className="w-full h-2 bg-[#1a233a] rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                            <span className="text-xs text-slate-600 font-mono mt-1">Lockout duration after detection</span>
                        </div>
                    </div>
                </div>

                {/* Automation & Alerts */}
                <div className="glass-panel rounded-3xl p-7 hover:border-amber-500/30 transition-colors duration-300">
                    <h3 className="text-lg font-heading font-bold text-white mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
                        <BellRing className="w-5 h-5 text-amber-500" /> Notification Arrays
                    </h3>
                    <div className="space-y-5">
                        <label className="flex items-center justify-between p-5 bg-black/40 border border-white/5 rounded-xl cursor-pointer hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group">
                            <div>
                                <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">Audio Alert Protocol</h4>
                                <p className="text-xs text-slate-500 font-mono mt-1">Chime when violation detected</p>
                            </div>
                            <input type="checkbox" name="audioAlerts" checked={config.audioAlerts} onChange={handleChange} className="sr-only peer" />
                            <div className="relative w-12 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00f2fe] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"></div>
                        </label>

                        <label className="flex items-center justify-between p-4 bg-[#060a13] border border-[#1a233a] rounded-xl cursor-pointer hover:border-indigo-500/30 transition-colors">
                            <div>
                                <h4 className="text-sm font-bold text-white">Auto-Export Daily Log</h4>
                                <p className="text-xs text-slate-500 font-mono mt-1">Generate EOD CSV dumps</p>
                            </div>
                            <input type="checkbox" name="autoExport" checked={config.autoExport} onChange={handleChange} className="sr-only peer" />
                            <div className="relative w-11 h-6 bg-[#1a233a] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                        </label>
                    </div>
                </div>

                {/* System Maintenance */}
                <div className="bg-[#0d1321] border border-rose-500/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] bg-gradient-to-bl from-rose-500 to-transparent w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-[#1a233a] pb-4">
                        <DatabaseZap className="w-5 h-5 text-rose-500" /> Database Administration
                    </h3>
                    <div className="space-y-4">
                        <div className="bg-[#060a13] border border-rose-500/20 p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-rose-400">Purge Telemetry</h4>
                                <p className="text-xs text-rose-500/60 font-mono mt-1">Erase complete SQLite memory</p>
                            </div>
                            <button type="button" onClick={triggerReset} className="bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-xs transition duration-200 border border-rose-500/20 flex items-center gap-2">
                                <RotateCcw className="w-4 h-4" /> Reset
                            </button>
                        </div>

                        <div className="bg-[#060a13] border border-[#1a233a] p-4 rounded-xl flex flex-col gap-2">
                            <h4 className="text-sm font-bold text-white flex justify-between">
                                System Version <span className="font-mono text-emerald-400">v1.2.0-rc4</span>
                            </h4>
                            <div className="h-1.5 w-full bg-[#1a233a] rounded-full overflow-hidden mt-2">
                                <div className="h-full bg-slate-500 rounded-full w-full" />
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono text-right">Core Up To Date</span>
                        </div>
                    </div>
                </div>

                {/* Fleet Geo-Tagging Config */}
                <div className="glass-panel rounded-3xl p-7 lg:col-span-2">
                    <h3 className="text-lg font-heading font-bold text-white mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
                        <Video className="w-5 h-5 text-[#00f2fe]" /> Fleet Tracking Config
                    </h3>
                    <div className="space-y-6">
                        {/* New Location Form */}
                        <div className="flex gap-4 mb-6">
                            <input
                                type="text"
                                placeholder="E.g., South Perimeter Checkpoint"
                                className="bg-black/40 border border-white/10 text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-[#00f2fe]/50 focus:border-[#00f2fe] flex-1 p-4 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                                value={newLocName}
                                onChange={(e) => setNewLocName(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={handleAddLocation}
                                className="bg-[#00f2fe]/10 text-[#00f2fe] hover:bg-[#00f2fe] hover:text-black hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] px-8 py-3 rounded-xl transition duration-300 text-sm font-bold border border-[#00f2fe]/30"
                            >
                                Register Block
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {cameras.map(cam => (
                                <div key={cam.id} className="bg-[#060a13] border border-[#1a233a] rounded-xl p-4">
                                    <h4 className="font-bold text-sm text-white mb-3">USB-CAM-{cam.id}</h4>
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Device Alias</label>
                                            <input
                                                type="text"
                                                value={cam.name}
                                                onChange={(e) => handleCameraChange(cam.id, 'name', e.target.value)}
                                                className="bg-black/50 border border-[#1a233a] rounded p-2 text-xs text-slate-300 outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Assigned Geo-Zone</label>
                                            <select
                                                value={cam.location_id || ''}
                                                onChange={(e) => handleCameraChange(cam.id, 'location_id', e.target.value)}
                                                className="bg-black/50 border border-[#1a233a] rounded p-2 text-xs text-slate-300 outline-none"
                                            >
                                                <option value="">-- Select Zone --</option>
                                                {locations.map(loc => (
                                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </form>
        </motion.div>
    );
}

const Loader = () => (
    <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Processing...
    </div>
);
