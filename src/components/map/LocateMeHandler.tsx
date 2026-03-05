import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

interface LocateMeHandlerProps {
    center: [number, number] | null;
    isMobile?: boolean;
    isMenuOpen?: boolean;
}

export const LocateMeHandler: React.FC<LocateMeHandlerProps> = ({ center, isMobile, isMenuOpen }) => {
    const map = useMap();
    const lastCenterRef = useRef<string>("");

    useEffect(() => {
        if (center) {
            const centerStr = center.join(',');
            if (lastCenterRef.current !== centerStr) {
                lastCenterRef.current = centerStr;

                // On mobile with the menu open, we want the center to appear in the visible top space
                if (isMobile && isMenuOpen) {
                    const containerHeight = map.getSize().y;
                    // Move the geographic center point into the middle of the top visible 50%
                    // This means moving it from 0.5H to 0.25H. Panning viewport DOWN by 0.25H does this.
                    const offset = containerHeight * 0.225; // Slight adjustment for handle

                    map.setView(center, 18, { animate: false });
                    map.panBy([0, offset], { animate: true });
                } else {
                    map.setView(center, 18);
                }
            }
        }
    }, [center, map, isMobile, isMenuOpen]);
    return null;
};
