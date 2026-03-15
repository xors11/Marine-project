import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useCycloneTimeline — animated year timeline for cyclone playback
 */
export default function useCycloneTimeline() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentYear, setCurrentYear] = useState(2001);
    const [speed, setSpeed] = useState(1);
    const timerRef = useRef(null);

    const play = useCallback(() => setIsPlaying(true), []);
    const pause = useCallback(() => setIsPlaying(false), []);
    const reset = useCallback(() => {
        setIsPlaying(false);
        setCurrentYear(2001);
    }, []);

    useEffect(() => {
        if (isPlaying) {
            timerRef.current = setInterval(() => {
                setCurrentYear(prev => {
                    if (prev >= 2025) {
                        setIsPlaying(false);
                        return 2025;
                    }
                    return prev + 1;
                });
            }, 1000 / speed);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPlaying, speed]);

    return { isPlaying, currentYear, speed, play, pause, reset, setSpeed, setCurrentYear };
}
