import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from '../ui/MapLibre';

interface GpsBoundaryProps {
    location: [number, number] | null;
    radiusMeters?: number;
}

const SOURCE_ID = 'gps-boundary-source';
const LAYER_ID = 'gps-boundary-layer';
const FILL_LAYER_ID = 'gps-boundary-fill-layer';

function metersToPixels(meters: number, lat: number, zoom: number): number {
    const earthRadius = 6378137;
    const latRad = lat * Math.PI / 180;
    const circumference = 2 * Math.PI * earthRadius * Math.cos(latRad);
    const metersPerPixel = circumference / (256 * Math.pow(2, zoom));
    return meters / metersPerPixel;
}

function createCirclePolygon(lng: number, lat: number, radiusMeters: number, numPoints: number = 64): GeoJSON.Feature {
    const coords: [number, number][] = [];
    const d2r = Math.PI / 180;
    const r2d = 180 / Math.PI;
    const earthRadius = 6378137;
    const angularDistance = radiusMeters / earthRadius;

    for (let i = 0; i <= numPoints; i++) {
        const bearing = (i * 360) / numPoints * d2r;
        const latRad = lat * d2r;
        const lngRad = lng * d2r;

        const newLatRad = Math.asin(
            Math.sin(latRad) * Math.cos(angularDistance) +
            Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
        );
        const newLngRad = lngRad + Math.atan2(
            Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
            Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
        );

        coords.push([newLngRad * r2d, newLatRad * r2d]);
    }

    return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: {},
    };
}

export const GpsBoundary: React.FC<GpsBoundaryProps> = ({ location, radiusMeters = 100 }) => {
    const { map, isLoaded } = useMap();
    const isSourceAddedRef = useRef(false);
    const isLayerAddedRef = useRef(false);
    const isFillLayerAddedRef = useRef(false);

    const removeBoundary = () => {
        if (!map || !map.isStyleLoaded()) return;
        if (isFillLayerAddedRef.current) {
            if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
            isFillLayerAddedRef.current = false;
        }
        if (isLayerAddedRef.current) {
            if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
            isLayerAddedRef.current = false;
        }
        if (isSourceAddedRef.current) {
            if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
            isSourceAddedRef.current = false;
        }
    };

    useEffect(() => {
        if (!map || !isLoaded) return;

        if (!location) {
            removeBoundary();
            return;
        }

        const [lat, lng] = location;
        const circleFeature = createCirclePolygon(lng, lat, radiusMeters);

        const data: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: [circleFeature],
        };

        removeBoundary();

        map.addSource(SOURCE_ID, {
            type: 'geojson',
            data,
        });
        isSourceAddedRef.current = true;

        map.addLayer({
            id: FILL_LAYER_ID,
            type: 'fill',
            source: SOURCE_ID,
            paint: {
                'fill-color': 'rgba(239, 68, 68, 0.08)',
                'fill-opacity': 1,
            },
        });
        isFillLayerAddedRef.current = true;

        map.addLayer({
            id: LAYER_ID,
            type: 'line',
            source: SOURCE_ID,
            paint: {
                'line-color': 'rgba(239, 68, 68, 0.5)',
                'line-width': 2,
                'line-dasharray': [4, 4],
            },
        });
        isLayerAddedRef.current = true;

        return () => {
            removeBoundary();
        };
    }, [map, isLoaded, location, radiusMeters]);

    return null;
};
