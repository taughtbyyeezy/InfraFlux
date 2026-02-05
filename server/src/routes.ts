import { Router, Request, Response } from 'express';
import { query } from './db';

const router = Router();

interface IssueRow {
    id: number;
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
        COALESCE(json_agg(m.image_url) FILTER (WHERE m.image_url IS NOT NULL), '[]') as images
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
        (i.type = 'water_logging' AND i.created_at >= $1 - interval '3 days') OR
        (i.type = 'garbage_dump')
      )
      GROUP BY i.id, u.id, u.status, u.timestamp
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch map state' });
    }
});

// POST /api/report
router.post('/report', async (req: Request, res: Response) => {
    const { type, location, reportedBy, status, note, imageUrl, magnitude } = req.body;
    const [lat, lng] = location;

    try {
        // Start transaction
        await query('BEGIN');

        // 1. Insert Issue
        const issueResult = await query(
            'INSERT INTO issues (type, geom, reported_by, magnitude) VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5) RETURNING id',
            [type, lng, lat, reportedBy, magnitude || 5]
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
    const { vote } = req.body; // 'true' or 'false'

    try {
        const column = vote === 'true' ? 'votes_true' : 'votes_false';
        const result = await query(
            `UPDATE issues SET ${column} = ${column} + 1 WHERE id = $1 RETURNING votes_true, approved`,
            [id]
        );

        // Auto-approve if votes_true >= 3
        let approved = result.rows[0].approved;
        if (result.rows[0].votes_true >= 3 && !approved) {
            await query('UPDATE issues SET approved = TRUE WHERE id = $1', [id]);
            approved = true;
        }

        res.json({ message: 'Vote recorded', approved });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to record vote' });
    }
});

// POST /api/issue/:id/approve (Admin)
router.post('/issue/:id/approve', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await query('UPDATE issues SET approved = TRUE WHERE id = $1', [id]);
        res.json({ message: 'Issue approved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to approve issue' });
    }
});

// POST /api/issue/:id/resolve (Admin)
router.post('/issue/:id/resolve', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Create a new issue_update with resolved status
        await query(
            'INSERT INTO issue_updates (issue_id, status, note) VALUES ($1, $2, $3)',
            [id, 'resolved', 'Marked as resolved by admin']
        );
        res.json({ message: 'Issue marked as resolved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to resolve issue' });
    }
});

// POST /api/issue/:id/resolve-vote
router.post('/issue/:id/resolve-vote', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
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

        res.json({ message: 'Resolve vote recorded', resolve_votes: currentVotes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to record resolve vote' });
    }
});

export default router;
