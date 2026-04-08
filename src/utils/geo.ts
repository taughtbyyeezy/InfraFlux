/**
 * Calculates distance between two coordinates in meters using the Haversine formula.
 * lat/lon order: (lat1, lon1, lat2, lon2)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
};

/**
 * Provides human-readable error messages for GeolocationPositionError codes.
 */
export const getGeoErrorMessage = (error: GeolocationPositionError): string => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    switch (error.code) {
        case error.PERMISSION_DENIED:
            return isSafari
                ? "Permission denied. On Safari, you may also need to allow Location in System Settings > Privacy > Location Services."
                : "Permission denied. Please enable location services in your browser/system settings.";
        case error.POSITION_UNAVAILABLE:
            return "Position unavailable. Your device could not determine your location.";
        case error.TIMEOUT:
            return "Request timed out. Try again or check your signal.";
        default:
            return error.message || "An unknown error occurred.";
    }
};
