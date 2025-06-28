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

# Comprehensive waste categorization system
WASTE_CATEGORIES = {
    'plastic': {
        'plastic_bottles': {
            'co2_rate': 1.02,
            'avg_weight': 0.03,
            'methods': [
                "Remove caps and labels before recycling",
                "Rinse bottles to remove liquid residue", 
                "Check plastic recycling number (1-7)",
                "Place in designated plastic recycling bins",
                "Consider reusing for storage before recycling"
            ]
        },
        'plastic_bags': {
            'co2_rate': 0.8,
            'avg_weight': 0.005,
            'methods': [
                "Take to grocery store plastic bag recycling bins",
                "Never put in curbside recycling",
                "Bundle similar bags together",
                "Ensure bags are clean and dry",
                "Consider reusable alternatives"
            ]
        },
        'plastic_containers': {
            'co2_rate': 1.02,
            'avg_weight': 0.15,
            'methods': [
                "Check recycling number on bottom",
                "Remove food residue completely",
                "Separate lids if different plastic type",
                "Place in plastic recycling bin",
                "Reuse for food storage when possible"
            ]
        },
        'plastic_utensils': {
            'co2_rate': 0.5,
            'avg_weight': 0.01,
            'methods': [
                "Clean thoroughly before disposal",
                "Check if accepted in local recycling",
                "Consider compostable alternatives",
                "Reuse for crafts or gardening",
                "Last resort: general waste"
            ]
        }
    },
    'glass': {
        'glass_bottles': {
            'co2_rate': 0.31,
            'avg_weight': 0.4,
            'methods': [
                "Remove caps and lids",
                "Rinse to remove liquid residue",
                "Sort by color if required locally",
                "Place in glass recycling bin",
                "Consider bottle return programs"
            ]
        },
        'glass_jars': {
            'co2_rate': 0.31,
            'avg_weight': 0.2,
            'methods': [
                "Remove metal lids and recycle separately",
                "Clean thoroughly to remove food residue",
                "Remove labels if possible",
                "Reuse for food storage",
                "Recycle in glass collection"
            ]
        },
        'broken_glass': {
            'co2_rate': 0.31,
            'avg_weight': 0.1,
            'methods': [
                "Wrap safely in newspaper or cardboard",
                "Label clearly as 'broken glass'",
                "Take to specialized glass recycling facility",
                "Never put loose in recycling bins",
                "Handle with extreme care"
            ]
        },
        'window_glass': {
            'co2_rate': 0.20,
            'avg_weight': 2.0,
            'methods': [
                "Contact specialized glass recyclers",
                "Remove frames and hardware",
                "Transport safely to avoid breakage",
                "Check with construction waste facilities",
                "Consider donation if intact"
            ]
        }
    },
    'paper': {
        'newspapers': {
            'co2_rate': 0.46,
            'avg_weight': 0.1,
            'methods': [
                "Keep dry and clean",
                "Remove plastic sleeves",
                "Bundle or place loose in recycling",
                "Avoid glossy inserts if not accepted",
                "Consider composting if organic"
            ]
        },
        'cardboard': {
            'co2_rate': 0.46,
            'avg_weight': 0.2,
            'methods': [
                "Flatten boxes to save space",
                "Remove tape and staples",
                "Keep dry to prevent contamination",
                "Separate corrugated from paperboard",
                "Reuse for moving or storage"
            ]
        },
        'magazines': {
            'co2_rate': 0.46,
            'avg_weight': 0.15,
            'methods': [
                "Remove plastic wrapping",
                "Check if glossy paper is accepted",
                "Donate to libraries or schools first",
                "Bundle with other mixed paper",
                "Consider digital subscriptions"
            ]
        },
        'office_paper': {
            'co2_rate': 0.46,
            'avg_weight': 0.05,
            'methods': [
                "Remove paper clips and staples",
                "Shred sensitive documents",
                "Keep separate from cardboard",
                "Reuse blank sides for notes",
                "Ensure no plastic coatings"
            ]
        },
        'paper_cups': {
            'co2_rate': 0.2,
            'avg_weight': 0.02,
            'methods': [
                "Check if plastic-lined (not recyclable)",
                "Remove lids and sleeves",
                "Rinse if food contaminated",
                "Use reusable cups instead",
                "Compost if certified compostable"
            ]
        }
    },
    'metal': {
        'aluminum_cans': {
            'co2_rate': 2.1,
            'avg_weight': 0.015,
            'methods': [
                "Rinse to remove liquid residue",
                "Crush to save space",
                "Keep separate from steel cans",
                "Check for bottle deposits",
                "One of the most valuable recyclables"
            ]
        },
        'steel_cans': {
            'co2_rate': 1.8,
            'avg_weight': 0.08,
            'methods': [
                "Remove labels if possible",
                "Rinse thoroughly",
                "Remove both ends if required",
                "Test with magnet to confirm steel",
                "Recycle with other metals"
            ]
        },
        'aluminum_foil': {
            'co2_rate': 2.1,
            'avg_weight': 0.01,
            'methods': [
                "Clean off food residue",
                "Ball up with other foil pieces",
                "Must be tennis ball sized to recycle",
                "Reuse when possible",
                "Include aluminum take-out containers"
            ]
        },
        'metal_appliances': {
            'co2_rate': 1.5,
            'avg_weight': 15.0,
            'methods': [
                "Remove hazardous components (freon, etc.)",
                "Contact scrap metal dealers",
                "Check manufacturer take-back programs",
                "Donate if still functional",
                "Schedule bulk pickup with waste service"
            ]
        }
    },
    'electronics': {
        'smartphones': {
            'co2_rate': 15.0,
            'avg_weight': 0.2,
            'methods': [
                "Backup and wipe all personal data",
                "Remove SIM cards and memory cards",
                "Take to certified e-waste facilities",
                "Check manufacturer trade-in programs",
                "Donate if still functional"
            ]
        },
        'laptops': {
            'co2_rate': 18.0,
            'avg_weight': 2.5,
            'methods': [
                "Remove hard drives and wipe data",
                "Take to certified e-waste recyclers",
                "Check manufacturer recycling programs",
                "Donate to schools if working",
                "Never put in regular trash"
            ]
        },
        'batteries': {
            'co2_rate': 20.0,
            'avg_weight': 0.05,
            'methods': [
                "Take to battery recycling drop-offs",
                "Never put in regular trash",
                "Tape terminals on lithium batteries",
                "Separate by battery type",
                "Check electronics stores for programs"
            ]
        },
        'cables_chargers': {
            'co2_rate': 12.0,
            'avg_weight': 0.3,
            'methods': [
                "Bundle similar cables together",
                "Take to electronics recycling",
                "Donate working chargers",
                "Check electronics stores for take-back",
                "Strip copper if accepted locally"
            ]
        },
        'small_appliances': {
            'co2_rate': 14.0,
            'avg_weight': 3.0,
            'methods': [
                "Remove batteries before disposal",
                "Clean and test before donating",
                "Take to e-waste collection events",
                "Check thrift stores for donations",
                "Contact manufacturer for recycling"
            ]
        }
    },
    'textiles': {
        'clothing_good': {
            'co2_rate': 25.0,
            'avg_weight': 0.5,
            'methods': [
                "Wash and ensure good condition",
                "Donate to local thrift stores",
                "Use clothing donation bins",
                "Consider online donation platforms",
                "Host clothing swaps with friends"
            ]
        },
        'clothing_worn': {
            'co2_rate': 5.6,
            'avg_weight': 0.4,
            'methods': [
                "Take to textile recycling facilities",
                "Use H&M or similar store recycling",
                "Check municipal textile programs",
                "Repurpose into cleaning rags",
                "Consider upcycling projects"
            ]
        },
        'shoes': {
            'co2_rate': 8.0,
            'avg_weight': 0.8,
            'methods': [
                "Clean and check for wear",
                "Donate wearable shoes to charities",
                "Take worn shoes to Nike or similar programs",
                "Use specialized shoe recycling",
                "Repurpose for gardening"
            ]
        },
        'bedding_linens': {
            'co2_rate': 4.2,
            'avg_weight': 1.5,
            'methods': [
                "Donate clean, good condition items",
                "Take worn items to textile recycling",
                "Repurpose as cleaning cloths",
                "Use for pet bedding if appropriate",
                "Check animal shelters for donations"
            ]
        }
    },
    'organic': {
        'food_scraps': {
            'co2_rate': 0.5,
            'avg_weight': 0.3,
            'methods': [
                "Start home composting system",
                "Use municipal composting programs",
                "Avoid meat and dairy in home compost",
                "Consider worm composting",
                "Keep separate from recyclables"
            ]
        },
        'yard_waste': {
            'co2_rate': 0.3,
            'avg_weight': 2.0,
            'methods': [
                "Compost at home if space allows",
                "Use municipal yard waste collection",
                "Create brush piles for wildlife",
                "Chip branches for mulch",
                "Never burn in restricted areas"
            ]
        },
        'paper_towels': {
            'co2_rate': 0.1,
            'avg_weight': 0.02,
            'methods': [
                "Compost if not chemically treated",
                "Use in home composting systems",
                "Reduce usage with reusable alternatives",
                "Keep separate from recyclable paper",
                "Consider bamboo alternatives"
            ]
        }
    },
    'furniture': {
        'wooden_furniture': {
            'co2_rate': 30.0,
            'avg_weight': 25.0,
            'methods': [
                "Donate if in good condition",
                "List on online marketplaces",
                "Contact furniture banks",
                "Repurpose or upcycle pieces",
                "Take to construction waste facilities"
            ]
        },
        'upholstered_furniture': {
            'co2_rate': 20.0,
            'avg_weight': 30.0,
            'methods': [
                "Check donation requirements (bed bugs, etc.)",
                "Professional cleaning before donation",
                "Schedule bulk pickup",
                "Separate materials for recycling",
                "Consider reupholstering"
            ]
        },
        'mattresses': {
            'co2_rate': 15.0,
            'avg_weight': 35.0,
            'methods': [
                "Take to specialized mattress recycling",
                "Schedule bulk pickup service",
                "Check retailer take-back programs",
                "Donate if in excellent condition",
                "Never put in regular dumpster"
            ]
        }
    },
    'hazardous': {
        'paint': {
            'co2_rate': 0.0,
            'avg_weight': 2.0,
            'methods': [
                "Take to hazardous waste collection days",
                "Never pour down drains",
                "Let latex paint dry before disposal",
                "Donate unused paint to habitat groups",
                "Use paint hardener for small amounts"
            ]
        },
        'chemicals': {
            'co2_rate': 0.0,
            'avg_weight': 1.0,
            'methods': [
                "Take to hazardous waste facilities",
                "Never mix different chemicals",
                "Keep in original containers",
                "Follow all safety precautions",
                "Check community collection events"
            ]
        },
        'motor_oil': {
            'co2_rate': 0.0,
            'avg_weight': 4.0,
            'methods': [
                "Take to auto parts stores",
                "Use municipal hazardous waste programs",
                "Never pour on ground or drains",
                "Recycle oil filters separately",
                "Keep in original containers"
            ]
        },
        'fluorescent_bulbs': {
            'co2_rate': 0.0,
            'avg_weight': 0.1,
            'methods': [
                "Take to hazardous waste collection",
                "Use hardware store recycling programs",
                "Never break or put in regular trash",
                "Handle with care to avoid mercury",
                "Consider LED alternatives"
            ]
        }
    },
    'general': {
        'mixed_waste': {
            'co2_rate': 0.0,
            'avg_weight': 0.5,
            'methods': [
                "Last resort after exploring all options",
                "Minimize packaging when purchasing",
                "Consider zero-waste alternatives",
                "Use proper waste bins",
                "Look for ways to reduce overall waste"
            ]
        },
        'styrofoam': {
            'co2_rate': 0.0,
            'avg_weight': 0.02,
            'methods': [
                "Check for specialized polystyrene recycling",
                "Reuse for packaging when possible",
                "Take to electronics stores (some accept)",
                "Avoid purchasing styrofoam products",
                "Last resort: general waste"
            ]
        }
    }
}

