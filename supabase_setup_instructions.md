# Supabase Setup Instructions for Bin Buddy

## 1. Database Setup

Run the schema from `supabase_schema_with_images.sql` in your Supabase SQL editor:

```sql
-- This will create all tables, policies, functions, and triggers
-- Copy and paste the entire contents of supabase_schema_with_images.sql
```

## 2. Storage Bucket Setup

### Create the Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **"Create a new bucket"**
3. Name it: `waste-images`
4. Set as **Public bucket**: `false` (for security)
5. Click **"Create bucket"**

### Set Storage Policies

In the Storage section, click on `waste-images` bucket and go to **Policies**:

#### Policy 1: Users can upload their own images
```sql
-- Policy Name: "Users can upload their own images"
-- Operation: INSERT
-- Target roles: authenticated
-- Policy definition:
(storage.foldername(name))[1] = auth.uid()::text
```

#### Policy 2: Users can view their own images  
```sql
-- Policy Name: "Users can view their own images"
-- Operation: SELECT
-- Target roles: authenticated
-- Policy definition:
(storage.foldername(name))[1] = auth.uid()::text
```

#### Policy 3: Users can delete their own images
```sql
-- Policy Name: "Users can delete their own images" 
-- Operation: DELETE
-- Target roles: authenticated
-- Policy definition:
(storage.foldername(name))[1] = auth.uid()::text
```

## 3. Environment Variables

Add to your `.env` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Flask Backend
GEMINI_API_KEY=your-gemini-api-key
```

## 4. Frontend Integration Example

```javascript
import { handleWasteClassificationWithImage } from './supabase_integration_with_images.js'

// In your React component
const handleImageCapture = async (imageFile) => {
  const userLocation = { lat: 40.7128, lon: -74.0060 }
  const userId = user.id // from Supabase auth
  
  const result = await handleWasteClassificationWithImage(
    imageFile, 
    userLocation, 
    userId
  )
  
  if (result) {
    console.log('Classification saved:', result)
    // Show success message
    // Display result.display_name, result.color, result.icon, etc.
  }
}
```

## 5. User Authentication Flow

```javascript
// Sign up/in users
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password'
})

// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Use user.id for all database operations
```

## 6. File Structure

Your storage bucket will organize files like this:

```
waste-images/
├── user-uuid-1/
│   ├── image-uuid-1.jpg
│   ├── image-uuid-2.png
│   └── image-uuid-3.jpg
├── user-uuid-2/
│   ├── image-uuid-4.jpg
│   └── image-uuid-5.png
└── user-uuid-3/
    └── image-uuid-6.jpg
```

## 7. Security Features

✅ **User Isolation**: Each user can only access their own images and data  
✅ **Row Level Security**: Database policies prevent cross-user data access  
✅ **Storage Policies**: Images stored in user-specific folders  
✅ **Automatic Cleanup**: Cascade deletes remove orphaned images  
✅ **Error Handling**: Failed database saves clean up uploaded images  

## 8. Testing the Setup

```sql
-- Test inserting a classification
SELECT * FROM insert_classification_with_image(
    p_user_id := auth.uid(),
    p_image_id := uuid_generate_v4(),
    p_filename := 'test.jpg',
    p_storage_path := auth.uid()::text || '/test.jpg',
    p_file_size_bytes := 1024,
    p_mime_type := 'image/jpeg',
    p_main_category := 'electronic',
    p_specific_category := 'test_smartphone',
    p_display_name := 'Test Smartphone',
    p_confidence := 'high',
    p_weight_kg := 0.2,
    p_co2_saved_kg := 3.0,
    p_co2_rate_per_kg := 15.0,
    p_color := '#333333',
    p_icon := 'fa/FaMobile',
    p_disposal_methods := '["Test method"]'::jsonb,
    p_recyclable := true,
    p_donation_worthy := true
);
```

## 9. Analytics Queries

```sql
-- User's total impact
SELECT 
    total_classifications,
    total_co2_saved,
    total_weight_processed
FROM users WHERE id = auth.uid();

-- Daily analytics
SELECT * FROM daily_analytics 
ORDER BY date DESC LIMIT 30;

-- User's category breakdown
SELECT 
    main_category,
    COUNT(*) as count,
    SUM(co2_saved_kg) as total_co2
FROM waste_classifications 
WHERE user_id = auth.uid()
GROUP BY main_category;
``` 