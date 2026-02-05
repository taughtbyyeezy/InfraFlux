import React, { useState, useEffect } from 'react';
import { InfrastructureIssue } from '../types';
import { Check, CheckCircle, MapPin, Clock, ArrowLeft, AlertCircle, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

type Tab = 'pending' | 'active' | 'resolved';

const AdminDashboard = () => {
    const [issues, setIssues] = useState<InfrastructureIssue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('pending');
    const baseUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

    const fetchIssues = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${baseUrl}/api/map-state?timestamp=${new Date().toISOString()}`);
            const data = await response.json();
            setIssues(Array.isArray(data.issues) ? data.issues : []);
        } catch (error) {
            console.error('Failed to fetch issues:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchIssues(); }, []);

    const handleApprove = async (id: string) => {
        try {
            await fetch(`${baseUrl}/api/issue/${id}/approve`, { method: 'POST' });
            fetchIssues();
        } catch (error) {
            console.error('Failed to approve:', error);
        }
    };

    const handleResolve = async (id: string) => {
        try {
            await fetch(`${baseUrl}/api/issue/${id}/resolve`, { method: 'POST' });
            fetchIssues();
        } catch (error) {
            console.error('Failed to resolve:', error);
        }
    };

    const safeFormatDate = (dateString: string) => {
        try {
            if (!dateString) return 'Unknown';
            return format(new Date(dateString), 'PP');
        } catch {
            return 'Invalid';
        }
    };

    // Filtered lists
    const pendingIssues = issues.filter(i => !i.approved && i.status !== 'resolved');
    const activeIssues = issues.filter(i => i.approved && i.status !== 'resolved');
    const resolvedIssues = issues.filter(i => i.status === 'resolved');

    // Stats
    const stats = {
        total: issues.length,
        pending: pendingIssues.length,
        active: activeIssues.length,
        resolved: resolvedIssues.length
    };

    const currentList = activeTab === 'pending' ? pendingIssues : activeTab === 'active' ? activeIssues : resolvedIssues;

    const tabStyle = (tab: Tab) => ({
        flex: 1,
        padding: '0.75rem',
        background: activeTab === tab ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        fontWeight: 600,
        borderRadius: tab === 'pending' ? '8px 0 0 8px' : tab === 'resolved' ? '0 8px 8px 0' : '0'
    });

    return (
        <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', color: 'white' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" style={{ color: 'var(--text-muted)', display: 'flex' }}><ArrowLeft size={24} /></Link>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Admin Dashboard</h1>
                </div>
                <button onClick={fetchIssues} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Refresh</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.total}</div>
                    <div style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{stats.pending}</div>
                    <div style={{ color: '#f59e0b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Pending</div>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>{stats.active}</div>
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', textTransform: 'uppercase' }}>Active</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{stats.resolved}</div>
                    <div style={{ color: '#10b981', fontSize: '0.75rem', textTransform: 'uppercase' }}>Resolved</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', marginBottom: '1rem' }}>
                <button style={tabStyle('pending')} onClick={() => setActiveTab('pending')}>Pending ({stats.pending})</button>
                <button style={tabStyle('active')} onClick={() => setActiveTab('active')}>Active ({stats.active})</button>
                <button style={tabStyle('resolved')} onClick={() => setActiveTab('resolved')}>Resolved ({stats.resolved})</button>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {isLoading ? (
                    <p>Loading...</p>
                ) : currentList.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: '#9ca3af' }}>
                        No issues in this category.
                    </div>
                ) : (
                    currentList.map(issue => (
                        <div key={issue.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600, color: issue.type === 'pothole' ? '#ef4444' : '#3b82f6', background: issue.type === 'pothole' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{issue.type}</span>
                                    <span style={{ color: '#6b7280', fontSize: '0.75rem' }}><Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{safeFormatDate(issue.createdAt)}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                                    <MapPin size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                    {issue.location?.[0]?.toFixed(4) || '?'}, {issue.location?.[1]?.toFixed(4) || '?'}
                                </div>
                                {activeTab === 'pending' && (
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                        Votes: <span style={{ color: '#10b981' }}>{issue.votes_true || 0}✓</span> / <span style={{ color: '#ef4444' }}>{issue.votes_false || 0}✗</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {activeTab === 'pending' && (
                                    <button onClick={() => handleApprove(issue.id)} style={{ background: '#10b981', border: 'none', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                                        <Check size={16} /> Approve
                                    </button>
                                )}
                                {activeTab === 'active' && (
                                    <button onClick={() => handleResolve(issue.id)} style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                                        <CheckCircle size={16} /> Resolve
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
