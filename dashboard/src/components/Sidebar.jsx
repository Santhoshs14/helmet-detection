/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Camera, LayoutDashboard, ScrollText, LogOut, Shield, ChevronLeft, ChevronRight, Activity, Cpu, Settings, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const sections = [
        {
            title: 'Monitoring',
            items: [
                { to: '/overview', icon: <Activity size={18} />, label: 'Overview' },
                { to: '/dashboard', icon: <Camera size={18} />, label: 'Live Camera' },
                { to: '/metrics', icon: <LayoutDashboard size={18} />, label: 'Analytics' },
            ]
        },
        {
            title: 'System Logs',
            items: [
                { to: '/alerts', icon: <Bell size={18} />, label: 'Alerts', badge: 'New' },
                { to: '/logs', icon: <ScrollText size={18} />, label: 'Violations' },
            ]
        },
        {
            title: 'Management',
            items: [
                { to: '/settings', icon: <Settings size={18} />, label: 'System Config' },
            ]
        }
    ];

    return (
        <motion.aside
            animate={{ width: isCollapsed ? 80 : 260 }}
            className="flex-none bg-[#0a0e1a]/40 backdrop-blur-xl border-r border-white/5 flex flex-col items-stretch z-40 relative shadow-[10px_0_30px_rgba(0,0,0,0.5)] transition-all duration-300"
        >
            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-8 bg-[#1a233a] border border-[#1a233a] text-slate-400 hover:text-white p-1 rounded-full shadow-lg z-50 transition-colors"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Brand Header */}
            <div className={`h-20 flex items-center px-6 border-b border-white/5 shrink-0 ${isCollapsed ? 'justify-center px-0' : ''}`}>
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#00f2fe]/10 border border-[#00f2fe]/20 shadow-[inset_0_0_20px_rgba(0,242,254,0.15),0_0_15px_rgba(0,242,254,0.2)]">
                    <Shield className="text-[#00f2fe] w-5 h-5 absolute" />
                </div>
                {!isCollapsed && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="font-heading font-extrabold text-xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 ml-3"
                    >
                        HelmetVision
                    </motion.span>
                )}
            </div>

            {/* Nav Menu */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6 no-scrollbar">
                {sections.map((section, idx) => (
                    <div key={idx}>
                        {!isCollapsed && (
                            <motion.h4
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2"
                            >
                                {section.title}
                            </motion.h4>
                        )}
                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = location.pathname === item.to;
                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={`group relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3 gap-3'} py-2.5 rounded-lg transition-all duration-200 font-medium text-sm overflow-hidden`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabBadge"
                                                className="absolute inset-0 bg-[#00f2fe]/10 border border-[#00f2fe]/30 rounded-lg shadow-[inset_0_0_20px_rgba(0,242,254,0.1)]"
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}

                                        <div className={`relative z-10 ${isActive ? 'text-[#00f2fe]' : 'text-slate-400 group-hover:text-white'} transition-colors duration-300`}>
                                            {item.icon}
                                        </div>

                                        {!isCollapsed && (
                                            <span className={`relative z-10 font-sans ${isActive ? 'text-white font-bold tracking-wide' : 'text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300'}`}>
                                                {item.label}
                                            </span>
                                        )}

                                        {!isCollapsed && item.badge && !isActive && (
                                            <span className="relative z-10 ml-auto flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                            </span>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Server Status Mini Banner */}
            {!isCollapsed && (
                <div className="px-4 mb-4">
                    <div className="bg-[#0f1522] border border-white/5 rounded-xl p-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2">
                            <Activity className="text-[#00ff87] w-4 h-4" />
                            <span className="text-xs font-bold text-slate-300">Engine V.1</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff87] shadow-[0_0_10px_rgba(0,255,135,0.8)] animate-pulse" />
                            <span className="text-[10px] font-bold text-[#00ff87] uppercase tracking-widest">Online</span>
                        </div>
                    </div>
                </div>
            )}

            {/* User Footer */}
            <div className={`p-4 border-t border-white/5 shrink-0 bg-black/20 backdrop-blur-md`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#00f2fe]/10 border border-[#00f2fe]/20 flex items-center justify-center font-heading font-bold text-sm text-[#00f2fe] shadow-[0_0_10px_rgba(0,242,254,0.1)]">
                            AD
                        </div>
                        {!isCollapsed && (
                            <div>
                                <p className="text-sm font-bold text-slate-200 leading-tight">Administrator</p>
                                <p className="text-[10px] text-slate-500 font-mono tracking-wider">SEC-L3</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Disconnect"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </motion.aside>
    );
}
