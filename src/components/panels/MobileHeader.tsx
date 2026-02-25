import React from 'react';
import { Moon, Sun } from 'lucide-react';

interface MobileHeaderProps {
    theme: 'light' | 'dark';
    isMenuOpen: boolean;
    onMenuToggle: () => void;
    selectedTypes: string[];
    onToggleType: (type: string) => void;
    onThemeToggle: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
    theme,
    isMenuOpen,
    onMenuToggle,
    selectedTypes,
    onToggleType,
    onThemeToggle
}) => {
    return (
        <>
            <div className="mobile-header">
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
                    onClick={onMenuToggle}
                >
                    <div className="hamburger-line"></div>
                    <div className="hamburger-line"></div>
                    <div className="hamburger-line"></div>
                </button>
            </div>

            {/* Mobile Dropdown Menu */}
            <div className={`mobile-dropdown ${isMenuOpen ? 'open' : ''}`}>
                <div className="mobile-dropdown-content">
                    <div className="menu-section">
                        <div className="menu-label">FILTERS</div>
                        <div className="mobile-filter-grid">
                            <button
                                className={`mobile-filter-item ${selectedTypes.includes('pothole') ? 'active' : ''}`}
                                onClick={() => onToggleType('pothole')}
                            >
                                <div className="filter-dot" style={{ background: selectedTypes.includes('pothole') ? '#fbbf24' : 'transparent' }}></div>
                                Potholes
                            </button>
                            <button
                                className={`mobile-filter-item ${selectedTypes.includes('water_logging') ? 'active' : ''}`}
                                onClick={() => onToggleType('water_logging')}
                            >
                                <div className="filter-dot" style={{ background: selectedTypes.includes('water_logging') ? '#3b82f6' : 'transparent' }}></div>
                                Water Logging
                            </button>
                            <button
                                className={`mobile-filter-item ${selectedTypes.includes('garbage_dump') ? 'active' : ''}`}
                                onClick={() => onToggleType('garbage_dump')}
                            >
                                <div className="filter-dot" style={{ background: selectedTypes.includes('garbage_dump') ? '#ef4444' : 'transparent' }}></div>
                                Garbage Dump
                            </button>
                        </div>
                    </div>

                    <div className="menu-section" style={{ marginTop: '1.5rem' }}>
                        <div className="menu-label">APPEARANCE</div>
                        <button
                            type="button"
                            className="mobile-theme-toggle"
                            onClick={onThemeToggle}
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
    );
};
