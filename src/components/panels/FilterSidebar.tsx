import React from 'react';
import { PlusCircle } from 'lucide-react';

interface FilterSidebarProps {
    isOpen: boolean;
    selectedTypes: string[];
    onToggleType: (type: string) => void;
    onReportClick: () => void;
}

const filterTypes = [
    { id: 'pothole', label: 'Potholes', color: '#ef4444' },
    { id: 'water_logging', label: 'Water Logging', color: '#3b82f6' },
    { id: 'garbage_dump', label: 'Garbage Dump', color: '#fbbf24' }
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
    isOpen,
    selectedTypes,
    onToggleType,
    onReportClick
}) => {
    return (
        <div className={`side-menu ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                {/* Logo and toggle logic handled by floating hamburger */}
            </div>

            <div className="sidebar-scroll-content">
                <div className="menu-section">
                    <div className="menu-label">FILTERS</div>
                    <div className="filter-group">
                        {filterTypes.map(type => (
                            <div
                                key={type.id}
                                className={`filter-item ${selectedTypes.includes(type.id) ? 'active' : ''}`}
                                onClick={() => onToggleType(type.id)}
                            >
                                <span
                                    className="filter-dot"
                                    style={{
                                        background: selectedTypes.includes(type.id) ? type.color : undefined,
                                    }}
                                ></span>
                                {type.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="sidebar-footer">
                <button className="report-btn-highlight" onClick={onReportClick}>
                    <PlusCircle size={20} /> REPORT ISSUE
                </button>
            </div>
        </div>
    );
};
