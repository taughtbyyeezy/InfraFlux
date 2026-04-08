import React from 'react';
import { XCircle, CheckCircle, Check, Trash } from 'lucide-react';
import { InfrastructureIssue } from '../../types';
import { hapticButton, hapticSuccess } from '../../utils/haptic';

interface VoteButtonsProps {
    issue: InfrastructureIssue;
    isAdmin: boolean;
    isVoting: boolean;
    votingType: 'true' | 'false' | null;
    onVote: (id: string, type: 'true' | 'false') => void;
    onApprove?: (id: string) => void;
    onRemove?: (id: string) => void;
    confidence: number;
}

export const VoteButtons: React.FC<VoteButtonsProps> = ({
    issue,
    isAdmin,
    isVoting,
    votingType,
    onVote,
    onApprove,
    onRemove,
    confidence
}) => {
    if (isAdmin) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', minHeight: '48px', padding: '0 10px' }}>
                <button
                    className="vote-pill-btn active-btn"
                    style={{
                        background: issue.approved ? '#6b7280' : '#10b981',
                        color: 'white',
                        cursor: issue.approved ? 'not-allowed' : 'pointer',
                        opacity: issue.approved ? 0.7 : 1
                    }}
                    onClick={() => {
                        hapticButton();
                        issue.id && !issue.approved && onApprove?.(issue.id);
                    }}
                    disabled={issue.approved}
                >
                    <Check size={18} />
                    <span>{issue.approved ? 'APPROVED' : 'APPROVE'}</span>
                </button>
                <button
                    className="vote-pill-btn fixed-btn"
                    style={{ background: '#ef4444', color: 'white' }}
                    onClick={() => {
                        hapticButton();
                        issue.id && onRemove?.(issue.id);
                    }}
                >
                    <Trash size={18} />
                    <span>REMOVE</span>
                </button>
            </div>
        );
    }

    const isPending = issue.status === 'pending';
    const leftLabel = isPending ? 'FAKE' : 'ACTIVE';
    const rightLabel = 'FIXED';

    return (
        <div className="vote-pill-container">
            <div className="vote-pill">
                <button
                    type="button"
                    className="vote-pill-btn active-btn"
                    onClick={() => {
                        hapticButton();
                        issue.id && onVote(issue.id, 'true');
                    }}
                    disabled={isVoting}
                    style={{
                        opacity: isVoting && votingType === 'true' ? 0.7 : 1,
                        cursor: isVoting ? 'wait' : 'pointer'
                    }}
                >
                    {isVoting && votingType === 'true' ? (
                        <span className="vote-spinner" />
                    ) : (
                        <XCircle size={18} />
                    )}
                    <span>{leftLabel}</span>
                </button>
                <div className="vote-pill-separator"></div>
                <button
                    type="button"
                    className="vote-pill-btn fixed-btn"
                    onClick={() => {
                        hapticButton();
                        issue.id && onVote(issue.id, 'false');
                    }}
                    disabled={isVoting}
                    style={{
                        opacity: isVoting && votingType === 'false' ? 0.7 : 1,
                        cursor: isVoting ? 'wait' : 'pointer'
                    }}
                >
                    {isVoting && votingType === 'false' ? (
                        <span className="vote-spinner" />
                    ) : (
                        <CheckCircle size={18} />
                    )}
                    <span>{rightLabel}</span>
                </button>
            </div>

            {/* Confidence Percentage */}
            <div className="desktop-confidence-display">
                {confidence}%
            </div>
        </div>
    );
};
