import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface LocateMeHandlerProps {
    center: [number, number] | null;
    focusLocation?: [number, number] | null;
    isMobile?: boolean;
    isMenuOpen?: boolean;
    locateTrigger?: number;
    focusTrigger?: number;
}

export const LocateMeHandler: React.FC<LocateMeHandlerProps> = ({
    center,
    focusLocation,
    isMobile,
    isMenuOpen,
    locateTrigger = 0,
    focusTrigger = 0
}) => {
    const map = useMap();
    const lastCenterRef = useRef<string>("");
    const lastLocateTriggerRef = useRef<number>(0);
    const lastFocusTriggerRef = useRef<number>(0);

    const getOffsetCenter = (latlng: [number, number], targetZoom: number) => {
        if (!map || !isMobile) return latlng;

        // 1. Project the GPS point to absolute pixel coordinates at the target zoom level
        const projectedPoint = map.project(latlng, targetZoom);

        // 2. Adjust for the visual offset (move camera 25% + 15px "down" the screen to account for 50% + 30px panel)
        const containerHeight = map.getSize().y;
        const offsetPoint = L.point(projectedPoint.x, projectedPoint.y + (containerHeight * 0.25) + 15);

        // 3. Unproject back to GPS coordinates
        const targetLatLng = map.unproject(offsetPoint, targetZoom);
        return [targetLatLng.lat, targetLatLng.lng] as [number, number];
    };

    useEffect(() => {
        if (!map) return;

        const currentZoom = map.getZoom();

        // Handle Locate Me (Scenario 1 & 2)
        const locateTriggerChanged = locateTrigger !== lastLocateTriggerRef.current;
        lastLocateTriggerRef.current = locateTrigger;

        if (center && (locateTriggerChanged || (lastCenterRef.current !== center.join(',')))) {
            lastCenterRef.current = center.join(',');
            const targetZoom = 18;
            const finalTarget = (isMobile && isMenuOpen) ? getOffsetCenter(center, targetZoom) : center;
            map.setView(finalTarget, targetZoom, { animate: true, duration: 0.5 });
            return; // Priority to GPS move
        }

        // Handle Map Click Focus (Explicit trigger from UserMap)
        const focusTriggerChanged = focusTrigger !== lastFocusTriggerRef.current;
        lastFocusTriggerRef.current = focusTrigger;

        if (isMobile && focusTriggerChanged && focusLocation) {
            const offsetTarget = getOffsetCenter(focusLocation, currentZoom);
            map.setView(offsetTarget, currentZoom, { animate: true, duration: 0.5 });
        }
    }, [center, focusLocation, map, isMobile, isMenuOpen, locateTrigger, focusTrigger]);
    return null;
};
