import React from 'react';
import { useMapEvents } from 'react-leaflet';

interface MapClickHandlerProps {
    onMapClick: (latlng: [number, number], point: L.Point) => void;
    addToast: (message: string, type: 'error' | 'success' | 'warning' | 'info') => void;
}

export const MapClickHandler: React.FC<MapClickHandlerProps> = ({ onMapClick, addToast }) => {
    useMapEvents({
        click: (e) => {
            onMapClick([e.latlng.lat, e.latlng.lng], e.containerPoint);
        },
        locationerror: (e) => {
            console.error('Location error:', e.message);
            addToast(`Location access failed: ${e.message}`, 'error');
        }
    });
    return null;
};
