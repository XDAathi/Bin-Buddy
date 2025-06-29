import os
import uuid
import json
import base64
import requests
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# Default CO2 rates by general category (as fallback)
DEFAULT_CO2_RATES = {
    'recyclable': 1.0,
    'organic': 0.3,
    'electronic': 15.0,
    'textile': 8.0,
    'furniture': 25.0,
    'hazardous': 0.0,
    'general': 0.0
}

# Available icon sets for React Icons
ICON_SETS = {
    'material': ['MdRecycling', 'MdDelete', 'MdDevices', 'MdLocalGroceryStore', 'MdHome', 'MdWarning', 'MdBattery', 'MdPhone', 'MdLaptop', 'MdChair', 'MdLocalFlorist', 'MdRestaurant', 'MdShoppingBag', 'MdDirectionsCar', 'MdBuild', 'MdColorLens', 'MdCleaningServices', 'MdKitchen'],
    'fa': ['FaRecycle', 'FaTrash', 'FaMobile', 'FaLaptop', 'FaShirt', 'FaCouch', 'FaBatteryFull', 'FaCar', 'FaPaintBrush', 'FaLeaf', 'FaAppleAlt', 'FaWineBottle', 'FaNewspaper', 'FaTv', 'FaGamepad', 'FaHeadphones', 'FaShoes', 'FaGlasses'],
    'io': ['IoMdRecycle', 'IoMdTrash', 'IoMdPhone', 'IoMdLaptop', 'IoMdShirt', 'IoMdBed', 'IoMdBattery', 'IoMdCar', 'IoMdBrush', 'IoMdLeaf', 'IoMdApple', 'IoMdBottle', 'IoMdPaper', 'IoMdTv', 'IoMdGameController'],
    'hi': ['HiRecycle', 'HiTrash', 'HiDeviceMobile', 'HiDesktopComputer', 'HiShoppingBag', 'HiHome', 'HiBatteryFull', 'HiCar', 'HiColorSwatch', 'HiLeaf', 'HiFastFood', 'HiGift', 'HiNewspaper', 'HiDesktopComputer']
}

def create_dynamic_prompt():
    """Create a comprehensive prompt for dynamic waste classification"""
    icon_examples = []
    for icon_set, icons in ICON_SETS.items():
        icon_examples.extend([f"{icon_set}/{icon}" for icon in icons[:5]])  # Show examples from each set
    
    return f"""Analyze this waste item image and create a comprehensive classification. Return ONLY a JSON object:
{{
    "main_category": "broad category (recyclable/organic/electronic/textile/furniture/hazardous/garbage)",
    "specific_category": "very specific item type (e.g. plastic_water_bottle, iphone_smartphone, leather_boots, etc.)",
    "display_name": "Human readable name (e.g. 'Plastic Water Bottle', 'iPhone Smartphone')",
    "estimated_weight_kg": number,
    "confidence": "high/medium/low",
    "co2_saved_kg_per_kg": number (research-based CO2 savings rate for this specific material),
    "color": "hex color that represents this item type (e.g. #2196F3 for plastic, #4CAF50 for organic)",
    "icon": "icon_set/icon_name (choose from examples below)",
    "disposal_methods": ["array of 4-5 specific disposal instructions for this exact item"],
    "location_query": "specific search query for maps OR 'nearest_X' format",
    "recyclable": true/false,
    "donation_worthy": true/false (if item could be donated instead of discarded)
}}

Available icons (format: icon_set/icon_name):
{', '.join(icon_examples[:20])}

Examples of good responses:
- For plastic bottle: location_query: "plastic recycling center", color: "#2196F3"
- For smartphone: location_query: "electronics recycling e-waste", color: "#333333"
- For couch: location_query: "furniture donation thrift store", color: "#8D6E63"
- For batteries: location_query: "battery recycling drop-off", color: "#FF9800"
- For cardboard: location_query: "nearest_recycling", color: "#795548"
- For apple core: location_query: "nearest_composting", color: "#4CAF50"

Be extremely specific with categories (e.g. "plastic_water_bottle" not just "plastic", "leather_running_shoes" not just "shoes").
Research accurate CO2 savings rates for the specific material.
Choose colors that visually represent the item.
Pick the most appropriate icon from the available sets."""

