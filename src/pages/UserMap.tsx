import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { InfrastructureIssue, IssueType } from '../types';
import {
    Play, Pause, AlertCircle, Droplets, Plus, PlusCircle, X, XCircle,
    ThumbsUp, ThumbsDown, Check, CheckCircle, Search, Navigation,
    Layers, ChevronRight, Map as MapIcon, Calendar,
    Trash2, Info, Camera, Trash, AlertTriangle,
    Clock, CheckCircle2, Maximize2, ExternalLink, Shield,
    Sun, Moon
} from 'lucide-react';
import { format } from 'date-fns';
import { clusterIssues } from '../utils/clustering';
import { getVoterId } from '../utils/voterId';

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

const getSelectedLocationIcon = (type: IssueType, zoom: number) => {
    let color = '#22d3ee'; // Default Cyan
    if (type === 'pothole') color = '#fbbf24'; // Amber/Yellow
    if (type === 'water_logging') color = '#3b82f6'; // Blue
    if (type === 'garbage_dump') color = '#ef4444'; // Red

    const size = 20 * Math.pow(1.1, zoom - 16);
    const html = `<div class="selected-location-marker" style="
        background: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 0 4px ${color}66, 0 0 20px ${color}cc;
        animation: pulse 2s infinite;
        cursor: grab;
    "></div>`;

    return L.divIcon({
        html: html,
        className: 'selected-location-icon',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
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

// Component to handle map center updates for locate me feature
const LocateMeHandler = ({ center }: { center: [number, number] | null }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, 18);
        }
    }, [center, map]);
    return null;
};

// Mobile Bottom Panel Component with simple drag
interface MobileBottomPanelProps {
    children: React.ReactNode;
    onClose: () => void;
}

const MobileBottomPanel: React.FC<MobileBottomPanelProps> = ({ children, onClose }) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const [isClosing, setIsClosing] = useState(false);
    const startY = useRef(0);
    const currentY = useRef(0);
    const isAnimating = useRef(false);
    const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

    useEffect(() => {
        const handleResize = () => {
            if (window.visualViewport) {
                setViewportHeight(window.visualViewport.height);
            } else {
                setViewportHeight(window.innerHeight);
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            window.visualViewport.addEventListener('scroll', handleResize);
        }
        window.addEventListener('resize', handleResize);

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
                window.visualViewport.removeEventListener('scroll', handleResize);
            }
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const animateTo = (targetY: number, duration: number = 300) => {
        if (!panelRef.current || isAnimating.current) return;

        isAnimating.current = true;
        const startTransform = parseFloat(panelRef.current.style.transform.replace(/[^\d.-]/g, '') || '0');
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentPos = startTransform + (targetY - startTransform) * easeOut;

            if (panelRef.current) {
                panelRef.current.style.transform = `translateY(${currentPos}px)`;
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                isAnimating.current = false;
                if (targetY >= window.innerHeight * 0.4) {
                    onClose();
                }
            }
        };

        requestAnimationFrame(animate);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isAnimating.current) return;
        startY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isAnimating.current) return;
        currentY.current = e.touches[0].clientY;
        const diff = currentY.current - startY.current;

        if (diff > 0 && panelRef.current) {
            panelRef.current.style.transform = `translateY(${diff}px)`;
        }
    };

    const handleTouchEnd = () => {
        if (isAnimating.current) return;
        const diff = currentY.current - startY.current;
        const threshold = 80;

        if (diff > threshold) {
            animateTo(window.innerHeight * 0.4, 200);
        } else {
            animateTo(0, 250);
        }
    };

    // Calculate how much the keyboard has pushed up the viewport
    const keyboardOffset = window.innerHeight - viewportHeight;

    return (
        <div
            ref={panelRef}
            className={`mobile-bottom-panel ${isClosing ? 'closing' : ''}`}
            style={{
                bottom: `${keyboardOffset}px`,
                height: keyboardOffset > 0 ? '60vh' : '40vh',
                transition: isAnimating.current ? 'none' : 'transform 0.3s ease-out, bottom 0.2s ease-out, height 0.3s ease-out'
            }}
        >
            <div
                className="mobile-bottom-handle"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="mobile-bottom-drag-indicator"></div>
            </div>
            <div className="mobile-bottom-content">
                {children}
            </div>
        </div>
    );
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

interface UserMapProps {
    isAdmin?: boolean;
}

