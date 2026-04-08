import React, { useState, useRef, useEffect } from 'react';
import { Clock, AlertTriangle, ExternalLink, Maximize2, ShieldCheck, CheckCircle2, XCircle, Camera, Check, ImagePlus, RotateCcw, X, AlertCircle, ArrowUp } from 'lucide-react';
import { format } from 'date-fns';
import { InfrastructureIssue, IssueStatus } from '../../types';
import { calculateDistance, getGeoErrorMessage } from '../../utils/geo';
import { getOpToken } from '../../utils/opToken';
import { useToast } from '../../contexts/ToastContext';
import { hapticButton, hapticSuccess } from '../../utils/haptic';
import { Spinner } from '../Skeleton';
import imageCompression from 'browser-image-compression';

interface IssueDetailsProps {
    issue: InfrastructureIssue;
    magnitudeLabel: (mag: number) => string;
    userLocation?: [number, number] | null;
    onStatusUpdate?: () => void;
}

export const IssueDetails: React.FC<IssueDetailsProps> = ({
    issue,
    magnitudeLabel,
    userLocation: initialUserLocation,
    onStatusUpdate
}) => {
    const { addToast } = useToast();
    const [isResolving, setIsResolving] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [resolutionImage, setResolutionImage] = useState<File | null>(null);
    const [resolutionImageUrl, setResolutionImageUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [compressionError, setCompressionError] = useState<string | null>(null);
    const [isLocationVerified, setIsLocationVerified] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cleanup local blob URL
    useEffect(() => {
        return () => {
            if (resolutionImageUrl && resolutionImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(resolutionImageUrl);
            }
        };
    }, [resolutionImageUrl]);

    // Reset UI state when switching issues
    useEffect(() => {
        setIsResolving(false);
        setIsUploading(false);
        setIsLocationVerified(false);
        setResolutionImage(null);
        setResolutionImageUrl('');
    }, [issue.id]);

    const baseUrl = import.meta.env.VITE_API_URL || '';

    const formatDate = (dateString: string) => {
        try {
            const d = dateString ? new Date(dateString) : new Date();
            return isNaN(d.getTime()) ? 'Unknown date' : format(d, 'MMM d, yyyy');
        } catch (e) {
            return 'Unknown date';
        }
    };

    const handleVerifyClick = () => {
        hapticButton();

        // 1. If already verified for this session, skip GPS and go straight to camera
        if (isLocationVerified) {
            fileInputRef.current?.click();
            return;
        }

        // 2. iOS Safari / Chrome Workaround:
        // Programmatic camera triggers MUST be synchronous right after a user tap.
        // We check if the global map has a recently validated user location and use it instantly.
        if (initialUserLocation) {
            const distance = calculateDistance(
                initialUserLocation[0], initialUserLocation[1],
                issue.location[0], issue.location[1]
            );
            
            if (distance <= 200) {
                setIsLocationVerified(true);
                // Synchronous trigger - works on iOS securely!
                fileInputRef.current?.click();
                return;
            }
        }

        // 3. Fallback to requesting live location
        setIsLocating(true);
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        const success = (pos: GeolocationPosition) => {
            const { latitude, longitude } = pos.coords;
            
            const distance = calculateDistance(
                latitude, longitude,
                issue.location[0], issue.location[1]
            );

            if (distance > 200) {
                addToast(`You must be within 200 meters to verify a fix. Current distance: ${Math.round(distance)}m`, 'error');
            } else {
                setIsLocationVerified(true);
                
                // Attempt to open camera. On Android this will likely work. 
                // On iOS, this async programmatic trigger is blocked silently.
                fileInputRef.current?.click();
                
                // Show a toast just in case it was blocked silently by iOS Safari strict security
                setTimeout(() => {
                    if (!isResolving && !isUploading) {
                        addToast('Location verified! Please tap Verify again to open camera.', 'success');
                    }
                }, 500);
            }
            setIsLocating(false);
        };

        const error = (err: GeolocationPositionError) => {
            console.error('Geolocation error:', err);
            if (err.code === err.TIMEOUT && options.enableHighAccuracy) {
                navigator.geolocation.getCurrentPosition(success, (secondErr) => {
                    addToast(`Unable to verify location: ${getGeoErrorMessage(secondErr)}`, 'error');
                    setIsLocating(false);
                }, { ...options, enableHighAccuracy: false, timeout: 5000 });
                return;
            }
            addToast(`Unable to verify location: ${getGeoErrorMessage(err)}`, 'error');
            setIsLocating(false);
        };

        // Delay the execution by 50ms so React can flush the setIsLocating(true) state 
        // to the DOM and actually render the loading spinner before the native GPS thread locks up iOS!
        setTimeout(() => {
            navigator.geolocation.getCurrentPosition(success, error, options);
        }, 50);
    };

    const handleSubmitResolution = async () => {
        if (!resolutionImage) return;
        if (isSubmitting) return; // Guard against double-submit from re-renders

        setIsSubmitting(true);
        setUploadProgress(0);

        try {
            // 1. Upload to ImgBB first
            const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;
            if (!IMGBB_API_KEY) {
                addToast('ImgBB API key is missing', 'error');
                setIsSubmitting(false);
                return;
            }

            const finalImageUrl = await new Promise<string>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const formData = new FormData();
                formData.append('image', resolutionImage, `resolution_${Date.now()}.jpg`);

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

            // 2. Submit to backend with public URL
            const opToken = getOpToken();
            const response = await fetch(`${baseUrl}/api/issues/${issue.id}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    opToken,
                    imageUrl: finalImageUrl
                })
            });

            if (response.ok) {
                const data = await response.json();
                setUploadProgress(100);
                hapticSuccess();
                addToast(data.message, 'success');
                
                // Deterministic cleanup
                setTimeout(() => {
                    setIsResolving(false);
                    setResolutionImage(null);
                    setResolutionImageUrl('');
                    if (onStatusUpdate) onStatusUpdate();
                }, 500);
            } else {
                const err = await response.json().catch(() => ({ error: 'Internal server error' }));
                addToast(err.error || 'Failed to submit resolution', 'error');
                setUploadProgress(0);
            }
        } catch (error) {
            console.error('Error submitting resolution:', error);
            addToast(error instanceof Error ? error.message : 'Network error occurred', 'error');
            setUploadProgress(0);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTribunalVote = async (vote: 'up' | 'down') => {
        hapticButton();
        try {
            const response = await fetch(`${baseUrl}/api/issues/${issue.id}/vote-resolution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vote })
            });

            if (response.ok) {
                hapticSuccess();
                addToast(`Consensus vote recorded as ${vote === 'up' ? 'fixed' : 'fake'}.`, 'success');
                if (onStatusUpdate) onStatusUpdate();
            } else {
                addToast('Failed to record vote', 'error');
            }
        } catch (error) {
            addToast('Network error', 'error');
        }
    };

    return (
        <>
            {/* Resolution Lifecycle Panel */}
            {issue.status === 'resolved' && (
                <div className={`resolution-lifecycle-panel status-${issue.status}`}>
                    {/* Banner removed per user request */}
                    <div className="resolved-banner">
                        <CheckCircle2 size={16} />
                        <span>VERIFIED FIXED</span>
                    </div>
                </div>
            )}

            <div className="menu-section mt-2">
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
                            <div className="info-card-value">
                                {issue.status === 'pending' ? 'Verifying Fix' :
                                    issue.status === 'resolved' ? 'Issue Fixed' :
                                        'Awaiting Action'}
                            </div>
                        </div>
                        <div className={`status-badge-${issue.status || 'active'}`}>
                            {(issue.status || 'active').toUpperCase()}
                        </div>
                    </div>

                    <div className="info-card">
                        <div className="info-card-icon">
                            <AlertTriangle size={18} />
                        </div>
                        <div className="info-card-content">
                            <div className="info-card-label">MAGNITUDE</div>
                            <div className="info-card-value">
                                {magnitudeLabel(Number(issue.magnitude) || 5)} Impact
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
                                {formatDate(issue.createdAt)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {((issue.reported_mla_name || issue.mla_name) || (issue.current_mla_name) || (issue.reported_ac_name || issue.ac_name) || (issue.current_ac_name)) && (
                <div className="menu-section">
                    <div className="menu-label">
                        JURISDICTION
                    </div>

                    <div className="info-card-list">
                        {/* Logic: Only show two cards if both exist and are different */}
                        {((issue.reported_mla_name || issue.mla_name) && issue.current_mla_name &&
                            ((issue.reported_mla_name || issue.mla_name) !== issue.current_mla_name ||
                                (issue.reported_ac_name || issue.ac_name) !== issue.current_ac_name)) ? (
                            <>
                                {/* Current MLA */}
                                <div className="jurisdiction-card">
                                    <div className="jurisdiction-main-info">
                                        <div className="jurisdiction-title" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                            CURRENT REPRESENTATIVE
                                        </div>
                                        <div className="jurisdiction-title">
                                            {issue.current_mla_name || 'PENDING...'}
                                        </div>
                                        <div className="jurisdiction-subtitle">
                                            {issue.current_ac_name?.replace(/\sAC$/i, '') || 'UNMAPPED'}
                                        </div>
                                    </div>

                                    <div className="jurisdiction-divider"></div>

                                    <div className="jurisdiction-party-info">
                                        <div className="jurisdiction-party-value">
                                            {issue.current_mla_party || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {/* MLA at Time of Report */}
                                <div className="jurisdiction-card" style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--border-light)' }}>
                                    <div className="jurisdiction-main-info">
                                        <div className="jurisdiction-title" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                            MLA AT TIME OF REPORT
                                        </div>
                                        <div className="jurisdiction-title">
                                            {issue.reported_mla_name || issue.mla_name || 'UNKNOWN'}
                                        </div>
                                        <div className="jurisdiction-subtitle">
                                            {(issue.reported_ac_name || issue.ac_name)?.replace(/\sAC$/i, '') || 'UNMAPPED'}
                                        </div>
                                    </div>

                                    <div className="jurisdiction-divider"></div>

                                    <div className="jurisdiction-party-info">
                                        <div className="jurisdiction-party-value">
                                            {issue.reported_mla_party || issue.party || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Show ONE card - prefer current MLA, fall back to reported/legacy */
                            <div className="jurisdiction-card">
                                <div className="jurisdiction-main-info">
                                    <div className="jurisdiction-title">
                                        {issue.current_mla_name || issue.reported_mla_name || issue.mla_name || 'PENDING...'}
                                    </div>
                                    <div className="jurisdiction-subtitle">
                                        {(issue.current_ac_name || issue.reported_ac_name || issue.ac_name)?.replace(/\sAC$/i, '') || 'UNMAPPED'}
                                    </div>
                                </div>

                                <div className="jurisdiction-divider"></div>

                                <div className="jurisdiction-party-info">
                                    <div className="jurisdiction-party-value">
                                        {issue.current_mla_party || issue.reported_mla_party || issue.party || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {issue.note && (
                <div className="menu-section">
                    <div className="menu-label">DESCRIPTION</div>
                    <div className="description-box">
                        {issue.note}
                    </div>
                </div>
            )}

            {/* Lifecycle Timeline: Evidence -> Action/Resolution */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="menu-section" style={{ width: '100%', marginBottom: 0, paddingBottom: 0 }}>
                    <div className="menu-label">
                        EVIDENCE
                    </div>
                    <div className="evidence-box">
                        <div className="evidence-image-container" style={{ 
                            position: 'relative', 
                            aspectRatio: '16 / 9', 
                            width: '100%', 
                            borderRadius: '12px', 
                            overflow: 'hidden',
                            background: 'rgba(0, 0, 0, 0.2)'
                        }}>
                            {issue.images && issue.images.length > 0 ? (
                                issue.images.map((img, idx) => (
                                    <div key={idx} style={{ position: 'relative', width: '100%', height: '100%' }}>
                                        <img src={img} alt={`Evidence ${idx + 1}`} className="mobile-evidence-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <a
                                            href={img}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="image-expand-btn"
                                            style={{
                                                position: 'absolute',
                                                bottom: '8px',
                                                right: '8px',
                                                background: 'rgba(0,0,0,0.5)',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                color: 'white',
                                                backdropFilter: 'blur(4px)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 5
                                            }}
                                        >
                                            <Maximize2 size={16} />
                                        </a>
                                    </div>
                                ))
                            ) : (
                                <div style={{ 
                                    aspectRatio: '16 / 9',
                                    width: '100%',
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '8px',
                                    color: 'var(--text-muted)',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: '12px',
                                    border: '1px dashed var(--glass-border)'
                                }}>
                                    <Camera size={24} opacity={0.4} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>No evidence photo provided</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Simple Connector Line - No margins to ensure touching */}
                {(issue.status === 'active' || issue.resolution_image_url) && (
                    <div style={{ height: '30px', width: '2px', background: 'var(--border-light)', margin: '0', opacity: 0.6 }} />
                )}

                {/* Target milestone: Resolution Photo or Action Button */}
                {(issue.status === 'pending' || issue.status === 'resolved') && issue.resolution_image_url && (
                    <div className="menu-section resolution-highlight" style={{ width: '100%', marginTop: 0, paddingTop: 0, marginBottom: '0.5rem' }}>
                        {issue.status === 'resolved' && (
                            <div className="menu-label" style={{ color: 'var(--success)' }}>
                                VERIFIED RESOLUTION PHOTO
                            </div>
                        )}
                        <div className="evidence-box">
                        <div className="evidence-image-container" style={{ 
                            borderColor: 'var(--success-glow)', 
                            position: 'relative',
                            aspectRatio: '16 / 9',
                            width: '100%',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            background: 'rgba(0, 0, 0, 0.2)'
                        }}>
                            <img src={issue.resolution_image_url} alt="Resolution" className="mobile-evidence-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <a
                                    href={issue.resolution_image_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="image-expand-btn"
                                    style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '8px',
                                        background: 'rgba(0,0,0,0.5)',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        color: 'white',
                                        backdropFilter: 'blur(4px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 5
                                    }}
                                >
                                    <Maximize2 size={16} />
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Area: Verify Fixed (Active State) */}
                {issue.status === 'active' && !isResolving && (
                    <div className="menu-section action-section" style={{ width: '100%', marginTop: 0, paddingTop: 0, paddingBottom: 0, marginBottom: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={handleVerifyClick}
                            disabled={isLocating}
                            style={{
                                width: '100%',
                                height: '44px',
                                minHeight: '44px',
                                maxHeight: '44px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                color: 'var(--text-secondary)',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                padding: '0 1.5rem',
                                flex: 'none',
                                opacity: isLocating ? 0.7 : 1
                            }}
                        >
                            {isLocating ? (
                                <Spinner style={{ width: '20px', height: '20px' }} />
                            ) : (
                                <>
                                    <ImagePlus size={20} />
                                    <span>VERIFY AS FIXED</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            {/* Resolution Submittal Form - Redesigned as Square Preview Window */}
            {isResolving && (
                <div className="menu-section resolution-form-overlay" style={{ width: '100%', marginTop: 0, paddingTop: 0 }}>
                    <div className="resolution-form-body" style={{ padding: 0 }}>
                        {/* Square Preview Window */}
                        <div 
                            className="resolution-preview-container"
                            style={{
                                width: '100%',
                                aspectRatio: '16 / 9', // WIDESCREEN PREVIEW
                                borderRadius: '16px',
                                overflow: 'hidden',
                                background: 'var(--glass-card)',
                                border: compressionError ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--glass-border)',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
                            }}
                        >
                            {isUploading ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Spinner style={{ width: '32px', height: '32px' }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>PRECISION COMPRESSION...</span>
                                </div>
                            ) : compressionError ? (
                                <div 
                                    className="flex flex-col items-center gap-2 cursor-pointer w-full h-full justify-center"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <AlertCircle size={24} className="text-red-500" />
                                    <span className="text-red-500 font-bold text-[11px] tracking-widest uppercase">Capture Failed</span>
                                    <span className="text-[10px] text-red-500/50 uppercase font-black">Try Again</span>
                                </div>
                            ) : resolutionImageUrl ? (
                                <>
                                    <img 
                                        src={resolutionImageUrl} 
                                        alt="Resolution Preview" 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                    
                                    {/* Top Right Actions: Retake & Cancel */}
                                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px', zIndex: 20 }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setResolutionImage(null);
                                                setResolutionImageUrl('');
                                                fileInputRef.current?.click();
                                            }}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                background: 'rgba(0,0,0,0.5)',
                                                color: 'white',
                                                borderRadius: '8px',
                                                backdropFilter: 'blur(4px)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 0,
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                            title="Retake Photo"
                                        >
                                            <RotateCcw size={16} strokeWidth={2.5} />
                                        </button>
                                        
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsResolving(false);
                                                setResolutionImage(null);
                                                setResolutionImageUrl('');
                                            }}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                background: 'rgba(0,0,0,0.5)',
                                                color: 'white',
                                                borderRadius: '8px',
                                                backdropFilter: 'blur(4px)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 0,
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                            title="Cancel Verification"
                                        >
                                            <X size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    {/* Bottom Right Action: Upload */}
                                    <div style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 20 }}>
                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={handleSubmitResolution}
                                            style={{
                                                height: '36px',
                                                padding: '0 12px',
                                                gap: '6px',
                                                background: 'rgba(0,0,0,0.5)',
                                                color: 'white',
                                                borderRadius: '8px',
                                                backdropFilter: 'blur(4px)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                fontSize: '0.75rem',
                                                opacity: isSubmitting ? 0.6 : 1
                                            }}
                                        >
                                            {isSubmitting ? (
                                                <Spinner style={{ fontSize: '16px' }} />
                                            ) : (
                                                <>
                                                    <ArrowUp size={16} strokeWidth={2.5} />
                                                    <span>UPLOAD</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div style={{ width: '100%', height: '100%' }} />
                            )}
                        </div>
                    </div>
                </div>
            )}
            </div>

            {/* Jury Section - Not part of the simple photo timeline */}
            {/* Jury Section Removed per user request */}


            <input
                type="file"
                ref={fileInputRef}
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setIsUploading(true);
                    setCompressionError(null);
                    
                    try {
                        const options = {
                            maxSizeMB: 0.4,
                            maxWidthOrHeight: 1200,
                            useWebWorker: true,
                            initialQuality: 0.7,
                        };
                        const compressedFile = await imageCompression(file, options);
                        setResolutionImage(compressedFile);
                        setResolutionImageUrl(URL.createObjectURL(compressedFile));
                        // ONLY NOW show the UI overlay once we have the picture
                        setIsResolving(true);
                    } catch (err) {
                        console.error('Compression failed:', err);
                        setCompressionError('Failed to process image');
                    } finally {
                        setIsUploading(false);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                }}
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                tabIndex={-1}
            />
        </>
    );
};
