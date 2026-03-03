// Central API configuration
// In production (Render), set VITE_API_URL to your Render backend URL
// e.g. https://helmet-api.onrender.com
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// WebSocket URL derived from API URL (http→ws, https→wss)
export const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws/stats';
