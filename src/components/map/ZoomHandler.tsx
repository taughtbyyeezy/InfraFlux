import React, { useEffect } from 'react';
import { useMap } from '../ui/MapLibre';

interface ZoomHandlerProps {
    onZoomChange: (zoom: number) => void;
}

export const ZoomHandler: React.FC<ZoomHandlerProps> = ({ onZoomChange }) => {
    const { map, isLoaded } = useMap();

    useEffect(() => {
        if (!map || !isLoaded) return;

        const handler = () => {
            onZoomChange(map.getZoom());
        };

        map.on('zoomend', handler);
        return () => {
            map.off('zoomend', handler);
        };
    }, [map, isLoaded, onZoomChange]);

    return null;
};
