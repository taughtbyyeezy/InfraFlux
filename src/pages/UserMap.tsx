import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { InfrastructureIssue, IssueType } from '../types';
import {
    Play, Pause, AlertCircle, Droplets, Plus, X,
    ThumbsUp, ThumbsDown, Search, Navigation,
    Layers, ChevronRight, Map as MapIcon, Calendar,
    Trash2, Info, Camera, Trash, AlertTriangle,
    Clock, CheckCircle2, Maximize2
} from 'lucide-react';
import { format } from 'date-fns';
import { clusterIssues } from '../utils/clustering';

const getIcon = (type: string, status: string, zoom: number, magnitude: number = 8, approved: boolean = false) => {
    let color = '#22d3ee'; // Default Cyan

    if (type === 'pothole') color = '#fbbf24'; // Amber
    if (type === 'water_logging') color = '#3b82f6'; // Blue
    if (type === 'garbage_dump') color = '#ef4444'; // Red
    if (status === 'resolved') color = '#22c55e'; // Green

    const size = 16 * Math.pow(1.1, zoom - 16);

    const html = `<div class="glow-dot" style="background: ${color}; width: ${size}px; height: ${size}px;"></div>`;

    return L.divIcon({
        html: html,
        className: 'issue-icon',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, 0],
    });
};

const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
};

const ZoomHandler = ({ onZoomChange }: { onZoomChange: (zoom: number) => void }) => {
    const map = useMapEvents({
        zoomend: () => {
            onZoomChange(map.getZoom());
        },
    });
    return null;
};

const MapRegister = ({ setMap }: { setMap: (map: L.Map) => void }) => {
    const map = useMap();
    useEffect(() => {
        setMap(map);
    }, [map, setMap]);
    return null;
};

const MapClickHandler = ({ onMapClick }: { onMapClick: (latlng: [number, number]) => void }) => {
    useMapEvents({
        click: (e) => {
            onMapClick([e.latlng.lat, e.latlng.lng]);
        },
        locationerror: (e) => {
            console.error('Location error:', e.message);
            alert(`Location access failed: ${e.message}`);
        }
    });
    return null;
};

const ScalingMarkers = ({
    issues,
    zoom,
    magnitude,
    onSelect
}: {
    issues: InfrastructureIssue[],
    zoom: number,
    magnitude: number,
    onSelect: (issue: InfrastructureIssue) => void
}) => {
    return (
        <>
            {issues.filter(issue => issue.status !== 'resolved').map((issue) => (
                <Marker
                    key={issue.id}
                    position={issue.location}
                    icon={getIcon(issue.type, issue.status, zoom, issue.magnitude || 5, issue.approved)}
                    eventHandlers={{
                        click: () => onSelect(issue),
                    }}
                />
            ))}
        </>
    );
};

const sector18Center: [number, number] = [28.1711, 76.6211];
const rewariBounds: [[number, number], [number, number]] = [
    [27.9, 76.2],
    [28.5, 76.9]
];

