import React, { useEffect } from 'react';
import { useMap } from '../ui/MapLibre';

interface MapClickHandlerProps {
    onMapClick: (latlng: [number, number], point: { x: number; y: number }) => void;
    addToast: (message: string, type: 'error' | 'success' | 'warning' | 'info') => void;
}

export const MapClickHandler: React.FC<MapClickHandlerProps> = ({ onMapClick, addToast }) => {
    const { map, isLoaded } = useMap();

    useEffect(() => {
        if (!map || !isLoaded) return;

        const clickHandler = (e: any) => {
            // e.lngLat has {lng, lat}; e.point has {x, y}
            
            // PROXIMITY GUARD: Reject map clicks that are too close to existing markers
            // We check if the 'hit area' layer was touched
            const hitFeatures = map.queryRenderedFeatures(e.point, { layers: ['issues-unclustered-hit'] });
            if (hitFeatures && hitFeatures.length > 0) {
                console.log('Map click ignored - within proximity touch guard of marker');
                return;
            }

            onMapClick([e.lngLat.lat, e.lngLat.lng], { x: e.point.x, y: e.point.y });
        };

        const errorHandler = (e: any) => {
            console.error('Location error:', e.message);
            addToast(`Location access failed: ${e.message}`, 'error');
        };

        map.on('click', clickHandler);
        map.on('error', errorHandler);

        return () => {
            map.off('click', clickHandler);
            map.off('error', errorHandler);
        };
    }, [map, isLoaded, onMapClick, addToast]);

    return null;
};
