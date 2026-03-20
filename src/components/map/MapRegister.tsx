import React, { useEffect } from 'react';
import { useMap } from '../ui/MapLibre';
import maplibregl from 'maplibre-gl';

interface MapRegisterProps {
    setMap: (map: maplibregl.Map) => void;
}

export const MapRegister: React.FC<MapRegisterProps> = ({ setMap }) => {
    const { map, isLoaded } = useMap();
    useEffect(() => {
        if (isLoaded && map) {
            setMap(map);
        }
    }, [map, isLoaded, setMap]);
    return null;
};
