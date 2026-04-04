import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    forwardRef,
    useImperativeHandle,
    useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';

// ─── Context ──────────────────────────────────────────────────────────────────

interface MapContextValue {
    map: maplibregl.Map | null;
    isLoaded: boolean;
}

const MapContext = createContext<MapContextValue>({ map: null, isLoaded: false });

export function useMap(): MapContextValue {
    return useContext(MapContext);
}

// ─── Map Component ────────────────────────────────────────────────────────────

interface MapViewport {
    longitude: number;
    latitude: number;
    zoom: number;
    bearing: number;
    pitch: number;
}

export interface MapRef {
    getMap: () => maplibregl.Map | null;
    flyTo: (options: { center?: [number, number]; zoom?: number; duration?: number }) => void;
}

interface MapProps {
    children?: React.ReactNode;
    className?: string;
    center?: [number, number]; // [lng, lat]
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    scrollZoom?: boolean;
    dragRotate?: boolean;
    touchZoomRotate?: boolean;
    touchPitch?: boolean;
    maxPitch?: number;
    style?: React.CSSProperties;
    theme?: 'light' | 'dark';
    projection?: maplibregl.ProjectionSpecification;
    viewport?: Partial<MapViewport>;
    onViewportChange?: (viewport: MapViewport) => void;
    onMoveEnd?: (viewport: MapViewport) => void;
    onMapClick?: (e: maplibregl.MapMouseEvent) => void;
    isPanelOpen?: boolean;
    suppressPaddingEffect?: boolean;
    loading?: boolean;
}

const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

const LIGHT_TILES = [
    'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
];

const DARK_TILES = [
    'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    'https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
];

