import os
import uuid
import json
import base64
import requests
import time
from datetime import datetime, timezone
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
        
        # Clean up confidence value (remove % symbols and ensure valid values)
        if 'confidence' in result:
            confidence = str(result['confidence']).lower().replace('%', '').strip()
            if confidence not in ['low', 'medium', 'high']:
                result['confidence'] = 'medium'
            else:
                result['confidence'] = confidence
        
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
    """Find nearby disposal locations using multiple FREE APIs"""
    
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
    
    # Try multiple FREE APIs in order of quality
    all_suggestions = []
    
    # 1. Try Overpass API (FREE, powerful OpenStreetMap queries)
    print("🔍 Trying Overpass API (FREE)...")
    suggestions = try_overpass_api(lat, lon, location_query)
    if suggestions:
        all_suggestions.extend(suggestions)
    
    # 2. Try HERE API (1000 requests/day FREE)
    if len(all_suggestions) < 3:
        print("🔍 Trying HERE API (FREE tier)...")
        suggestions = try_here_api(lat, lon, location_query)
        if suggestions:
            all_suggestions.extend(suggestions)
    
    # 3. Try Foursquare API (FREE tier)
    if len(all_suggestions) < 3:
        print("🔍 Trying Foursquare API (FREE tier)...")
        suggestions = try_foursquare_api(lat, lon, location_query)
        if suggestions:
            all_suggestions.extend(suggestions)
    
    # Remove duplicates and filter by distance
    unique_suggestions = []
    seen_places = set()
    
    for suggestion in all_suggestions:
        # Skip if too far (more than 25km)
        if suggestion['distance_km'] > 25:
            continue
        
        # Skip duplicates (based on name and rough location)
        place_key = f"{suggestion['name'].lower().replace(' ', '')}_{suggestion['lat']:.2f}_{suggestion['lon']:.2f}"
        if place_key not in seen_places:
            seen_places.add(place_key)
            unique_suggestions.append(suggestion)
    
    # Sort by distance and return top 5
    unique_suggestions.sort(key=lambda x: x['distance_km'])
    final_suggestions = unique_suggestions[:5]
    
    print(f"✅ Returning {len(final_suggestions)} FREE API suggestions (filtered from {len(all_suggestions)} total)")
    for i, suggestion in enumerate(final_suggestions):
        rating_text = f" - {suggestion.get('rating', 'N/A')}⭐" if suggestion.get('rating') else ""
        print(f"   {i+1}. {suggestion['name']} - {suggestion['distance_km']}km{rating_text}")
    
    # If we still don't have enough results, add some generic ones
    if len(final_suggestions) < 2:
        final_suggestions.extend(get_generic_suggestions(lat, lon, location_query))
    
    return final_suggestions[:5]

