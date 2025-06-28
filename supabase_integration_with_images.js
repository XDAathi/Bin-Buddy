// Complete Supabase integration with image storage and user isolation
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'your-supabase-url'
const supabaseKey = 'your-supabase-anon-key'
const supabase = createClient(supabaseUrl, supabaseKey)

const BUCKET_NAME = 'waste-images'

/**
 * Upload image to Supabase Storage with user isolation
 * Images are stored in user-specific folders: {user_id}/{image_id}.{ext}
 */
async function uploadImageToStorage(imageFile, userId, imageId) {
  try {
    // Create user-specific path
    const fileExtension = imageFile.name.split('.').pop()
    const fileName = `${imageId}.${fileExtension}`
    const storagePath = `${userId}/${fileName}`
    
    // Upload to storage bucket
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, imageFile, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      })

    if (error) {
      console.error('Error uploading image:', error)
      return null
    }

    // Return storage metadata
    return {
      filename: imageFile.name,
      storage_path: storagePath,
      file_size_bytes: imageFile.size,
      mime_type: imageFile.type,
      public_url: `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`
    }
  } catch (err) {
    console.error('Unexpected error uploading image:', err)
    return null
  }
}

/**
 * Save complete waste classification with image to database
 */
async function saveWasteClassificationWithImage(imageFile, apiResponse, userId, userLocation) {
  try {
    // 1. Upload image to storage
    const imageMetadata = await uploadImageToStorage(imageFile, userId, apiResponse.image_id)
    if (!imageMetadata) {
      throw new Error('Failed to upload image to storage')
    }

    // 2. Save classification and image metadata using custom function
    const { data, error } = await supabase.rpc('insert_classification_with_image', {
      p_user_id: userId,
      p_image_id: apiResponse.image_id,
      p_filename: imageMetadata.filename,
      p_storage_path: imageMetadata.storage_path,
      p_file_size_bytes: imageMetadata.file_size_bytes,
      p_mime_type: imageMetadata.mime_type,
      p_main_category: apiResponse.main_category,
      p_specific_category: apiResponse.specific_category,
      p_display_name: apiResponse.display_name,
      p_confidence: apiResponse.confidence,
      p_weight_kg: apiResponse.weight,
      p_co2_saved_kg: apiResponse.co2_saved,
      p_co2_rate_per_kg: apiResponse.co2_rate,
      p_color: apiResponse.color,
      p_icon: apiResponse.icon,
      p_disposal_methods: apiResponse.disposal_methods,
      p_recyclable: apiResponse.recyclable,
      p_donation_worthy: apiResponse.donation_worthy,
      p_user_lat: userLocation?.lat || null,
      p_user_lon: userLocation?.lon || null,
      p_location_query: apiResponse.location_query,
      p_location_suggestions: apiResponse.suggestions
    })

    if (error) {
      console.error('Error saving classification:', error)
      // If database save fails, try to clean up uploaded image
      await supabase.storage.from(BUCKET_NAME).remove([imageMetadata.storage_path])
      return null
    }

    return {
      classification_id: data[0]?.classification_id,
      waste_image_id: data[0]?.waste_image_id,
      image_url: imageMetadata.public_url,
      ...apiResponse
    }

  } catch (err) {
    console.error('Unexpected error saving classification:', err)
    return null
  }
}

/**
 * Complete workflow: Camera -> Classification -> Storage -> Database
 */
async function handleWasteClassificationWithImage(imageFile, userLocation, userId) {
  try {
    // 1. Convert image to base64 for API
    const imageDataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(imageFile)
    })

    // 2. Call your Flask API for classification
    const response = await fetch('/api/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageDataUrl,
        lat: userLocation.lat,
        lon: userLocation.lon
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    const apiResponse = await response.json()

    // 3. Save image and classification to Supabase
    const result = await saveWasteClassificationWithImage(
      imageFile, 
      apiResponse, 
      userId, 
      userLocation
    )

    return result

  } catch (error) {
    console.error('Error in complete classification workflow:', error)
    throw error
  }
}

