-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    email TEXT,
    username TEXT,
    location_lat DECIMAL(10,8),
    location_lon DECIMAL(11,8),
    total_classifications INTEGER DEFAULT 0,
    total_co2_saved DECIMAL(10,2) DEFAULT 0.0,
    total_weight_processed DECIMAL(10,2) DEFAULT 0.0
);

-- Images table for storing image metadata (actual images in Supabase Storage)
CREATE TABLE waste_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Image metadata
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage bucket
    file_size_bytes INTEGER,
    mime_type TEXT,
    
    -- Image processing
    processed BOOLEAN DEFAULT false,
    processing_error TEXT,
    
    CONSTRAINT unique_user_storage_path UNIQUE(user_id, storage_path)
);

-- Enhanced waste classifications table for dynamic system
CREATE TABLE waste_classifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID UNIQUE NOT NULL, -- From API response
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    waste_image_id UUID REFERENCES waste_images(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Dynamic classification data
    main_category TEXT NOT NULL,
    specific_category TEXT NOT NULL,
    display_name TEXT NOT NULL,
    confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
    
    -- Weight and impact
    weight_kg DECIMAL(8,4) NOT NULL,
    co2_saved_kg DECIMAL(10,4) NOT NULL,
    co2_rate_per_kg DECIMAL(10,4) NOT NULL,
    
    -- Visual metadata (new dynamic fields)
    color TEXT NOT NULL, -- Hex color
    icon TEXT NOT NULL, -- icon_set/icon_name format
    
    -- Disposal and reuse
    disposal_methods JSONB NOT NULL,
    recyclable BOOLEAN NOT NULL,
    donation_worthy BOOLEAN NOT NULL,
    
    -- Location data
    user_lat DECIMAL(10,8),
    user_lon DECIMAL(11,8),
    location_query TEXT NOT NULL,
    location_suggestions JSONB NOT NULL,
    
    -- Additional metadata
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    CONSTRAINT valid_coordinates CHECK (
        (user_lat IS NULL AND user_lon IS NULL) OR 
        (user_lat BETWEEN -90 AND 90 AND user_lon BETWEEN -180 AND 180)
    ),
    CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT valid_icon CHECK (icon ~ '^[a-z]+/[A-Za-z0-9]+$')
);

-- Disposal locations table (unchanged)
CREATE TABLE disposal_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('dropoff', 'donate', 'dispose', 'error')),
    category TEXT NOT NULL,
    
    lat DECIMAL(10,8) NOT NULL,
    lon DECIMAL(11,8) NOT NULL,
    address TEXT,
    
    phone TEXT,
    website TEXT,
    hours TEXT,
    
    verified BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    
    CONSTRAINT valid_location_coords CHECK (
        lat BETWEEN -90 AND 90 AND lon BETWEEN -180 AND 180
    )
);

-- Enhanced analytics for dynamic categories
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    
    total_classifications INTEGER DEFAULT 0,
    total_co2_saved DECIMAL(12,4) DEFAULT 0.0,
    total_weight_processed DECIMAL(12,4) DEFAULT 0.0,
    
    -- Dynamic category tracking
    main_category_stats JSONB DEFAULT '{}',
    specific_category_stats JSONB DEFAULT '{}',
    confidence_stats JSONB DEFAULT '{}',
    
    -- New metrics
    recyclable_count INTEGER DEFAULT 0,
    donation_worthy_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(date)
);

-- Indexes for performance
CREATE INDEX idx_waste_images_user_id ON waste_images(user_id);
CREATE INDEX idx_waste_images_created_at ON waste_images(created_at DESC);
CREATE INDEX idx_waste_images_processed ON waste_images(processed);

CREATE INDEX idx_waste_classifications_created_at ON waste_classifications(created_at DESC);
CREATE INDEX idx_waste_classifications_main_category ON waste_classifications(main_category);
CREATE INDEX idx_waste_classifications_specific_category ON waste_classifications(specific_category);
CREATE INDEX idx_waste_classifications_user_id ON waste_classifications(user_id);
CREATE INDEX idx_waste_classifications_recyclable ON waste_classifications(recyclable);
CREATE INDEX idx_waste_classifications_donation_worthy ON waste_classifications(donation_worthy);

CREATE INDEX idx_disposal_locations_category ON disposal_locations(category);
CREATE INDEX idx_disposal_locations_active ON disposal_locations(active) WHERE active = true;

-- RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposal_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Image policies (users can only access their own images)
CREATE POLICY "Users can view own images" ON waste_images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON waste_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images" ON waste_images
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON waste_images
    FOR DELETE USING (auth.uid() = user_id);

-- Classification policies (users can only access their own classifications)
CREATE POLICY "Users can view own classifications" ON waste_classifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own classifications" ON waste_classifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own classifications" ON waste_classifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own classifications" ON waste_classifications
    FOR DELETE USING (auth.uid() = user_id);

-- Public read policies
CREATE POLICY "Anyone can view active disposal locations" ON disposal_locations
    FOR SELECT USING (active = true);

CREATE POLICY "Anyone can view analytics" ON daily_analytics
    FOR SELECT USING (true);

