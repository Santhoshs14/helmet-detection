/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

export default function Login() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Invalid credentials');
            }

            const data = await response.json();
            login(data.access_token, data.role);
            navigate('/overview');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex bg-[#060a13] min-h-screen text-slate-200 overflow-hidden font-sans relative">

            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

            <div className="flex w-full">

                {/* Left Side - Presentation */}
                <div className="hidden lg:flex w-[55%] relative flex-col justify-center items-center p-12 overflow-hidden border-r border-white/5 bg-[#0a0e1a]/50 backdrop-blur-3xl">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative z-10 max-w-lg text-center"
                    >
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 to-blue-600 shadow-[0_0_40px_rgba(99,102,241,0.3)] mb-8">
                            <Shield className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-5xl font-extrabold tracking-tight text-white mb-4">HelmetVision</h1>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Enterprise-grade automated traffic safety enforcement. Leveraging neural networks for real-time compliance monitoring.
                        </p>
                    </motion.div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-[45%] flex items-center justify-center p-8 sm:p-12 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="w-full max-w-md"
                    >
                        {/* Mobile Brand (hidden on large screens) */}
                        <div className="lg:hidden text-center mb-10">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/20 mb-4">
                                <Shield className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight">HelmetVision</h1>
                        </div>

                        <div className="mb-10 lg:text-left text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                            <p className="text-slate-500 text-sm">Please enter your credentials to access the control panel.</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium rounded-xl flex items-center gap-2"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Platform Username</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#0d1321]/50 border border-white/10 rounded-xl px-4 py-3.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                                        placeholder="admin"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Secure Password</label>
                                    <div className="relative group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="w-full bg-[#0d1321]/50 border border-white/10 rounded-xl pl-10 pr-12 py-3.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />

                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-0.5 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Authenticate <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-xs text-slate-600 font-medium">
                            Powered by Deep Learning Engine V1.2.0<br />
                            Unauthorized access is strictly prohibited.
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