/**
 * Get user's classification history with images
 */
async function getUserClassificationsWithImages(userId, limit = 20) {
  const { data, error } = await supabase
    .from('waste_classifications')
    .select(`
      *,
      waste_images (
        filename,
        storage_path,
        file_size_bytes,
        mime_type
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching classifications:', error)
    return { data: null, error }
  }

  // Add public URLs for images
  const dataWithUrls = data.map(classification => ({
    ...classification,
    image_url: classification.waste_images 
      ? `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${classification.waste_images.storage_path}`
      : null
  }))

  return { data: dataWithUrls, error: null }
}

/**
 * Delete classification and associated image
 */
async function deleteClassification(classificationId, userId) {
  try {
    // Get classification with image info
    const { data: classification, error: fetchError } = await supabase
      .from('waste_classifications')
      .select(`
        *,
        waste_images (storage_path)
      `)
      .eq('id', classificationId)
      .eq('user_id', userId) // Ensure user owns this classification
      .single()

    if (fetchError || !classification) {
      console.error('Classification not found or access denied')
      return false
    }

    // Delete from database (cascade will handle waste_images)
    const { error: deleteError } = await supabase
      .from('waste_classifications')
      .delete()
      .eq('id', classificationId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting classification:', deleteError)
      return false
    }

    // Delete image from storage
    if (classification.waste_images?.storage_path) {
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([classification.waste_images.storage_path])
    }

    return true

  } catch (err) {
    console.error('Unexpected error deleting classification:', err)
    return false
  }
}

/**
 * Get user stats and analytics
 */
async function getUserStats(userId) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('total_classifications, total_co2_saved, total_weight_processed')
    .eq('id', userId)
    .single()

  if (userError) {
    console.error('Error fetching user stats:', userError)
    return null
  }

  // Get category breakdown for this user
  const { data: categories, error: catError } = await supabase
    .from('waste_classifications')
    .select('main_category, specific_category, recyclable, donation_worthy')
    .eq('user_id', userId)

  if (catError) {
    console.error('Error fetching category stats:', catError)
    return user
  }

  // Calculate category stats
  const categoryStats = categories.reduce((acc, item) => {
    acc[item.main_category] = (acc[item.main_category] || 0) + 1
    return acc
  }, {})

  const recyclableCount = categories.filter(item => item.recyclable).length
  const donationWorthyCount = categories.filter(item => item.donation_worthy).length

  return {
    ...user,
    category_breakdown: categoryStats,
    recyclable_items: recyclableCount,
    donation_worthy_items: donationWorthyCount,
    most_common_category: Object.keys(categoryStats).reduce((a, b) => 
      categoryStats[a] > categoryStats[b] ? a : b, Object.keys(categoryStats)[0]
    )
  }
}

/**
 * Search classifications by category or text
 */
async function searchUserClassifications(userId, searchTerm, category = null) {
  let query = supabase
    .from('waste_classifications')
    .select(`
      *,
      waste_images (filename, storage_path)
    `)
    .eq('user_id', userId)

  if (category) {
    query = query.eq('main_category', category)
  }

  if (searchTerm) {
    query = query.or(`
      specific_category.ilike.%${searchTerm}%,
      display_name.ilike.%${searchTerm}%
    `)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(50)

  return { data, error }
}

// React Hook example for using these functions
export function useWasteClassification() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const classifyWaste = async (imageFile, userLocation, userId) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await handleWasteClassificationWithImage(imageFile, userLocation, userId)
      return result
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { classifyWaste, loading, error }
}

export {
  uploadImageToStorage,
  saveWasteClassificationWithImage,
  handleWasteClassificationWithImage,
  getUserClassificationsWithImages,
  deleteClassification,
  getUserStats,
  searchUserClassifications
} 