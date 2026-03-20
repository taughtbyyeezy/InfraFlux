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

/**
 * Calculates offset center for mobile view with bottom panel
 * When panel takes bottom 50%, marker should be centered in top 50%
 * To achieve this, we move the camera DOWN by ~25% of screen height
 */
const calculateOffsetCenter = (
    map: maplibregl.Map,
    latlng: [number, number]
): [number, number] => {
    const mapLibreLngLat: [number, number] = [latlng[1], latlng[0]]; // [lng, lat]
    const projectedPoint = map.project(mapLibreLngLat);

    const containerHeight = map.getContainer().offsetHeight;
    // Panel is ~50% height, so offset by 25% to center marker in top half
    const offsetPixels = containerHeight * 0.25;
    
    // Move camera DOWN (add to Y) so marker moves UP on screen into visible area
    projectedPoint.y += offsetPixels;

    const targetLngLat = map.unproject(projectedPoint);
    return [targetLngLat.lng, targetLngLat.lat]; // Return as [lng, lat] for flyTo
};

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

        if (center && (locateTriggerChanged || lastCenterRef.current !== center.join(','))) {
            lastCenterRef.current = center.join(',');
            const targetZoom = 18;
            
            // For GPS locate, use offset when menu is open on mobile
            const finalCenter = (isMobile && isMenuOpen)
                ? calculateOffsetCenter(map, center)
                : [center[1], center[0]] as [number, number];

            map.flyTo({
                center: finalCenter,
                zoom: targetZoom,
                duration: 500,
            });
            return;
        }

        // Handle Map Click / Marker Focus (when bottom panel is open)
        const focusTriggerChanged = focusTrigger !== lastFocusTriggerRef.current;
        lastFocusTriggerRef.current = focusTrigger;

        if (isMobile && focusTriggerChanged && focusLocation) {
            const offsetCenter = calculateOffsetCenter(map, focusLocation);
            map.flyTo({
                center: offsetCenter,
                zoom: map.getZoom(),
                duration: 500,
            });
        }
    }, [center, focusLocation, map, isLoaded, isMobile, isMenuOpen, locateTrigger, focusTrigger]);

    return null;
};
