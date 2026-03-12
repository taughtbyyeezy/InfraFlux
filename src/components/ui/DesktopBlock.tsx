import React from 'react';
import { Smartphone, X } from 'lucide-react';
import { hapticButton } from '../../utils/haptic';

interface DesktopBlockProps {
    onClose?: () => void;
}

export const DesktopBlock: React.FC<DesktopBlockProps> = ({ onClose }) => {
    // We remove the hard window.innerWidth check here and control it via UserMap logic

    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://www.infraflux.space';
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;

    return (
        <div className="desktop-block-container">
            <div className="desktop-block-content">
                {onClose && (
                    <button
                        className="desktop-block-close"
                        onClick={() => {
                            hapticButton();
                            onClose();
                        }}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                )}
                <div className="desktop-block-icon">
                    <Smartphone size={40} className="smartphone-icon" />
                </div>
                <h1>Mobile Only</h1>
                <p>
                    Reporting requires on-site verification (Camera/GPS), only available on mobile devices.
                </p>

                <div className="qr-container">
                    <img src={qrCodeUrl} alt="Scan to open on mobile" className="qr-image" />
                    <span>Scan to report</span>
                </div>

                <div className="desktop-block-footer">
                    <p>You can still browse on desktop.</p>
                </div>
            </div>
        </div>
    );
};

export default DesktopBlock;
