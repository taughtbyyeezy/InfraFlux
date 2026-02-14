import { Router, Request, Response, NextFunction } from 'express';
import { query } from './db';
import { z } from 'zod';

// Validation Schemas
const IssueReportSchema = z.object({
    type: z.enum(['pothole', 'water_logging', 'garbage_dump']),
    location: z.tuple([z.number(), z.number()]),
    reportedBy: z.string().min(1),
    status: z.enum(['active', 'in_progress', 'resolved']).optional(),
    note: z.string().max(500).optional(),
    imageUrl: z.string().url().or(z.literal('')).optional(),
    magnitude: z.number().int().min(1).max(10).optional()
});

const VoteSchema = z.object({
    vote: z.enum(['true', 'false']),
    voterId: z.string().uuid()
});

const ResolveVoteSchema = z.object({
    voterId: z.string().uuid()
});

// Admin Auth Middleware
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
    const adminSecret = req.headers['x-admin-secret'];
    if (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized: Invalid admin secret' });
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
}

// GET /api/map-state?timestamp=XYZ
router.get('/map-state', async (req: Request, res: Response) => {
    const { timestamp } = req.query;
    const targetTime = timestamp ? new Date(timestamp as string) : new Date();

    try {
        const sql = `
      SELECT 
        i.id,
        i.type,
        ST_Y(i.geom::geometry) as lat,
        ST_X(i.geom::geometry) as lng,
        i.reported_by,
        i.created_at as "createdAt",
        i.approved,
        i.votes_true,
        i.votes_false,
        i.resolve_votes,
        i.magnitude,
        u.status,
        u.timestamp as updated_at,
        u.note,
        COALESCE(json_agg(distinct m.image_url) FILTER (WHERE m.image_url IS NOT NULL), '[]') as images
      FROM issues i
      JOIN LATERAL (
        SELECT * FROM issue_updates
        WHERE issue_id = i.id AND timestamp <= $1
        ORDER BY timestamp DESC
        LIMIT 1
      ) u ON true
      LEFT JOIN media m ON m.update_id = u.id
      WHERE (
        (i.type = 'pothole' AND i.created_at >= $1 - interval '2 years') OR
        (i.type = 'water_logging' AND i.created_at >= $1 - interval '30 days') OR
        (i.type = 'garbage_dump')
      )
      GROUP BY i.id, i.type, i.geom, i.reported_by, i.created_at, i.approved, i.votes_true, i.votes_false, i.resolve_votes, i.magnitude, u.id, u.status, u.timestamp, u.note
    `;

        const result = await query(sql, [targetTime]);

        // Transform back to the frontend types (location: [lat, lng])
        const issues = result.rows.map((row: IssueRow) => ({
            ...row,
            location: [parseFloat(row.lat), parseFloat(row.lng)],
            images: row.images
        }));

        res.json({
            timestamp: targetTime.toISOString(),
            issues
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
router.post('/report', async (req: Request, res: Response) => {
    const validation = IssueReportSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: 'Invalid report data', details: validation.error.format() });
    }

    const { type, location, reportedBy, status, note, imageUrl, magnitude } = validation.data;
    const [lat, lng] = location;

    try {
        // Start transaction
        await query('BEGIN');

        // 1. Insert Issue with 1 initial vote from creator
        const issueResult = await query(
            'INSERT INTO issues (type, geom, reported_by, magnitude, votes_true) VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6) RETURNING id',
            [type, lng, lat, reportedBy, magnitude || 5, 1]
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
router.post('/issue/:id/approve', adminAuth, async (req: Request, res: Response) => {
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
router.post('/issue/:id/delist', adminAuth, async (req: Request, res: Response) => {
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
