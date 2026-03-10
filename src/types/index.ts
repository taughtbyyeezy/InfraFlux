export type IssueType = 'pothole' | 'streetlight' | 'water_logging' | 'garbage_dump';
export type IssueStatus = 'active' | 'resolved' | 'in_progress';
export type PotholeSize = 'small' | 'medium' | 'large';
export type Severity = 'low' | 'medium' | 'high';

export interface InfrastructureIssue {
    id: string;
    type: IssueType;
    location: [number, number]; // Lat, Lng
    status: IssueStatus;
    createdAt: string;
    resolvedAt: string | null;
    reportedBy: string;
    size?: PotholeSize;
    severity?: Severity;
    isOperational?: boolean;
    images?: string[]; // Visual proof gallery
    approved?: boolean;
    votes_true?: number;
    votes_false?: number;
    resolve_votes?: number;
    magnitude?: number;
    note?: string;
    originalId?: string;
    mla_name?: string;
    party?: string;
    ac_name?: string;
    st_name?: string;
    dist_name?: string;
    constituency_id?: number | string;
}

export interface HistoricalSnapshot {
    timestamp: string;
    issues: InfrastructureIssue[];
}
