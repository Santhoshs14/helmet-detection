/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Power, AlertCircle, Signal, ShieldCheck, Crosshair, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

// Derive WebSocket URL from API URL (http→ws, https→wss)
const getCameraWsUrl = () => API_URL.replace(/^http/, 'ws') + '/ws/camera';

const FRAME_RATE = 5; // frames per second sent to backend

export default function LiveCamera() {
    const { token } = useAuth();
    const [cameraActive, setCameraActive] = useState(false);
    const [status, setStatus] = useState('idle'); // idle | starting | active | error
    const [detections, setDetections] = useState([]);
    const [liveStats, setLiveStats] = useState({ helmets: 0, no_helmets: 0 });
    const [permissionDenied, setPermissionDenied] = useState(false);

    const videoRef = useRef(null);       // shows live webcam feed
    const captureRef = useRef(null);     // hidden canvas for frame capture
    const overlayRef = useRef(null);     // visible canvas overlay for bounding boxes
    const wsRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);
    const animFrameRef = useRef(null);

    // Draw bounding boxes on the overlay canvas
    const drawDetections = useCallback((dets, videoW, videoH) => {
        const overlay = overlayRef.current;
        if (!overlay) return;
        overlay.width = videoW;
        overlay.height = videoH;
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, videoW, videoH);

        dets.forEach(det => {
            const { x, y, w, h } = det.box;
            const isHelmet = det.label === 'Helmet';
            const color = isHelmet ? '#00ff87' : '#ff0844';
            const glow = isHelmet ? 'rgba(0,255,135,0.4)' : 'rgba(255,8,68,0.4)';

            // Glow effect
            ctx.shadowColor = glow;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y, w, h);
            ctx.shadowBlur = 0;

            // Label pill background
            const label = `${det.label} ${(det.score * 100).toFixed(0)}%`;
            ctx.font = 'bold 13px monospace';
            const textW = ctx.measureText(label).width;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x, y - 26, textW + 14, 22, 4);
            ctx.fill();

            // Label text
            ctx.fillStyle = isHelmet ? '#000' : '#fff';
            ctx.fillText(label, x + 7, y - 9);
        });
    }, []);

    // Capture a frame from the video and send over WebSocket
    const captureAndSend = useCallback(() => {
        const video = videoRef.current;
        const canvas = captureRef.current;
        const ws = wsRef.current;

        if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;
        if (video.videoWidth === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        canvas.toBlob(blob => {
            if (blob && ws.readyState === WebSocket.OPEN) {
                blob.arrayBuffer().then(buf => ws.send(buf));
            }
        }, 'image/jpeg', 0.7);
    }, []);

    const startCamera = async () => {
        setStatus('starting');
        setPermissionDenied(false);
        try {
            // Request webcam permission
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
            });
            streamRef.current = stream;
            videoRef.current.srcObject = stream;
            await videoRef.current.play();

            // Open WebSocket to /ws/camera
            const ws = new WebSocket(getCameraWsUrl());
            ws.binaryType = 'arraybuffer';
            wsRef.current = ws;

            ws.onopen = () => {
                setCameraActive(true);
                setStatus('active');
                // Send frames at FRAME_RATE fps
                intervalRef.current = setInterval(captureAndSend, 1000 / FRAME_RATE);
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const dets = data.detections || [];
                setDetections(dets);
                setLiveStats({ helmets: data.current_helmets, no_helmets: data.current_no_helmets });
                const v = videoRef.current;
                if (v) drawDetections(dets, v.videoWidth, v.videoHeight);
            };

            ws.onerror = (e) => {
                console.error('Camera WS error', e);
                setStatus('error');
            };

            ws.onclose = () => {
                setCameraActive(false);
                setStatus('idle');
            };

        } catch (err) {
            console.error('Camera start error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionDenied(true);
            }
            setStatus('error');
        }
    };

    const stopCamera = () => {
        clearInterval(intervalRef.current);
        cancelAnimationFrame(animFrameRef.current);

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;

        // Clear overlay
        const ctx = overlayRef.current?.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

        setDetections([]);
        setLiveStats({ helmets: 0, no_helmets: 0 });
        setCameraActive(false);
        setStatus('idle');
    };

    const toggleCamera = () => cameraActive ? stopCamera() : startCamera();

    // Cleanup on unmount
    useEffect(() => () => stopCamera(), []);

    const helmetCount = liveStats.helmets;
    const noHelmetCount = liveStats.no_helmets;

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
                        Live Detection Feed
                    </h1>
                    <p className="text-slate-400 text-sm font-medium tracking-wide border-l-2 border-[#00f2fe]/50 pl-3 ml-1">
                        Browser webcam → cloud inference pipeline
                    </p>
                </div>

                <div className="flex items-center gap-4 glass-panel px-5 py-3 rounded-2xl">
                    {/* Live counters */}
                    {cameraActive && (
                        <div className="flex items-center gap-5 pr-5 border-r border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#00ff87] shadow-[0_0_8px_rgba(0,255,135,0.8)]" />
                                <span className="text-xs font-mono text-[#00ff87] font-bold">{helmetCount} Helmet</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#ff0844] shadow-[0_0_8px_rgba(255,8,68,0.8)]" />
                                <span className="text-xs font-mono text-[#ff0844] font-bold">{noHelmetCount} No Helmet</span>
                            </div>
                        </div>
                    )}

                    {/* Power toggle */}
                    <button
                        onClick={toggleCamera}
                        disabled={status === 'starting'}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md active:scale-95 disabled:opacity-50 ${cameraActive
                            ? 'bg-[#ff0844]/10 text-[#ff0844] border border-[#ff0844]/20 hover:bg-[#ff0844] hover:text-white shadow-[0_0_15px_rgba(255,8,68,0.2)] hover:shadow-[0_0_25px_rgba(255,8,68,0.4)]'
                            : 'bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/20 hover:bg-[#00ff87] hover:text-black shadow-[0_0_15px_rgba(0,255,135,0.2)] hover:shadow-[0_0_25px_rgba(0,255,135,0.4)]'
                            }`}
                    >
                        <Power size={14} className={status === 'starting' ? 'animate-spin' : cameraActive ? '' : 'animate-pulse'} />
                        {status === 'starting' ? 'Starting...' : cameraActive ? 'Halt Engine' : 'Ignite Engine'}
                    </button>
                </div>
            </header>

            {/* Video Container */}
            <section className="flex-1 glass-panel rounded-3xl overflow-hidden relative shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex flex-col min-h-0">

                {/* Status Bar */}
                <div className="h-14 bg-black/60 border-b border-white/10 flex items-center px-6 justify-between shrink-0 z-10 backdrop-blur-xl absolute top-0 w-full">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-xl border border-white/5">
                            <Signal className={`w-4 h-4 ${cameraActive ? 'text-[#00ff87]' : 'text-slate-600'}`} />
                            <span className="text-[11px] font-bold text-slate-200 tracking-[0.2em] font-mono">
                                {cameraActive ? 'LIVE' : 'OFFLINE'}
                            </span>
                        </div>
                        {cameraActive && (
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff0844] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff0844] shadow-[0_0_10px_rgba(255,8,68,0.8)]"></span>
                                </span>
                                <span className="text-xs font-bold text-[#ff0844] tracking-[0.2em] uppercase">REC</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-5 text-xs font-mono text-slate-400">
                        <div className="flex items-center gap-1.5"><Crosshair className="w-4 h-4 text-[#00f2fe]" /> {FRAME_RATE} FPS → server</div>
                        <div className="w-[1px] h-4 bg-white/10" />
                        <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#00ff87]" /> WSS SECURE</div>
                    </div>
                </div>

                {/* Feed Area */}
                <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-30" />

                    {/* Video + overlay canvas stacked */}
                    <div className="relative w-full h-full flex items-center justify-center mt-14">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`max-w-full max-h-full object-contain transition-opacity duration-500 ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
                        />
                        {/* Detection overlay canvas — sits on top of video */}
                        <canvas
                            ref={overlayRef}
                            className="absolute top-0 left-0 w-full h-full pointer-events-none"
                            style={{ objectFit: 'contain' }}
                        />
                        {/* Hidden frame capture canvas */}
                        <canvas ref={captureRef} className="hidden" />
                    </div>

                    {/* IDLE state HUD */}
                    {!cameraActive && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20"
                        >
                            <div className="w-24 h-24 rounded-full border border-[#1a233a] bg-[#060a13] flex items-center justify-center shadow-lg">
                                {permissionDenied
                                    ? <AlertCircle size={40} className="text-rose-500" />
                                    : <Power size={40} className="text-slate-700" />
                                }
                            </div>
                            <div className="text-center">
                                {permissionDenied ? (
                                    <>
                                        <p className="text-rose-400 tracking-[0.3em] font-black text-lg mb-2">CAMERA BLOCKED</p>
                                        <p className="text-slate-500 font-mono text-xs">Allow camera access in browser settings, then try again</p>
                                    </>
                                ) : status === 'error' ? (
                                    <>
                                        <p className="text-amber-400 tracking-[0.3em] font-black text-lg mb-2">CONNECTION ERROR</p>
                                        <p className="text-slate-500 font-mono text-xs">Could not connect to inference server</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-rose-500/80 tracking-[0.4em] font-black text-lg mb-2">SYSTEM INACTIVE</p>
                                        <p className="text-slate-500 font-mono text-xs">Press Ignite Engine to start your browser webcam</p>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Live HUD corner info */}
                    {cameraActive && (
                        <div className="absolute bottom-6 right-6 border border-white/10 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white font-mono text-xs shadow-lg flex flex-col gap-1 pointer-events-none">
                            <span className="text-slate-400">SOURCE: <span className="text-[#00f2fe]">BROWSER CAM</span></span>
                            <span className="text-slate-400">MODEL: <span className="text-amber-400">MediaPipe</span></span>
                            <span className="text-slate-400">RATE: <span className="text-indigo-400">{FRAME_RATE} FPS</span></span>
                        </div>
                    )}

                    {/* Edge vignette */}
                    {cameraActive && <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] pointer-events-none" />}
                </div>
            </section>
        </motion.div>
    );
}
