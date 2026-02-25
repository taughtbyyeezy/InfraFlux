import React from 'react';
import { Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { InfrastructureIssue } from '../../types';

interface IssueDetailsProps {
    issue: InfrastructureIssue;
    magnitudeLabel: (mag: number) => string;
}

export const IssueDetails: React.FC<IssueDetailsProps> = ({ issue, magnitudeLabel }) => {
    const getIssueTypeLabel = (type: string) => {
        switch (type) {
            case 'water_logging': return 'Water Logging';
            case 'garbage_dump': return 'Garbage Dump';
            case 'pothole': return 'Pothole';
            default: return String(type || 'Issue').replace(/_/g, ' ');
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const d = dateString ? new Date(dateString) : new Date();
            return isNaN(d.getTime()) ? 'Unknown date' : format(d, 'MMM d, yyyy');
        } catch (e) {
            return 'Unknown date';
        }
    };

    return (
        <>
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

            {issue.note && (
                <div className="menu-section">
                    <div className="menu-label">DESCRIPTION</div>
                    <div className="description-box">
                        {issue.note}
                    </div>
                </div>
            )}

            {issue.images && issue.images.length > 0 && (
                <div className="menu-section">
                    <div className="menu-label">EVIDENCE</div>
                    <div className="evidence-box">
                        {issue.images.map((img, idx) => (
                            <div key={idx} style={{
                                position: 'relative',
                                width: '100%',
                                aspectRatio: '16 / 9',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                background: '#09090b',
                                border: '1px solid var(--glass-border)'
                            }}>
                                <img
                                    src={img}
                                    alt={`Evidence ${idx + 1}`}
                                    className="mobile-evidence-img"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
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
        </>
    );
};