# Location search queries for different main categories
LOCATION_QUERIES = {
    'plastic': 'plastic recycling center',
    'glass': 'glass recycling center',
    'paper': 'paper recycling center cardboard',
    'metal': 'metal recycling scrap yard',
    'electronics': 'electronics recycling e-waste',
    'textiles': 'clothing donation textile recycling',
    'organic': 'composting facility organic waste',
    'furniture': 'furniture donation thrift store',
    'hazardous': 'hazardous waste facility',
    'general': 'waste disposal center landfill'
}

def get_category_info(category, subtype):
    """Get category information with fallback"""
    if category in WASTE_CATEGORIES and subtype in WASTE_CATEGORIES[category]:
        return WASTE_CATEGORIES[category][subtype]
    
    # Fallback to first item in category
    if category in WASTE_CATEGORIES:
        first_subtype = list(WASTE_CATEGORIES[category].keys())[0]
        return WASTE_CATEGORIES[category][first_subtype]
    
    # Ultimate fallback
    return {
        'co2_rate': 0.0,
        'avg_weight': 0.2,
        'methods': ["Consult local waste management guidelines"]
    }

def create_optimized_prompt():
    """Create an optimized prompt with category mappings to save tokens"""
    categories = []
    for main_cat, subcats in WASTE_CATEGORIES.items():
        subcategories = list(subcats.keys())
        categories.append(f"{main_cat}: {', '.join(subcategories)}")
    
    return f"""Analyze this image and identify the waste item. Return ONLY a JSON object:
{{
    "category": "main category",
    "subtype": "specific subtype",
    "estimated_weight_kg": number,
    "confidence": "high/medium/low"
}}

Categories:
{chr(10).join(categories)}

Rules:
- Choose the most specific subtype that matches
- Weight should be realistic for the item size
- Use confidence based on image clarity
- Return valid JSON only"""

