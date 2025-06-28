-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (optional - for tracking user behavior)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    email TEXT,
    location_lat DECIMAL(10,8),
    location_lon DECIMAL(11,8),
    total_classifications INTEGER DEFAULT 0,
    total_co2_saved DECIMAL(10,2) DEFAULT 0.0
);

-- Main waste classifications table
CREATE TABLE waste_classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Classification data
    category TEXT NOT NULL,
    subtype TEXT NOT NULL,
    confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
    
    -- Weight and impact
    weight_kg DECIMAL(8,4) NOT NULL,
    co2_saved_kg DECIMAL(10,4) NOT NULL,
    
    -- Location data
    user_lat DECIMAL(10,8),
    user_lon DECIMAL(11,8),
    
    -- Disposal methods (stored as JSONB array)
    disposal_methods JSONB NOT NULL,
    
    -- Location suggestions (stored as JSONB array)
    location_suggestions JSONB NOT NULL,
    
    -- Additional metadata
    image_processed BOOLEAN DEFAULT true,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    CONSTRAINT valid_coordinates CHECK (
        (user_lat IS NULL AND user_lon IS NULL) OR 
        (user_lat BETWEEN -90 AND 90 AND user_lon BETWEEN -180 AND 180)
    )
);

-- Reusable disposal locations table (for caching/reuse)
CREATE TABLE disposal_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Location details
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('dropoff', 'donate', 'dispose', 'error')),
    category TEXT NOT NULL,
    
    -- Geographic data
    lat DECIMAL(10,8) NOT NULL,
    lon DECIMAL(11,8) NOT NULL,
    address TEXT,
    
    -- Contact info
    phone TEXT,
    website TEXT,
    hours TEXT,
    
    -- Metadata
    verified BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    
    CONSTRAINT valid_location_coords CHECK (
        lat BETWEEN -90 AND 90 AND lon BETWEEN -180 AND 180
    )
);

-- Analytics table for aggregated data
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    
    -- Aggregate stats
    total_classifications INTEGER DEFAULT 0,
    total_co2_saved DECIMAL(12,4) DEFAULT 0.0,
    total_weight_processed DECIMAL(12,4) DEFAULT 0.0,
    
    -- Category breakdowns (JSONB for flexibility)
    category_stats JSONB DEFAULT '{}',
    confidence_stats JSONB DEFAULT '{}',
    
    -- Geographic stats
    top_locations JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(date)
);

-- Indexes for performance
CREATE INDEX idx_waste_classifications_created_at ON waste_classifications(created_at DESC);
CREATE INDEX idx_waste_classifications_category ON waste_classifications(category);
CREATE INDEX idx_waste_classifications_user_id ON waste_classifications(user_id);
CREATE INDEX idx_waste_classifications_location ON waste_classifications USING GIST(
    ll_to_earth(user_lat, user_lon)
) WHERE user_lat IS NOT NULL AND user_lon IS NOT NULL;

CREATE INDEX idx_disposal_locations_category ON disposal_locations(category);
CREATE INDEX idx_disposal_locations_type ON disposal_locations(type);
CREATE INDEX idx_disposal_locations_active ON disposal_locations(active) WHERE active = true;
CREATE INDEX idx_disposal_locations_location ON disposal_locations USING GIST(
    ll_to_earth(lat, lon)
);

CREATE INDEX idx_daily_analytics_date ON daily_analytics(date DESC);

-- RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposal_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert and view their own classifications
CREATE POLICY "Users can insert classifications" ON waste_classifications
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own classifications" ON waste_classifications
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow all users to read disposal locations and analytics
CREATE POLICY "Anyone can view disposal locations" ON disposal_locations
    FOR SELECT USING (active = true);

CREATE POLICY "Anyone can view analytics" ON daily_analytics
    FOR SELECT USING (true);

-- Functions for updating analytics
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET 
            total_classifications = total_classifications + 1,
            total_co2_saved = total_co2_saved + NEW.co2_saved_kg,
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Update daily analytics
        INSERT INTO daily_analytics (date, total_classifications, total_co2_saved, total_weight_processed)
        VALUES (CURRENT_DATE, 1, NEW.co2_saved_kg, NEW.weight_kg)
        ON CONFLICT (date) DO UPDATE SET
            total_classifications = daily_analytics.total_classifications + 1,
            total_co2_saved = daily_analytics.total_co2_saved + NEW.co2_saved_kg,
            total_weight_processed = daily_analytics.total_weight_processed + NEW.weight_kg,
            updated_at = NOW();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when classification is inserted
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT ON waste_classifications
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

-- Example data insertion function
CREATE OR REPLACE FUNCTION insert_classification(
    p_image_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_category TEXT,
    p_subtype TEXT,
    p_confidence TEXT,
    p_weight_kg DECIMAL,
    p_co2_saved_kg DECIMAL,
    p_user_lat DECIMAL DEFAULT NULL,
    p_user_lon DECIMAL DEFAULT NULL,
    p_disposal_methods JSONB,
    p_location_suggestions JSONB
)
RETURNS UUID AS $$
DECLARE
    classification_id UUID;
BEGIN
    INSERT INTO waste_classifications (
        image_id, user_id, category, subtype, confidence,
        weight_kg, co2_saved_kg, user_lat, user_lon,
        disposal_methods, location_suggestions
    ) VALUES (
        p_image_id, p_user_id, p_category, p_subtype, p_confidence,
        p_weight_kg, p_co2_saved_kg, p_user_lat, p_user_lon,
        p_disposal_methods, p_location_suggestions
    ) RETURNING id INTO classification_id;
    
    RETURN classification_id;
END;
$$ LANGUAGE plpgsql; 