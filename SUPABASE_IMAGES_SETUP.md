# Supabase Image Storage Setup Guide

This guide explains how to set up the new image storage functionality that stores images in a Supabase Storage bucket instead of the database.

## Overview

The application now stores waste classification images in a Supabase Storage bucket named "images" with descriptive filenames that include:
- `waste_image_id_{image_id}_{category}_{timestamp}.{extension}`

## Setup Instructions

### 1. Create the Storage Bucket

Run the SQL script `supabase_bucket_setup.sql` in your Supabase SQL editor:

```sql
-- This will create the 'images' bucket with proper permissions
-- Run the entire script in your Supabase SQL editor
```

### 2. Update Your Supabase Configuration

Make sure your `supabase_integration_with_images.js` file has the correct Supabase URL and API key:

```javascript
const supabaseUrl = 'your-actual-supabase-url'
const supabaseKey = 'your-actual-supabase-anon-key'
```

### 3. Update the Image URL Function

In the `supabase_bucket_setup.sql` file, update the `get_image_url` function with your actual Supabase project reference:

```sql
CREATE OR REPLACE FUNCTION get_image_url(storage_path TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'https://YOUR-PROJECT-REF.supabase.co/storage/v1/object/public/images/' || storage_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Replace `YOUR-PROJECT-REF` with your actual Supabase project reference.

## How It Works

### Image Upload Process

1. **User takes/selects an image** in the HomeTab
2. **Image is uploaded to Supabase Storage** with a descriptive filename
3. **Classification data is saved** to the database with a reference to the image
4. **Image URL is generated** for display in the HistoryTab

### File Naming Convention

Images are stored with names like:
```
waste_image_id_abc123_plastic_bottle_2024-01-15T10-30-45-123Z.jpg
```

Where:
- `abc123` is the image_id from the API response
- `plastic_bottle` is the sanitized category name
- `2024-01-15T10-30-45-123Z` is the timestamp
- `.jpg` is the original file extension

### Database Changes

The `waste_images` table now stores:
- `filename`: The descriptive filename
- `storage_path`: The path in the storage bucket
- `file_size_bytes`: File size
- `mime_type`: File type

### Frontend Changes

- **HomeTab.jsx**: Now uses `handleWasteClassificationWithImage()` function
- **HistoryTab.jsx**: Displays images using the `image_url` field
- **supabase_integration_with_images.js**: Handles all image storage logic

## Benefits

1. **Better Performance**: Images are served from CDN instead of database
2. **Cost Effective**: Storage is cheaper than database storage
3. **Scalable**: Can handle large numbers of images efficiently
4. **Descriptive Names**: Easy to identify images by category and timestamp
5. **Automatic Cleanup**: Images are automatically deleted when classifications are removed

## Troubleshooting

### Images Not Loading

1. Check that the bucket is created: `supabase_bucket_setup.sql`
2. Verify RLS policies are in place
3. Check the image URL format in the database
4. Ensure your Supabase URL is correct

### Upload Failures

1. Check file size limits (50MB default)
2. Verify allowed MIME types
3. Check authentication status
4. Review browser console for errors

### Database Errors

1. Ensure the `waste_images` table exists
2. Check foreign key constraints
3. Verify the `insert_classification_with_image` function exists

## Testing

1. Take a photo or upload an image in the HomeTab
2. Verify the image appears in the HistoryTab
3. Check the Supabase Storage dashboard to see the uploaded file
4. Verify the filename follows the naming convention

## Migration from Old System

If you have existing images stored in the database:

1. Export existing image data
2. Upload images to the new bucket with proper naming
3. Update database records with new storage paths
4. Test the migration thoroughly

## Security Notes

- Images are stored in a public bucket but with user-specific access controls
- RLS policies ensure users can only access their own images
- File size and type restrictions prevent abuse
- Automatic cleanup prevents orphaned files 