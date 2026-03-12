import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { hapticButton } from '../../utils/haptic';

interface DonateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DonateModal: React.FC<DonateModalProps> = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'upi' | 'crypto'>('upi');
    
    const upiId = "work@progress";
    const cryptoAddress = "work@progress";

    const copyToClipboard = (text: string) => {
        hapticButton();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } else {
            // Fallback for non-secure contexts
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textArea);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="support-modal-overlay" onClick={onClose}>
            <div className="support-modal-card" onClick={e => e.stopPropagation()}>
                <div className="support-modal-tabs">
                    <button 
                        className={`support-tab ${activeTab === 'upi' ? 'active' : ''}`}
                        onClick={() => setActiveTab('upi')}
                    >
                        UPI
                    </button>
                    <button 
                        className={`support-tab ${activeTab === 'crypto' ? 'active' : ''}`}
                        onClick={() => setActiveTab('crypto')}
                    >
                        BTC
                    </button>
                </div>

                <p className="support-modal-tagline">
                    Donate to help keep InfraFlux free and open.
                </p>

                <div className="support-modal-qr">
                    <div className="support-qr-frame">
                        <div className="support-qr-placeholder">
                            <img src="/logo/infraFLUX_black_bohme_mid.png" alt="QR" className="support-qr-logo" />
                        </div>
                    </div>
                </div>

                <div className="support-upi-section">
                    <p className="support-upi-label">{activeTab === 'upi' ? 'UPI ID' : 'WALLET ADDRESS'}</p>
                    <div 
                        className="support-upi-box" 
                        onClick={() => copyToClipboard(activeTab === 'upi' ? upiId : cryptoAddress)}
                    >
                        <span className="support-upi-id">
                            {activeTab === 'upi' ? upiId : cryptoAddress}
                        </span>
                        {copied ? <Check size={18} color="#4caf50" /> : <Copy size={18} />}
                    </div>
                </div>
            </div>
        </div>
    );
};
