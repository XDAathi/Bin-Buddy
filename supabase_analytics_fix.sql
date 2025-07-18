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

-- Fix for daily_analytics RLS policies
-- The trigger function update_user_and_analytics_stats() needs to be able to INSERT and UPDATE
-- records in daily_analytics table, but the current RLS policies only allow SELECT operations.

-- Add INSERT policy for daily_analytics (allow system/trigger functions to insert)
CREATE POLICY "System can insert analytics" ON daily_analytics
    FOR INSERT WITH CHECK (true);

-- Add UPDATE policy for daily_analytics (allow system/trigger functions to update)
CREATE POLICY "System can update analytics" ON daily_analytics
    FOR UPDATE USING (true);

-- Alternative: Create the trigger function with SECURITY DEFINER to bypass RLS
-- This recreates the function with elevated privileges
CREATE OR REPLACE FUNCTION update_user_and_analytics_stats()
RETURNS TRIGGER
SECURITY DEFINER  -- This allows the function to bypass RLS policies
SET search_path = public
AS $$
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

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS update_stats_trigger ON waste_classifications;
CREATE TRIGGER update_stats_trigger
    AFTER INSERT ON waste_classifications
    FOR EACH ROW EXECUTE FUNCTION update_user_and_analytics_stats(); 