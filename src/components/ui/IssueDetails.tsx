import React from 'react';
import { Clock, AlertTriangle, ExternalLink, Maximize2 } from 'lucide-react';
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

            {((issue.reported_mla_name || issue.mla_name) || (issue.current_mla_name) || (issue.reported_ac_name || issue.ac_name) || (issue.current_ac_name)) && (
                <div className="menu-section">
                    <div className="menu-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                        REPRESENTATIVE JURISDICTION
                    </div>

                    {/* Logic: Only show two cards if both exist and are different */}
                    {((issue.reported_mla_name || issue.mla_name) && issue.current_mla_name &&
                        ((issue.reported_mla_name || issue.mla_name) !== issue.current_mla_name ||
                            (issue.reported_ac_name || issue.ac_name) !== issue.current_ac_name)) ? (
                        <>
                            {/* Current MLA */}
                            <div className="jurisdiction-card" style={{ marginBottom: '12px' }}>
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
            )}

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
                                background: 'var(--glass-card)',
                                border: '1px solid var(--border-light)'
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
                                            (target.nextSibling as HTMLAnchorElement).style.display = 'none';
                                            (target.nextSibling.nextSibling as HTMLElement).style.display = 'flex';
                                        }
                                    }}
                                />
                                <a
                                    href={img}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '8px',
                                        background: 'rgba(0, 0, 0, 0.5)',
                                        backdropFilter: 'blur(4px)',
                                        color: 'white',
                                        padding: '6px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        zIndex: 5,
                                        transition: 'all 0.2s ease'
                                    }}
                                    className="image-expand-btn"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Maximize2 size={16} />
                                </a>
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
