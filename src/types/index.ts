export type IssueType = 'pothole' | 'streetlight' | 'water_logging' | 'garbage_dump';
export type IssueStatus = 'active' | 'resolved' | 'in_progress' | 'pending';
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
    // Civic Time Machine resolution data
    resolution_image_url?: string;
    resolution_upvotes?: number;
    resolution_downvotes?: number;
    op_token?: string;
    // MLA at time of report (stored when issue was created)
    reported_mla_name?: string;
    reported_mla_party?: string;
    reported_ac_name?: string;
    reported_st_name?: string;
    reported_dist_name?: string;
    // Current MLA (live lookup)
    current_mla_name?: string;
    current_mla_party?: string;
    current_ac_name?: string;
    current_st_name?: string;
    current_dist_name?: string;
    // Legacy fields (for backward compatibility)
    mla_name?: string;
    party?: string;
    ac_name?: string;
    st_name?: string;
    dist_name?: string;
}

export interface HistoricalSnapshot {
    timestamp: string;
    issues: InfrastructureIssue[];
}
