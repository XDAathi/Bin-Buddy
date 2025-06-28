-- BinBuddy Database Schema
-- =======================
-- 
-- Supabase PostgreSQL schema for the BinBuddy sustainability app.
-- Run these commands in your Supabase SQL editor to set up the database.

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    total_co2_saved NUMERIC DEFAULT 0,
    items_processed INTEGER DEFAULT 0,
    trips_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create items table for classified items
CREATE TABLE IF NOT EXISTS public.items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    category TEXT NOT NULL CHECK (category IN (
        'recyclable', 'organic', 'e-waste', 'donation', 
        'textile_recycle', 'hazardous', 'general_trash'
    )),
    subtype TEXT NOT NULL,
    quality TEXT CHECK (quality IN ('good', 'fair', 'poor') OR quality IS NULL),
    weight NUMERIC NOT NULL DEFAULT 0,
    co2_saved NUMERIC NOT NULL DEFAULT 0,
    disposal_methods JSONB,
    image_url TEXT,
    user_lat NUMERIC,
    user_lon NUMERIC,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'planned', 'completed')),
    trip_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create trips table for grouping items
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    destination_type TEXT CHECK (destination_type IN (
        'recycling_center', 'donation_center', 'e-waste_facility', 
        'hazardous_waste', 'textile_recycling', 'general_dump'
    )),
    destination_name TEXT,
    destination_lat NUMERIC,
    destination_lon NUMERIC,
    distance_km NUMERIC,
    total_items INTEGER DEFAULT 0,
    total_co2_saved NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create disposal_locations table for caching location data
CREATE TABLE IF NOT EXISTS public.disposal_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lon NUMERIC NOT NULL,
    address TEXT,
    phone TEXT,
    website TEXT,
    hours JSONB,
    services JSONB,
    rating NUMERIC CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create carbon_stats table for tracking carbon savings
CREATE TABLE IF NOT EXISTS public.carbon_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_co2_saved NUMERIC DEFAULT 0,
    items_count INTEGER DEFAULT 0,
    category_breakdown JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Add foreign key constraint for trip_id in items table
ALTER TABLE public.items 
ADD CONSTRAINT fk_items_trip 
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_timestamp ON public.items(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_disposal_locations_type ON public.disposal_locations(type);
CREATE INDEX IF NOT EXISTS idx_disposal_locations_category ON public.disposal_locations(category);
CREATE INDEX IF NOT EXISTS idx_carbon_stats_user_date ON public.carbon_stats(user_id, date DESC);

-- Create function to update profiles total_co2_saved
CREATE OR REPLACE FUNCTION update_profile_co2_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        -- Item completed, add to total
        UPDATE public.profiles 
        SET 
            total_co2_saved = total_co2_saved + NEW.co2_saved,
            items_processed = items_processed + 1,
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Update daily carbon stats
        INSERT INTO public.carbon_stats (user_id, date, daily_co2_saved, items_count)
        VALUES (NEW.user_id, CURRENT_DATE, NEW.co2_saved, 1)
        ON CONFLICT (user_id, date) 
        DO UPDATE SET 
            daily_co2_saved = carbon_stats.daily_co2_saved + NEW.co2_saved,
            items_count = carbon_stats.items_count + 1;
            
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed' THEN
        -- Item uncompleted, subtract from total
        UPDATE public.profiles 
        SET 
            total_co2_saved = total_co2_saved - OLD.co2_saved,
            items_processed = items_processed - 1,
            updated_at = NOW()
        WHERE id = OLD.user_id;
        
        -- Update daily carbon stats
        UPDATE public.carbon_stats 
        SET 
            daily_co2_saved = daily_co2_saved - OLD.co2_saved,
            items_count = items_count - 1
        WHERE user_id = OLD.user_id AND date = CURRENT_DATE;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update CO2 stats
CREATE TRIGGER trigger_update_co2_stats
    AFTER UPDATE ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_co2_stats();

-- Function to update trip statistics
CREATE OR REPLACE FUNCTION update_trip_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update trip totals
        UPDATE public.trips 
        SET 
            total_items = (
                SELECT COUNT(*) 
                FROM public.items 
                WHERE trip_id = NEW.trip_id
            ),
            total_co2_saved = (
                SELECT COALESCE(SUM(co2_saved), 0) 
                FROM public.items 
                WHERE trip_id = NEW.trip_id
            )
        WHERE id = NEW.trip_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update trip stats when items change
CREATE TRIGGER trigger_update_trip_stats
    AFTER INSERT OR UPDATE OF trip_id, co2_saved ON public.items
    FOR EACH ROW
    WHEN (NEW.trip_id IS NOT NULL)
    EXECUTE FUNCTION update_trip_stats();

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own items" ON public.items
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own trips" ON public.trips
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own carbon stats" ON public.carbon_stats
    FOR ALL USING (auth.uid() = user_id);

-- Public read access to disposal locations
CREATE POLICY "Anyone can view disposal locations" ON public.disposal_locations
    FOR SELECT USING (true);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample disposal locations for testing
INSERT INTO public.disposal_locations (name, type, category, lat, lon, address, services) VALUES
('Green Recycling Center', 'recycling_center', 'recyclable', 40.7128, -74.0060, 'New York, NY', '["plastic", "glass", "paper", "metal"]'),
('Electronics Disposal Hub', 'e-waste_facility', 'e-waste', 40.7589, -73.9851, 'New York, NY', '["computers", "phones", "batteries", "appliances"]'),
('Community Donation Center', 'donation_center', 'donation', 40.7505, -73.9934, 'New York, NY', '["clothing", "furniture", "books", "toys"]'),
('Textile Recycling Point', 'textile_recycling', 'textile_recycle', 40.7282, -74.0776, 'New York, NY', '["clothing", "shoes", "bags", "textiles"]')
ON CONFLICT DO NOTHING; 