const UserMap = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [issues, setIssues] = useState<InfrastructureIssue[]>([]);
    const [selectedIssue, setSelectedIssue] = useState<InfrastructureIssue | null>(null);
    const [zoom, setZoom] = useState(16);
    const [isLoading, setIsLoading] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const [isPickingLocation, setIsPickingLocation] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['pothole', 'garbage_dump']);
    const [isSelectingType, setIsSelectingType] = useState(false);
    const [map, setMap] = useState<L.Map | null>(null);

    const [reportForm, setReportForm] = useState({
        type: 'pothole' as IssueType,
        note: '',
        imageUrl: '',
        location: null as [number, number] | null,
        magnitude: 5
    });

    const baseUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

    const fetchMapState = async (time: Date) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${baseUrl}/api/map-state?timestamp=${time.toISOString()}`);
            const data = await response.json();
            setIssues(Array.isArray(data.issues) ? data.issues : []);
        } catch (error) {
            console.error('Failed to fetch map state:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMapState(currentTime);
    }, [currentTime]);

    const handleReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportForm.location) return;

        try {
            const response = await fetch(`${baseUrl}/api/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: reportForm.type,
                    note: reportForm.note,
                    imageUrl: reportForm.imageUrl,
                    location: reportForm.location,
                    reportedBy: 'Citizen',
                    magnitude: reportForm.magnitude
                })
            });
            if (response.ok) {
                setIsReporting(false);
                setReportForm({ type: 'pothole', note: '', imageUrl: '', location: null, magnitude: 5 });
                fetchMapState(new Date());
            }
        } catch (error) {
            console.error('Failed to report issue:', error);
        }
    };

    const handleResolveVote = async (id: string) => {
        try {
            await fetch(`${baseUrl}/api/issue/${id}/resolve-vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            fetchMapState(currentTime);
        } catch (error) {
            console.error('Failed to resolve vote:', error);
        }
    };

    const toggleType = (type: string) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const filteredIssues = useMemo(() => {
        if (!Array.isArray(issues)) return [];
        return issues.filter(issue => selectedTypes.includes(issue.type));
    }, [issues, selectedTypes]);

    const clusteredMarkers = useMemo(() => clusterIssues(filteredIssues), [filteredIssues]);

    const magnitudeLabel = (mag: number) => {
        if (mag <= 3) return 'Minor';
        if (mag <= 7) return 'Moderate';
        return 'Severe';
    };

    return (
        <div className="map-container">
            {/* Left Sidebar Menu */}
            <div className={`side-menu ${isMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <button className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <div style={{ width: 24, height: 2, background: 'white' }}></div>
                            <div style={{ width: 18, height: 2, background: 'white' }}></div>
                            <div style={{ width: 24, height: 2, background: 'white' }}></div>
                        </div>
                    </button>
                    <div className="logo-container">
                        <div className="logo-icon">U</div>
                        <div>
                            <div className="logo-text">UrbanFix</div>
                            <div className="logo-subtitle">Live Hub • Rewari</div>
                        </div>
                    </div>
                </div>

                <div className="sidebar-scroll-content">
                    <div className="menu-section">
                        <div className="menu-label">FILTERS</div>
                        <div className="filter-group">
                            {[
                                { id: 'pothole', label: 'Potholes' },
                                { id: 'water_logging', label: 'Water Logging' },
                                { id: 'garbage_dump', label: 'Garbage Dump' }
                            ].map(type => (
                                <div
                                    key={type.id}
                                    className={`filter-item ${selectedTypes.includes(type.id) ? 'active' : ''}`}
                                    onClick={() => toggleType(type.id)}
                                >
                                    <span className="filter-dot"></span>
                                    {type.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <button className="report-btn-highlight" onClick={() => {
                        setIsMenuOpen(false);
                        setIsSelectingType(true);
                    }}>
                        <Plus size={20} /> REPORT ISSUE
                    </button>
                </div>
            </div>

            {/* Floating Hamburger for when menu is closed */}
            {!isMenuOpen && (
                <button className="floating-hamburger" onClick={() => setIsMenuOpen(true)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ width: 24, height: 2, background: 'white' }}></div>
                        <div style={{ width: 18, height: 2, background: 'white' }}></div>
                        <div style={{ width: 24, height: 2, background: 'white' }}></div>
                    </div>
                </button>
            )}

            <MapContainer
                center={sector18Center}
                zoom={zoom}
                scrollWheelZoom={true}
                zoomControl={false}
                maxBounds={rewariBounds}
                minZoom={12}
                maxBoundsViscosity={1.0}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <MapUpdater center={sector18Center} />
                <ZoomHandler onZoomChange={setZoom} />
                <MapRegister setMap={setMap} />
                <MapClickHandler onMapClick={(loc) => {
                    if (isPickingLocation) {
                        setReportForm(prev => ({ ...prev, location: loc }));
                        setIsReporting(true);
                        setIsPickingLocation(false);
                    }
                }} />

                <ScalingMarkers
                    issues={clusteredMarkers}
                    zoom={zoom}
                    magnitude={5}
                    onSelect={setSelectedIssue}
                />

                {isPickingLocation && (
                    <div style={{ position: 'absolute', top: '7rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1100, background: 'white', color: 'black', padding: '0.75rem 1.5rem', borderRadius: '999px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                        <Navigation size={18} /> Click on map to locate issue
                        <button onClick={() => setIsPickingLocation(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={18} /></button>
                    </div>
                )}
            </MapContainer>

            {/* Type Selection Overlay during Reporting */}
            {isSelectingType && (
                <div className="modal-overlay">
                    <div className="type-select-overlay">
                        <button className="overlay-close" onClick={() => setIsSelectingType(false)}><X size={20} /></button>
                        <div className="menu-label">Select Issue Type</div>
                        <div className="filter-group">
                            {[
                                { id: 'pothole', label: 'Pothole', icon: <AlertCircle size={20} /> },
                                { id: 'water_logging', label: 'Water Logging', icon: <Droplets size={20} /> },
                                { id: 'garbage_dump', label: 'Garbage Dump', icon: <Trash2 size={20} /> }
                            ].map(t => (
                                <div
                                    key={t.id}
                                    className="checkbox-label"
                                    onClick={() => {
                                        setReportForm(prev => ({ ...prev, type: t.id as IssueType }));
                                        setIsSelectingType(false);
                                        setIsPickingLocation(true);
                                    }}
                                >
                                    <div style={{ color: 'var(--accent)' }}>{t.icon}</div>
                                    <div style={{ fontWeight: 600 }}>{t.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Right Detail Sidebar */}
            <div className={`detail-sidebar ${selectedIssue ? 'open' : ''}`}>
                {selectedIssue && (
                    <>
                        <button className="close-btn" onClick={() => setSelectedIssue(null)}>
                            <X size={18} />
                        </button>

                        <div className="detail-header">
                            <h2 className="detail-title">
                                {String(selectedIssue.type || 'Issue').replace(/_/g, ' ')}
                            </h2>
                            <div className="case-id">
                                Case #{String(selectedIssue.id || '').split('_').pop()?.slice(0, 8).toUpperCase()}
                            </div>
                        </div>

                        <div className="sidebar-scroll-content">

                            <div className="menu-section">
                                <div className="menu-label">DETAILS</div>
                                <div className="info-card-list">
                                    <div className="info-card">
                                        <div className="info-card-icon">
                                            <div className="status-dot-outer">
                                                <div className="status-dot-inner"></div>
                                            </div>
                                        </div>
                                        <div className="info-card-content">
                                            <div className="info-card-label">CURRENT STATUS</div>
                                            <div className="info-card-value">In Review</div>
                                        </div>
                                        <div className="status-badge-active">ACTIVE</div>
                                    </div>

                                    <div className="info-card">
                                        <div className="info-card-icon">
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div className="info-card-content">
                                            <div className="info-card-label">MAGNITUDE</div>
                                            <div className="info-card-value">
                                                {magnitudeLabel(Number(selectedIssue.magnitude) || 5)} Impact
                                            </div>
                                        </div>
                                    </div>

                                    <div className="info-card">
                                        <div className="info-card-icon">
                                            <Clock size={18} />
                                        </div>
                                        <div className="info-card-content">
                                            <div className="info-card-label">REPORTED DATE</div>
                                            <div className="info-card-value">
                                                {(() => {
                                                    try {
                                                        const d = selectedIssue.createdAt ? new Date(selectedIssue.createdAt) : new Date();
                                                        return isNaN(d.getTime()) ? 'Feb 4, 2026 • 14:20 PM' : format(d, 'MMM d, yyyy • HH:mm a');
                                                    } catch (e) {
                                                        return 'Feb 4, 2026 • 14:20 PM';
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="menu-section">
                                <div className="menu-label">DESCRIPTION</div>
                                <div className="description-box">
                                    This is the description of the issue that is stated above and it can have details such as how wide is the pothole or the severity of the water logging or any special details related to any issue which cannot be directly stored in the database.
                                </div>
                            </div>

                            <div className="menu-section">
                                <div className="menu-label">EVIDENCE</div>
                                <div className="evidence-box">
                                    <div className="evidence-placeholder"></div>
                                </div>
                            </div>
                        </div>

                        <div className="sidebar-footer">
                            <button
                                className="btn-resolve-premium"
                                onClick={() => {
                                    if (selectedIssue.id) handleResolveVote(selectedIssue.id);
                                    setSelectedIssue(null);
                                }}
                            >
                                <CheckCircle2 size={20} /> Mark as Resolved
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Final Report Modal */}
            {isReporting && (
                <div className="modal-overlay">
                    <div className="detail-modal report-modal">
                        <button className="close-btn" onClick={() => setIsReporting(false)}><X size={18} /></button>

                        <div className="detail-header">
                            <h2 className="detail-title">Finalize Report</h2>
                            <div className="detail-subtitle">Location pinned. Add details & evidence.</div>
                        </div>

                        <div className="detail-body">
                            <div className="grid-label" style={{ marginBottom: '0.5rem' }}>Description</div>
                            <textarea
                                className="note-bubble"
                                style={{ width: '100%', height: '100px', border: 'none', resize: 'none', marginBottom: '1.5rem', padding: '1rem', fontStyle: 'normal' }}
                                placeholder="Describe the severity or specific details..."
                                value={reportForm.note}
                                onChange={e => setReportForm(prev => ({ ...prev, note: e.target.value }))}
                            />

                            <div className="upload-area">
                                <Camera size={32} color="var(--text-dim)" style={{ marginBottom: '0.5rem' }} />
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Upload Photo</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>JPEG or PNG up to 10MB</div>
                            </div>
                        </div>

                        <div className="action-bar">
                            <button className="btn-primary" onClick={handleReport}>
                                Submit Report <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMap;
