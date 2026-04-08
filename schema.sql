-- InfraFlux Local Database Schema
-- Requires PostGIS extension

-- 1. Enable PostGIS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Issue Status ENUM
CREATE TYPE issue_status AS ENUM ('active', 'in_progress', 'resolved', 'pending');

-- 3. Issues Table
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    reported_by VARCHAR(255) NOT NULL,
    magnitude INTEGER DEFAULT 5,
    approved BOOLEAN DEFAULT FALSE,
    votes_true INTEGER DEFAULT 1,
    votes_false INTEGER DEFAULT 0,
    resolve_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reported_mla_name VARCHAR(150),
    reported_mla_party VARCHAR(50),
    reported_ac_name VARCHAR(100),
    reported_st_name VARCHAR(100),
    reported_dist_name VARCHAR(100),
    status issue_status DEFAULT 'active',
    resolution_image_url TEXT,
    resolution_upvotes INTEGER DEFAULT 0,
    resolution_downvotes INTEGER DEFAULT 0,
    op_token VARCHAR(255)
);

-- 3. Issue Updates Table (History/Status)
CREATE TABLE IF NOT EXISTS issue_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    note TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Media Table (Images)
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    update_id UUID REFERENCES issue_updates(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Individual Votes Table (Prevention of double-voting)
CREATE TABLE IF NOT EXISTS issue_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL,
    vote_type VARCHAR(20) NOT NULL, -- 'up', 'down', 'resolve'
    ip_address VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. MLA Data (Spatial Data & Representative Metadata)
CREATE TABLE IF NOT EXISTS mla_data (
    id SERIAL PRIMARY KEY,
    st_name VARCHAR(100) NOT NULL,
    ac_name VARCHAR(100) NOT NULL,
    mla_name VARCHAR(150),
    party VARCHAR(50),
    dist_name VARCHAR(100),
    geom GEOMETRY(MultiPolygon, 4326),
    UNIQUE(st_name, ac_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_issues_geom ON issues USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_issues_reported_mla ON issues (reported_mla_name);
CREATE INDEX IF NOT EXISTS idx_issue_updates_issue_id ON issue_updates(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_votes_issue_voter ON issue_votes(issue_id, voter_id);
CREATE INDEX IF NOT EXISTS idx_mla_spatial_gist ON mla_data USING GIST (geom);
