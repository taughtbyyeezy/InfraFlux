import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

interface MapUpdaterProps {
    center: [number, number];
}

export const MapUpdater: React.FC<MapUpdaterProps> = ({ center }) => {
    const map = useMap();
    const lastCenterRef = useRef<string>("");

    useEffect(() => {
        const centerStr = center.join(',');
        if (lastCenterRef.current !== centerStr) {
            map.setView(center);
            lastCenterRef.current = centerStr;
        }
    }, [center, map]);
    return null;
};
