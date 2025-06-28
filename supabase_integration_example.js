// Example of integrating API response with Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'your-supabase-url'
const supabaseKey = 'your-supabase-anon-key'
const supabase = createClient(supabaseUrl, supabaseKey)

// Example API response (from your backend)
const apiResponse = {
  "image_id": "a7b8c9d0-1234-5678-9abc-def012345678",
  "timestamp": "2024-01-15T14:30:45.123Z",
  "category": "electronics",
  "subtype": "smartphones",
  "confidence": "high",
  "weight": 0.2,
  "co2_saved": 3.0,
  "disposal_methods": [
    "Backup and wipe all personal data",
    "Remove SIM cards and memory cards",
    "Take to certified e-waste facilities",
    "Check manufacturer trade-in programs",
    "Donate if still functional"
  ],
  "suggestions": [
    {
      "type": "dropoff",
      "name": "Best Buy Electronics Recycling Center",
      "distance_km": 2.3,
      "lat": 40.7128,
      "lon": -74.0060
    },
    {
      "type": "dropoff", 
      "name": "Apple Store - Trade In Program",
      "distance_km": 3.1,
      "lat": 40.7614,
      "lon": -73.9776
    }
  ]
}

// Function to save classification to Supabase
async function saveClassificationToSupabase(apiResponse, userLocation, userId = null) {
  try {
    // Insert the classification using the custom function
    const { data, error } = await supabase.rpc('insert_classification', {
      p_image_id: apiResponse.image_id,
      p_user_id: userId,
      p_category: apiResponse.category,
      p_subtype: apiResponse.subtype,
      p_confidence: apiResponse.confidence,
      p_weight_kg: apiResponse.weight,
      p_co2_saved_kg: apiResponse.co2_saved,
      p_user_lat: userLocation?.lat || null,
      p_user_lon: userLocation?.lon || null,
      p_disposal_methods: apiResponse.disposal_methods,
      p_location_suggestions: apiResponse.suggestions
    })

    if (error) {
      console.error('Error saving classification:', error)
      return null
    }

    console.log('Classification saved successfully:', data)
    return data
  } catch (err) {
    console.error('Unexpected error:', err)
    return null
  }
}

// Alternative: Direct INSERT (if not using the custom function)
async function saveClassificationDirect(apiResponse, userLocation, userId = null) {
  const { data, error } = await supabase
    .from('waste_classifications')
    .insert({
      image_id: apiResponse.image_id,
      user_id: userId,
      category: apiResponse.category,
      subtype: apiResponse.subtype,
      confidence: apiResponse.confidence,
      weight_kg: apiResponse.weight,
      co2_saved_kg: apiResponse.co2_saved,
      user_lat: userLocation?.lat || null,
      user_lon: userLocation?.lon || null,
      disposal_methods: apiResponse.disposal_methods,
      location_suggestions: apiResponse.suggestions
    })
    .select()

  return { data, error }
}

// Function to get user's classification history
async function getUserClassifications(userId, limit = 20) {
  const { data, error } = await supabase
    .from('waste_classifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

// Function to get analytics data
async function getAnalytics(startDate, endDate) {
  const { data, error } = await supabase
    .from('daily_analytics')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  return { data, error }
}

// Function to get nearby disposal locations
async function getNearbyLocations(lat, lon, category, radius = 10) {
  // This would require a more complex spatial query
  // For now, we'll just get all locations for the category
  const { data, error } = await supabase
    .from('disposal_locations')
    .select('*')
    .eq('category', category)
    .eq('active', true)

  if (data) {
    // Calculate distances client-side (or use PostGIS functions)
    return data.map(location => ({
      ...location,
      distance_km: calculateDistance(lat, lon, location.lat, location.lon)
    })).sort((a, b) => a.distance_km - b.distance_km)
  }

  return { data, error }
}

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Example usage in your app
async function handleWasteClassification(imageData, userLocation, userId) {
  try {
    // 1. Call your Flask API
    const response = await fetch('/api/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        lat: userLocation.lat,
        lon: userLocation.lon
      })
    })

    const apiResponse = await response.json()

    // 2. Save to Supabase
    const classificationId = await saveClassificationToSupabase(
      apiResponse, 
      userLocation, 
      userId
    )

    // 3. Return combined data
    return {
      ...apiResponse,
      classification_id: classificationId
    }

  } catch (error) {
    console.error('Error in waste classification flow:', error)
    throw error
  }
}

// Raw SQL example for manual insertion
const rawSQLExample = `
INSERT INTO waste_classifications (
    image_id, user_id, category, subtype, confidence,
    weight_kg, co2_saved_kg, user_lat, user_lon,
    disposal_methods, location_suggestions
) VALUES (
    'a7b8c9d0-1234-5678-9abc-def012345678',
    '12345678-1234-1234-1234-123456789012',  -- user_id (optional)
    'electronics',
    'smartphones', 
    'high',
    0.2,
    3.0,
    40.7128,
    -74.0060,
    '["Backup and wipe all personal data", "Remove SIM cards and memory cards", "Take to certified e-waste facilities", "Check manufacturer trade-in programs", "Donate if still functional"]'::jsonb,
    '[{"type": "dropoff", "name": "Best Buy Electronics Recycling Center", "distance_km": 2.3, "lat": 40.7128, "lon": -74.0060}, {"type": "dropoff", "name": "Apple Store - Trade In Program", "distance_km": 3.1, "lat": 40.7614, "lon": -73.9776}]'::jsonb
);
`;

export {
  saveClassificationToSupabase,
  saveClassificationDirect,
  getUserClassifications,
  getAnalytics,
  getNearbyLocations,
  handleWasteClassification
} 