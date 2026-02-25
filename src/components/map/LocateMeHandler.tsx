import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

interface LocateMeHandlerProps {
    center: [number, number] | null;
}

export const LocateMeHandler: React.FC<LocateMeHandlerProps> = ({ center }) => {
    const map = useMap();
    const lastCenterRef = useRef<string>("");

    useEffect(() => {
        if (center) {
            const centerStr = center.join(',');
            if (lastCenterRef.current !== centerStr) {
                map.setView(center, 18);
                lastCenterRef.current = centerStr;
            }
        }
    }, [center, map]);
    return null;
};
