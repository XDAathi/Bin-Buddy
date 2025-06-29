import {createClient} from '@supabase/supabase-js';
import supabase from './supabase-client';

// CREATE (make sure to include user_id)
export async function createClassification(classification, user_id) {
  const { data, error } = await supabase
    .from('waste_classifications')
    .insert([{ ...classification, user_id }])
    .select();
  if (error) throw error;
  return data;
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