import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface MapRegisterProps {
    setMap: (map: L.Map) => void;
}

export const MapRegister: React.FC<MapRegisterProps> = ({ setMap }) => {
    const map = useMap();
    useEffect(() => {
        setMap(map);
    }, [map, setMap]);
    return null;
};
