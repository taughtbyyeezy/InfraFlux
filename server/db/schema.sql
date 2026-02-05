-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Issue Types Enum (Idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_type') THEN
        CREATE TYPE issue_type AS ENUM ('pothole', 'water_logging', 'garbage_dump');
    END IF;
END $$;

-- Issue Status Enum (Idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_status') THEN
        CREATE TYPE issue_status AS ENUM ('active', 'in_progress', 'resolved');
    END IF;
END $$;

-- Main Issues Table
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type issue_type NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL, -- WGS84 coordinates
    reported_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved BOOLEAN DEFAULT FALSE,
    votes_true INTEGER DEFAULT 0,
    votes_false INTEGER DEFAULT 0,
    votes_resolve INTEGER DEFAULT 0,
    magnitude INTEGER DEFAULT 5
);

-- Historical Updates Table
CREATE TABLE IF NOT EXISTS issue_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    status issue_status NOT NULL,
    note TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Media Table for Visual Proof
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_id UUID REFERENCES issue_updates(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial Index
CREATE INDEX IF NOT EXISTS issues_geom_idx ON issues USING GIST (geom);

-- Helper view for current state at a specific time
CREATE OR REPLACE VIEW current_issue_states AS
SELECT DISTINCT ON (i.id)
    i.id,
    i.type,
    ST_Y(i.geom::geometry) as lat,
    ST_X(i.geom::geometry) as lng,
    i.reported_by,
    i.created_at,
    u.status,
    u.timestamp as updated_at,
    u.note
FROM issues i
JOIN issue_updates u ON i.id = u.issue_id
ORDER BY i.id, u.timestamp DESC;