def classify_image_with_gemini(image_data):
    """Classify image using optimized Gemini Vision API"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data.split(',')[1])
        image = Image.open(io.BytesIO(image_bytes))
        
        # Use optimized prompt
        prompt = create_optimized_prompt()
        
        response = model.generate_content([prompt, image])
        
        # Parse JSON response
        result_text = response.text.strip()
        if result_text.startswith('```json'):
            result_text = result_text[7:-3]
        elif result_text.startswith('```'):
            result_text = result_text[3:-3]
            
        result = json.loads(result_text)
        
        # Validate and set defaults
        if 'category' not in result or result['category'] not in WASTE_CATEGORIES:
            result['category'] = 'general'
            result['subtype'] = 'mixed_waste'
        
        if 'subtype' not in result or result['subtype'] not in WASTE_CATEGORIES.get(result['category'], {}):
            # Use first available subtype for the category
            result['subtype'] = list(WASTE_CATEGORIES[result['category']].keys())[0]
        
        if 'estimated_weight_kg' not in result:
            category_info = get_category_info(result['category'], result['subtype'])
            result['estimated_weight_kg'] = category_info['avg_weight']
        
        if 'confidence' not in result:
            result['confidence'] = 'medium'
            
        return result
        
    except Exception as e:
        print(f"Error classifying image: {e}")
        return {
            "category": "general",
            "subtype": "mixed_waste",
            "estimated_weight_kg": 0.2,
            "confidence": "low"
        }

def calculate_co2_savings(category, subtype, weight):
    """Calculate CO2 savings based on category, subtype, and weight"""
    category_info = get_category_info(category, subtype)
    rate = category_info['co2_rate']
    return round(weight * rate, 2)

def find_nearby_locations(lat, lon, category):
    """Find nearby disposal locations or return simple suggestions"""
    
    # For common small items, return simple suggestions
    if category in ['plastic', 'glass', 'paper', 'metal']:
        return [{
            "type": "dropoff",
            "name": "Nearest recycling center",
            "distance_km": 0.0,
            "lat": lat,
            "lon": lon
        }]
    
    if category == 'general':
        return [{
            "type": "dispose",
            "name": "Nearest trash collection",
            "distance_km": 0.0,
            "lat": lat,
            "lon": lon
        }]
    
    if category == 'organic':
        return [{
            "type": "dropoff",
            "name": "Nearest composting facility or home compost",
            "distance_km": 0.0,
            "lat": lat,
            "lon": lon
        }]
    
    # For larger/specialty items, try to find actual locations
    try:
        query = LOCATION_QUERIES.get(category, 'waste disposal recycling')
        
        # Special handling for large items
        if category == 'furniture':
            query = 'furniture donation thrift store dump'
        elif category == 'electronics':
            query = 'electronics recycling e-waste center'
        elif category == 'hazardous':
            query = 'hazardous waste facility'
        elif category == 'textiles':
            query = 'clothing donation center'
        
        # Search using Nominatim
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': query,
            'format': 'jsonv2',
            'lat': lat,
            'lon': lon,
            'limit': 10,
            'bounded': 1,
            'viewbox': f"{lon-0.2},{lat-0.2},{lon+0.2},{lat+0.2}"
        }
        
        headers = {'User-Agent': 'BinBuddy/1.0'}
        response = requests.get(url, params=params, headers=headers, timeout=5)
        
        if response.status_code == 200:
            results = response.json()
            suggestions = []
            
            for result in results:
                result_lat = float(result['lat'])
                result_lon = float(result['lon'])
                distance = calculate_distance(lat, lon, result_lat, result_lon)
                
                # Determine type based on category
                suggestion_type = "dropoff"
                if category in ['textiles', 'furniture']:
                    suggestion_type = "donate"
                elif category == 'general':
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
            return suggestions[:5] if suggestions else [{"type": "error", "name": "No locations found", "distance_km": 0.0, "lat": lat, "lon": lon}]
        
    except Exception as e:
        print(f"Error finding locations: {e}")
    
    # Return no locations found if API fails
    return [{"type": "error", "name": "No locations found", "distance_km": 0.0, "lat": lat, "lon": lon}]

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
        
        # Extract data (removed weight parameter)
        image_data = data.get('image')
        lat = data.get('lat')
        lon = data.get('lon')
        
        if not image_data or not lat or not lon:
            return jsonify({'error': 'Missing required fields: image, lat, lon'}), 400
        
        # Classify image with Gemini
        classification = classify_image_with_gemini(image_data)
        
        # Get category information
        category_info = get_category_info(classification['category'], classification['subtype'])
        
        # Use Gemini's weight estimate
        weight = classification['estimated_weight_kg']
        
        # Calculate CO2 savings
        co2_saved = calculate_co2_savings(
            classification['category'], 
            classification['subtype'], 
            weight
        )
        
        # Get disposal methods for this specific subtype
        disposal_methods = category_info['methods']
        
        # Find nearby locations
        suggestions = find_nearby_locations(lat, lon, classification['category'])
        
        # Create response
        response = {
            "image_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "category": classification['category'],
            "subtype": classification['subtype'],
            "confidence": classification.get('confidence', 'medium'),
            "weight": weight,
            "co2_saved": co2_saved,
            "disposal_methods": disposal_methods,
            "suggestions": suggestions
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error in classify_waste: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all available waste categories and subcategories"""
    return jsonify(WASTE_CATEGORIES)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 