-- Functions for updating analytics with dynamic categories
CREATE OR REPLACE FUNCTION update_user_and_analytics_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update user stats
        UPDATE users 
        SET 
            total_classifications = total_classifications + 1,
            total_co2_saved = total_co2_saved + NEW.co2_saved_kg,
            total_weight_processed = total_weight_processed + NEW.weight_kg,
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Update daily analytics with dynamic categories
        INSERT INTO daily_analytics (
            date, 
            total_classifications, 
            total_co2_saved, 
            total_weight_processed,
            main_category_stats,
            specific_category_stats,
            recyclable_count,
            donation_worthy_count
        )
        VALUES (
            CURRENT_DATE, 
            1, 
            NEW.co2_saved_kg, 
            NEW.weight_kg,
            jsonb_build_object(NEW.main_category, 1),
            jsonb_build_object(NEW.specific_category, 1),
            CASE WHEN NEW.recyclable THEN 1 ELSE 0 END,
            CASE WHEN NEW.donation_worthy THEN 1 ELSE 0 END
        )
        ON CONFLICT (date) DO UPDATE SET
            total_classifications = daily_analytics.total_classifications + 1,
            total_co2_saved = daily_analytics.total_co2_saved + NEW.co2_saved_kg,
            total_weight_processed = daily_analytics.total_weight_processed + NEW.weight_kg,
            main_category_stats = daily_analytics.main_category_stats || 
                jsonb_build_object(
                    NEW.main_category, 
                    COALESCE((daily_analytics.main_category_stats->>NEW.main_category)::integer, 0) + 1
                ),
            specific_category_stats = daily_analytics.specific_category_stats || 
                jsonb_build_object(
                    NEW.specific_category, 
                    COALESCE((daily_analytics.specific_category_stats->>NEW.specific_category)::integer, 0) + 1
                ),
            recyclable_count = daily_analytics.recyclable_count + CASE WHEN NEW.recyclable THEN 1 ELSE 0 END,
            donation_worthy_count = daily_analytics.donation_worthy_count + CASE WHEN NEW.donation_worthy THEN 1 ELSE 0 END,
            updated_at = NOW();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats
CREATE TRIGGER update_stats_trigger
    AFTER INSERT ON waste_classifications
    FOR EACH ROW EXECUTE FUNCTION update_user_and_analytics_stats();

-- Function to insert complete classification with image
CREATE OR REPLACE FUNCTION insert_classification_with_image(
    p_user_id UUID,
    p_image_id UUID,
    p_filename TEXT,
    p_storage_path TEXT,
    p_file_size_bytes INTEGER,
    p_mime_type TEXT,
    p_main_category TEXT,
    p_specific_category TEXT,
    p_display_name TEXT,
    p_confidence TEXT,
    p_weight_kg DECIMAL,
    p_co2_saved_kg DECIMAL,
    p_co2_rate_per_kg DECIMAL,
    p_color TEXT,
    p_icon TEXT,
    p_disposal_methods JSONB,
    p_recyclable BOOLEAN,
    p_donation_worthy BOOLEAN,
    p_user_lat DECIMAL DEFAULT NULL,
    p_user_lon DECIMAL DEFAULT NULL,
    p_location_query TEXT DEFAULT '',
    p_location_suggestions JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE(classification_id UUID, waste_image_id UUID) AS $$
DECLARE
    v_waste_image_id UUID;
    v_classification_id UUID;
BEGIN
    -- Insert image record
    INSERT INTO waste_images (
        user_id, filename, storage_path, file_size_bytes, mime_type, processed
    ) VALUES (
        p_user_id, p_filename, p_storage_path, p_file_size_bytes, p_mime_type, true
    ) RETURNING id INTO v_waste_image_id;
    
    -- Insert classification
    INSERT INTO waste_classifications (
        image_id, user_id, waste_image_id, main_category, specific_category, 
        display_name, confidence, weight_kg, co2_saved_kg, co2_rate_per_kg,
        color, icon, disposal_methods, recyclable, donation_worthy,
        user_lat, user_lon, location_query, location_suggestions
    ) VALUES (
        p_image_id, p_user_id, v_waste_image_id, p_main_category, p_specific_category,
        p_display_name, p_confidence, p_weight_kg, p_co2_saved_kg, p_co2_rate_per_kg,
        p_color, p_icon, p_disposal_methods, p_recyclable, p_donation_worthy,
        p_user_lat, p_user_lon, p_location_query, p_location_suggestions
    ) RETURNING id INTO v_classification_id;
    
    RETURN QUERY SELECT v_classification_id, v_waste_image_id;
END;
$$ LANGUAGE plpgsql;

-- Storage bucket setup (run this in Supabase dashboard or via API)
-- CREATE BUCKET IF NOT EXISTS 'waste-images';

-- Storage RLS policies (for the waste-images bucket)
-- These would be set up in Supabase dashboard:
-- 1. "Users can upload their own images" - allow INSERT where auth.uid() = (storage.foldername(name))[1]::uuid
-- 2. "Users can view their own images" - allow SELECT where auth.uid() = (storage.foldername(name))[1]::uuid
-- 3. "Users can delete their own images" - allow DELETE where auth.uid() = (storage.foldername(name))[1]::uuid 