const MapBase = forwardRef<MapRef, MapProps>(
    (
        {
            children,
            className,
            center = [0, 0],
            zoom = 10,
            minZoom,
            maxZoom,
            scrollZoom = true,
            style,
            theme = 'light',
            projection,
            dragRotate,
            touchZoomRotate,
            touchPitch,
            maxPitch,
            onViewportChange,
            onMoveEnd,
            onMapClick,
            isPanelOpen = false,
            suppressPaddingEffect = false,
        },
        ref,
    ) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const mapRef = useRef<maplibregl.Map | null>(null);
        const [isLoaded, setIsLoaded] = useState(false);
        const onViewportChangeRef = useRef(onViewportChange);
        const onMoveEndRef = useRef(onMoveEnd);
        const onMapClickRef = useRef(onMapClick);
        const isInitialMount = useRef(true);

        // Stabilize context value to prevent unnecessary re-renders of all map children
        const contextValue = useMemo(() => ({
            map: mapRef.current,
            isLoaded
        }), [isLoaded]);

        useEffect(() => {
            onViewportChangeRef.current = onViewportChange;
        }, [onViewportChange]);

        useEffect(() => {
            onMoveEndRef.current = onMoveEnd;
        }, [onMoveEnd]);

        useEffect(() => {
            onMapClickRef.current = onMapClick;
        }, [onMapClick]);

        useImperativeHandle(ref, () => ({
            getMap: () => mapRef.current,
            flyTo: (options) => {
                mapRef.current?.flyTo(options);
            },
        }));

        useEffect(() => {
            if (!containerRef.current) return;

            const initialTiles = theme === 'dark' ? DARK_TILES : LIGHT_TILES;
            const initialStyle: maplibregl.StyleSpecification = {
                version: 8,
                sources: {
                    'carto-tiles': {
                        type: 'raster',
                        tiles: initialTiles,
                        tileSize: 256,
                        attribution: TILE_ATTRIBUTION,
                    },
                },
                layers: [
                    {
                        id: 'carto-tiles-layer',
                        type: 'raster',
                        source: 'carto-tiles',
                    },
                ],
            };

            const map = new maplibregl.Map({
                container: containerRef.current,
                style: initialStyle,
                center,
                zoom,
                minZoom,
                maxZoom,
                scrollZoom,
                dragRotate: dragRotate ?? true,
                touchZoomRotate: touchZoomRotate ?? true,
                touchPitch: touchPitch ?? true,
                maxPitch: maxPitch ?? 85,
                attributionControl: false,
            });

            mapRef.current = map;

            if (projection) {
                map.on('style.load', () => {
                    (map as any).setProjection(projection);
                });
            }

            map.on('load', () => {
                setIsLoaded(true);
            });

            map.on('move', () => {
                if (onViewportChangeRef.current) {
                    const c = map.getCenter();
                    onViewportChangeRef.current({
                        longitude: c.lng,
                        latitude: c.lat,
                        zoom: map.getZoom(),
                        bearing: map.getBearing(),
                        pitch: map.getPitch(),
                    });
                }
            });

            map.on('moveend', () => {
                if (onMoveEndRef.current) {
                    const c = map.getCenter();
                    onMoveEndRef.current({
                        longitude: c.lng,
                        latitude: c.lat,
                        zoom: map.getZoom(),
                        bearing: map.getBearing(),
                        pitch: map.getPitch(),
                    });
                }
            });

            map.on('click', (e) => {
                onMapClickRef.current?.(e);
            });

            return () => {
                map.remove();
                mapRef.current = null;
                setIsLoaded(false);
            };
        }, []); // eslint-disable-line react-hooks/exhaustive-deps

        // Update Projection
        useEffect(() => {
            const map = mapRef.current;
            if (!map || !projection) return;

            if (map.isStyleLoaded()) {
                (map as any).setProjection(projection);
            } else {
                map.once('style.load', () => {
                    (map as any).setProjection(projection);
                });
            }
        }, [projection]);

        // Update Interaction Handlers
        useEffect(() => {
            const map = mapRef.current;
            if (!map) return;

            if (dragRotate !== undefined) {
                if (dragRotate) map.dragRotate.enable();
                else map.dragRotate.disable();
            }

            if (touchZoomRotate !== undefined) {
                if (touchZoomRotate) map.touchZoomRotate.enableRotation();
                else map.touchZoomRotate.disableRotation();
            }

            if (touchPitch !== undefined) {
                if (touchPitch) map.touchPitch.enable();
                else map.touchPitch.disable();
            }

            if (maxPitch !== undefined) {
                map.setMaxPitch(maxPitch);
            }
        }, [dragRotate, touchZoomRotate, touchPitch, maxPitch]);

        // Update Padding for Optical Centering (Animated)
        useEffect(() => {
            const map = mapRef.current;
            if (!map || suppressPaddingEffect) return;

            // Preserve initial fly-in animation on first load
            if (isInitialMount.current) {
                isInitialMount.current = false;
                return;
            }

            // STAGGER: Add a small delay to let the UI (Vaul) start its transition 
            // before slamming the main thread with an easeTo camera calculation
            const timeout = setTimeout(() => {
                const map = mapRef.current;
                if (!map) return;
                
                if (isPanelOpen) {
                    const height = map.getContainer().offsetHeight;
                    map.easeTo({
                        padding: { top: 0, bottom: height * 0.5, left: 0, right: 0 },
                        duration: 300,
                        essential: true
                    });
                } else {
                    map.easeTo({
                        padding: { top: 0, bottom: 0, left: 0, right: 0 },
                        duration: 300,
                        essential: true
                    });
                }
            }, 50);

            return () => clearTimeout(timeout);
        }, [isPanelOpen, suppressPaddingEffect]);

        // Update theme — swap tile source only, preserve all custom layers
        useEffect(() => {
            const map = mapRef.current;
            if (!map || !map.isStyleLoaded()) return;

            const layerId = 'carto-tiles-layer';
            const sourceId = 'carto-tiles';
            const newTiles = theme === 'dark' ? DARK_TILES : LIGHT_TILES;

            if (!map.getSource(sourceId)) return;

            // Remove tile layer first, then the source
            if (map.getLayer(layerId)) map.removeLayer(layerId);
            map.removeSource(sourceId);

            // Re-add source with new tiles
            map.addSource(sourceId, {
                type: 'raster',
                tiles: newTiles,
                tileSize: 256,
                attribution: TILE_ATTRIBUTION,
            });

            // Re-add layer at the bottom (before all other layers)
            const styleLayers = map.getStyle().layers;
            const firstLayerId = styleLayers && styleLayers.length > 0 ? styleLayers[0].id : undefined;
            map.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
            }, firstLayerId);
        }, [theme]);

        return (
            <MapContext.Provider value={contextValue}>
                <div ref={containerRef} className={className} style={style}>
                    {isLoaded && children}
                </div>
            </MapContext.Provider>
        );
    },
);

