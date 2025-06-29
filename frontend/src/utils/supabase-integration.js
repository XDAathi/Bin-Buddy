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

  // Add signed URLs for images with better error handling
  const dataWithUrls = await Promise.all(
    data.map(async classification => {
      let image_url = null;
      
      if (classification.waste_images && classification.waste_images.storage_path) {
        try {
          console.log('Processing image for classification:', classification.id, 'Storage path:', classification.waste_images.storage_path);
          
          // First, check if the file exists
          const { data: fileExists, error: listError } = await supabase.storage
            .from(BUCKET_NAME)
            .list(classification.waste_images.storage_path.split('/').slice(0, -1).join('/'), {
              search: classification.waste_images.storage_path.split('/').pop()
            });
            
          if (listError) {
            console.log('Error checking file existence:', listError);
            return { ...classification, image_url: null };
          }
          
          if (fileExists && fileExists.length > 0) {
            // Try to get a signed URL first (works with private storage)
            const { data: signedUrl, error: signedError } = await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(classification.waste_images.storage_path, 3600); // 1 hour expiry
              
            if (!signedError && signedUrl && signedUrl.signedUrl) {
              // Verify the URL is accessible
              try {
                const response = await fetch(signedUrl.signedUrl, { method: 'HEAD' });
                if (response.ok) {
                  image_url = signedUrl.signedUrl;
                  console.log('Generated valid signed URL:', image_url);
                } else {
                  console.log('Signed URL not accessible, trying public URL');
                  const { data: publicUrl } = supabase.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(classification.waste_images.storage_path);
                  image_url = publicUrl.publicUrl;
                  console.log('Generated public URL:', image_url);
                }
              } catch (fetchError) {
                console.log('Error verifying signed URL, using public URL:', fetchError.message);
                const { data: publicUrl } = supabase.storage
                  .from(BUCKET_NAME)
                  .getPublicUrl(classification.waste_images.storage_path);
                image_url = publicUrl.publicUrl;
              }
            } else {
              console.log('Signed URL failed, trying public URL. Error:', signedError);
              const { data: publicUrl } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(classification.waste_images.storage_path);
              image_url = publicUrl.publicUrl;
              console.log('Generated public URL:', image_url);
            }
          } else {
            console.log('File does not exist in storage:', classification.waste_images.storage_path);
          }
        } catch (err) {
          console.warn('Error generating image URL for classification', classification.id, ':', err);
          // Keep image_url as null - will use fallback icon
        }
      } else {
        console.log('No waste_images data or storage_path for classification:', classification.id);
      }
      
      return {
        ...classification,
        image_url
      };
    })
  );

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

/**
 * Update completion status of a waste classification
 */
export async function updateClassificationCompletion(classificationId, completed, userId) {
  try {
    const { data, error } = await supabase
      .from('waste_classifications')
      .update({ completed: completed })
      .eq('id', classificationId)
      .eq('user_id', userId) // Ensure user can only update their own items
      .select();

    if (error) {
      console.error('Error updating completion status:', error);
      return { success: false, error };
    }

    console.log('Successfully updated completion status:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error updating completion status:', err);
    return { success: false, error: err };
  }
}

/**
 * Get REAL weekly progress data from user's actual classifications
 */
export async function getRealWeeklyProgress(userId) {
  const { data, error } = await supabase
    .from('waste_classifications')
    .select('created_at, co2_saved_kg, weight_kg')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('Error fetching weekly progress:', error);
    return [];
  }

  // Group by week
  const weeklyData = {};
  data.forEach(item => {
    const date = new Date(item.created_at);
    const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        week: `Week ${Math.ceil((Date.now() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))}`,
        items: 0,
        co2: 0,
        weight: 0
      };
    }
    
    weeklyData[weekKey].items += 1;
    weeklyData[weekKey].co2 += item.co2_saved_kg || 0;
    weeklyData[weekKey].weight += item.weight_kg || 0;
  });

  return Object.values(weeklyData).slice(-8); // Last 8 weeks
}

/**
 * Get REAL category breakdown from user's actual classifications
 */
export async function getRealCategoryBreakdown(userId) {
  const { data, error } = await supabase
    .from('waste_classifications')
    .select('main_category')
    .eq('user_id', userId);

  if (error || !data) {
    console.error('Error fetching category breakdown:', error);
    return {};
  }

  const categoryCount = {};
  const total = data.length;
  
  data.forEach(item => {
    const category = item.main_category || 'other';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });

  const categoryBreakdown = {};
  Object.entries(categoryCount).forEach(([category, count]) => {
    categoryBreakdown[category] = {
      count,
      percentage: Math.round((count / total) * 100)
    };
  });

  return categoryBreakdown;
}

/**
 * Get REAL daily activity from user's actual classifications
 */
export async function getRealDailyActivity(userId) {
  const { data, error } = await supabase
    .from('waste_classifications')
    .select('created_at, co2_saved_kg')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (error || !data) {
    console.error('Error fetching daily activity:', error);
    return [];
  }

  const dailyData = {
    'Mon': { day: 'Mon', items: 0, co2: 0 },
    'Tue': { day: 'Tue', items: 0, co2: 0 },
    'Wed': { day: 'Wed', items: 0, co2: 0 },
    'Thu': { day: 'Thu', items: 0, co2: 0 },
    'Fri': { day: 'Fri', items: 0, co2: 0 },
    'Sat': { day: 'Sat', items: 0, co2: 0 },
    'Sun': { day: 'Sun', items: 0, co2: 0 }
  };

  data.forEach(item => {
    const date = new Date(item.created_at);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    
    dailyData[dayName].items += 1;
    dailyData[dayName].co2 += item.co2_saved_kg || 0;
  });

  return Object.values(dailyData);
}

/**
 * Get REAL monthly trends from user's actual classifications
 */
export async function getRealMonthlyTrends(userId) {
  const { data, error } = await supabase
    .from('waste_classifications')
    .select('created_at, co2_saved_kg, weight_kg')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('Error fetching monthly trends:', error);
    return [];
  }

  const monthlyData = {};
  data.forEach(item => {
    const date = new Date(item.created_at);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthName,
        items: 0,
        co2Saved: 0,
        weight: 0
      };
    }
    
    monthlyData[monthKey].items += 1;
    monthlyData[monthKey].co2Saved += item.co2_saved_kg || 0;
    monthlyData[monthKey].weight += item.weight_kg || 0;
  });

  return Object.values(monthlyData).slice(-6); // Last 6 months
}

/**
 * Get user's first classification date for calculating days active
 */
export async function getUserFirstClassificationDate(userId) {
  const { data, error } = await supabase
    .from('waste_classifications')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return new Date(data[0].created_at);
}

/**
 * Delete a waste classification by id and userId
 */
export async function deleteClassification(classificationId, userId) {
  try {
    const { error } = await supabase
      .from('waste_classifications')
      .delete()
      .eq('id', classificationId)
      .eq('user_id', userId);
    if (error) {
      console.error('Error deleting classification:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error('Unexpected error deleting classification:', err);
    return { success: false, error: err };
  }
} 