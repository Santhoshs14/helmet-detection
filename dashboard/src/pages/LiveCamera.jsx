/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect, useMemo, useRef } from 'react';
import { Camera, Power, RefreshCw, AlertCircle, Signal, ShieldCheck, Crosshair, Users, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

export default function LiveCamera() {
    const { token } = useAuth();
    const [cameraActive, setCameraActive] = useState(true);
    const [cameraSource, setCameraSource] = useState(0);
    const [cameras, setCameras] = useState([]);
    const streamRef = useRef(null);

    const streamTimestamp = useMemo(() => new Date().getTime(), [cameraActive]);

    useEffect(() => {
        // Fetch statuses
        fetch(`${API_URL}/camera/status`)
            .then(res => res.json())
            .then(data => {
                setCameraActive(data.camera_active);
                setCameraSource(data.camera_source);
            })
            .catch(console.error);

        // Fetch cameras registry
        fetch(`${API_URL}/cameras`)
            .then(res => res.json())
            .then(data => {
                setCameras(data.cameras || []);
            })
            .catch(console.error);
    }, []);

    // Handle stream src purely via the ref, rather than React state bindings
    useEffect(() => {
        if (!streamRef.current) return;

        if (cameraActive) {
            // Update the stream only when it turns active, using timestamp
            streamRef.current.src = `${API_URL}/video_feed?t=${new Date().getTime()}`;
            streamRef.current.style.opacity = "1";
        } else {
            // Clear stream logic without re-rendering the component's internal UI too much
            streamRef.current.src = "";
            streamRef.current.style.opacity = "0";
        }
    }, [cameraActive]);

    const toggleCamera = async () => {
        const endpoint = cameraActive ? '/camera/stop' : '/camera/start';
        try {
            await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setCameraActive(!cameraActive);
        } catch (e) {
            console.error(e);
        }
    };

    const changeSource = async (e) => {
        const source = parseInt(e.target.value, 10);
        try {
            await fetch(`${API_URL}/camera/source`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ source })
            });
            setCameraSource(source);
            setCameraActive(true);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col p-8 overflow-hidden h-full gap-6"
        >
            <header className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-4xl font-heading font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2 flex items-center gap-4">
                        <div className="p-3 bg-[#00f2fe]/10 rounded-2xl border border-[#00f2fe]/20 shadow-[0_0_20px_rgba(0,242,254,0.15)] backdrop-blur-md">
                            <Camera className="text-[#00f2fe] w-7 h-7" />
                        </div>
                        Live Matrix Feed
                    </h1>
                    <p className="text-slate-400 text-sm font-medium tracking-wide border-l-2 border-[#00f2fe]/50 pl-3 ml-1">Real-time object detection processing pipeline</p>
                </div>

                <div className="flex items-center gap-4 glass-panel px-5 py-3 rounded-2xl">
                    {/* Source Selector */}
                    <div className="flex items-center gap-4 pr-6 border-r border-white/10">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Stream</span>
                        <div className="relative">
                            <select
                                className="appearance-none bg-black/40 text-white border border-white/10 rounded-xl px-4 py-2 text-sm font-mono outline-none focus:border-[#00f2fe]/50 focus:ring-1 focus:ring-[#00f2fe]/50 pr-10 transition-colors cursor-pointer hover:bg-black/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                                value={cameraSource}
                                onChange={changeSource}
                            >
                                {cameras.length > 0 ? cameras.map(cam => (
                                    <option key={cam.id} value={cam.id}>{cam.name} ({cam.location_name})</option>
                                )) : (
                                    <>
                                        <option value={0}>USB-CAM-0</option>
                                        <option value={1}>USB-CAM-1</option>
                                    </>
                                )}
                            </select>
                            <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                    {/* Power Toggle */}
                    <button
                        onClick={toggleCamera}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md active:scale-95 ${cameraActive
                            ? 'bg-[#ff0844]/10 text-[#ff0844] border border-[#ff0844]/20 hover:bg-[#ff0844] hover:text-white shadow-[0_0_15px_rgba(255,8,68,0.2)] hover:shadow-[0_0_25px_rgba(255,8,68,0.4)]'
                            : 'bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/20 hover:bg-[#00ff87] hover:text-black shadow-[0_0_15px_rgba(0,255,135,0.2)] hover:shadow-[0_0_25px_rgba(0,255,135,0.4)]'
                            }`}
                    >
                        <Power size={14} className={cameraActive ? "" : "animate-pulse"} />
                        {cameraActive ? 'Halt Engine' : 'Ignite Engine'}
                    </button>
                </div>
            </header>

            {/* Video Container */}
            <section className="flex-1 glass-panel rounded-3xl overflow-hidden relative shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex flex-col min-h-0">
                {/* Status Bar Top */}
                <div className="h-16 bg-black/60 border-b border-white/10 flex items-center px-6 justify-between shrink-0 shadow-sm z-10 backdrop-blur-xl absolute top-0 w-full left-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                            <Signal className={`w-4 h-4 ${cameraActive ? 'text-[#00ff87]' : 'text-slate-600'}`} />
                            <span className="text-[11px] font-bold text-slate-200 tracking-[0.2em] font-mono">
                                {cameras.find(c => c.id === cameraSource)?.location_name?.toUpperCase() || 'NODE-ALPHA'}
                            </span>
                        </div>
                        {cameraActive && (
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff0844] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff0844] shadow-[0_0_10px_rgba(255,8,68,0.8)]"></span>
                                </span>
                                <span className="text-xs font-bold text-[#ff0844] tracking-[0.2em] uppercase">REC</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-5 text-xs font-mono text-slate-400 font-medium tracking-wide">
                        <div className="flex items-center gap-1.5"><Crosshair className="w-4 h-4 text-[#00f2fe]" /> FOV: 90°</div>
                        <div className="w-[1px] h-4 bg-white/10" />
                        <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#00ff87]" /> SECURE</div>
                    </div>
                </div>

                {/* Stream Window */}
                <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                    {/* Grid Pattern Background overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-30" />

                    {/*
                      We isolate the img from React's state-driven re-renders using a ref.
                      It mounts once. The src is updated imperatively or kept stable to avoid flicker.
                      The MJPEG stream natively handles new frames.
                    */}
                    <img
                        ref={streamRef}
                        alt="Camera Feed"
                        className={`w-full h-full object-contain max-h-full transition-all duration-700 ${!cameraActive && 'opacity-0 scale-105 blur-md'}`}
                        onError={(e) => { if (cameraActive) e.target.style.opacity = 0.3; }}
                    />

                    {/* Offline HUD overlay */}
                    {!cameraActive && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20 backdrop-blur-sm bg-black/40"
                        >
                            <div className="w-24 h-24 rounded-full border border-[#1a233a] bg-[#060a13] flex items-center justify-center shadow-lg shadow-black">
                                <Power size={40} className="text-slate-700" />
                            </div>
                            <div className="text-center">
                                <p className="text-rose-500/80 tracking-[0.4em] font-black text-lg mb-2">SYSTEM INACTIVE</p>
                                <p className="text-slate-500 font-mono text-xs">Awaiting ignition sequence...</p>
                            </div>
                        </motion.div>
                    )}

                    {/* Live HUD Overlays */}
                    {cameraActive && (
                        <>
                            <div className="absolute bottom-6 right-6 border border-white/10 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white font-mono text-xs shadow-lg flex flex-col gap-1 pointer-events-none">
                                <span className="text-slate-400">RES: <span className="text-emerald-400">720p</span></span>
                                <span className="text-slate-400">MODEL: <span className="text-amber-400">EfficientDet</span></span>
                                <span className="text-slate-400">LATENCY: <span className="text-indigo-400">24ms</span></span>
                            </div>

                            {/* Faint edge vignette */}
                            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] pointer-events-none" />
                        </>
                    )}
                </div>
            </section>
        </motion.div>
    );
}
