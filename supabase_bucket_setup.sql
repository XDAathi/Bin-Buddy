-- Supabase Storage Bucket Setup for Images
-- Run this in your Supabase SQL editor

-- Create the images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  52428800, -- 50MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the images bucket
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'images' AND 
  auth.role() = 'authenticated'
);

-- Allow users to view their own images
CREATE POLICY "Allow users to view own images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'images' AND 
  auth.role() = 'authenticated'
);

-- Allow users to update their own images
CREATE POLICY "Allow users to update own images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'images' AND 
  auth.role() = 'authenticated'
);

-- Allow users to delete their own images
CREATE POLICY "Allow users to delete own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'images' AND 
  auth.role() = 'authenticated'
);

-- Optional: Allow public read access to images (if you want images to be publicly accessible)
CREATE POLICY "Allow public read access to images" ON storage.objects
FOR SELECT USING (bucket_id = 'images');

-- Create a function to get image URL from storage path
CREATE OR REPLACE FUNCTION get_image_url(storage_path TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'https://your-project-ref.supabase.co/storage/v1/object/public/images/' || storage_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to delete image from storage when classification is deleted
CREATE OR REPLACE FUNCTION delete_image_from_storage()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the image file from storage when the waste_images record is deleted
  IF OLD.storage_path IS NOT NULL THEN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'images' AND name = OLD.storage_path;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically delete image files when waste_images record is deleted
DROP TRIGGER IF EXISTS delete_image_trigger ON waste_images;
CREATE TRIGGER delete_image_trigger
  BEFORE DELETE ON waste_images
  FOR EACH ROW
  EXECUTE FUNCTION delete_image_from_storage(); 