def classify_image_with_gemini(image_data):
    """Classify image using dynamic Gemini Vision API"""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data.split(',')[1])
        image = Image.open(io.BytesIO(image_bytes))
        
        # Use dynamic prompt
        prompt = create_dynamic_prompt()
        
        response = model.generate_content([prompt, image])
        
        # Parse JSON response
        result_text = response.text.strip()
        if result_text.startswith('```json'):
            result_text = result_text[7:-3]
        elif result_text.startswith('```'):
            result_text = result_text[3:-3]
            
        result = json.loads(result_text)
        
        # Validate and set defaults
        required_fields = ['main_category', 'specific_category', 'display_name', 'estimated_weight_kg', 
                          'confidence', 'co2_saved_kg_per_kg', 'color', 'icon', 'disposal_methods', 
                          'location_query', 'recyclable', 'donation_worthy']
        
        for field in required_fields:
            if field not in result:
                # Set sensible defaults
                if field == 'main_category':
                    result[field] = 'general'
                elif field == 'specific_category':
                    result[field] = 'unidentified_item'
                elif field == 'display_name':
                    result[field] = 'Unidentified Item'
                elif field == 'estimated_weight_kg':
                    result[field] = 0.2
                elif field == 'confidence':
                    result[field] = 'low'
                elif field == 'co2_saved_kg_per_kg':
                    result[field] = DEFAULT_CO2_RATES.get(result.get('main_category', 'general'), 0.0)
                elif field == 'color':
                    result[field] = '#757575'
                elif field == 'icon':
                    result[field] = 'material/MdDelete'
                elif field == 'disposal_methods':
                    result[field] = ["Consult local waste management guidelines"]
                elif field == 'location_query':
                    result[field] = 'nearest_disposal'
                elif field in ['recyclable', 'donation_worthy']:
                    result[field] = False
        
        # Validate color format
        if not result['color'].startswith('#') or len(result['color']) != 7:
            result['color'] = '#757575'
        
        # Validate icon format
        if '/' not in result['icon']:
            result['icon'] = 'material/MdDelete'
        
        return result
        
    except Exception as e:
        print(f"Error classifying image: {e}")
        return {
            "main_category": "general",
            "specific_category": "unidentified_item",
            "display_name": "Unidentified Item",
            "estimated_weight_kg": 0.2,
            "confidence": "low",
            "co2_saved_kg_per_kg": 0.0,
            "color": "#757575",
            "icon": "material/MdDelete",
            "disposal_methods": ["Consult local waste management guidelines"],
            "location_query": "nearest_disposal",
            "recyclable": False,
            "donation_worthy": False
        }

def calculate_co2_savings(co2_rate, weight):
    """Calculate CO2 savings based on rate and weight"""
    return round(weight * co2_rate, 2)

