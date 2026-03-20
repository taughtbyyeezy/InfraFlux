import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from '../ui/MapLibre';
import { InfrastructureIssue } from '../../types';
import { issuesToGeoJSON, geoJSONToIssue } from '../../utils/geojson';

interface IssuesLayerProps {
    issues: InfrastructureIssue[];
    zoom: number;
    onSelect: (issue: InfrastructureIssue) => void;
    onZoomChange: (zoom: number) => void;
}

const SOURCE_ID = 'issues-source';
const HEATMAP_ID = 'issues-heatmap';
const UNCLUSTERED_ID = 'issues-unclustered';
const UNCLUSTERED_GLOW_ID = 'issues-unclustered-glow';
const UNCLUSTERED_HIT_ID = 'issues-unclustered-hit';

const ALL_LAYER_IDS = [HEATMAP_ID, UNCLUSTERED_ID, UNCLUSTERED_GLOW_ID, UNCLUSTERED_HIT_ID];

export const IssuesLayer: React.FC<IssuesLayerProps> = ({
    issues,
    zoom,
    onSelect,
    onZoomChange,
}) => {
    const { map, isLoaded } = useMap();
    const onSelectRef = useRef(onSelect);
    const updateTimerRef = useRef<number>();

    useEffect(() => {
        onSelectRef.current = onSelect;
    }, [onSelect]);

    // Initialize layers once map is loaded
    useEffect(() => {
        if (!map || !isLoaded) return;

        // ─── Add source (no clustering) ────────────────────────────────────────
        map.addSource(SOURCE_ID, {
            type: 'geojson',
            data: issuesToGeoJSON(issues),
        });

        // ─── Heatmap layer (zoom 0–12) ─────────────────────────────────────────
        map.addLayer({
            id: HEATMAP_ID,
            type: 'heatmap',
            source: SOURCE_ID,
            maxzoom: 12,
            paint: {
                'heatmap-weight': ['interpolate', ['linear'], ['get', 'magnitude'], 0, 0, 10, 1],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'],
                    0, 1,
                    6, 3,
                    12, 4,
                ],
                'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(0,0,0,0)',
                    0.2, 'rgba(34,211,238,0.4)',
                    0.4, 'rgba(251,191,36,0.6)',
                    0.6, 'rgba(239,68,68,0.7)',
                    1, 'rgba(239,68,68,0.9)',
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'],
                    0, 2,
                    6, 20,
                    12, 35,
                ],
                'heatmap-opacity': 0.85,
            },
        });

        // ─── Glow effect (outer glow behind individual markers) ────────────────
        map.addLayer({
            id: UNCLUSTERED_GLOW_ID,
            type: 'circle',
            source: SOURCE_ID,
            minzoom: 12,
            paint: {
                'circle-color': [
                    'case',
                    ['==', ['get', 'status'], 'resolved'], '#22c55e66',
                    ['match', ['get', 'type'],
                        'pothole', '#ef444466',
                        'water_logging', '#3b82f666',
                        'garbage_dump', '#fbbf2466',
                        '#22d3ee66',
                    ],
                ],
                'circle-radius': ['interpolate', ['linear'], ['zoom'],
                    12, 10,
                    14, 14,
                    16, 18,
                    18, 24,
                    20, 30,
                ],
                'circle-opacity': 0.3,
                'circle-blur': 1,
            },
        });

        // ─── Individual markers (zoom 12+) ───────────────────────────────────
        map.addLayer({
            id: UNCLUSTERED_ID,
            type: 'circle',
            source: SOURCE_ID,
            minzoom: 12,
            paint: {
                'circle-color': [
                    'case',
                    ['==', ['get', 'status'], 'resolved'], '#22c55e',
                    ['match', ['get', 'type'],
                        'pothole', '#ef4444',
                        'water_logging', '#3b82f6',
                        'garbage_dump', '#fbbf24',
                        '#22d3ee',
                    ],
                ],
                'circle-radius': ['interpolate', ['linear'], ['zoom'],
                    12, 4,
                    14, 6,
                    16, 8,
                    18, 12,
                    20, 16,
                ],
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': ['case', ['==', ['get', 'status'], 'resolved'], 0.5, 1],
            },
        });

        // ─── Hit area (invisible, larger radius for touch detection) ───────────
        map.addLayer({
            id: UNCLUSTERED_HIT_ID,
            type: 'circle',
            source: SOURCE_ID,
            minzoom: 12,
            paint: {
                'circle-color': '#000000',
                'circle-radius': 40,
                'circle-opacity': 0,
            },
        });

        // ─── Click handlers ───────────────────────────────────────────────────

        // Individual marker click → select
        const unclusteredClickHandler = (e: maplibregl.MapMouseEvent) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [UNCLUSTERED_ID] });
            if (!features.length) return;
            const props = features[0].properties!;
            const issue = geoJSONToIssue(props);
            if (onSelectRef.current) {
                onSelectRef.current(issue);
            }
        };
        map.on('click', UNCLUSTERED_HIT_ID, unclusteredClickHandler);

        // Cursor pointer on markers
        map.on('mouseenter', UNCLUSTERED_HIT_ID, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', UNCLUSTERED_HIT_ID, () => { map.getCanvas().style.cursor = ''; });

        // ─── Cleanup ──────────────────────────────────────────────────────────
        return () => {
            map.off('click', UNCLUSTERED_HIT_ID, unclusteredClickHandler);
            for (const id of ALL_LAYER_IDS) {
                if (map.getLayer(id)) map.removeLayer(id);
            }
            if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
        };
    }, [map, isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

    // Throttled data update — re-sync GeoJSON source when issues change
    useEffect(() => {
        if (!map || !isLoaded) return;
        const source = map.getSource(SOURCE_ID);
        if (!source) return;

        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = window.setTimeout(() => {
            const geojson = issuesToGeoJSON(issues);
            (map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource).setData(geojson);
        }, 100);
    }, [issues, map, isLoaded]);

    // Zoom handler
    useEffect(() => {
        if (!map || !isLoaded) return;
        const handler = () => onZoomChange(map.getZoom());
        map.on('zoomend', handler);
        return () => { map.off('zoomend', handler); };
    }, [map, isLoaded, onZoomChange]);

    return null;
};