def try_overpass_api(lat, lon, location_query):
    """Search using Overpass API - completely FREE and powerful OpenStreetMap queries"""
    try:
        # Create search radius (in meters)
        radius = 15000  # 15km
        
        # Build category-specific Overpass queries
        queries = []
        
        if 'electronic' in location_query.lower() or 'e-waste' in location_query.lower():
            queries = [
                f'[out:json][timeout:10];(node["shop"="electronics"](around:{radius},{lat},{lon});node["name"~"Best Buy|Staples|Future Shop"](around:{radius},{lat},{lon}););out;',
                f'[out:json][timeout:10];(node["recycling:small_appliances"="yes"](around:{radius},{lat},{lon});node["amenity"="recycling"]["recycling_type"="centre"](around:{radius},{lat},{lon}););out;'
            ]
        elif 'furniture' in location_query.lower():
            queries = [
                f'[out:json][timeout:10];(node["shop"="charity"](around:{radius},{lat},{lon});node["name"~"Goodwill|Salvation Army|Value Village"](around:{radius},{lat},{lon}););out;',
                f'[out:json][timeout:10];(node["shop"="second_hand"](around:{radius},{lat},{lon});node["shop"="thrift"](around:{radius},{lat},{lon}););out;'
            ]
        elif 'clothing' in location_query.lower():
            queries = [
                f'[out:json][timeout:10];(node["shop"="charity"](around:{radius},{lat},{lon});node["shop"="second_hand"](around:{radius},{lat},{lon}););out;',
                f'[out:json][timeout:10];(node["name"~"Goodwill|Salvation Army|Value Village"](around:{radius},{lat},{lon}););out;'
            ]
        elif 'battery' in location_query.lower():
            queries = [
                f'[out:json][timeout:10];(node["amenity"="recycling"]["recycling:batteries"="yes"](around:{radius},{lat},{lon});node["shop"="car_repair"](around:{radius},{lat},{lon}););out;'
            ]
        elif 'recycling' in location_query.lower():
            queries = [
                f'[out:json][timeout:10];(node["amenity"="recycling"](around:{radius},{lat},{lon});node["amenity"="waste_disposal"](around:{radius},{lat},{lon}););out;'
            ]
        elif 'donation' in location_query.lower():
            queries = [
                f'[out:json][timeout:10];(node["shop"="charity"](around:{radius},{lat},{lon});node["amenity"="social_facility"](around:{radius},{lat},{lon}););out;'
            ]
        else:
            queries = [
                f'[out:json][timeout:10];(node["amenity"="recycling"](around:{radius},{lat},{lon});node["amenity"="waste_disposal"](around:{radius},{lat},{lon}););out;'
            ]
        
        suggestions = []
        
        for query in queries[:2]:  # Limit to 2 queries per search
            print(f"🔍 Running Overpass query...")
            
            response = requests.post(
                'https://overpass-api.de/api/interpreter',
                data=query,
                timeout=15,
                headers={'User-Agent': 'BinBuddy/1.0'}
            )
            
            if response.status_code == 200:
                data = response.json()
                elements = data.get('elements', [])
                print(f"📊 Overpass API found {len(elements)} elements")
                
                for element in elements:
                    if 'lat' not in element or 'lon' not in element:
                        continue
                    
                    tags = element.get('tags', {})
                    name = tags.get('name', tags.get('operator', 'Unknown Location'))
                    
                    if not name or name == 'Unknown Location':
                        continue
                    
                    result_lat = element['lat']
                    result_lon = element['lon']
                    distance = calculate_distance(lat, lon, result_lat, result_lon)
                    
                    # Determine type based on tags
                    suggestion_type = determine_overpass_type(tags, location_query)
                    
                    # Build address from tags
                    address_parts = []
                    for addr_key in ['addr:housenumber', 'addr:street', 'addr:city']:
                        if addr_key in tags:
                            address_parts.append(tags[addr_key])
                    address = ', '.join(address_parts) if address_parts else 'Address not available'
                    
                    suggestions.append({
                        "type": suggestion_type,
                        "name": name,
                        "address": address,
                        "distance_km": round(distance, 1),
                        "lat": result_lat,
                        "lon": result_lon,
                        "source": "overpass"
                    })
                
                if suggestions:
                    break  # Found results, no need to try more queries
        
        return suggestions[:5]  # Return top 5
        
    except Exception as e:
        print(f"💥 Error with Overpass API: {e}")
        return []