def find_nearby_locations(lat, lon, location_query):
    """Find nearby disposal locations using Google Places API"""
    
    print(f"🔍 Searching for locations: '{location_query}' at {lat}, {lon}")
    
    # Handle "nearest_X" format queries
    if location_query.startswith('nearest_'):
        simple_type = location_query.replace('nearest_', '').replace('_', ' ')
        print(f"📍 Using simple nearest location for: {simple_type}")
        return [{
            "type": "dropoff",
            "name": f"Nearest {simple_type}",
            "distance_km": 0.0,
            "lat": lat,
            "lon": lon
        }]
    
    # Get Google Places API key
    google_api_key = os.getenv('GOOGLE_PLACES_API_KEY')
    if not google_api_key:
        print("❌ No Google Places API key found, falling back to basic search")
        return try_fallback_search(lat, lon, location_query)
    
    all_suggestions = []
    
    try:
        # Enhanced search terms with better specificity for Google Places
        search_terms = []
        place_types = []
        
        # Add category-specific search terms and place types
        if 'electronic' in location_query.lower() or 'e-waste' in location_query.lower():
            search_terms = [
                'electronics recycling center',
                'computer recycling', 
                'e-waste disposal',
                'Best Buy recycling'
            ]
            place_types = ['electronics_store', 'store']
        elif 'furniture' in location_query.lower():
            search_terms = [
                'Goodwill',
                'Salvation Army',
                'thrift store',
                'furniture donation center'
            ]
            place_types = ['clothing_store', 'store']
        elif 'clothing' in location_query.lower():
            search_terms = [
                'Goodwill',
                'Salvation Army', 
                'clothing donation',
                'textile recycling'
            ]
            place_types = ['clothing_store', 'store']
        elif 'battery' in location_query.lower():
            search_terms = [
                'battery recycling',
                'hazardous waste facility',
                'automotive store battery'
            ]
            place_types = ['car_repair', 'store']
        elif 'plastic' in location_query.lower() or 'recycling' in location_query.lower():
            search_terms = [
                'recycling center',
                'waste management',
                'municipal recycling'
            ]
            place_types = ['local_government_office']
        elif 'donation' in location_query.lower() or 'charity' in location_query.lower():
            search_terms = [
                'Goodwill',
                'Salvation Army',
                'charity donation center',
                'thrift store'
            ]
            place_types = ['clothing_store', 'store']
        else:
            search_terms = [
                'waste management',
                'recycling center',
                'dump'
            ]
            place_types = ['local_government_office']
        
        # Try each search approach
        for search_term in search_terms[:4]:  # Limit API calls
            print(f"🔍 Trying Google Places search: '{search_term}'")
            
            # Strategy 1: Text search for specific businesses
            suggestions = try_google_places_text_search(lat, lon, search_term, google_api_key, radius=20000)
            if suggestions:
                all_suggestions.extend(suggestions)
                continue
            
            # Strategy 2: Nearby search with place types
            for place_type in place_types[:2]:  # Try up to 2 place types
                suggestions = try_google_places_nearby_search(lat, lon, search_term, place_type, google_api_key, radius=15000)
                if suggestions:
                    all_suggestions.extend(suggestions)
                    break
        
        # Remove duplicates and filter by distance
        unique_suggestions = []
        seen_places = set()
        
        for suggestion in all_suggestions:
            # Skip if too far (more than 30km)
            if suggestion['distance_km'] > 30:
                continue
            
            # Skip duplicates (based on place_id or name+location)
            place_key = suggestion.get('place_id', f"{suggestion['name']}_{suggestion['lat']:.3f}_{suggestion['lon']:.3f}")
            if place_key not in seen_places:
                seen_places.add(place_key)
                unique_suggestions.append(suggestion)
        
        # Sort by distance and return top 5
        unique_suggestions.sort(key=lambda x: x['distance_km'])
        final_suggestions = unique_suggestions[:5]
        
        print(f"✅ Returning {len(final_suggestions)} Google Places suggestions (filtered from {len(all_suggestions)} total)")
        for i, suggestion in enumerate(final_suggestions):
            print(f"   {i+1}. {suggestion['name']} - {suggestion['distance_km']}km - {suggestion.get('rating', 'N/A')}⭐")
        
        return final_suggestions
        
    except Exception as e:
        print(f"💥 Error finding locations with Google Places: {e}")
        return try_fallback_search(lat, lon, location_query)

def try_google_places_text_search(lat, lon, search_term, api_key, radius=20000):
    """Search for places using Google Places Text Search API"""
    try:
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        params = {
            'query': f"{search_term} near {lat},{lon}",
            'location': f"{lat},{lon}",
            'radius': radius,
            'key': api_key
        }
        
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            print(f"📊 Google Places Text Search found {len(results)} results for '{search_term}'")
            
            suggestions = []
            for result in results:
                if 'geometry' not in result:
                    continue
                    
                result_lat = result['geometry']['location']['lat']
                result_lon = result['geometry']['location']['lng']
                distance = calculate_distance(lat, lon, result_lat, result_lon)
                
                # Determine type based on place types and search term
                suggestion_type = determine_suggestion_type(result, search_term)
                
                suggestions.append({
                    "type": suggestion_type,
                    "name": result['name'],
                    "address": result.get('formatted_address', 'Address unavailable'),
                    "distance_km": round(distance, 1),
                    "lat": result_lat,
                    "lon": result_lon,
                    "rating": result.get('rating'),
                    "place_id": result.get('place_id'),
                    "types": result.get('types', [])
                })
            
            return suggestions
        else:
            print(f"❌ Google Places Text Search API returned status code: {response.status_code}")
            
    except Exception as e:
        print(f"💥 Error in Google Places Text Search: {e}")
    
    return []

