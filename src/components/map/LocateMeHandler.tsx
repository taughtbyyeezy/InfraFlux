import React, { useEffect, useRef } from 'react';
import { useMap } from '../ui/MapLibre';

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
    focusTrigger = 0,
}) => {
    const { map, isLoaded } = useMap();
    const lastCenterRef = useRef<string>('');
    const lastLocateTriggerRef = useRef<number>(0);
    const lastFocusTriggerRef = useRef<number>(0);

    useEffect(() => {
        if (!map || !isLoaded) return;

        // Handle Locate Me (GPS button)
        const locateTriggerChanged = locateTrigger !== lastLocateTriggerRef.current;
        lastLocateTriggerRef.current = locateTrigger;

        if (center && locateTriggerChanged) {
            lastCenterRef.current = center.join(',');
            const targetZoom = 19;
            
            // MapLibre expects [lng, lat]
            const lngLat: [number, number] = [center[1], center[0]];
            
            // To center marker in the TOP half, we tell MapLibre that the BOTTOM half is "padded" 
            // (i.e. occupied by something else). This pushes the center point up.
            const bottomPadding = (isMobile && isMenuOpen)
                ? map.getContainer().offsetHeight / 2
                : 0;

            // Smooth flyTo for all scenarios
            map.flyTo({
                center: lngLat,
                zoom: targetZoom,
                padding: { left: 0, right: 0, top: 0, bottom: bottomPadding },
                duration: 1200,
                essential: true,
            });
            return;
        }

        // Handle Map Click / Marker Focus (manual taps)
        const focusTriggerChanged = focusTrigger !== lastFocusTriggerRef.current;
        lastFocusTriggerRef.current = focusTrigger;

        if (isMobile && focusTriggerChanged && focusLocation) {
            // MapLibre expects [lng, lat]
            const lngLat: [number, number] = [focusLocation[1], focusLocation[0]];
            
            // Push marker into top half of screen
            const bottomPadding = map.getContainer().offsetHeight / 2;

            map.easeTo({
                center: lngLat,
                zoom: map.getZoom(), // Maintain current zoom
                padding: { left: 0, right: 0, top: 0, bottom: bottomPadding },
                duration: 0,
            });
        }
    }, [center, focusLocation, map, isLoaded, isMobile, isMenuOpen, locateTrigger, focusTrigger]);

    return null;
};
