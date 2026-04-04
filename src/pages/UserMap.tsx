import React, { useState, useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { InfrastructureIssue, IssueType } from '../types';
import { Navigation, PlusCircle, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getVoterId } from '../utils/voterId';
import { useToast } from '../contexts/ToastContext';
import { MapLoadingOverlay, Spinner } from '../components/Skeleton';
import { hapticButton, hapticSuccess } from '../utils/haptic';
import { Map, MapMarker, MarkerContent, useMap } from '../components/ui/MapLibre';
import {
    ZoomHandler,
    MapRegister,
    MapClickHandler,
    LocateMeHandler,
    MapFlyIn,
    IssuesLayer,
    MobileBottomPanel,
    FilterSidebar,
    MobileHeader,
    VoteButtons,
    IssueDetails,
    AdminLoginOverlay,
    ReportForm
} from '../components';
import { DonateModal } from '../components/ui/DonateModal';
import { DesktopBlock } from '../components/ui/DesktopBlock';


const sector18Center: [number, number] = [28.1711, 76.6211];

interface UserMapProps {
    isAdmin?: boolean;
}

const ISSUE_MARKER_COLORS: Record<string, { bg: string; glow: string; glowStrong: string }> = {
    pothole: { bg: '#ef4444', glow: '#ef444466', glowStrong: '#ef4444cc' },
    water_logging: { bg: '#3b82f6', glow: '#3b82f666', glowStrong: '#3b82f6cc' },
    garbage_dump: { bg: '#fbbf24', glow: '#fbbf2466', glowStrong: '#fbbf24cc' },
    streetlight: { bg: '#8b5cf6', glow: '#8b5cf666', glowStrong: '#8b5cf6cc' },
};

const getMarkerColor = (type: IssueType | string) =>
    ISSUE_MARKER_COLORS[type] || { bg: '#ef4444', glow: '#ef444466', glowStrong: '#ef4444cc' };

const UserMap: React.FC<UserMapProps> = ({ isAdmin = false }) => {
    const { addToast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [issues, setIssues] = useState<InfrastructureIssue[]>([]);
    const [selectedIssue, setSelectedIssue] = useState<InfrastructureIssue | null>(null);
    const [zoom, setZoom] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [reportStep, setReportStep] = useState<'form' | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['pothole', 'water_logging', 'garbage_dump']);
    const [map, setMap] = useState<maplibregl.Map | null>(null);
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
    const isActuallyMobile = useMemo(() => {
        const userAgent = navigator.userAgent || "";
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    }, []);
    const showBlock = !isAdmin && !isActuallyMobile;
    const [votingIssueId, setVotingIssueId] = useState<string | null>(null);
    const [votingType, setVotingType] = useState<'true' | 'false' | null>(null);
    const [locateTrigger, setLocateTrigger] = useState(0);
    const [focusTrigger, setFocusTrigger] = useState(0);

    const [reportForm, setReportForm] = useState({
        type: 'pothole' as IssueType,
        note: '',
        imageUrl: '',
        imageFile: null as File | null,
        location: null as [number, number] | null,
        magnitude: 5,
        honeypot: '',
        userLocation: null as [number, number] | null,
        mla_name: undefined as string | undefined,
        party: undefined as string | undefined,
        ac_name: undefined as string | undefined,
        st_name: undefined as string | undefined
    });
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
    const [isMarkerVisible, setIsMarkerVisible] = useState(true);
    const [isLocating, setIsLocating] = useState(false);
    const suppressPaddingEffect = useRef(false);
    const lastViewportUpdate = useRef(0);


    const baseUrl = import.meta.env.VITE_API_URL || '';

    const ZOOM_THRESHOLD = 5.0;
    const isStreetLevel = zoom > ZOOM_THRESHOLD;
    const isRotationLocked = isStreetLevel || !!selectedIssue || reportStep === 'form' || isMobileReportOpen;
    const isPanelOpen = isMobile && (!!selectedIssue || isMobileReportOpen);

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

    // Window resize handler for Layout only
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 767);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [hasInitialCentered, setHasInitialCentered] = useState(false);

    // Fetch map data
    const fetchMapState = async (time: Date, bounds?: { minLng: number; minLat: number; maxLng: number; maxLat: number }) => {
        // Only show global loading overlay on initial mount (when issues are empty)
        const isInitialLoad = issues.length === 0;
        if (isInitialLoad) setIsLoading(true);

        const minDelay = new Promise(resolve => setTimeout(resolve, 1000));
        try {
            const fetchPromise = (async () => {
                let url = `${baseUrl}/api/map-state?timestamp=${time.toISOString()}`;
                if (bounds) {
                    url += `&minLng=${bounds.minLng}&minLat=${bounds.minLat}&maxLng=${bounds.maxLng}&maxLat=${bounds.maxLat}`;
                }
                const response = await fetch(url);
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })();

            const [data] = await Promise.all([fetchPromise as Promise<any>, minDelay]);
            setIssues(Array.isArray(data.issues) ? data.issues : []);

            // IP-based centering removed to prioritize Rewari default
        } catch (error) {
            console.error('Failed to fetch map state:', error);
            addToast('Failed to fetch map data', 'error');
            await minDelay;
        } finally {
            if (isInitialLoad) setIsLoading(false);
        }
    };

    // Re-added initial fetch to resolve loading deadlock
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

    // Effect to lookup MLA when report location changes
    useEffect(() => {
        const lookupMLA = async () => {
            if (!reportForm.location) return;

            try {
                const [lat, lng] = reportForm.location;
                const response = await fetch(`${baseUrl}/api/lookup-mla?lat=${lat}&lng=${lng}`);
                const data = await response.json();

                if (data.found) {
                    setReportForm(prev => ({
                        ...prev,
                        mla_name: data.mla_name,
                        party: data.party,
                        ac_name: data.ac_name,
                        st_name: data.st_name
                    }));
                } else {
                    // Reset MLA info but keep constituency name if it was somehow partially found
                    setReportForm(prev => ({
                        ...prev,
                        mla_name: undefined,
                        party: undefined,
                        ac_name: 'Unknown',
                        st_name: 'India'
                    }));
                }
            } catch (error) {
                console.error('Failed to lookup MLA:', error);
            }
        };

        if (reportStep === 'form' || isMobileReportOpen) {
            lookupMLA();
        }
    }, [reportForm.location, reportStep, isMobileReportOpen, baseUrl]);


    const handleReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportForm.location) {
            addToast('Please select a location on the map', 'warning');
            return;
        }

        // Mandatory photo for Moderate and High Severity (Magnitude > 3)
        if (reportForm.magnitude > 3 && !reportForm.imageFile) {
            addToast('Moderate and high severity reports require photo evidence. Please upload a photo or decrease severity.', 'error');
            return;
        }

        // GPS Proximity Guard for Incentive Program
        if (userLocation && reportForm.location) {
            const [uLat, uLng] = userLocation;
            const [mLat, mLng] = reportForm.location;

            // Haversine distance calculation (simple approximation)
            const R = 6371e3; // metres
            const φ1 = uLat * Math.PI / 180;
            const φ2 = mLat * Math.PI / 180;
            const Δφ = (mLat - uLat) * Math.PI / 180;
            const Δλ = (mLng - uLng) * Math.PI / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c; // in metres

            if (distance > 100) { // 100 meters threshold
                addToast('Report marker is too far from your actual location. Please report on-site.', 'error');
                return;
            }
        } else if (!userLocation) {
            addToast('Real-time GPS location is required to verify your report for rewards.', 'warning');
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
                            // Map real upload (0-100) to (0-90)
                            const percent = Math.round((event.loaded / event.total) * 90);
                            setUploadProgress(percent);
                        }
                    });

                    xhr.addEventListener('load', () => {
                        try {
                            const result = JSON.parse(xhr.responseText);
                            if (result.success) {
                                setUploadProgress(90);
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
            } else {
                setUploadProgress(10); // Start at 10% if no image
            }

            // Start Artificial Crawl (90% to 99%)
            const crawlInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev < 99) return prev + 1;
                    clearInterval(crawlInterval);
                    return prev;
                });
            }, 300); // Crawl 1% every 300ms

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

            clearInterval(crawlInterval);

            if (response.ok) {
                setUploadProgress(100);
                setTimeout(() => {
                    setReportStep(null);
                    setIsMobileReportOpen(false);
                    setReportForm({
                        type: 'pothole', note: '', imageUrl: '', imageFile: null, location: null, magnitude: 5, honeypot: '', userLocation: null,
                        mla_name: undefined, party: undefined, ac_name: undefined, st_name: undefined
                    });
                    setUploadProgress(0);
                    fetchMapState(new Date());
                    hapticSuccess();
                    addToast('Issue reported successfully!', 'success');
                }, 400); // Short delay to show 100% completion
            } else {
                setUploadProgress(0);
                const data = await response.json().catch(() => ({}));
                if (response.status === 429) {
                    addToast(data.error || 'Rate limit reached. Please try again later.', 'warning');
                } else {
                    addToast(`Failed to submit report: ${data.error || 'Server error'}`, 'error');
                }
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
        const targetId = issue?.id || id;

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
        const targetId = issue?.id || id;

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
        const targetId = issue?.id || id;

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
            type: 'pothole', note: '', imageUrl: '', imageFile: null, location: null, magnitude: 5, honeypot: '', userLocation: null,
            mla_name: undefined, party: undefined, ac_name: undefined, st_name: undefined
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

    const performGeolocation = (updateReport: boolean = false) => {
        if (!navigator.geolocation) {
            addToast('Geolocation is not supported by your browser', 'error');
            return;
        }

        // 1. Safety Check: Prevent overlapping GPS requests and camera flights
        if (isLocating) return;
        setIsLocating(true);

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
            const newLoc: [number, number] = [latitude, longitude];

            setUserLocation(newLoc);

            if (isMobile) {
                // Scenario 1: Always increment locateTrigger to show GPS dot focus
                setLocateTrigger(prev => prev + 1);

                if (updateReport) {
                    // Scenario 3: Also update report marker and trigger focus
                    setIsMarkerVisible(false);
                    setReportForm(prev => ({ ...prev, location: newLoc }));
                    setFocusTrigger(prev => prev + 1);
                    
                    // Re-reveal marker after flyin (completes at last moment ~950ms)
                    setTimeout(() => setIsMarkerVisible(true), 950);
                }
            } else if (updateReport) {
                // Desktop path
                setReportForm(prev => ({ ...prev, location: newLoc }));
            }

            hapticSuccess();
            
            // Allow cooldown once high-precision flyin completes
            setTimeout(() => setIsLocating(false), 2000);
        };

        const error = (err: GeolocationPositionError) => {
            console.error('Geolocation error:', err);
            if (err.code === err.TIMEOUT && options.enableHighAccuracy) {
                navigator.geolocation.getCurrentPosition(success, (secondErr) => {
                    addToast(`Unable to get location: ${getGeoErrorMessage(secondErr)}`, 'error');
                }, { ...options, enableHighAccuracy: false, timeout: 5000 });
                return;
            }
            addToast(`Unable to get location: ${getGeoErrorMessage(err)}`, 'error');
            setIsLocating(false);
        };

        navigator.geolocation.getCurrentPosition(success, error, options);
    };

    // Replace the old handlers with unified logic
    const handleLocateMe = () => performGeolocation(false);
    const handleGetCurrentLocation = () => performGeolocation(true);

    const filteredIssues = useMemo(() => {
        if (!Array.isArray(issues)) return [];
        return issues.filter(issue =>
            selectedTypes.includes(issue.type) &&
            issue.status !== 'resolved'
        );
    }, [issues, selectedTypes]);

    // Calculate counts for each issue type
    const issueCounts = useMemo(() => {
        return issues.reduce((acc, issue) => {
            if (issue.status !== 'resolved') {
                acc[issue.type] = (acc[issue.type] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [issues]);

    const magnitudeLabel = (mag: number) => {
        if (mag <= 3) return 'Low';
        if (mag <= 7) return 'Moderate';
        return 'High';
    };

    const handleMoveEnd = (vp: any) => {
        if (isRotationLocked && (vp.bearing !== 0 || vp.pitch !== 0)) {
            map?.easeTo({
                bearing: 0,
                pitch: 0,
                duration: 200,
                essential: true
            });
        }

        // Spatial Pagination: Fetch issues within the new viewport
        if (map) {
            const bounds = map.getBounds();
            fetchMapState(currentTime, {
                minLng: bounds.getWest(),
                minLat: bounds.getSouth(),
                maxLng: bounds.getEast(),
                maxLat: bounds.getNorth()
            });
        }
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
                issueCounts={issueCounts}
            />

            {/* Fixed Logo for Desktop */}
            {!isLoading && (
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
            )}

            {/* Floating Hamburger */}
            {!isLoading && (
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
            )}

            {/* Desktop Theme Toggle */}
            {!isLoading && (
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
            )}

            {/* Mobile Header - Transitioned via CSS for unified "entity" movement */}
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
                    isHidden={isDonateModalOpen || isMobileReportOpen || reportStep === 'form' || !!selectedIssue}
                    isLoading={isLoading}
                    issueCounts={issueCounts}
                    voterId={getVoterId()}
                />
            )}

            {/* Map Container */}
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
                <Map
                    center={[-98.5795, 39.8283]} // Geographic center of US / Americas
                    zoom={zoom}
                    scrollZoom={true}
                    maxZoom={20}
                    style={{ height: '100%', width: '100%' }}
                    theme={theme}
                    projection={isStreetLevel ? { type: 'mercator' } : { type: 'globe' }}
                    dragRotate={!isRotationLocked}
                    touchZoomRotate={!isRotationLocked}
                    touchPitch={!isRotationLocked}
                    maxPitch={isRotationLocked ? 0 : 85}
                    onViewportChange={(vp) => {
                        const now = Date.now();
                        if (now - lastViewportUpdate.current > 100) {
                            setZoom(vp.zoom);
                            lastViewportUpdate.current = now;
                        }
                    }}
                    onMoveEnd={(vp) => {
                        setZoom(vp.zoom);
                        handleMoveEnd(vp);
                    }}
                    isPanelOpen={isPanelOpen}
                    suppressPaddingEffect={suppressPaddingEffect.current}
                >
                    <MapFlyIn isLoading={isLoading} targetCenter={[20.5937, 78.9629]} targetZoom={4} />
                    <ZoomHandler onZoomChange={setZoom} />
                    <MapRegister setMap={setMap} />
                    <MapClickHandler
                        onMapClick={(loc, point) => {
                            if (!map) return;

                            // Proximity Guard: use MapLibre's rendered features
                            const mp = new maplibregl.Point(point.x, point.y);
                            const renderedFeatures = map.queryRenderedFeatures(mp, {
                                layers: ['issues-unclustered']
                            });
                            if (renderedFeatures.length > 0) return;

                            // Suppress automated padding effect during manual camera movement
                            suppressPaddingEffect.current = true;

                            const targetPaddingBottom = map.getContainer().offsetHeight * 0.5;
                            const currentZoom = map.getZoom();

                            if (currentZoom < 18) {
                                // Cinematic fly-in from high altitude
                                map.flyTo({
                                    center: [loc[1], loc[0]], // [lng, lat]
                                    zoom: 18,
                                    duration: 1500,
                                    padding: { 
                                        bottom: targetPaddingBottom,
                                        top: 0, left: 0, right: 0 
                                    },
                                    essential: true
                                });
                                // Reset suppression after the longer fly-in
                                setTimeout(() => {
                                    suppressPaddingEffect.current = false;
                                }, 1550);
                            } else {
                                // Smooth slide for local, street-level adjustments
                                map.easeTo({
                                    center: [loc[1], loc[0]], // [lng, lat]
                                    duration: 600,
                                    padding: { 
                                        bottom: targetPaddingBottom,
                                        top: 0, left: 0, right: 0 
                                    },
                                    essential: true
                                });
                                // Reset suppression after the shorter pan
                                setTimeout(() => {
                                    suppressPaddingEffect.current = false;
                                }, 650);
                            }

                            if (isMobile) {
                                hapticButton();
                                setSelectedIssue(null);
                                setReportStep(null);
                                setIsMobileReportOpen(true);
                                setIsMarkerVisible(true);
                                setReportForm({
                                    type: 'pothole',
                                    note: '',
                                    imageUrl: '',
                                    imageFile: null,
                                    location: loc,
                                    magnitude: 5,
                                    honeypot: '',
                                    userLocation: null,
                                    mla_name: undefined,
                                    party: undefined,
                                    ac_name: undefined,
                                    st_name: undefined
                                });
                            } else if (reportStep === 'form' || isMobileReportOpen) {
                                setReportForm(prev => ({ ...prev, location: loc }));
                                // Ensure suppression resets for desktop as well if it's already open
                                if (!isMobile) {
                                    setTimeout(() => {
                                        suppressPaddingEffect.current = false;
                                    }, 650);
                                }
                            }
                        }}
                        addToast={addToast}
                    />
                    <LocateMeHandler
                        center={userLocation}
                        focusLocation={reportForm.location}
                        isMobile={isMobile}
                        isMenuOpen={reportStep === 'form' || isMobileReportOpen}
                        locateTrigger={locateTrigger}
                        focusTrigger={focusTrigger}
                    />

                    <IssuesLayer
                        issues={filteredIssues}
                        zoom={zoom}
                        onSelect={(issue) => {
                            hapticButton();
                            setReportStep(null);
                            setIsMobileReportOpen(false);
                            setSelectedIssue(issue);
                        }}
                        onZoomChange={setZoom}
                    />

                    {reportForm.location && (reportStep === 'form' || isMobileReportOpen) && isMarkerVisible && (
                        <MapMarker
                            key="report-marker"
                            longitude={reportForm.location[1]}
                            latitude={reportForm.location[0]}
                            draggable={true}
                            onDragEnd={(lngLat) => {
                                setReportForm(prev => ({ ...prev, location: [lngLat.lat, lngLat.lng] }));
                                // Trigger focus handler to center marker in visible area
                                if (isMobile) {
                                    setFocusTrigger(prev => prev + 1);
                                }
                            }}
                        >
                            <MarkerContent className="selected-location-icon">
                                <div style={{
                                    background: getMarkerColor(reportForm.type).bg,
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    border: '3px solid white',
                                    boxShadow: `0 0 0 4px ${getMarkerColor(reportForm.type).glow}, 0 0 20px ${getMarkerColor(reportForm.type).glowStrong}`,
                                    cursor: 'grab',
                                }} />
                            </MarkerContent>
                        </MapMarker>
                    )}
                </Map>
                <MapLoadingOverlay isLoading={isLoading} theme={theme as 'light' | 'dark'} />
            </div>

            {/* Mobile Bottom Bar */}
            <AnimatePresence>
                {(!selectedIssue && !reportStep && !isMobileReportOpen && !isLoading) && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "linear" }}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
                    >
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
                                        type: 'pothole', note: '', imageUrl: '', imageFile: null, location: null, magnitude: 5, honeypot: '', userLocation: null,
                                        mla_name: undefined, party: undefined, ac_name: undefined, st_name: undefined
                                    });
                                }}
                            >
                                <PlusCircle size={18} />
                                <span>REPORT ISSUE</span>
                            </button>
                            <button
                                type="button"
                                className={`mobile-locate-btn ${isLocating ? 'locating' : ''}`}
                                onClick={() => {
                                    hapticButton();
                                    handleLocateMe();
                                }}
                                disabled={isLocating}
                                aria-label="Locate me"
                            >
                                {isLocating ? (
                                    <Spinner style={{ fontSize: '1.2rem', width: '18px', height: '18px' }} />
                                ) : (
                                    <Navigation size={18} />
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Issue Details Panel */}
            {
                isMobile && selectedIssue && !reportStep && (
                    <MobileBottomPanel
                        onClose={() => setSelectedIssue(null)}
                        height={0.5}
                        modal={false}
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
                        {showBlock ? (
                            <DesktopBlock onClose={handleCancelReport} />
                        ) : (
                            <ReportForm
                                formData={reportForm}
                                onChange={(data) => setReportForm(prev => ({ ...prev, ...data }))}
                                onSubmit={handleReport}
                                onCancel={handleCancelReport}
                                onGetLocation={handleGetCurrentLocation}
                                isMobile={isMobile}
                                uploadProgress={uploadProgress}
                                isSubmitting={isSubmitting}
                                isLocating={isLocating}
                            />
                        )}
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
                        {showBlock ? (
                            <DesktopBlock onClose={handleCancelReport} />
                        ) : (
                            <ReportForm
                                formData={reportForm}
                                onChange={(data) => setReportForm(prev => ({ ...prev, ...data }))}
                                onSubmit={handleReport}
                                onCancel={handleCancelReport}
                                onGetLocation={handleGetCurrentLocation}
                                isMobile={isMobile}
                                uploadProgress={uploadProgress}
                                isSubmitting={isSubmitting}
                                isLocating={isLocating}
                            />
                        )}
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
