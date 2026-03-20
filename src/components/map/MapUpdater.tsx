import React, { useEffect, useRef } from 'react';
import { useMap } from '../ui/MapLibre';

interface MapUpdaterProps {
    center: [number, number]; // [lat, lng] from app state
}

export const MapUpdater: React.FC<MapUpdaterProps> = ({ center }) => {
    const { map, isLoaded } = useMap();
    const lastCenterRef = useRef<string>('');

    useEffect(() => {
        if (!map || !isLoaded) return;
        const centerStr = center.join(',');
        if (lastCenterRef.current !== centerStr) {
            map.setCenter([center[1], center[0]]); // MapLibre: [lng, lat]
            lastCenterRef.current = centerStr;
        }
    }, [center, map, isLoaded]);
    return null;
};
