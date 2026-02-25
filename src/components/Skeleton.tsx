import React from 'react';
import './Skeleton.css';

export const SkeletonText: React.FC<{ width?: string; lines?: number }> = ({ width = '100%', lines = 1 }) => {
  return (
    <>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="skeleton skeleton-text" 
          style={{ width: i === lines - 1 ? width : '100%' }}
        />
      ))}
    </>
  );
};

export const SkeletonTitle: React.FC<{ width?: string }> = ({ width = '60%' }) => {
  return <div className="skeleton skeleton-title" style={{ width }} />;
};

export const SkeletonCircle: React.FC<{ size?: number }> = ({ size = 40 }) => {
  return (
    <div 
      className="skeleton skeleton-circle" 
      style={{ width: size, height: size }}
    />
  );
};

export const SkeletonCard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="skeleton-card">
      {children || <SkeletonText lines={3} />}
    </div>
  );
};

export const SkeletonInfoRow: React.FC = () => {
  return (
    <div className="skeleton-info-row">
      <SkeletonCircle size={40} />
      <div className="skeleton-info-text">
        <div className="skeleton skeleton-text" style={{ width: '30%', height: '0.75rem' }} />
        <div className="skeleton skeleton-text" style={{ width: '70%', height: '1rem' }} />
      </div>
      <div className="skeleton skeleton-badge" />
    </div>
  );
};

interface MapLoadingOverlayProps {
  message?: string;
}

export const MapLoadingOverlay: React.FC<MapLoadingOverlayProps> = ({ message = 'Loading map data...' }) => {
  return (
    <div className="skeleton-map-overlay">
      <div className="skeleton-loader">
        <div className="skeleton-spinner" />
        <span className="skeleton-loader-text">{message}</span>
      </div>
    </div>
  );
};

export const PanelSkeleton: React.FC = () => {
  return (
    <div className="skeleton-panel">
      <div className="skeleton-panel-header">
        <SkeletonTitle width="50%" />
        <div className="skeleton" style={{ width: '60px', height: '24px' }} />
      </div>
      <div className="skeleton-panel-content">
        <SkeletonInfoRow />
        <SkeletonInfoRow />
        <SkeletonInfoRow />
        <SkeletonCard />
      </div>
    </div>
  );
};

export const AdminListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          background: 'rgba(255,255,255,0.05)', 
          padding: '1rem', 
          borderRadius: '8px', 
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '0.75rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
            <div className="skeleton" style={{ width: '80px', height: '20px' }} />
            <div className="skeleton" style={{ width: '60%', height: '16px' }} />
          </div>
          <div className="skeleton" style={{ width: '80px', height: '32px', borderRadius: '4px' }} />
        </div>
      ))}
    </>
  );
};
