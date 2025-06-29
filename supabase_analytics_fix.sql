-- Fix for daily_analytics RLS policy issue
-- Run this in your Supabase SQL editor to fix the classification saving error

-- Add missing INSERT and UPDATE policies for daily_analytics table
-- The trigger function needs to be able to insert/update analytics data

-- Allow system/triggers to insert analytics data
CREATE POLICY "Allow system inserts for analytics" ON daily_analytics
    FOR INSERT WITH CHECK (true);

-- Allow system/triggers to update analytics data  
CREATE POLICY "Allow system updates for analytics" ON daily_analytics
    FOR UPDATE USING (true);

-- Alternatively, if you want to be more restrictive, you can use:
-- CREATE POLICY "Allow authenticated inserts for analytics" ON daily_analytics
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Allow authenticated updates for analytics" ON daily_analytics
--     FOR UPDATE USING (auth.role() = 'authenticated'); 