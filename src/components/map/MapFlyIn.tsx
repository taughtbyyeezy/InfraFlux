import React, { useEffect, useRef } from 'react';
import { useMap } from '../ui/MapLibre';

interface MapFlyInProps {
    isLoading: boolean;
    targetCenter: [number, number]; // [lat, lng]
    targetZoom: number;
}

export const MapFlyIn: React.FC<MapFlyInProps> = ({ isLoading, targetCenter, targetZoom }) => {
    const { map, isLoaded } = useMap();
    const hasFlown = useRef(false);

    useEffect(() => {
        if (!map || !isLoaded) return;
        if (hasFlown.current) return;
        if (isLoading) return;

        hasFlown.current = true;
        map.flyTo({
            center: [targetCenter[1], targetCenter[0]], // MapLibre: [lng, lat]
            zoom: targetZoom,
            duration: 2500,
            essential: true,
        });
    }, [map, isLoaded, isLoading, targetCenter, targetZoom]);

    return null;
};