def try_google_places_nearby_search(lat, lon, keyword, place_type, api_key, radius=15000):
    """Search for nearby places using Google Places Nearby Search API"""
    try:
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            'location': f"{lat},{lon}",
            'radius': radius,
            'type': place_type,
            'keyword': keyword,
            'key': api_key
        }
        
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            print(f"📊 Google Places Nearby Search found {len(results)} results for '{keyword}' + '{place_type}'")
            
            suggestions = []
            for result in results:
                if 'geometry' not in result:
                    continue
                    
                result_lat = result['geometry']['location']['lat']
                result_lon = result['geometry']['location']['lng']
                distance = calculate_distance(lat, lon, result_lat, result_lon)
                
                # Determine type based on place types and keyword
                suggestion_type = determine_suggestion_type(result, keyword)
                
                suggestions.append({
                    "type": suggestion_type,
                    "name": result['name'],
                    "address": result.get('vicinity', 'Address unavailable'),
                    "distance_km": round(distance, 1),
                    "lat": result_lat,
                    "lon": result_lon,
                    "rating": result.get('rating'),
                    "place_id": result.get('place_id'),
                    "types": result.get('types', [])
                })
            
            return suggestions
        else:
            print(f"❌ Google Places Nearby Search API returned status code: {response.status_code}")
            
    except Exception as e:
        print(f"💥 Error in Google Places Nearby Search: {e}")
    
    return []

def determine_suggestion_type(place_result, search_term):
    """Determine the suggestion type based on place data and search term"""
    place_types = place_result.get('types', [])
    name = place_result.get('name', '').lower()
    search_lower = search_term.lower()
    
    # Check for donation/charity places
    if any(keyword in name for keyword in ['goodwill', 'salvation army', 'charity', 'thrift']):
        return "donate"
    if any(keyword in search_lower for keyword in ['donation', 'charity', 'thrift', 'goodwill', 'salvation']):
        return "donate"
    
    # Check for disposal/waste places
    if any(keyword in name for keyword in ['dump', 'landfill', 'waste', 'transfer station']):
        return "dispose"
    if any(keyword in search_lower for keyword in ['dump', 'landfill', 'disposal', 'waste management']):
        return "dispose"
    
    # Default to dropoff for recycling centers and others
    return "dropoff"

def try_fallback_search(lat, lon, location_query):
    """Fallback search when Google Places API is not available"""
    print("🔄 Using fallback search method")
    
    # Return some generic suggestions based on location
    return [
        {
            "type": "dropoff",
            "name": "Municipal Recycling Center",
            "distance_km": 2.5,
            "lat": lat + 0.01,
            "lon": lon + 0.01
        },
        {
            "type": "donate",
            "name": "Local Donation Center",
            "distance_km": 1.8,
            "lat": lat - 0.008,
            "lon": lon + 0.012
        }
    ]



def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate approximate distance in km between two coordinates"""
    import math
    
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371  # Earth's radius in km
    
    return r * c

@app.route('/api/classify', methods=['POST'])
def classify_waste():
    """Main endpoint to classify waste and return recommendations"""
    try:
        data = request.json
        
        # Extract data
        image_data = data.get('image')
        lat = data.get('lat')
        lon = data.get('lon')
        
        if not image_data or not lat or not lon:
            return jsonify({'error': 'Missing required fields: image, lat, lon'}), 400
        
        # Classify image with Gemini (now returns comprehensive data)
        classification = classify_image_with_gemini(image_data)
        
        # Use Gemini's weight estimate and CO2 rate
        weight = classification['estimated_weight_kg']
        co2_saved = calculate_co2_savings(classification['co2_saved_kg_per_kg'], weight)
        
        # Find nearby locations using Gemini's location query
        suggestions = find_nearby_locations(lat, lon, classification['location_query'])
        
        # Create response with all dynamic data
        response = {
            "image_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            
            # Core classification
            "main_category": classification['main_category'],
            "specific_category": classification['specific_category'],
            "display_name": classification['display_name'],
            "confidence": classification['confidence'],
            
            # Weight and impact
            "weight": weight,
            "co2_saved": co2_saved,
            "co2_rate": classification['co2_saved_kg_per_kg'],
            
            # Visual and interaction
            "color": classification['color'],
            "icon": classification['icon'],
            
            # Disposal guidance
            "disposal_methods": classification['disposal_methods'],
            "recyclable": classification['recyclable'],
            "donation_worthy": classification['donation_worthy'],
            
            # Location suggestions
            "suggestions": suggestions,
            "location_query": classification['location_query']
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error in classify_waste: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/icons', methods=['GET'])
def get_available_icons():
    """Get all available icon sets and icons"""
    return jsonify(ICON_SETS)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001) 