const UserMap: React.FC<UserMapProps> = ({ isAdmin = false }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [issues, setIssues] = useState<InfrastructureIssue[]>([]);
    const [selectedIssue, setSelectedIssue] = useState<InfrastructureIssue | null>(null);
    const [zoom, setZoom] = useState(16);
    const [isLoading, setIsLoading] = useState(false);
    const [reportStep, setReportStep] = useState<'type' | 'location' | 'form' | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (window.innerWidth > 767) {
            const timer = setTimeout(() => {
                setIsMenuOpen(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, []);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['pothole', 'water_logging', 'garbage_dump']);
    const [map, setMap] = useState<L.Map | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('theme') as 'light' | 'dark';
        if (saved) return saved;
        return window.innerWidth <= 767 ? 'light' : 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('light-theme');
            root.classList.remove('dark-theme');
        } else {
            root.classList.add('dark-theme');
            root.classList.remove('light-theme');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [isMobileReportOpen, setIsMobileReportOpen] = useState(false);
    const [isMobileReportClosing, setIsMobileReportClosing] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [adminPassword, setAdminPassword] = useState(sessionStorage.getItem('admin_password') || '');
    const [loginPasswordInput, setLoginPasswordInput] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
    const mobileReportPanelRef = useRef<HTMLDivElement>(null);
    const touchStartY = useRef<number>(0);
    const currentTranslateY = useRef<number>(0);

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

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 767;
            setIsMobile(mobile);
            setTheme(mobile ? 'light' : 'dark');
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                    location: reportForm.location,
                    reportedBy: getVoterId(),
                    magnitude: reportForm.magnitude,
                    ...(reportForm.imageUrl ? { imageUrl: reportForm.imageUrl } : {})
                })
            });
            if (response.ok) {
                setReportStep(null);
                setIsMobileReportOpen(false);
                setReportForm({ type: 'pothole', note: '', imageUrl: '', location: null, magnitude: 5 });
                fetchMapState(new Date());
            } else {
                const data = await response.json().catch(() => ({}));
                alert(`Failed to submit report: ${data.error || 'Server error'}`);
            }
        } catch (error) {
            console.error('Failed to report issue:', error);
            alert('A network error occurred while submitting the report.');
        }
    };

    const handleResolveVote = async (id: string) => {
        try {
            const response = await fetch(`${baseUrl}/api/issue/${id}/resolve-vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voterId: getVoterId() })
            });
            fetchMapState(currentTime);
        } catch (error) {
            console.error('Failed to resolve vote:', error);
        }
    };

    const handleVote = async (id: string, voteType: 'true' | 'false') => {
        try {
            const response = await fetch(`${baseUrl}/api/issue/${id}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vote: voteType,
                    voterId: getVoterId()
                })
            });
            if (response.ok) {
                const data = await response.json();
                if (data.delisted) {
                    setSelectedIssue(null);
                }
                fetchMapState(currentTime);
                // Update selected issue with new vote counts
                if (selectedIssue && selectedIssue.id === id) {
                    setSelectedIssue({
                        ...selectedIssue,
                        votes_true: data.votes_true,
                        votes_false: data.votes_false
                    });
                }
            } else {
                const data = await response.json().catch(() => ({}));
                alert(`Failed to record vote: ${data.error || 'Server error'}`);
            }
        } catch (error) {
            console.error('Failed to vote:', error);
            alert('A network error occurred while voting.');
        }
    };

    const handleApprove = async (id: string) => {
        try {
            const secretToUse = adminPassword || import.meta.env.VITE_ADMIN_SECRET || 'admin';
            const response = await fetch(`${baseUrl}/api/issue/${id}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': secretToUse
                },
                body: JSON.stringify({ adminAction: 'approve' })
            });
            if (response.ok) {
                fetchMapState(currentTime);
                if (selectedIssue && selectedIssue.id === id) {
                    setSelectedIssue({ ...selectedIssue, approved: true });
                }
            } else {
                const error = await response.json().catch(() => ({}));
                alert(`Approve failed: ${error.error || 'Server error'}`);
            }
        } catch (error) {
            console.error('Failed to approve:', error);
            alert(`Network error while approving: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            const secretToUse = adminPassword || import.meta.env.VITE_ADMIN_SECRET || 'admin';
            const response = await fetch(`${baseUrl}/api/issue/${id}/delist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': secretToUse
                },
                body: JSON.stringify({ adminAction: 'delist' })
            });
            if (response.ok) {
                setSelectedIssue(null);
                fetchMapState(currentTime);
            } else {
                const error = await response.json().catch(() => ({}));
                alert(`Remove failed: ${error.error || 'Server error'} (Status: ${response.status})`);
            }
        } catch (error) {
            console.error('Failed to remove:', error);
            alert(`Network error while removing: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const calculateConfidence = (votesTrue: number = 0, votesFalse: number = 0, approved: boolean = false): number => {
        if (approved) return 100;
        const totalVotes = votesTrue + votesFalse;
        if (totalVotes === 0) return 50; // Default 50% when no votes

        // Wilson score interval for confidence calculation
        // This gives a more accurate confidence score, especially with low vote counts
        const z = 1.96; // 95% confidence interval
        const phat = votesTrue / totalVotes;
        const n = totalVotes;

        const numerator = phat + (z * z) / (2 * n) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);
        const denominator = 1 + (z * z) / n;

        return Math.round((numerator / denominator) * 100);
    };

    const toggleType = (type: string) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const handleLocateMe = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation([latitude, longitude]);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Unable to get your location. Please check location permissions.');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    };

    const filteredIssues = useMemo(() => {
        if (!Array.isArray(issues)) return [];
        return issues.filter(issue => selectedTypes.includes(issue.type));
    }, [issues, selectedTypes]);

    const clusteredMarkers = useMemo(() => clusterIssues(filteredIssues), [filteredIssues]);

    const magnitudeLabel = (mag: number) => {
        if (mag <= 3) return 'Low';
        if (mag <= 7) return 'Moderate';
        return 'High';
    };

    return (
        <div className={`map-container ${isAdmin ? 'admin-mode' : ''}`}>
            {/* Admin Login Overlay */}
            {isAdmin && !adminPassword && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 20000,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--glass-surface)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '24px',
                        padding: '40px',
                        width: '100%',
                        maxWidth: '400px',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                    }}>
                        <Shield style={{ color: 'var(--accent)', marginBottom: '20px' }} size={48} />
                        <h2 style={{ color: 'white', marginBottom: '10px', fontSize: '1.5rem' }}>Admin Access</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.9rem' }}>
                            Please enter the administrative password to manage infrastructure reports.
                        </p>
                        <input
                            type="password"
                            placeholder="Admin Password"
                            value={loginPasswordInput}
                            onChange={(e) => setLoginPasswordInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && loginPasswordInput) {
                                    setAdminPassword(loginPasswordInput);
                                    sessionStorage.setItem('admin_password', loginPasswordInput);
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '15px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                color: 'white',
                                marginBottom: '20px',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={() => {
                                if (loginPasswordInput) {
                                    setAdminPassword(loginPasswordInput);
                                    sessionStorage.setItem('admin_password', loginPasswordInput);
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '15px',
                                background: 'var(--accent)',
                                color: 'black',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '700',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Authorize Access
                        </button>
                    </div>
                </div>
            )}

            {isAdmin && adminPassword && (
                <div style={{
                    position: 'fixed',
                    top: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10000,
                    background: '#ef4444',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    pointerEvents: 'none',
                    textTransform: 'uppercase'
                }}>
                    Admin Mode
                </div>
            )}
            {/* Left Sidebar Menu */}
            <div className={`side-menu ${isMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <button className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <div style={{ width: 24, height: 2, background: 'currentColor' }}></div>
                            <div style={{ width: 18, height: 2, background: 'currentColor' }}></div>
                            <div style={{ width: 24, height: 2, background: 'currentColor' }}></div>
                        </div>
                    </button>
                    {/* Logo removed from here */}
                </div>

                <div className="sidebar-scroll-content">
                    <div className="menu-section">
                        <div className="menu-label">FILTERS</div>
                        <div className="filter-group">
                            {[
                                { id: 'pothole', label: 'Potholes', color: '#fbbf24' },
                                { id: 'water_logging', label: 'Water Logging', color: '#3b82f6' },
                                { id: 'garbage_dump', label: 'Garbage Dump', color: '#ef4444' }
                            ].map(type => (
                                <div
                                    key={type.id}
                                    className={`filter-item ${selectedTypes.includes(type.id) ? 'active' : ''}`}
                                    onClick={() => toggleType(type.id)}
                                >
                                    <span
                                        className="filter-dot"
                                        style={{
                                            background: selectedTypes.includes(type.id) ? type.color : undefined,
                                        }}
                                    ></span>
                                    {type.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <button className="report-btn-highlight" onClick={() => {
                        setSelectedIssue(null);
                        setIsMobileReportOpen(false);
                        setReportStep('form');
                    }}>
                        <PlusCircle size={20} /> REPORT ISSUE
                    </button>
                </div>
            </div>

            {/* Fixed Logo for Desktop */}
            <div className="desktop-logo-fixed">
                <div className="logo-icon">IF</div>
                <div>
                    <div className="logo-text">InfraFlux</div>
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

            {/* Desktop Theme Toggle */}
            <button
                className="theme-toggle-desktop"
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Mobile Header with Logo and Hamburger */}
            {!selectedIssue && !reportStep && (
                <>
                    <div className="mobile-header">
                        <div className="mobile-logo">IF</div>
                        <button
                            className={`mobile-hamburger ${isMobileMenuOpen ? 'active' : ''}`}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <div className="hamburger-line"></div>
                            <div className="hamburger-line"></div>
                            <div className="hamburger-line"></div>
                        </button>
                    </div>

                    {/* Mobile Dropdown Menu */}
                    <div className={`mobile-dropdown ${isMobileMenuOpen ? 'open' : ''}`}>
                        <div className="mobile-dropdown-content">
                            <div className="menu-section">
                                <div className="menu-label">FILTERS</div>
                                <div className="mobile-filter-grid">
                                    <button
                                        className={`mobile-filter-item ${selectedTypes.includes('pothole') ? 'active' : ''}`}
                                        onClick={() => {
                                            toggleType('pothole');
                                        }}
                                    >
                                        <div className="filter-dot" style={{ background: '#fbbf24' }}></div>
                                        Potholes
                                    </button>
                                    <button
                                        className={`mobile-filter-item ${selectedTypes.includes('water_logging') ? 'active' : ''}`}
                                        onClick={() => {
                                            toggleType('water_logging');
                                        }}
                                    >
                                        <div className="filter-dot" style={{ background: '#3b82f6' }}></div>
                                        Water
                                    </button>
                                    <button
                                        className={`mobile-filter-item ${selectedTypes.includes('garbage_dump') ? 'active' : ''}`}
                                        onClick={() => {
                                            toggleType('garbage_dump');
                                        }}
                                    >
                                        <div className="filter-dot" style={{ background: '#ef4444' }}></div>
                                        Garbage
                                    </button>
                                </div>
                            </div>

                            <div className="menu-section" style={{ marginTop: '1.5rem' }}>
                                <div className="menu-label">APPEARANCE</div>
                                <button
                                    className="mobile-theme-toggle"
                                    onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                                >
                                    {theme === 'light' ? (
                                        <><Moon size={20} /> Dark Mode</>
                                    ) : (
                                        <><Sun size={20} /> Light Mode</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
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
                    url={theme === 'dark'
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    }
                />
                <MapUpdater center={sector18Center} />
                <ZoomHandler onZoomChange={setZoom} />
                <MapRegister setMap={setMap} />
                <MapClickHandler onMapClick={(loc) => {
                    if ((reportStep === 'form' && !reportForm.location) || (isMobileReportOpen && !reportForm.location)) {
                        setReportForm(prev => ({ ...prev, location: loc }));
                    }
                }} />
                <LocateMeHandler center={userLocation} />

                <ScalingMarkers
                    issues={clusteredMarkers}
                    zoom={zoom}
                    magnitude={5}
                    onSelect={(issue) => {
                        setReportStep(null);
                        setIsMobileReportOpen(false);
                        setSelectedIssue(issue);
                    }}
                />

                {reportForm.location && (reportStep === 'form' || isMobileReportOpen) && (
                    <Marker
                        key={`selected-${zoom}`}
                        position={reportForm.location}
                        icon={getSelectedLocationIcon(reportForm.type, zoom)}
                        draggable={true}
                        eventHandlers={{
                            dragend: (e) => {
                                const marker = e.target;
                                const newPos = marker.getLatLng();
                                setReportForm(prev => ({ ...prev, location: [newPos.lat, newPos.lng] }));
                            }
                        }}
                    />
                )}

                {reportStep === 'location' && (
                    <div style={{ position: 'absolute', top: '7rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1100, background: 'white', color: 'black', padding: '0.75rem 1.5rem', borderRadius: '999px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                        <Navigation size={18} /> Click on map to locate issue
                        <button onClick={() => setReportStep(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={18} /></button>
                    </div>
                )}
            </MapContainer>

            {/* Mobile Bottom Bar with Report Button and Locate Me */}
            {(!selectedIssue && !reportStep && !isMobileReportOpen) && (
                <div className="mobile-bottom-bar">
                    <button
                        className="mobile-report-btn"
                        onClick={() => {
                            setSelectedIssue(null);
                            setReportStep(null);
                            setIsMobileReportOpen(true);
                            setReportForm({ type: 'pothole', note: '', imageUrl: '', location: null, magnitude: 5 });
                        }}
                    >
                        <PlusCircle size={18} />
                        <span>REPORT ISSUE</span>
                    </button>
                    <button
                        className="mobile-locate-btn"
                        onClick={handleLocateMe}
                        aria-label="Locate me"
                    >
                        <Navigation size={18} />
                    </button>
                </div>
            )}

            {/* Mobile Issue Details Panel - Bottom 40% */}
            {isMobile && selectedIssue && !reportStep && (
                <MobileBottomPanel
                    onClose={() => setSelectedIssue(null)}
                >
                    <div className="mobile-detail-content">
                        <div className="mobile-detail-header">
                            <h2 className="mobile-detail-title">
                                {selectedIssue.type === 'water_logging' ? 'Water Logging' : selectedIssue.type === 'garbage_dump' ? 'Garbage Dump' : selectedIssue.type === 'pothole' ? 'Pothole' : String(selectedIssue.type || 'Issue').replace(/_/g, ' ')}
                            </h2>
                            <div className="mobile-confidence-badge">
                                {calculateConfidence(selectedIssue.votes_true, selectedIssue.votes_false, selectedIssue.approved)}% <span className="confidence-text">Confidence</span>
                            </div>
                        </div>

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
                                                    return isNaN(d.getTime()) ? 'Feb 4, 2026' : format(d, 'MMM d, yyyy');
                                                } catch (e) {
                                                    return 'Feb 10, 2026';
                                                }
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {selectedIssue.note && (
                            <div className="menu-section">
                                <div className="menu-label">DESCRIPTION</div>
                                <div className="description-box">
                                    {selectedIssue.note}
                                </div>
                            </div>
                        )}

                        {selectedIssue.images && selectedIssue.images.length > 0 && (
                            <div className="menu-section">
                                <div className="menu-label">EVIDENCE</div>
                                <div className="evidence-box">
                                    {selectedIssue.images.map((img, idx) => (
                                        <div key={idx} style={{ position: 'relative', width: '100%' }}>
                                            <img
                                                src={img}
                                                alt={`Evidence ${idx + 1}`}
                                                className="mobile-evidence-img"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    if (target.nextSibling) {
                                                        (target.nextSibling as HTMLElement).style.display = 'flex';
                                                    }
                                                }}
                                            />
                                            <div style={{
                                                display: 'none',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '2rem',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '12px',
                                                color: 'var(--text-muted)',
                                                fontSize: '0.8rem',
                                                textAlign: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <ExternalLink size={20} />
                                                <div>Image failed to load</div>
                                                <a href={img} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                                                    View on External Site
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mobile-detail-footer">
                            {isAdmin ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', minHeight: '48px', padding: '0 10px' }}>
                                    <button
                                        className="vote-pill-btn active-btn"
                                        style={{
                                            background: selectedIssue.approved ? '#6b7280' : '#10b981',
                                            color: 'white',
                                            cursor: selectedIssue.approved ? 'not-allowed' : 'pointer',
                                            opacity: selectedIssue.approved ? 0.7 : 1
                                        }}
                                        onClick={() => selectedIssue.id && !selectedIssue.approved && handleApprove(selectedIssue.id)}
                                        disabled={selectedIssue.approved}
                                    >
                                        <Check size={18} />
                                        <span>{selectedIssue.approved ? 'APPROVED' : 'APPROVE'}</span>
                                    </button>
                                    <button
                                        className="vote-pill-btn fixed-btn"
                                        style={{ background: '#ef4444', color: 'white' }}
                                        onClick={() => selectedIssue.id && handleRemove(selectedIssue.id)}
                                    >
                                        <Trash size={18} />
                                        <span>REMOVE</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="vote-pill">
                                    <button
                                        className="vote-pill-btn active-btn"
                                        onClick={() => selectedIssue.id && handleVote(selectedIssue.id, 'true')}
                                    >
                                        <XCircle size={18} />
                                        <span>ACTIVE</span>
                                    </button>
                                    <div className="vote-pill-separator"></div>
                                    <button
                                        className="vote-pill-btn fixed-btn"
                                        onClick={() => selectedIssue.id && handleVote(selectedIssue.id, 'false')}
                                    >
                                        <CheckCircle size={18} />
                                        <span>FIXED IT</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </MobileBottomPanel>
            )}

            {/* Mobile Report Form Panel - Bottom 40% */}
            {isMobileReportOpen && (
                <MobileBottomPanel
                    onClose={() => {
                        setIsMobileReportOpen(false);
                        setReportForm({ type: 'pothole', note: '', imageUrl: '', location: null, magnitude: 5 });
                    }}
                >
                    <div className="mobile-report-content">
                        {/* Issue Type Dropdown */}
                        <div className="mobile-report-section">
                            <label className="mobile-report-label">Issue Type</label>
                            <select
                                className="mobile-report-select"
                                value={reportForm.type}
                                onChange={(e) => setReportForm(prev => ({ ...prev, type: e.target.value as IssueType }))}
                            >
                                <option value="pothole">Pothole</option>
                                <option value="water_logging">Water Logging</option>
                                <option value="garbage_dump">Garbage Dump</option>
                            </select>
                        </div>

                        {/* Location Coordinates */}
                        <div className="mobile-report-section">
                            <label className="mobile-report-label">Location</label>
                            <div className="mobile-report-coordinates">
                                {reportForm.location ? (
                                    <span>{reportForm.location[0].toFixed(6)}, {reportForm.location[1].toFixed(6)}</span>
                                ) : (
                                    <span className="mobile-report-coordinates-placeholder">Tap on map to select location</span>
                                )}
                            </div>
                        </div>

                        {/* Magnitude Selection */}
                        <div className="mobile-report-section">
                            <label className="mobile-report-label">Magnitude</label>
                            <div className="magnitude-group">
                                {[
                                    { value: 3, label: 'Low Impact' },
                                    { value: 5, label: 'Moderate' },
                                    { value: 10, label: 'High Impact' }
                                ].map((m) => (
                                    <button
                                        key={m.value}
                                        className={`magnitude-btn ${reportForm.magnitude === m.value ? 'selected' : ''}`}
                                        data-value={m.value}
                                        onClick={() => setReportForm(prev => ({ ...prev, magnitude: m.value }))}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mobile-report-section">
                            <label className="mobile-report-label">Description</label>
                            <textarea
                                className="mobile-report-textarea"
                                placeholder="Describe the issue..."
                                value={reportForm.note}
                                onChange={(e) => setReportForm(prev => ({ ...prev, note: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        {/* Evidence */}
                        <div className="mobile-report-section">
                            <label className="mobile-report-label">Evidence</label>
                            <input
                                type="text"
                                className="mobile-report-evidence-url"
                                placeholder="Paste image URL here..."
                                value={reportForm.imageUrl}
                                onChange={(e) => setReportForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                            />
                            {reportForm.imageUrl && (
                                <div className="evidence-preview-container">
                                    <img
                                        src={reportForm.imageUrl}
                                        alt="Preview"
                                        className="evidence-preview-img"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                        onLoad={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'block';
                                        }}
                                    />
                                    <button
                                        className="preview-remove-btn"
                                        onClick={() => setReportForm(prev => ({ ...prev, imageUrl: '' }))}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            className="mobile-report-submit"
                            onClick={handleReport}
                            disabled={!reportForm.location}
                        >
                            <PlusCircle size={20} />
                            Submit Report
                        </button>
                    </div>
                </MobileBottomPanel>
            )
            }

            {/* Right Sidebar - Shows Issue Details or Report Form */}
            <div className={`detail-sidebar ${(!isMobile && (selectedIssue || reportStep)) ? 'open' : ''}`}>
                {/* Issue Details View */}
                {selectedIssue && !reportStep && (
                    <>
                        <button className="close-btn" onClick={() => setSelectedIssue(null)} style={{ top: '1.65rem' }}>
                            <X size={18} />
                        </button>

                        <div className="detail-header" style={{ position: 'relative' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                paddingRight: '50px'
                            }}>
                                <h2 className="detail-title" style={{ margin: 0, fontSize: '2rem' }}>
                                    {selectedIssue.type === 'water_logging' ? 'Water Logging' : selectedIssue.type === 'garbage_dump' ? 'Garbage Dump' : selectedIssue.type === 'pothole' ? 'Pothole' : String(selectedIssue.type || 'Issue').replace(/_/g, ' ')}
                                </h2>
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

                            {selectedIssue.note && (
                                <div className="menu-section">
                                    <div className="menu-label">DESCRIPTION</div>
                                    <div className="description-box">
                                        {selectedIssue.note}
                                    </div>
                                </div>
                            )}

                            {selectedIssue.images && selectedIssue.images.length > 0 && (
                                <div className="menu-section">
                                    <div className="menu-label">EVIDENCE</div>
                                    <div className="evidence-box">
                                        {selectedIssue.images.map((img, idx) => (
                                            <div key={idx} style={{ position: 'relative', width: '100%' }}>
                                                <img
                                                    key={idx}
                                                    src={img}
                                                    alt={`Evidence ${idx + 1}`}
                                                    className="mobile-evidence-img"
                                                    style={{ marginBottom: '0.5rem' }}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        if (target.nextSibling) {
                                                            (target.nextSibling as HTMLElement).style.display = 'flex';
                                                        }
                                                    }}
                                                />
                                                <div style={{
                                                    display: 'none',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '2rem',
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid var(--border-light)',
                                                    borderRadius: '12px',
                                                    color: 'var(--text-muted)',
                                                    fontSize: '0.9rem',
                                                    textAlign: 'center',
                                                    gap: '0.5rem',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    <ExternalLink size={24} />
                                                    <div>Evidence image failed to load</div>
                                                    <a href={img} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                                                        Open Evidence Source
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="sidebar-footer">
                            {isAdmin ? (
                                <div className="vote-pill-container" style={{ width: '100%' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', minHeight: '48px', padding: '0 10px' }}>
                                        <button
                                            className="vote-pill-btn active-btn"
                                            style={{
                                                background: selectedIssue.approved ? '#6b7280' : '#10b981',
                                                color: 'white',
                                                cursor: selectedIssue.approved ? 'not-allowed' : 'pointer',
                                                opacity: selectedIssue.approved ? 0.7 : 1
                                            }}
                                            onClick={() => selectedIssue.id && !selectedIssue.approved && handleApprove(selectedIssue.id)}
                                            disabled={selectedIssue.approved}
                                        >
                                            <Check size={18} />
                                            <span>{selectedIssue.approved ? 'APPROVED' : 'APPROVE'}</span>
                                        </button>
                                        <button
                                            className="vote-pill-btn fixed-btn"
                                            style={{ background: '#ef4444', color: 'white' }}
                                            onClick={() => selectedIssue.id && handleRemove(selectedIssue.id)}
                                        >
                                            <Trash size={18} />
                                            <span>REMOVE</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="vote-pill-container">
                                    <div className="vote-pill">
                                        <button
                                            className="vote-pill-btn active-btn"
                                            onClick={() => selectedIssue.id && handleVote(selectedIssue.id, 'true')}
                                        >
                                            <XCircle size={18} />
                                            <span>ACTIVE</span>
                                        </button>
                                        <div className="vote-pill-separator"></div>
                                        <button
                                            className="vote-pill-btn fixed-btn"
                                            onClick={() => selectedIssue.id && handleVote(selectedIssue.id, 'false')}
                                        >
                                            <CheckCircle size={18} />
                                            <span>FIXED</span>
                                        </button>
                                    </div>

                                    {/* Confidence Percentage */}
                                    <div className="desktop-confidence-display">
                                        {calculateConfidence(selectedIssue.votes_true, selectedIssue.votes_false, selectedIssue.approved)}%
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Consolidated Report Form */}
                {reportStep === 'form' && (
                    <>
                        <button className="close-btn" onClick={() => setReportStep(null)} style={{ top: '1.65rem' }}>
                            <X size={18} />
                        </button>

                        <div className="detail-header">
                            <h2 className="detail-title">Report Issue</h2>
                            <div className="detail-subtitle">Fill in the details to report an issue</div>
                        </div>

                        <div className="sidebar-scroll-content">
                            {/* Issue Type Selection */}
                            <div className="menu-section">
                                <div className="menu-label">ISSUE TYPE</div>
                                <div className="filter-group">
                                    {[
                                        { id: 'pothole', label: 'Pothole', icon: <AlertCircle size={20} />, color: '#fbbf24' },
                                        { id: 'water_logging', label: 'Water', icon: <Droplets size={20} />, color: '#3b82f6' },
                                        { id: 'garbage_dump', label: 'Garbage', icon: <Trash2 size={20} />, color: '#ef4444' }
                                    ].map(t => (
                                        <div
                                            key={t.id}
                                            className={`checkbox-label ${reportForm.type === t.id ? 'selected' : ''}`}
                                            onClick={() => {
                                                setReportForm(prev => ({ ...prev, type: t.id as IssueType }));
                                            }}
                                            style={{
                                                background: reportForm.type === t.id ? `${t.color}20` : undefined,
                                                borderColor: reportForm.type === t.id ? t.color : undefined
                                            }}
                                        >
                                            <div style={{ color: t.color }}>{t.icon}</div>
                                            <div style={{ fontWeight: 600 }}>{t.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Magnitude Selection */}
                            <div className="menu-section">
                                <div className="menu-label">MAGNITUDE</div>
                                <div className="magnitude-group">
                                    {[
                                        { value: 3, label: 'Low Impact' },
                                        { value: 5, label: 'Moderate' },
                                        { value: 10, label: 'High Impact' }
                                    ].map((m) => (
                                        <button
                                            key={m.value}
                                            className={`magnitude-btn ${reportForm.magnitude === m.value ? 'selected' : ''}`}
                                            data-value={m.value}
                                            onClick={() => setReportForm(prev => ({ ...prev, magnitude: m.value }))}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Location Selection */}
                            <div className="menu-section">
                                <div className="menu-label">LOCATION</div>
                                <div
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: '12px',
                                        padding: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => { }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        background: reportForm.location ? 'rgba(34, 211, 238, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: reportForm.location ? 'var(--accent)' : 'var(--text-muted)'
                                    }}>
                                        <Navigation size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                            {reportForm.location ? 'Location Selected' : 'Click on Map'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                                            {reportForm.location
                                                ? `${reportForm.location[0].toFixed(4)}, ${reportForm.location[1].toFixed(4)} (drag marker to adjust)`
                                                : 'Select location by clicking on the map'
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="menu-section">
                                <div className="menu-label">DESCRIPTION</div>
                                <textarea
                                    className="note-bubble"
                                    style={{
                                        width: '100%',
                                        height: '100px',
                                        border: '1px solid var(--border-light)',
                                        resize: 'none',
                                        padding: '1rem',
                                        fontStyle: 'normal',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '12px',
                                        fontSize: '0.9rem'
                                    }}
                                    placeholder="Describe the severity or specific details..."
                                    value={reportForm.note}
                                    onChange={e => setReportForm(prev => ({ ...prev, note: e.target.value }))}
                                />
                            </div>

                            {/* Evidence */}
                            <div className="menu-section">
                                <div className="menu-label">EVIDENCE</div>
                                <input
                                    type="text"
                                    className="note-bubble"
                                    style={{
                                        width: '100%',
                                        height: '52px',
                                        border: '1px solid var(--border-light)',
                                        padding: '1rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontFamily: 'inherit',
                                        fontSize: '0.9rem',
                                        marginBottom: '0.5rem'
                                    }}
                                    placeholder="Paste image URL here..."
                                    value={reportForm.imageUrl}
                                    onChange={(e) => setReportForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                                />
                                {reportForm.imageUrl && (
                                    <div className="evidence-preview-container">
                                        <img
                                            src={reportForm.imageUrl}
                                            alt="Preview"
                                            className="evidence-preview-img"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                            onLoad={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'block';
                                            }}
                                        />
                                        <button
                                            className="preview-remove-btn"
                                            onClick={() => setReportForm(prev => ({ ...prev, imageUrl: '' }))}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="sidebar-footer">
                            <button
                                className="btn-resolve-premium"
                                onClick={handleReport}
                                disabled={!reportForm.location}
                                style={{
                                    background: reportForm.location ? 'var(--accent)' : 'rgba(128, 128, 128, 0.3)',
                                    color: reportForm.location ? '#000' : '#666',
                                    cursor: reportForm.location ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Submit Report <ChevronRight size={18} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div >
    );
};

export default UserMap;
