import React from 'react';
import { Shield } from 'lucide-react';

interface AdminLoginOverlayProps {
    password: string;
    onPasswordChange: (password: string) => void;
    onSubmit: () => void;
}

export const AdminLoginOverlay: React.FC<AdminLoginOverlayProps> = ({
    password,
    onPasswordChange,
    onSubmit
}) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 20000,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'var(--glass-surface)',
                border: '1px solid var(--glass-border)',
                borderRadius: '24px',
                padding: '40px',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
                <Shield style={{ color: 'var(--accent)', marginBottom: '20px' }} size={48} />
                <h2 style={{ color: 'white', marginBottom: '10px', fontSize: '1.5rem' }}>Admin Access</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.9rem' }}>
                    Please enter the administrative password to manage infrastructure reports.
                </p>
                <input
                    type="password"
                    placeholder="Admin Password"
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && password) {
                            onSubmit();
                        }
                    }}
                    style={{
                        width: '100%',
                        padding: '15px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '12px',
                        color: 'white',
                        marginBottom: '20px',
                        fontSize: '1rem',
                        outline: 'none'
                    }}
                />
                <button
                    onClick={onSubmit}
                    disabled={!password}
                    style={{
                        width: '100%',
                        padding: '15px',
                        background: 'var(--accent)',
                        color: 'black',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: '700',
                        fontSize: '1rem',
                        cursor: password ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        opacity: password ? 1 : 0.5
                    }}
                >
                    Authorize Access
                </button>
            </div>
        </div>
    );
};
