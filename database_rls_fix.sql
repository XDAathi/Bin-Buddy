-- COMPREHENSIVE FIX for RLS Policy Issues
-- This file fixes the database storage problem where classifications aren't being saved

-- Option 1: Temporarily disable RLS on daily_analytics (simplest fix)
ALTER TABLE daily_analytics DISABLE ROW LEVEL SECURITY;

-- Option 2: Create more permissive policies (if you want to keep RLS enabled)
-- Run these if you prefer to keep RLS enabled instead of disabling it

-- First, drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Anyone can view analytics" ON daily_analytics;
DROP POLICY IF EXISTS "System can insert analytics" ON daily_analytics;
DROP POLICY IF EXISTS "System can update analytics" ON daily_analytics;

-- Create new permissive policies
CREATE POLICY "Allow all operations on analytics" ON daily_analytics
    FOR ALL USING (true) WITH CHECK (true);

-- Alternative: Create the function with SECURITY DEFINER and proper permissions
CREATE OR REPLACE FUNCTION update_user_and_analytics_stats()
RETURNS TRIGGER
SECURITY DEFINER  -- This makes the function run with elevated privileges
SET search_path = public, pg_temp
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_stats_trigger ON waste_classifications;
CREATE TRIGGER update_stats_trigger
    AFTER INSERT ON waste_classifications
    FOR EACH ROW EXECUTE FUNCTION update_user_and_analytics_stats();

-- Grant necessary permissions to the function owner (postgres/authenticated role)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON daily_analytics TO authenticated;
GRANT INSERT, UPDATE ON users TO authenticated;

-- Ensure the function can be executed by authenticated users
GRANT EXECUTE ON FUNCTION update_user_and_analytics_stats() TO authenticated;

-- Verify current RLS status (for debugging)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('daily_analytics', 'waste_classifications', 'users');

-- Show current policies (for debugging)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('daily_analytics', 'waste_classifications', 'users'); 