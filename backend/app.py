import os
import uuid
import json
import base64
import requests
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
    """Find nearby disposal locations based on dynamic query"""
    
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
    
    # For specific queries, search for actual locations
    try:
        # Try multiple search approaches
        search_terms = [location_query]
        
        # Add simpler, more generic search terms
        if 'electronic' in location_query.lower() or 'e-waste' in location_query.lower():
            search_terms.extend(['electronics recycling', 'e-waste center', 'computer recycling'])
        elif 'recycling' in location_query.lower():
            search_terms.extend(['recycling center', 'waste management', 'recycling facility'])
        elif 'donation' in location_query.lower() or 'charity' in location_query.lower():
            search_terms.extend(['donation center', 'thrift store', 'charity shop'])
        else:
            search_terms.extend(['waste management', 'recycling center', 'dump'])
        
        # Try each search term until we get results
        for search_term in search_terms:
            print(f"🔍 Trying search term: '{search_term}'")
            
            # Search using Nominatim
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': search_term,
                'format': 'jsonv2',
                'lat': lat,
                'lon': lon,
                'limit': 10,
                'bounded': 1,
                'viewbox': f"{lon-0.2},{lat-0.2},{lon+0.2},{lat+0.2}"
            }
        
            print(f"🌐 Making API call to: {url}")
            print(f"📝 Query params: {params}")
            
            headers = {'User-Agent': 'BinBuddy/1.0'}
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            print(f"📡 API Response: {response.status_code}")
            
            if response.status_code == 200:
                results = response.json()
                print(f"📊 Found {len(results)} raw results from API")
                
                if results:  # If we found results, process them
                    suggestions = []
                    
                    for i, result in enumerate(results):
                        print(f"🏢 Result {i+1}: {result.get('display_name', 'Unknown')}")
                        
                        result_lat = float(result['lat'])
                        result_lon = float(result['lon'])
                        distance = calculate_distance(lat, lon, result_lat, result_lon)
                        
                        # Determine type based on query content
                        suggestion_type = "dropoff"
                        if any(word in search_term.lower() for word in ['donation', 'charity', 'thrift']):
                            suggestion_type = "donate"
                        elif any(word in search_term.lower() for word in ['dump', 'landfill', 'disposal']):
                            suggestion_type = "dispose"
                        
                        suggestions.append({
                            "type": suggestion_type,
                            "name": result.get('display_name', 'Unknown Location'),
                            "distance_km": round(distance, 1),
                            "lat": result_lat,
                            "lon": result_lon
                        })
                    
                    # Sort by distance and return up to 5
                    suggestions.sort(key=lambda x: x['distance_km'])
                    final_suggestions = suggestions[:5]
                    print(f"✅ Returning {len(final_suggestions)} location suggestions")
                    return final_suggestions
                else:
                    print(f"❌ No results for '{search_term}', trying next term...")
            else:
                print(f"❌ API returned status code: {response.status_code} for '{search_term}'")
        
    except Exception as e:
        print(f"💥 Error finding locations: {e}")
    
    # Return empty list if API fails
    print("🚫 Returning empty location list")
    return []

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