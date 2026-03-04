import React, { useRef, useEffect, useState } from 'react';
import { Navigation, PlusCircle, ChevronRight } from 'lucide-react';
import { IssueType } from '../../types';
import { hapticButton } from '../../utils/haptic';
import ImageUpload from './ImageUpload';

interface ReportFormData {
    type: IssueType;
    note: string;
    imageUrl: string;
    imageFile: File | null;
    location: [number, number] | null;
    magnitude: number;
    honeypot?: string;
    userLocation?: [number, number] | null;
}

interface ReportFormProps {
    formData: ReportFormData;
    onChange: (data: Partial<ReportFormData>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    onGetLocation: () => void;
    isMobile?: boolean;
    uploadProgress?: number;
    isSubmitting?: boolean;
}

const issueTypes = [
    { value: 'pothole', label: 'Pothole', color: '#ef4444' },
    { value: 'water_logging', label: 'Water Logging', color: '#3b82f6' },
    { value: 'garbage_dump', label: 'Garbage Dump', color: '#fbbf24' }
];

const severityLevels = [
    { value: 2, label: 'Low', description: 'Minor issue', color: '#22c55e' },
    { value: 5, label: 'Moderate', description: 'Affects usage', color: '#eab308' },
    { value: 8, label: 'High', description: 'Dangerous', color: '#ef4444' }
];

const DesktopReportForm: React.FC<ReportFormProps & { isUploading: boolean; setIsUploading: (v: boolean) => void }> = ({
    formData,
    onChange,
    onSubmit,
    onCancel,
    onGetLocation,
    isUploading,
    setIsUploading,
    uploadProgress = 0,
    isSubmitting = false
}) => {
    const noteRef = useRef<HTMLTextAreaElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (formRef.current) {
                const firstInput = formRef.current.querySelector('select, button, textarea') as HTMLElement;
                if (firstInput) {
                    firstInput.focus();
                }
            }
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    const handleSeveritySelect = (value: number) => {
        hapticButton();
        onChange({ magnitude: value });
    };

    return (
        <form ref={formRef} onSubmit={onSubmit} onKeyDown={handleKeyDown} className="desktop-report-form">
            <div className="form-header">
                <h2>Report Issue</h2>
                <button type="button" className="detail-close-btn" onClick={onCancel}>
                    <div className="hamburger-line"></div>
                    <div className="hamburger-line"></div>
                    <div className="hamburger-line"></div>
                </button>
            </div>

            <div className="form-scroll-content">
                <div className="form-group">
                    <label htmlFor="issue-type">ISSUE TYPE</label>
                    <select
                        id="issue-type"
                        value={formData.type}
                        onChange={(e) => onChange({ type: e.target.value as IssueType })}
                        className="form-select"
                    >
                        {issueTypes.map(type => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>SEVERITY LEVEL</label>
                    <div className="severity-buttons">
                        {severityLevels.map((level) => (
                            <button
                                key={level.value}
                                type="button"
                                className={`severity-btn severity-${level.label.toLowerCase()} ${formData.magnitude === level.value ? 'active' : ''}`}
                                onClick={() => handleSeveritySelect(level.value)}
                                style={{ '--severity-color': level.color } as React.CSSProperties}
                            >
                                <span className="severity-label">{level.label}</span>
                                <span className="severity-desc">{level.description}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label>LOCATION</label>
                    <div className="location-group">
                        <button
                            type="button"
                            className="btn-coordinate-display"
                            onClick={() => {
                                hapticButton();
                                onGetLocation();
                            }}
                        >
                            {formData.location ? (
                                <span className="location-coordinates">
                                    {formData.location[0].toFixed(4)}, {formData.location[1].toFixed(4)}
                                </span>
                            ) : (
                                <span className="location-placeholder">Tap on the map to set location</span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                hapticButton();
                                onGetLocation();
                            }}
                            className="btn-locate-square"
                            aria-label="Use my current location"
                        >
                            <Navigation size={18} color="white" />
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label>PHOTO EVIDENCE</label>
                    <ImageUpload
                        onCompressionComplete={(file) => {
                            onChange({ imageFile: file, imageUrl: URL.createObjectURL(file) });
                            setIsUploading(false);
                        }}
                        onCompressionStart={() => setIsUploading(true)}
                        onCompressionError={() => setIsUploading(false)}
                        onReset={() => onChange({ imageUrl: '', imageFile: null })}
                        currentImageUrl={formData.imageUrl}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">DESCRIPTION</label>
                    <textarea
                        id="description"
                        ref={noteRef}
                        value={formData.note}
                        onChange={(e) => onChange({ note: e.target.value })}
                        placeholder="Describe the issue..."
                        rows={3}
                        className="form-textarea"
                    />
                </div>

                {/* Honeypot field - hidden from users */}
                <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0, overflow: 'hidden' }} aria-hidden="true">
                    <input
                        type="text"
                        name="website_url_field"
                        tabIndex={-1}
                        autoComplete="off"
                        value={formData.honeypot || ''}
                        onChange={(e) => onChange({ honeypot: e.target.value })}
                    />
                </div>
            </div>
            <hr className="form-header-separator" />
            <div className="form-footer">
                <button
                    type="submit"
                    className={`report-btn-highlight progress-btn ${(isUploading || isSubmitting) ? 'loading' : ''}`}
                    disabled={!formData.location || isUploading || isSubmitting}
                    onClick={hapticButton}
                    style={{
                        height: '50px',
                        fontSize: '15px',
                        '--progress': `${isSubmitting ? uploadProgress : (isUploading ? 50 : 0)}%`
                    } as React.CSSProperties}
                >
                    <div className="progress-fill" />
                    <div className="btn-content">
                        <div className="btn-icon-left"><PlusCircle size={22} /></div>
                        <span className="btn-text-center">{isSubmitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}</span>
                        <div className="btn-icon-right"><ChevronRight size={20} /></div>
                    </div>
                </button>
            </div>
        </form >
    );
};

const MobileReportForm: React.FC<ReportFormProps & { isUploading: boolean; setIsUploading: (v: boolean) => void }> = ({
    formData,
    onChange,
    onSubmit,
    onCancel,
    onGetLocation,
    isUploading,
    setIsUploading,
    uploadProgress = 0,
    isSubmitting = false
}) => {
    const noteRef = useRef<HTMLTextAreaElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (formRef.current) {
                const firstInput = formRef.current.querySelector('select, button, textarea') as HTMLElement;
                if (firstInput) {
                    firstInput.focus();
                }
            }
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    const handleSeveritySelect = (value: number) => {
        hapticButton();
        onChange({ magnitude: value });
    };

    return (
        <form ref={formRef} onSubmit={onSubmit} className="report-form mobile-report-form">
            <div className="form-header">
                <h2>Report Issue</h2>
                <hr className="form-header-separator" />
            </div>

            <div className="form-body">
                <div className="form-group">
                    <label htmlFor="issue-type">ISSUE TYPE</label>
                    <select
                        id="issue-type"
                        value={formData.type}
                        onChange={(e) => onChange({ type: e.target.value as IssueType })}
                        className="form-select"
                    >
                        {issueTypes.map(type => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>SEVERITY LEVEL</label>
                    <div className="severity-buttons">
                        {severityLevels.map((level) => (
                            <button
                                key={level.value}
                                type="button"
                                className={`severity-btn severity-${level.label.toLowerCase()} ${formData.magnitude === level.value ? 'active' : ''}`}
                                onClick={() => handleSeveritySelect(level.value)}
                                style={{ '--severity-color': level.color } as React.CSSProperties}
                            >
                                <span className="severity-label">{level.label}</span>
                                <span className="severity-desc">{level.description}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label>LOCATION</label>
                    <div className="location-row">
                        {formData.location ? (
                            <span className="location-coordinates">
                                {formData.location[0].toFixed(4)}, {formData.location[1].toFixed(4)}
                            </span>
                        ) : (
                            <span className="location-placeholder">Tap on the map to set location</span>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                hapticButton();
                                onGetLocation();
                            }}
                            className="btn-locate-square"
                            aria-label="Use my current location"
                        >
                            <Navigation size={18} color="white" />
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label>PHOTO EVIDENCE</label>
                    <ImageUpload
                        onCompressionComplete={(file) => {
                            onChange({ imageFile: file, imageUrl: URL.createObjectURL(file) });
                            setIsUploading(false);
                        }}
                        onCompressionStart={() => setIsUploading(true)}
                        onCompressionError={() => setIsUploading(false)}
                        onReset={() => onChange({ imageUrl: '', imageFile: null })}
                        currentImageUrl={formData.imageUrl}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">DESCRIPTION</label>
                    <textarea
                        id="description"
                        ref={noteRef}
                        value={formData.note}
                        onChange={(e) => onChange({ note: e.target.value })}
                        placeholder="Describe the issue..."
                        rows={3}
                        className="form-textarea"
                    />
                </div>

                {/* Honeypot field - hidden from users */}
                <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0, overflow: 'hidden' }} aria-hidden="true">
                    <input
                        type="text"
                        name="website_url_field"
                        tabIndex={-1}
                        autoComplete="off"
                        value={formData.honeypot || ''}
                        onChange={(e) => onChange({ honeypot: e.target.value })}
                    />
                </div>
            </div>
            <hr className="form-header-separator" />
            <div className="form-footer">
                <button
                    type="submit"
                    className={`btn-submit progress-btn ${(isUploading || isSubmitting) ? 'loading' : ''}`}
                    disabled={!formData.location || isUploading || isSubmitting}
                    onClick={hapticButton}
                    style={{
                        flex: 1,
                        height: '44px',
                        fontSize: '15px',
                        '--progress': `${isSubmitting ? uploadProgress : (isUploading ? 50 : 0)}%`
                    } as React.CSSProperties}
                >
                    <div className="progress-fill" />
                    <div className="btn-content">
                        <div className="btn-icon-left" />
                        <span className="btn-text-center">{isSubmitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}</span>
                        <div className="btn-icon-right"><ChevronRight size={20} /></div>
                    </div>
                </button>
            </div>
        </form>
    );
};

export const ReportForm: React.FC<ReportFormProps> = (props) => {
    const [isUploading, setIsUploading] = useState(false);

    if (props.isMobile) {
        return <MobileReportForm {...props} isUploading={isUploading} setIsUploading={setIsUploading} isSubmitting={props.isSubmitting} />;
    }
    return <DesktopReportForm {...props} isUploading={isUploading} setIsUploading={setIsUploading} isSubmitting={props.isSubmitting} />;
};

export default ReportForm;
