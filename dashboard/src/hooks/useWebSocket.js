import { useState, useEffect, useRef } from 'react';
import useWebSocket from 'react-use-websocket';
import toast from 'react-hot-toast';
import { WS_URL } from '../config/api';

export default function useStatsWebSocket() {
    const [stats, setStats] = useState({
        total_monitored: 0,
        current_helmets: 0,
        current_no_helmets: 0,
        violations: [],
        alerts: []
    });
    const prevViolationsCount = useRef(0);
    const seenAlertIds = useRef(new Set());

    const { lastJsonMessage, readyState } = useWebSocket(WS_URL, {
        shouldReconnect: () => true, // Automatically reconnect
        reconnectAttempts: 10,
        reconnectInterval: 3000,
    });

    useEffect(() => {
        if (lastJsonMessage !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStats(lastJsonMessage);

            // Trigger toast on new violation logged
            if (lastJsonMessage.violations && lastJsonMessage.violations.length > prevViolationsCount.current) {
                // Determine if it was just initialized or a real new event
                if (prevViolationsCount.current > 0) {
                    toast.error(`No Helmet Detected`, {
                        icon: '📷',
                        style: {
                            borderRadius: '12px',
                            background: '#0d1321',
                            color: '#fff',
                            border: '1px solid #f43f5e',
                            boxShadow: '0 0 20px rgba(244,63,94,0.2)'
                        },
                    });
                }
                prevViolationsCount.current = lastJsonMessage.violations.length;
            }

            // Trigger toast on new System Alert
            if (lastJsonMessage.alerts && lastJsonMessage.alerts.length > 0) {
                lastJsonMessage.alerts.forEach(alert => {
                    if (!seenAlertIds.current.has(alert.id)) {
                        seenAlertIds.current.add(alert.id);
                        // Prevent alert spam on first load
                        if (seenAlertIds.current.size > lastJsonMessage.alerts.length) {
                            if (alert.play_sound) {
                                // Attempt to play a simple beep (browser policies may block without interaction)
                                const audio = new Audio('/alert-sound.mp3'); // if we have one
                                audio.play().catch(e => console.log('Audio blocked', e));
                            }

                            toast(alert.message, {
                                icon: '🚨',
                                duration: 8000,
                                style: {
                                    borderRadius: '12px',
                                    background: '#060a13',
                                    color: '#f59e0b',
                                    border: '1px solid #f59e0b',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 24px rgba(245, 158, 11, 0.3)'
                                }
                            });
                        }
                    }
                });
            }
        }
    }, [lastJsonMessage]);

    return { stats, isConnected: readyState === 1 };
}
