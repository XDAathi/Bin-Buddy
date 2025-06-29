import supabase from './supabase-client';

// CREATE (make sure to include user_id)
export async function createClassification(classification, user_id) {
  try {
    // Create a dummy image record if waste_image_id is not provided
    let waste_image_id = classification.waste_image_id;
    
    if (!waste_image_id) {
      const { data: imageData, error: imageError } = await supabase
        .from('waste_images')
        .insert([{
          user_id: user_id,
          filename: 'camera_capture.jpg',
          storage_path: `${user_id}/temp_${Date.now()}.jpg`,
          file_size_bytes: 0,
          mime_type: 'image/jpeg',
          processed: true
        }])
        .select()
        .single();
      
      if (imageError) {
        console.error('Failed to create image record:', imageError);
        throw imageError;
      }
      
      waste_image_id = imageData.id;
    }

    const { data, error } = await supabase
      .from('waste_classifications')
      .insert([{ ...classification, user_id, waste_image_id }])
      .select();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to create classification:', error);
    throw error;
  }
}

// READ (only for this user)
export async function getClassifications(user_id) {
  const { data, error } = await supabase
    .from('waste_classifications')
    .select('*')
    .eq('user_id', user_id);
  if (error) throw error;
  return data;
}

// DELETE (only for this user's record)
export async function deleteClassification(id, user_id) {
  const { error } = await supabase
    .from('waste_classifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user_id);
  if (error) throw error;
  return true;
}

export async function upsertUser(user) {
  const { error } = await supabase
    .from('users')
    .upsert([
      {
        id: user.id,
        email: user.email,
        username: user.username || (user.email ? user.email.split('@')[0] : 'User'),
      }
    ]);
  if (error) throw error;
  return true;
}