export const Map = React.memo(MapBase, (prev, next) => {
    // Custom comparison to prevent re-renders on high-frequency map movement
    // The Map component only needs a full re-render if its container geometry 
    // or architectural props (theme, projection, interaction toggles) change.
    return (
        prev.theme === next.theme &&
        prev.projection === next.projection &&
        prev.isPanelOpen === next.isPanelOpen &&
        prev.suppressPaddingEffect === next.suppressPaddingEffect &&
        prev.dragRotate === next.dragRotate &&
        prev.touchZoomRotate === next.touchZoomRotate &&
        prev.touchPitch === next.touchPitch &&
        prev.maxPitch === next.maxPitch &&
        prev.className === next.className &&
        prev.style === next.style
    );
});

Map.displayName = 'Map';

// ─── MapMarker ────────────────────────────────────────────────────────────────

interface MapMarkerProps {
    longitude: number;
    latitude: number;
    children?: React.ReactNode;
    draggable?: boolean;
    onClick?: (e: MouseEvent) => void;
    onMouseEnter?: (e: MouseEvent) => void;
    onMouseLeave?: (e: MouseEvent) => void;
    onDragStart?: (lngLat: { lng: number; lat: number }) => void;
    onDrag?: (lngLat: { lng: number; lat: number }) => void;
    onDragEnd?: (lngLat: { lng: number; lat: number }) => void;
}

export const MapMarker: React.FC<MapMarkerProps> = ({
    longitude,
    latitude,
    children,
    draggable = false,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    onDrag,
    onDragEnd,
}) => {
    const { map } = useMap();
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!map) return;

        const el = document.createElement('div');
        el.className = 'mapcn-marker-root';

        const marker = new maplibregl.Marker({
            element: el,
            draggable,
        })
            .setLngLat([longitude, latitude])
            .addTo(map);

        markerRef.current = marker;

        if (draggable) {
            marker.on('dragstart', () => {
                const ll = marker.getLngLat();
                onDragStart?.({ lng: ll.lng, lat: ll.lat });
            });
            marker.on('drag', () => {
                const ll = marker.getLngLat();
                onDrag?.({ lng: ll.lng, lat: ll.lat });
            });
            marker.on('dragend', () => {
                const ll = marker.getLngLat();
                onDragEnd?.({ lng: ll.lng, lat: ll.lat });
            });
        }

        return () => {
            marker.remove();
            markerRef.current = null;
        };
    }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update position
    useEffect(() => {
        markerRef.current?.setLngLat([longitude, latitude]);
    }, [longitude, latitude]);

    // Update draggable
    useEffect(() => {
        markerRef.current?.setDraggable(draggable);
    }, [draggable]);

    // Render children into marker element
    const markerEl = markerRef.current?.getElement();

    if (!markerEl) return null;

    return (
        <MarkerPortal container={markerEl}>
            <div
                ref={elementRef}
                className="mapcn-marker-content"
                onClick={onClick as any}
                onMouseEnter={onMouseEnter as any}
                onMouseLeave={onMouseLeave as any}
            >
                {children}
            </div>
        </MarkerPortal>
    );
};

// ─── MarkerPortal ─────────────────────────────────────────────────────────────

interface MarkerPortalProps {
    container: HTMLElement;
    children: React.ReactNode;
}

const MarkerPortal: React.FC<MarkerPortalProps> = ({ container, children }) => {
    const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalRoot(container);
    }, [container]);

    if (!portalRoot) return null;

    return createPortal(children, portalRoot);
};

// ─── MarkerContent ────────────────────────────────────────────────────────────

interface MarkerContentProps {
    children?: React.ReactNode;
    className?: string;
}

export const MarkerContent: React.FC<MarkerContentProps> = ({ children, className }) => {
    return <div className={`mapcn-marker-content-inner ${className || ''}`.trim()}>{children}</div>;
};