def try_here_api(lat, lon, location_query):
    """Search using HERE API - 1000 requests/day FREE"""
    try:
        here_api_key = os.getenv('HERE_API_KEY')
        if not here_api_key:
            print("⚠️ No HERE API key found, skipping...")
            return []
        
        # Build search terms
        search_terms = get_search_terms_for_category(location_query)
        
        suggestions = []
        for search_term in search_terms[:2]:  # Limit API calls
            url = "https://discover.search.hereapi.com/v1/discover"
            params = {
                'at': f"{lat},{lon}",
                'q': search_term,
                'limit': 10,
                'apikey': here_api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                items = data.get('items', [])
                print(f"📊 HERE API found {len(items)} results for '{search_term}'")
                
                for item in items:
                    position = item.get('position', {})
                    if 'lat' not in position or 'lng' not in position:
                        continue
                    
                    result_lat = position['lat']
                    result_lon = position['lng']
                    distance = calculate_distance(lat, lon, result_lat, result_lon)
                    
                    suggestions.append({
                        "type": determine_suggestion_type_from_categories(item.get('categories', []), location_query),
                        "name": item.get('title', 'Unknown Location'),
                        "address": item.get('address', {}).get('label', 'Address not available'),
                        "distance_km": round(distance, 1),
                        "lat": result_lat,
                        "lon": result_lon,
                        "source": "here"
                    })
                
                if suggestions:
                    break  # Found results
        
        return suggestions[:5]
        
    except Exception as e:
        print(f"💥 Error with HERE API: {e}")
        return []

def try_foursquare_api(lat, lon, location_query):
    """Search using Foursquare API - FREE tier available"""
    try:
        fsq_api_key = os.getenv('FOURSQUARE_API_KEY')
        if not fsq_api_key:
            print("⚠️ No Foursquare API key found, skipping...")
            return []
        
        # Build search terms and categories
        search_terms = get_search_terms_for_category(location_query)
        
        suggestions = []
        for search_term in search_terms[:2]:
            url = "https://api.foursquare.com/v3/places/search"
            params = {
                'll': f"{lat},{lon}",
                'query': search_term,
                'radius': 20000,  # 20km
                'limit': 10
            }
            
            headers = {
                'Authorization': fsq_api_key,
                'Accept': 'application/json'
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                print(f"📊 Foursquare API found {len(results)} results for '{search_term}'")
                
                for result in results:
                    geocodes = result.get('geocodes', {}).get('main', {})
                    if 'latitude' not in geocodes or 'longitude' not in geocodes:
                        continue
                    
                    result_lat = geocodes['latitude']
                    result_lon = geocodes['longitude']
                    distance = calculate_distance(lat, lon, result_lat, result_lon)
                    
                    location_info = result.get('location', {})
                    address = location_info.get('formatted_address', 'Address not available')
                    
                    suggestions.append({
                        "type": determine_suggestion_type_from_categories(result.get('categories', []), location_query),
                        "name": result.get('name', 'Unknown Location'),
                        "address": address,
                        "distance_km": round(distance, 1),
                        "lat": result_lat,
                        "lon": result_lon,
                        "rating": result.get('rating'),
                        "source": "foursquare"
                    })
                
                if suggestions:
                    break
        
        return suggestions[:5]
        
    except Exception as e:
        print(f"💥 Error with Foursquare API: {e}")
        return []

def get_search_terms_for_category(location_query):
    """Get search terms based on the location query category"""
    if 'electronic' in location_query.lower() or 'e-waste' in location_query.lower():
        return ['electronics recycling', 'Best Buy', 'computer repair', 'e-waste']
    elif 'furniture' in location_query.lower():
        return ['Goodwill', 'Salvation Army', 'thrift store', 'furniture donation']
    elif 'clothing' in location_query.lower():
        return ['clothing donation', 'Goodwill', 'thrift store', 'charity shop']
    elif 'battery' in location_query.lower():
        return ['battery recycling', 'auto parts store', 'car repair']
    elif 'recycling' in location_query.lower():
        return ['recycling center', 'waste management', 'municipal recycling']
    elif 'donation' in location_query.lower():
        return ['donation center', 'charity', 'Goodwill', 'Salvation Army']
    else:
        return ['recycling center', 'waste management']

def determine_overpass_type(tags, location_query):
    """Determine suggestion type from OpenStreetMap tags"""
    shop = tags.get('shop', '').lower()
    amenity = tags.get('amenity', '').lower()
    name = tags.get('name', '').lower()
    
    if shop in ['charity', 'second_hand', 'thrift'] or 'goodwill' in name or 'salvation army' in name:
        return "donate"
    elif amenity in ['waste_disposal', 'waste_transfer_station'] or 'dump' in name:
        return "dispose"
    else:
        return "dropoff"

def determine_suggestion_type_from_categories(categories, location_query):
    """Determine suggestion type from API categories"""
    # This is a simplified version - you can expand based on actual category data
    for category in categories:
        cat_name = category.get('name', '').lower() if isinstance(category, dict) else str(category).lower()
        if any(keyword in cat_name for keyword in ['charity', 'thrift', 'donation']):
            return "donate"
        elif any(keyword in cat_name for keyword in ['waste', 'dump', 'disposal']):
            return "dispose"
    
    return "dropoff"

def get_generic_suggestions(lat, lon, location_query):
    """Generate generic suggestions as fallback"""
    generic_suggestions = []
    
    if 'donation' in location_query.lower() or 'furniture' in location_query.lower() or 'clothing' in location_query.lower():
        generic_suggestions.extend([
            {
                "type": "donate",
                "name": "Local Goodwill Store",
                "address": "Check maps for nearest location",
                "distance_km": 3.2,
                "lat": lat + 0.02,
                "lon": lon + 0.015
            },
            {
                "type": "donate",
                "name": "Salvation Army Donation Center",
                "address": "Check maps for nearest location", 
                "distance_km": 4.1,
                "lat": lat - 0.025,
                "lon": lon + 0.02
            }
        ])
    else:
        generic_suggestions.extend([
            {
                "type": "dropoff",
                "name": "Municipal Recycling Center",
                "address": "Contact city for location",
                "distance_km": 2.8,
                "lat": lat + 0.015,
                "lon": lon - 0.01
            },
            {
                "type": "dropoff",
                "name": "Local Waste Management Facility",
                "address": "Check city website",
                "distance_km": 5.3,
                "lat": lat - 0.03,
                "lon": lon + 0.025
            }
        ])
    
    return generic_suggestions





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
            "timestamp": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            
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
    return jsonify({'status': 'healthy', 'timestamp': datetime.now(timezone.utc).isoformat()})

@app.route('/api/icons', methods=['GET'])
def get_available_icons():
    """Get all available icon sets and icons"""
    return jsonify(ICON_SETS)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001) 