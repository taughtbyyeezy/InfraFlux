import React from 'react';
import { useMapEvents } from 'react-leaflet';

interface ZoomHandlerProps {
    onZoomChange: (zoom: number) => void;
}

export const ZoomHandler: React.FC<ZoomHandlerProps> = ({ onZoomChange }) => {
    const map = useMapEvents({
        zoomend: () => {
            onZoomChange(map.getZoom());
        },
    });
    return null;
};
