/**
 * InfraFlux API Routes
 * 
 * [Spatial Data Journey] 85% Size Reduction
 * 1. 250MB+ Shapefiles simplified via Douglas-Peucker to GeoJSON (<40MB).
 * 2. Reduced vertex density & precision (6 decimals) for cloud-performance.
 * 3. Integrated India-wide MLA metadata into PostGIS `mla_data`.
 * 4. Point-in-Polygon (ST_Contains) with GiST indexing for O(1) jurisdiction lookup.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { query } from './db.js';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

// Rate Limiters
const reportSubmissionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 5, // Limit each IP to 5 reports per minute
    message: { error: "Too many reports submitted from this IP, please try again after a minute." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Validation Schemas
const sanitizeHTML = (str: string): string => {
    return str.replace(/<[^>]*>?/gm, ''); // Basic regex to strip tags
};

const IssueReportSchema = z.object({
    type: z.enum(['pothole', 'water_logging', 'garbage_dump']),
    location: z.tuple([z.number(), z.number()]),
    reportedBy: z.string().min(1),
    status: z.enum(['active', 'in_progress', 'resolved']).optional(),
    note: z.string().max(500).optional(),
    imageUrl: z.string().url().or(z.literal('')).optional(),
    magnitude: z.number().int().min(1).max(10).optional(),
    honeypot: z.string().max(0).optional(), // Must be empty
    userLocation: z.tuple([z.number(), z.number()]).optional() // Real GPS location
});

const LookupMLASchema = z.object({
    lat: z.string().transform(Number),
    lng: z.string().transform(Number)
});

const VoteSchema = z.object({
    vote: z.enum(['true', 'false']),
    voterId: z.string().uuid()
});

const ResolveVoteSchema = z.object({
    voterId: z.string().uuid()
});

// Admin Auth Middleware
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const clientSecret = req.headers['x-admin-secret'];
    const serverSecret = process.env.ADMIN_SECRET;
    
    if (!clientSecret || clientSecret !== serverSecret) {
        return res.status(403).json({ error: "Unauthorized: Invalid admin secret" });
    }
    next();
};


const router = Router();

interface IssueRow {
    id: string;
    type: string;
    lat: string;
    lng: string;
    reported_by: string;
    createdAt: Date;
    approved: boolean;
    votes_true: number;
    votes_false: number;
    resolve_votes: number;
    magnitude: number;
    status: string;
    updated_at: Date;
    images: string[];
    note: string;
    reported_mla_name?: string;
    reported_mla_party?: string;
    reported_ac_name?: string;
    reported_st_name?: string;
    reported_dist_name?: string;
    current_mla_name?: string;
    current_mla_party?: string;
    current_ac_name?: string;
    current_st_name?: string;
    current_dist_name?: string;
}

// Haversine formula to calculate distance in km
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// GET /api/lookup-mla?lat=XYZ&lng=XYZ
router.get('/lookup-mla', async (req: Request, res: Response) => {
    try {
        const { lat, lng } = LookupMLASchema.parse(req.query);

        const sql = `
            SELECT 
                ac_name,
                mla_name,
                party,
                st_name,
                dist_name
            FROM mla_data 
            WHERE ST_Contains(geom, ST_SetSRID(ST_Point($1, $2), 4326))
            LIMIT 1;
        `;

        const result = await query(sql, [lng, lat]);

        if (result.rows.length === 0) {
            return res.json({ found: false });
        }

        res.json({
            found: true,
            ...result.rows[0]
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }
        console.error('Error looking up MLA:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/map-state?timestamp=XYZ&minLng=A&minLat=B&maxLng=C&maxLat=D
router.get('/map-state', async (req: Request, res: Response) => {
    const { timestamp, minLng, minLat, maxLng, maxLat } = req.query;
    const targetTime = timestamp ? new Date(timestamp as string) : new Date();

    const hasBounds = minLng && minLat && maxLng && maxLat;

    try {
        const sql = `
      SELECT 
        i.id,
        i.type,
        ST_Y(i.geom::geometry) as lat,
        ST_X(i.geom::geometry) as lng,
        i.created_at as "createdAt",
        i.approved,
        i.votes_true,
        i.votes_false,
        i.resolve_votes,
        i.magnitude,
        u.status,
        u.timestamp as updated_at,
        u.note,
        i.reported_mla_name,
        i.reported_mla_party,
        i.reported_ac_name,
        i.reported_st_name,
        i.reported_dist_name,
        ac.mla_name as current_mla_name,
        ac.party as current_mla_party,
        ac.ac_name as current_ac_name,
        ac.st_name as current_st_name,
        ac.dist_name as current_dist_name,
        COALESCE(json_agg(distinct m.image_url) FILTER (WHERE m.image_url IS NOT NULL), '[]') as images
      FROM issues i
      ${hasBounds ? 'WHERE ST_Intersects(i.geom, ST_MakeEnvelope($2, $3, $4, $5, 4326))' : ''}
      JOIN LATERAL (
        SELECT * FROM issue_updates
        WHERE issue_id = i.id AND timestamp <= $1
        ORDER BY timestamp DESC
        LIMIT 1
      ) u ON true
      LEFT JOIN media m ON m.update_id = u.id
      LEFT JOIN mla_data ac ON ST_Contains(ac.geom, i.geom::geometry)
      GROUP BY i.id, i.type, i.geom, i.reported_by, i.created_at, i.approved, i.votes_true, i.votes_false, i.resolve_votes, i.magnitude, u.id, u.status, u.timestamp, u.note, i.reported_mla_name, i.reported_mla_party, i.reported_ac_name, i.reported_st_name, i.reported_dist_name, ac.id
      ORDER BY i.created_at DESC
      ${hasBounds ? '' : 'LIMIT 100'};
    `;

        const params = hasBounds 
            ? [targetTime, minLng, minLat, maxLng, maxLat] 
            : [targetTime];

        const result = await query(sql, params);

        // Transform back to the frontend types (location: [lat, lng])
        const issues = result.rows.map((row: IssueRow) => ({
            ...row,
            location: [parseFloat(row.lat), parseFloat(row.lng)],
            images: row.images
        }));

        // Infrastructure IP-based geolocation approximation
        // Vercel: x-vercel-ip-latitude, x-vercel-ip-longitude
        // Render: x-render-lat, x-render-lon
        const ipLat = req.headers['x-vercel-ip-latitude'] || req.headers['x-render-lat'];
        const ipLng = req.headers['x-vercel-ip-longitude'] || req.headers['x-render-lon'];

        let userDefaultLocation = null;
        if (ipLat && ipLng) {
            const lat = parseFloat(ipLat as string);
            const lng = parseFloat(ipLng as string);
            if (!isNaN(lat) && !isNaN(lng)) {
                userDefaultLocation = [lat, lng];
            }
        }

        res.json({
            timestamp: targetTime.toISOString(),
            issues,
            userDefaultLocation
        });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({
            error: 'Failed to fetch map state',
            details: err.message
        });
    }
});


// POST /api/report
router.post('/report', reportSubmissionLimiter, async (req: Request, res: Response) => {
    const validation = IssueReportSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Invalid report data', details: validation.error.format() });
    }

    const { type, location, reportedBy, status, note: rawNote, imageUrl, magnitude, honeypot, userLocation } = validation.data;
    const note = rawNote ? sanitizeHTML(rawNote) : undefined;

    // 1. User-Agent Mobile Verification for Incentive Program
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    // We allow overrides for development, but for production incentive security, mobile is required
    if (!isMobile && process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Verified reporting is only available on mobile devices.' });
    }

    // 2. Honeypot check
    if (honeypot) {
        return res.status(400).json({ error: 'Bot detected' });
    }

    // 3. Geofencing check (Strict 500m limit for incentives)
    const [lat, lng] = location;
    if (userLocation) {
        const distance = getDistance(userLocation[0], userLocation[1], lat, lng);
        if (distance > 0.5) { // 500 meters threshold
            return res.status(400).json({
                error: 'Geofencing failed: Report marker must be within 500m of your real-time GPS location.'
            });
        }
    } else if (process.env.NODE_ENV === 'production') {
        // Require userLocation for verified reports in production
        return res.status(400).json({ error: 'Real-time GPS location is required for verified reporting.' });
    }

    // 4. Lookup MLA at report location
    let reportedMLA = { mla_name: null, party: null, ac_name: null, st_name: null, dist_name: null };
    try {
        const mlaResult = await query(`
            SELECT mla_name, party, ac_name, st_name, dist_name
            FROM mla_data 
            WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
            LIMIT 1
        `, [lng, lat]);

        if (mlaResult.rows.length > 0) {
            reportedMLA = mlaResult.rows[0];
        }
    } catch (mlaError) {
        console.error('Error looking up MLA for report:', mlaError);
    }

    try {
        // Start transaction
        await query('BEGIN');

        // 1. Insert Issue with 1 initial vote from creator
        const issueResult = await query(
            `INSERT INTO issues (type, geom, reported_by, magnitude, votes_true, reported_mla_name, reported_mla_party, reported_ac_name, reported_st_name, reported_dist_name) 
             VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, $8, $9, $10, $11) 
             RETURNING id`,
            [type, lng, lat, reportedBy, magnitude || 5, 1, reportedMLA.mla_name, reportedMLA.party, reportedMLA.ac_name, reportedMLA.st_name, reportedMLA.dist_name]
        );
        const issueId = issueResult.rows[0].id;

        // 2. Insert Initial Update
        const updateResult = await query(
            'INSERT INTO issue_updates (issue_id, status, note) VALUES ($1, $2, $3) RETURNING id',
            [issueId, status || 'active', note]
        );
        const updateId = updateResult.rows[0].id;

        // 3. Insert Media (if provided)
        if (imageUrl) {
            await query(
                'INSERT INTO media (update_id, image_url) VALUES ($1, $2)',
                [updateId, imageUrl]
            );
        }

        await query('COMMIT');
        res.status(201).json({ id: issueId, message: 'Issue reported successfully' });
    } catch (err) {
        await query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to report issue' });
    }
});

// POST /api/issue/:id/vote
router.post('/issue/:id/vote', async (req: Request, res: Response) => {
    const { id } = req.params;
    const validation = VoteSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({ error: 'Invalid vote data', details: validation.error.format() });
    }

    const { vote, voterId } = validation.data;
    const ip = req.ip || req.socket.remoteAddress;

    try {
        // Check if user already voted
        const existingVote = await query(
            'SELECT id FROM issue_votes WHERE issue_id = $1 AND voter_id = $2 AND vote_type = $3',
            [id, voterId, vote === 'true' ? 'up' : 'down']
        );

        if (existingVote.rows.length > 0) {
            return res.status(409).json({ error: 'You have already cast this type of vote on this issue' });
        }

        // Start transaction
        await query('BEGIN');

        // 1. Record individual vote
        await query(
            'INSERT INTO issue_votes (issue_id, voter_id, vote_type, ip_address) VALUES ($1, $2, $3, $4)',
            [id, voterId, vote === 'true' ? 'up' : 'down', ip]
        );

        // 2. Update counter on issues table
        const column = vote === 'true' ? 'votes_true' : 'votes_false';
        const result = await query(
            `UPDATE issues SET ${column} = ${column} + 1 WHERE id = $1 RETURNING votes_true, votes_false, approved`,
            [id]
        );

        const votesTrue = result.rows[0].votes_true;
        const votesFalse = result.rows[0].votes_false;
        let approved = result.rows[0].approved;
        let delisted = false;

        // Auto-approve if votes_true >= 20
        if (votesTrue >= 20 && !approved) {
            await query('UPDATE issues SET approved = TRUE WHERE id = $1', [id]);
            approved = true;
        }

        // Auto-delist if votes_false >= 5 (fake report threshold)
        if (votesFalse >= 5) {
            await query(
                'INSERT INTO issue_updates (issue_id, status, note) VALUES ($1, $2, $3)',
                [id, 'resolved', 'Auto-delisted after 5 downvotes - marked as fake report']
            );
            delisted = true;
        }

        await query('COMMIT');
        res.json({ message: 'Vote recorded', approved, delisted, votes_true: votesTrue, votes_false: votesFalse });
    } catch (err) {
        await query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to record vote' });
    }
});

// POST /api/issue/:id/approve (Admin)
router.post('/issue/:id/approve', requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await query('UPDATE issues SET approved = TRUE WHERE id = $1', [id]);
        res.json({ message: 'Issue approved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to approve issue' });
    }
});

// POST /api/issue/:id/delist (Admin)
router.post('/issue/:id/delist', requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Create a new issue_update with resolved status
        await query(
            'INSERT INTO issue_updates (issue_id, status, note) VALUES ($1, $2, $3)',
            [id, 'resolved', 'Marked as resolved (delisted) by admin']
        );
        res.json({ message: 'Issue delisted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delist issue' });
    }
});

// POST /api/issue/:id/resolve-vote
router.post('/issue/:id/resolve-vote', async (req: Request, res: Response) => {
    const { id } = req.params;
    const validation = ResolveVoteSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({ error: 'Invalid vote data', details: validation.error.format() });
    }

    const { voterId } = validation.data;
    const ip = req.ip || req.socket.remoteAddress;

    try {
        // Check if user already voted to resolve
        const existingVote = await query(
            'SELECT id FROM issue_votes WHERE issue_id = $1 AND voter_id = $2 AND vote_type = $3',
            [id, voterId, 'resolve']
        );

        if (existingVote.rows.length > 0) {
            return res.status(409).json({ error: 'You have already voted to resolve this issue' });
        }

        // Start transaction
        await query('BEGIN');

        // 1. Record individual vote
        await query(
            'INSERT INTO issue_votes (issue_id, voter_id, vote_type, ip_address) VALUES ($1, $2, $3, $4)',
            [id, voterId, 'resolve', ip]
        );

        // 2. Update counter
        const result = await query(
            `UPDATE issues SET resolve_votes = resolve_votes + 1 WHERE id = $1 RETURNING resolve_votes`,
            [id]
        );

        const currentVotes = result.rows[0].resolve_votes;

        // Auto-resolve if resolve_votes >= 10
        if (currentVotes >= 10) {
            await query(
                'INSERT INTO issue_updates (issue_id, status, note) VALUES ($1, $2, $3)',
                [id, 'resolved', 'Auto-resolved after 10 removal votes']
            );
        }

        await query('COMMIT');
        res.json({ message: 'Resolve vote recorded', resolve_votes: currentVotes });
    } catch (err) {
        await query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to record resolve vote' });
    }
});

export default router;
