import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { InfrastructureIssue, IssueType } from '../types';
import { Navigation, PlusCircle, Sun, Moon } from 'lucide-react';
import { clusterIssues } from '../utils/clustering';
import { getVoterId } from '../utils/voterId';
import { useToast } from '../contexts/ToastContext';
import { MapLoadingOverlay } from '../components/Skeleton';
import { hapticButton, hapticSuccess } from '../utils/haptic';
import {
    MapUpdater,
    ZoomHandler,
    MapRegister,
    MapClickHandler,
    LocateMeHandler,
    ScalingMarkers,
    getSelectedLocationIcon,
    MobileBottomPanel,
    FilterSidebar,
    MobileHeader,
    VoteButtons,
    IssueDetails,
    AdminLoginOverlay,
    ReportForm
} from '../components';
import { DonateModal } from '../components/ui/DonateModal';


const sector18Center: [number, number] = [28.1711, 76.6211];

interface UserMapProps {
    isAdmin?: boolean;
}

const UserMap: React.FC<UserMapProps> = ({ isAdmin = false }) => {
    const { addToast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [issues, setIssues] = useState<InfrastructureIssue[]>([]);
    const [selectedIssue, setSelectedIssue] = useState<InfrastructureIssue | null>(null);
    const [zoom, setZoom] = useState(16);
    const [isLoading, setIsLoading] = useState(false);
    const [reportStep, setReportStep] = useState<'form' | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['pothole', 'water_logging', 'garbage_dump']);
    const [map, setMap] = useState<L.Map | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('theme') as 'light' | 'dark';
        if (saved) return saved;
        return window.innerWidth < 768 ? 'light' : 'dark';
    });
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [isMobileReportOpen, setIsMobileReportOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [adminPassword, setAdminPassword] = useState(sessionStorage.getItem('admin_password') || '');
    const [loginPasswordInput, setLoginPasswordInput] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
    const [votingIssueId, setVotingIssueId] = useState<string | null>(null);
    const [votingType, setVotingType] = useState<'true' | 'false' | null>(null);

    const [reportForm, setReportForm] = useState({
        type: 'pothole' as IssueType,
        note: '',
        imageUrl: '',
        imageFile: null as File | null,
        location: null as [number, number] | null,
        magnitude: 5,
        honeypot: '',
        userLocation: null as [number, number] | null
    });
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);


    const baseUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

    // Initialize menu open on desktop
    useEffect(() => {
        if (window.innerWidth > 767) {
            const timer = setTimeout(() => setIsMenuOpen(true), 500);
            return () => clearTimeout(timer);
        }
    }, []);

    // Theme effect
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

    // Window resize handler
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 767);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [hasInitialCentered, setHasInitialCentered] = useState(false);

    // Fetch map data
    const fetchMapState = async (time: Date) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${baseUrl}/api/map-state?timestamp=${time.toISOString()}`);
            const data = await response.json();
            setIssues(Array.isArray(data.issues) ? data.issues : []);

            // Handle IP-based initial centering
            if (!hasInitialCentered && data.userDefaultLocation && map) {
                const [lat, lng] = data.userDefaultLocation;
                map.setView([lat, lng], 13); // Zoom out slightly for city-level view
                setHasInitialCentered(true);
            }
        } catch (error) {
            console.error('Failed to fetch map state:', error);
            addToast('Failed to fetch map data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMapState(currentTime);
    }, [currentTime]);

    const getGeoErrorMessage = (error: GeolocationPositionError) => {
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

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            addToast('Geolocation is not supported by your browser', 'warning');
            return;
        }

        if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
            addToast('Warning: Geolocation usually requires HTTPS. Please use https:// or test on localhost.', 'warning');
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        const success = (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;
            setReportForm(prev => ({ ...prev, location: [latitude, longitude] }));
            if (map) {
                map.setView([latitude, longitude], 18);
            }
            hapticSuccess();
            addToast('Location found successfully', 'success');
        };

        const error = (err: GeolocationPositionError) => {
            console.error('Geolocation error:', err);
            if (err.code === err.TIMEOUT && options.enableHighAccuracy) {
                navigator.geolocation.getCurrentPosition(success, (secondErr) => {
                    addToast(`Failed to get location: ${getGeoErrorMessage(secondErr)}`, 'error');
                }, { ...options, enableHighAccuracy: false, timeout: 5000 });
                return;
            }
            addToast(`Failed to get location: ${getGeoErrorMessage(err)}`, 'error');
        };

        navigator.geolocation.getCurrentPosition(success, error, options);
    };

    const handleReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportForm.location) {
            addToast('Please select a location on the map', 'warning');
            return;
        }

        // Mandatory photo for High Severity (Magnitude > 7)
        if (reportForm.magnitude > 7 && !reportForm.imageFile) {
            addToast('High severity reports require photo evidence. Please upload an photo or decrease severity.', 'error');
            return;
        }

        let finalImageUrl = '';

        setIsSubmitting(true);
        try {
            // Upload to ImgBB only on final submit
            if (reportForm.imageFile) {
                const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;
                if (!IMGBB_API_KEY) {
                    addToast('ImgBB API key is missing', 'error');
                    setIsSubmitting(false);
                    return;
                }

                setUploadProgress(0);

                finalImageUrl = await new Promise<string>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    const formData = new FormData();
                    formData.append('image', reportForm.imageFile!, `report_${Date.now()}.jpg`);

                    xhr.upload.addEventListener('progress', (event) => {
                        if (event.lengthComputable) {
                            const percent = Math.round((event.loaded / event.total) * 100);
                            setUploadProgress(percent);
                        }
                    });

                    xhr.addEventListener('load', () => {
                        try {
                            const result = JSON.parse(xhr.responseText);
                            if (result.success) {
                                resolve(result.data.url);
                            } else {
                                reject(new Error(result.error?.message || 'Upload failed'));
                            }
                        } catch (e) {
                            reject(new Error('Failed to parse ImgBB response'));
                        }
                    });

                    xhr.addEventListener('error', () => reject(new Error('Network error')));
                    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

                    xhr.open('POST', `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`);
                    xhr.send(formData);
                });
            }

            const response = await fetch(`${baseUrl}/api/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: reportForm.type,
                    note: reportForm.note,
                    location: reportForm.location,
                    reportedBy: getVoterId(),
                    magnitude: reportForm.magnitude,
                    imageUrl: finalImageUrl,
                    ...(reportForm.honeypot ? { honeypot: reportForm.honeypot } : {}),
                    ...(userLocation ? { userLocation: userLocation } : {})
                })
            });
            if (response.ok) {
                setReportStep(null);
                setIsMobileReportOpen(false);
                setReportForm({
                    type: 'pothole', note: '', imageUrl: '', imageFile: null, location: null, magnitude: 5, honeypot: '', userLocation: null
                });
                setUploadProgress(0);
                fetchMapState(new Date());
                hapticSuccess();
                addToast('Issue reported successfully!', 'success');
            } else {
                const data = await response.json().catch(() => ({}));
                addToast(`Failed to submit report: ${data.error || 'Server error'}`, 'error');
            }
        } catch (error) {
            console.error('Failed to report issue:', error);
            addToast('A network error occurred while submitting the report.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVote = async (id: string, voteType: 'true' | 'false') => {
        const issue = issues.find(i => i.id === id);
        const clusteredIssue = clusteredMarkers.find(i => i.id === id);
        const targetId = clusteredIssue?.originalId || issue?.id || id;

        setVotingIssueId(id);
        setVotingType(voteType);

        try {
            const response = await fetch(`${baseUrl}/api/issue/${targetId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vote: voteType, voterId: getVoterId() })
            });
            if (response.ok) {
                const data = await response.json();
                if (data.delisted) {
                    setSelectedIssue(null);
                    addToast('Issue has been delisted due to negative votes', 'info');
                } else {
                    const voteLabel = voteType === 'true' ? 'active' : 'fixed';
                    hapticSuccess();
                    addToast(`Vote recorded: Marked as ${voteLabel}`, 'success');
                }
                fetchMapState(currentTime);
                if (selectedIssue && selectedIssue.id === id) {
                    setSelectedIssue({
                        ...selectedIssue,
                        votes_true: data.votes_true,
                        votes_false: data.votes_false
                    });
                }
            } else {
                const data = await response.json().catch(() => ({}));
                if (response.status === 409) {
                    addToast('You have already voted on this issue', 'warning');
                } else {
                    addToast(`Failed to record vote: ${data.error || 'Server error'}`, 'error');
                }
            }
        } catch (error) {
            console.error('Failed to vote:', error);
            addToast('A network error occurred while voting.', 'error');
        } finally {
            setVotingIssueId(null);
            setVotingType(null);
        }
    };

    const handleApprove = async (id: string) => {
        const issue = issues.find(i => i.id === id);
        const clusteredIssue = clusteredMarkers.find(i => i.id === id);
        const targetId = clusteredIssue?.originalId || issue?.id || id;

        try {
            const secretToUse = adminPassword || import.meta.env.VITE_ADMIN_SECRET || 'admin';
            const response = await fetch(`${baseUrl}/api/issue/${targetId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': secretToUse
                },
                body: JSON.stringify({ adminAction: 'approve' })
            });
            if (response.ok) {
                setIssues(prev => prev.map(issue => issue.id === id ? { ...issue, approved: true } : issue));
                if (selectedIssue && selectedIssue.id === id) {
                    setSelectedIssue({ ...selectedIssue, approved: true });
                }
                hapticSuccess();
                addToast('Issue approved successfully', 'success');
            } else {
                const error = await response.json().catch(() => ({}));
                addToast(`Approve failed: ${error.error || 'Server error'}`, 'error');
            }
        } catch (error) {
            console.error('Failed to approve:', error);
            addToast(`Network error while approving: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    };

    const handleRemove = async (id: string) => {
        const issue = issues.find(i => i.id === id);
        const clusteredIssue = clusteredMarkers.find(i => i.id === id);
        const targetId = clusteredIssue?.originalId || issue?.id || id;

        try {
            const secretToUse = adminPassword || import.meta.env.VITE_ADMIN_SECRET || 'admin';
            const response = await fetch(`${baseUrl}/api/issue/${targetId}/delist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': secretToUse
                },
                body: JSON.stringify({ adminAction: 'delist' })
            });
            if (response.ok) {
                setIssues(prev => prev.filter(issue => issue.id !== id));
                setSelectedIssue(null);
                hapticSuccess();
                addToast('Issue removed successfully', 'success');
            } else {
                const error = await response.json().catch(() => ({}));
                addToast(`Remove failed: ${error.error || 'Server error'} (Status: ${response.status})`, 'error');
            }
        } catch (error) {
            console.error('Failed to remove:', error);
            addToast(`Network error while removing: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    };

    const handleCancelReport = () => {
        setReportStep(null);
        setIsMobileReportOpen(false);
        setReportForm({
            type: 'pothole', note: '', imageUrl: '', imageFile: null, location: null, magnitude: 5, honeypot: '', userLocation: null
        });
    };

    const calculateConfidence = (votesTrue: number = 0, votesFalse: number = 0, approved: boolean = false): number => {
        if (approved) return 100;
        const totalVotes = votesTrue + votesFalse;
        if (totalVotes === 0) return 50;

        const z = 1.96;
        const phat = votesTrue / totalVotes;
        const n = totalVotes;

        const numerator = phat + (z * z) / (2 * n) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);
        const denominator = 1 + (z * z) / n;

        return Math.round((numerator / denominator) * 100);
    };

    const toggleType = (type: string) => {
        hapticButton();
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            addToast('Geolocation is not supported by your browser.', 'warning');
            return;
        }

        if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
            addToast('Note: Safari requires HTTPS for Geolocation. Testing on a local IP might fail.', 'warning');
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        const success = (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            if (map) {
                map.setView([latitude, longitude], 18);
            }
            hapticSuccess();
            addToast('Location found successfully', 'success');
        };

        const error = (err: GeolocationPositionError) => {
            console.error('LocateMe error:', err);
            if (err.code === err.TIMEOUT && options.enableHighAccuracy) {
                navigator.geolocation.getCurrentPosition(success, (secondErr) => {
                    addToast(`Unable to get location: ${getGeoErrorMessage(secondErr)}`, 'error');
                }, { ...options, enableHighAccuracy: false, timeout: 5000 });
                return;
            }
            addToast(`Unable to get location: ${getGeoErrorMessage(err)}`, 'error');
        };

        navigator.geolocation.getCurrentPosition(success, error, options);
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
                <AdminLoginOverlay
                    password={loginPasswordInput}
                    onPasswordChange={setLoginPasswordInput}
                    onSubmit={() => {
                        if (loginPasswordInput) {
                            setAdminPassword(loginPasswordInput);
                            sessionStorage.setItem('admin_password', loginPasswordInput);
                        }
                    }}
                />
            )}

            {/* Admin Mode Badge */}
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
            <FilterSidebar
                isOpen={isMenuOpen}
                selectedTypes={selectedTypes}
                onToggleType={toggleType}
                onReportClick={() => {
                    setSelectedIssue(null);
                    setIsMobileReportOpen(false);
                    setReportStep('form');
                }}
            />

            {/* Fixed Logo for Desktop */}
            <div className="desktop-logo-fixed">
                <div className="logo-icon">
                    <img
                        src={theme === 'light' ? '/infrafluxwhite.png' : '/infrafluxblack.png'}
                        alt="InfraFlux Logo"
                    />
                </div>
                <div className="logo-text-wrapper">
                    <div className="logo-text">
                        <img
                            src={theme === 'light' ? '/logo/infraFLUX_black_bohme_mid.png' : '/logo/infraFLUX_white_bohme_mid.png'}
                            alt="InfraFlux"
                        />
                    </div>
                </div>
            </div>

            {/* Floating Hamburger */}
            <button
                className={`floating-hamburger ${isMenuOpen ? 'active' : ''}`}
                onClick={() => {
                    hapticButton();
                    setIsMenuOpen(!isMenuOpen);
                }}
                style={{ zIndex: 4001 }}
            >
                <div className="hamburger-line"></div>
                <div className="hamburger-line"></div>
                <div className="hamburger-line"></div>
            </button>

            {/* Desktop Theme Toggle */}
            <button
                className="theme-toggle-desktop"
                onClick={() => {
                    hapticButton();
                    setTheme(prev => prev === 'light' ? 'dark' : 'light');
                }}
                title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Mobile Header with Logo and Hamburger - Always visible on mobile */}
            {isMobile && (
                <MobileHeader
                    theme={theme}
                    isMenuOpen={isMobileMenuOpen && !isDonateModalOpen}
                    onMenuToggle={() => {
                        if (isDonateModalOpen) {
                            setIsDonateModalOpen(false);
                        }
                        setIsMobileMenuOpen(!isMobileMenuOpen);
                    }}
                    selectedTypes={selectedTypes}
                    onToggleType={toggleType}
                    onThemeToggle={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                    onDonateClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsDonateModalOpen(true);
                    }}
                    isHidden={isDonateModalOpen}
                />
            )}

            {/* Map Container */}
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
                <MapContainer
                    center={sector18Center}
                    zoom={zoom}
                    scrollWheelZoom={true}
                    zoomControl={false}
                    maxZoom={18}
                    style={{ height: '100%', width: '100%' }}
                    preferCanvas={true}
                >
                    <TileLayer
                        url={theme === 'dark'
                            ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
                            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        }
                        keepBuffer={2}
                        updateWhenIdle={isMobile}
                    />
                    <MapUpdater center={sector18Center} />
                    <ZoomHandler onZoomChange={setZoom} />
                    <MapRegister setMap={setMap} />
                    <MapClickHandler
                        onMapClick={(loc, point) => {
                            if (!map) return;

                            // Proximity Guard: Check if click is too close to an existing marker (40px)
                            const isNearMarker = clusteredMarkers.some(issue => {
                                const markerPoint = map.latLngToContainerPoint(issue.location);
                                const distance = Math.sqrt(
                                    Math.pow(point.x - markerPoint.x, 2) +
                                    Math.pow(point.y - markerPoint.y, 2)
                                );
                                return distance < 40;
                            });

                            if (isNearMarker) return;

                            if (isMobile) {
                                hapticButton();
                                setSelectedIssue(null);
                                setReportStep(null);
                                setIsMobileReportOpen(true);
                                setReportForm({
                                    type: 'pothole',
                                    note: '',
                                    imageUrl: '',
                                    imageFile: null,
                                    location: loc,
                                    magnitude: 5,
                                    honeypot: '',
                                    userLocation: null
                                });
                            } else if (reportStep === 'form' || isMobileReportOpen) {
                                setReportForm(prev => ({ ...prev, location: loc }));
                            }
                        }}
                        addToast={addToast}
                    />
                    <LocateMeHandler center={userLocation} />

                    <ScalingMarkers
                        issues={clusteredMarkers}
                        zoom={zoom}
                        magnitude={5}
                        onSelect={(issue) => {
                            hapticButton();
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
                </MapContainer>
                {isLoading && <MapLoadingOverlay />}
            </div>

            {/* Mobile Bottom Bar */}
            {
                (!selectedIssue && !reportStep && !isMobileReportOpen) && (
                    <div className={`mobile-bottom-bar ${isDonateModalOpen ? 'hidden-for-support' : ''}`}>
                        <button
                            type="button"
                            className="mobile-report-btn"
                            onClick={() => {
                                hapticButton();
                                setSelectedIssue(null);
                                setReportStep(null);
                                setIsMobileReportOpen(true);
                                setReportForm({
                                    type: 'pothole', note: '', imageUrl: '', imageFile: null, location: null, magnitude: 5, honeypot: '', userLocation: null
                                });
                            }}
                        >
                            <PlusCircle size={18} />
                            <span>REPORT ISSUE</span>
                        </button>
                        <button
                            type="button"
                            className="mobile-locate-btn"
                            onClick={() => {
                                hapticButton();
                                handleLocateMe();
                            }}
                            aria-label="Locate me"
                        >
                            <Navigation size={18} />
                        </button>
                    </div>
                )
            }

            {/* Mobile Issue Details Panel */}
            {
                isMobile && selectedIssue && !reportStep && (
                    <MobileBottomPanel
                        onClose={() => setSelectedIssue(null)}
                        height={0.5}
                        modal={true}
                    >
                        <div className="mobile-issue-details">
                            <div className="mobile-detail-header">
                                <h2 className="mobile-detail-title">
                                    {selectedIssue.type === 'water_logging' ? 'Water Logging' :
                                        selectedIssue.type === 'garbage_dump' ? 'Garbage Dump' :
                                            selectedIssue.type === 'pothole' ? 'Pothole' :
                                                String(selectedIssue.type || 'Issue').replace(/_/g, ' ')}
                                </h2>
                                <div className="mobile-confidence-badge">
                                    {calculateConfidence(selectedIssue.votes_true, selectedIssue.votes_false, selectedIssue.approved)}%
                                    <span className="confidence-text">Confidence</span>
                                </div>
                            </div>

                            <IssueDetails
                                issue={selectedIssue!}
                                magnitudeLabel={magnitudeLabel}
                            />

                            <div className="mobile-detail-footer">
                                <VoteButtons
                                    issue={selectedIssue!}
                                    isAdmin={isAdmin}
                                    isVoting={votingIssueId === selectedIssue.id}
                                    votingType={votingType}
                                    onVote={handleVote}
                                    onApprove={handleApprove}
                                    onRemove={handleRemove}
                                    confidence={calculateConfidence(
                                        selectedIssue.votes_true,
                                        selectedIssue.votes_false,
                                        selectedIssue.approved
                                    )}
                                />
                            </div>
                        </div>
                    </MobileBottomPanel>
                )
            }

            {/* Mobile Report Form Panel */}
            {
                isMobileReportOpen && (
                    <MobileBottomPanel
                        onClose={handleCancelReport}
                        height={0.5}
                        modal={false}
                    >
                        <ReportForm
                            formData={reportForm}
                            onChange={(data) => setReportForm(prev => ({ ...prev, ...data }))}
                            onSubmit={handleReport}
                            onCancel={handleCancelReport}
                            onGetLocation={handleGetCurrentLocation}
                            isMobile={isMobile}
                            uploadProgress={uploadProgress}
                            isSubmitting={isSubmitting}
                        />
                    </MobileBottomPanel>
                )
            }

            {/* Desktop Sidebar - Issue Details */}
            {
                !isMobile && selectedIssue && !reportStep && (
                    <div className="detail-sidebar open">
                        <button className="detail-close-btn" onClick={() => setSelectedIssue(null)}>
                            <div className="hamburger-line"></div>
                            <div className="hamburger-line"></div>
                            <div className="hamburger-line"></div>
                        </button>

                        <div className="detail-header">
                            <h2 className="detail-title">
                                {selectedIssue.type === 'water_logging' ? 'Water Logging' :
                                    selectedIssue.type === 'garbage_dump' ? 'Garbage Dump' :
                                        selectedIssue.type === 'pothole' ? 'Pothole' :
                                            String(selectedIssue.type || 'Issue').replace(/_/g, ' ')}
                            </h2>
                        </div>

                        <div className="detail-content">
                            <IssueDetails
                                issue={selectedIssue!}
                                magnitudeLabel={magnitudeLabel}
                            />
                        </div>

                        <div className="detail-footer">
                            <VoteButtons
                                issue={selectedIssue!}
                                isAdmin={isAdmin}
                                isVoting={votingIssueId === selectedIssue.id}
                                votingType={votingType}
                                onVote={handleVote}
                                onApprove={handleApprove}
                                onRemove={handleRemove}
                                confidence={calculateConfidence(
                                    selectedIssue.votes_true,
                                    selectedIssue.votes_false,
                                    selectedIssue.approved
                                )}
                            />
                        </div>
                    </div>
                )
            }

            {/* Desktop Sidebar - Report Form */}
            {
                !isMobile && reportStep === 'form' && (
                    <div className="detail-sidebar report-sidebar open">
                        <ReportForm
                            formData={reportForm}
                            onChange={(data) => setReportForm(prev => ({ ...prev, ...data }))}
                            onSubmit={handleReport}
                            onCancel={handleCancelReport}
                            onGetLocation={handleGetCurrentLocation}
                            isMobile={isMobile}
                            uploadProgress={uploadProgress}
                            isSubmitting={isSubmitting}
                        />
                    </div>
                )
            }
            {/* Donation Modal */}
            <DonateModal
                isOpen={isDonateModalOpen}
                onClose={() => setIsDonateModalOpen(false)}
            />
        </div>
    );
};


export default UserMap;
