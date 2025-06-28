import supabase from '../supabase-client';

const BUCKET_NAME = 'waste-images';

/**
 * Upload image to Supabase Storage with user isolation
 */
export async function uploadImageToStorage(imageFile, userId, imageId) {
  try {
    const fileExtension = imageFile.name.split('.').pop() || 'jpg';
    const fileName = `${imageId}.${fileExtension}`;
    const storagePath = `${userId}/${fileName}`;
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, imageFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return {
      filename: imageFile.name,
      storage_path: storagePath,
      file_size_bytes: imageFile.size,
      mime_type: imageFile.type,
      public_url: publicUrl
    };
  } catch (err) {
    console.error('Unexpected error uploading image:', err);
    return null;
  }
}

/**
 * Save complete waste classification with image to database
 */
export async function saveWasteClassificationWithImage(imageFile, apiResponse, userId, userLocation) {
  try {
    // 1. Upload image to storage
    const imageMetadata = await uploadImageToStorage(imageFile, userId, apiResponse.image_id);
    if (!imageMetadata) {
      throw new Error('Failed to upload image to storage');
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
    });

    if (error) {
      console.error('Error saving classification:', error);
      // If database save fails, try to clean up uploaded image
      await supabase.storage.from(BUCKET_NAME).remove([imageMetadata.storage_path]);
      return null;
    }

    return {
      classification_id: data[0]?.classification_id,
      waste_image_id: data[0]?.waste_image_id,
      image_url: imageMetadata.public_url,
      ...apiResponse
    };

  } catch (err) {
    console.error('Unexpected error saving classification:', err);
    return null;
  }
}

/**
 * Complete workflow: Camera -> Classification -> Storage -> Database
 */
export async function handleWasteClassificationWithImage(imageFile, userLocation, userId) {
  try {
    // 1. Convert image to base64 for API
    const imageDataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(imageFile);
    });

    // 2. Call Flask API for classification
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
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const apiResponse = await response.json();

    // 3. Save image and classification to Supabase
    const result = await saveWasteClassificationWithImage(
      imageFile, 
      apiResponse, 
      userId, 
      userLocation
    );

    return result;

  } catch (error) {
    console.error('Error in complete classification workflow:', error);
    throw error;
  }
}

/**
 * Get user's classification history with images
 */
export async function getUserClassificationsWithImages(userId, limit = 20) {
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
    .limit(limit);

  if (error) {
    console.error('Error fetching classifications:', error);
    return { data: null, error };
  }

  // Add public URLs for images
  const dataWithUrls = data.map(classification => ({
    ...classification,
    image_url: classification.waste_images 
      ? supabase.storage.from(BUCKET_NAME).getPublicUrl(classification.waste_images.storage_path).data.publicUrl
      : null
  }));

  return { data: dataWithUrls, error: null };
}

/**
 * Get user stats
 */
export async function getUserStats(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('total_classifications, total_co2_saved, total_weight_processed')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }

  return data;
} 