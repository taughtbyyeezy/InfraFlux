import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface LocateMeHandlerProps {
    center: [number, number] | null;
    isMobile?: boolean;
    isMenuOpen?: boolean;
}

export const LocateMeHandler: React.FC<LocateMeHandlerProps> = ({ center, isMobile, isMenuOpen }) => {
    const map = useMap();
    const lastCenterRef = useRef<string>("");

    useEffect(() => {
        if (center && map) {
            const centerStr = `${center.join(',')}-${isMenuOpen}`;
            if (lastCenterRef.current !== centerStr) {
                lastCenterRef.current = centerStr;

                // On mobile with the menu open, we want the marker to appear in the visible top 50%
                if (isMobile && isMenuOpen) {
                    // Force a view reset to current center first to ensure unprojection is accurate
                    map.setView(center, 18, { animate: false });

                    const containerHeight = map.getSize().y;
                    const offsetPixels = containerHeight * 0.25;

                    // We want the user location (center) to appear at 25% height
                    // The map center (setView target) should therefore be 25% height BELOW the user location
                    const centerPoint = map.latLngToContainerPoint(center);
                    const targetPoint = L.point(centerPoint.x, centerPoint.y + offsetPixels);
                    const targetLatLng = map.containerPointToLatLng(targetPoint);

                    map.setView(targetLatLng, 18, { animate: true });
                } else {
                    map.setView(center, 18);
                }
            }
        }
    }, [center, map, isMobile, isMenuOpen]);
    return null;
};
