import React from 'react';
import { Moon, Sun, Heart, X } from 'lucide-react';
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
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
    theme,
    isMenuOpen,
    onMenuToggle,
    selectedTypes,
    onToggleType,
    onThemeToggle,
    onDonateClick,
    isHidden = false
}) => {
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
                                <div className="android-icon-box" style={{ background: '#ef4444' }}></div>
                                <span className="android-label">Potholes</span>
                            </div>

                            <div
                                className={`android-filter-item ${selectedTypes.includes('garbage_dump') ? 'active' : ''}`}
                                onClick={() => {
                                    hapticButton();
                                    onToggleType('garbage_dump');
                                }}
                            >
                                <div className="android-icon-box" style={{ background: '#fbbf24' }}></div>
                                <span className="android-label">Garbage Dump</span>
                            </div>

                            <div
                                className={`android-filter-item ${selectedTypes.includes('water_logging') ? 'active' : ''}`}
                                onClick={() => {
                                    hapticButton();
                                    onToggleType('water_logging');
                                }}
                            >
                                <div className="android-icon-box" style={{ background: '#3b82f6' }}></div>
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
                </div>
            </div>
        </>
    );
};

