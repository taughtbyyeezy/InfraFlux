import React from 'react';
import { Moon, Sun, Heart, X, Copy } from 'lucide-react';
import { hapticButton } from '../../utils/haptic';

interface MobileHeaderProps {
    theme: 'light' | 'dark';
    isMenuOpen: boolean;
    onMenuToggle: () => void;
    selectedTypes: string[];
    onToggleType: (type: string) => void;
    onThemeToggle: () => void;
    onDonateClick?: () => void;
    isHidden?: boolean;
    issueCounts: Record<string, number>;
    voterId?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
    theme,
    isMenuOpen,
    onMenuToggle,
    selectedTypes,
    onToggleType,
    onThemeToggle,
    onDonateClick,
    isHidden = false,
    issueCounts,
    voterId
}) => {
    const copyToClipboard = (text: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            hapticButton();
        } else {
            // Fallback for non-secure contexts
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                hapticButton();
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textArea);
        }
    };

    return (
        <>
            <div className={`mobile-header ${isHidden ? 'hidden-for-support' : ''}`}>
                <div className="mobile-logo">
                    <img
                        src={theme === 'light' ? '/infrafluxwhite.png' : '/infrafluxblack.png'}
                        alt="InfraFlux Logo"
                    />
                </div>
                <div className="mobile-logo-typeface">
                    <img
                        src={theme === 'light' ? '/logo/infraFLUX_black_bohme_mid.png' : '/logo/infraFLUX_white_bohme_mid.png'}
                        alt="InfraFlux"
                    />
                </div>
                <button
                    className={`mobile-hamburger ${isMenuOpen ? 'active' : ''}`}
                    onClick={() => {
                        hapticButton();
                        onMenuToggle();
                    }}
                >
                    <div className="hamburger-line"></div>
                    <div className="hamburger-line"></div>
                    <div className="hamburger-line"></div>
                </button>
            </div>

            {/* Mobile Dropdown Menu (Android/Material Style) */}
            <div className={`mobile-dropdown ${isMenuOpen ? 'open' : ''} ${isHidden ? 'hidden-for-support' : ''}`}>
                <div className="mobile-dropdown-content">
                    <div className="menu-section">
                        <div className="menu-label">FILTERS</div>
                        <div className="android-menu-grid">
                            <div
                                className={`android-filter-item ${selectedTypes.includes('pothole') ? 'active' : ''}`}
                                onClick={() => {
                                    hapticButton();
                                    onToggleType('pothole');
                                }}
                            >
                                <div className="android-icon-box" style={{ background: '#ef4444' }}>
                                    {issueCounts['pothole'] || 0}
                                </div>
                                <span className="android-label">Potholes</span>
                            </div>

                            <div
                                className={`android-filter-item ${selectedTypes.includes('garbage_dump') ? 'active' : ''}`}
                                onClick={() => {
                                    hapticButton();
                                    onToggleType('garbage_dump');
                                }}
                            >
                                <div className="android-icon-box" style={{ background: '#fbbf24' }}>
                                    {issueCounts['garbage_dump'] || 0}
                                </div>
                                <span className="android-label">Garbage Dump</span>
                            </div>

                            <div
                                className={`android-filter-item ${selectedTypes.includes('water_logging') ? 'active' : ''}`}
                                onClick={() => {
                                    hapticButton();
                                    onToggleType('water_logging');
                                }}
                            >
                                <div className="android-icon-box" style={{ background: '#3b82f6' }}>
                                    {issueCounts['water_logging'] || 0}
                                </div>
                                <span className="android-label">Water Logging</span>
                            </div>

                            <div
                                className="android-support-btn"
                                onClick={() => {
                                    hapticButton();
                                    onDonateClick?.();
                                }}
                            >
                                <div className="android-support-icon">
                                    <Heart size={30} fill="#ffffff" color="#ffffff" />
                                </div>
                                <span className="android-support-label">Support Me</span>
                            </div>
                        </div>
                    </div>

                    <div className="menu-section" style={{ marginTop: '1rem' }}>
                        <div className="menu-label">APPEARANCE</div>
                        <div
                            className="android-appearance-bar"
                            onClick={() => {
                                hapticButton();
                                onThemeToggle();
                            }}
                        >
                            {theme === 'light' ? (
                                <><Moon size={20} /> Dark Mode</>
                            ) : (
                                <><Sun size={20} /> Light Mode</>
                            )}
                        </div>
                    </div>

                    {voterId && (
                        <div className="menu-section" style={{ marginTop: '1rem' }}>
                            <div className="menu-label">REWARDS PROGRAM</div>
                            <div className="reward-id-card">
                                <div className="reward-id-header">
                                    <Heart size={16} fill="currentColor" />
                                    <span>Reward Payout ID</span>
                                </div>
                                <div className="reward-id-box">
                                    <span className="reward-id-value">
                                        {voterId.substring(0, 8)}...
                                    </span>
                                    <button
                                        className="reward-id-copy"
                                        onClick={() => copyToClipboard(voterId)}
                                        aria-label="Copy Reward ID"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <p className="reward-id-info">
                                    This anonymous ID is stored locally on your device to track your 10 reports and prevent duplicate payouts.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

