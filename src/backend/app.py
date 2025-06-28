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

# CO2 savings rates (kg CO2 saved per kg of material)
CO2_RATES = {
    'recyclable': 1.02,  # default for plastic
    'plastic': 1.02,
    'glass': 0.31,
    'paper': 0.46,
    'e-waste': 15.0,
    'donation': 25.0,
    'textile_recycle': 5.6,
    'organic': 0.0,
    'hazardous': 0.0,
    'general_trash': 0.0
}

# Default weights by category (kg)
DEFAULT_WEIGHTS = {
    'recyclable': 0.2,
    'organic': 0.3,
    'e-waste': 0.8,
    'donation': 0.5,
    'textile_recycle': 0.4,
    'hazardous': 0.1,
    'general_trash': 0.3
}

# Disposal methods by category
DISPOSAL_METHODS = {
    'recyclable': [
        "Clean the item before recycling",
        "Check local recycling guidelines",
        "Separate by material type"
    ],
    'organic': [
        "Compost at home if possible",
        "Use municipal composting services",
        "Avoid contamination with non-organic waste"
    ],
    'e-waste': [
        "Remove personal data before disposal",
        "Take to certified e-waste facilities",
        "Check manufacturer take-back programs"
    ],
    'donation': [
        "Ensure item is clean and functional",
        "Donate to local charities or thrift stores",
        "Consider online donation platforms"
    ],
    'textile_recycle': [
        "Clean and dry textiles before recycling",
        "Use textile recycling bins",
        "Consider upcycling or repurposing"
    ],
    'hazardous': [
        "Never put in regular trash",
        "Take to hazardous waste facilities",
        "Follow safety guidelines for handling"
    ],
    'general_trash': [
        "Last resort after exploring other options",
        "Use proper waste bins",
        "Minimize packaging when possible"
    ]
}

def classify_image_with_gemini(image_data):
    """Classify image using Gemini Vision API"""
    try:
        # Initialize the model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data.split(',')[1])
        image = Image.open(io.BytesIO(image_bytes))
        
        # Create prompt for classification
        prompt = """
        Analyze this image and classify the waste item. Return ONLY a JSON object with this exact structure:
        {
            "category": "one of: recyclable, organic, e-waste, donation, textile_recycle, hazardous, general_trash",
            "subtype": "specific item type like plastic_bottle, phone, jeans, etc.",
            "quality": "good/fair/poor (only for donation/textile_recycle, otherwise null)",
            "estimated_weight_kg": "estimated weight in kg as a number"
        }
        
        Categories:
        - recyclable: plastic bottles, cans, glass, paper, cardboard
        - organic: food waste, yard waste, biodegradable items
        - e-waste: electronics, batteries, phones, computers
        - donation: clothing, furniture, books, toys in good condition
        - textile_recycle: worn clothing, fabrics, shoes
        - hazardous: chemicals, paint, motor oil, fluorescent bulbs
        - general_trash: items that don't fit other categories
        
        Quality (for donation/textile_recycle only):
        - good: excellent condition, ready to use/wear
        - fair: minor wear, still usable
        - poor: significant wear, suitable only for recycling
        """
        
        response = model.generate_content([prompt, image])
        
        # Parse JSON response
        result_text = response.text.strip()
        if result_text.startswith('```json'):
            result_text = result_text[7:-3]
        elif result_text.startswith('```'):
            result_text = result_text[3:-3]
            
        result = json.loads(result_text)
        return result
        
    except Exception as e:
        print(f"Error classifying image: {e}")
        # Return default classification
        return {
            "category": "general_trash",
            "subtype": "unidentified_item",
            "quality": None,
            "estimated_weight_kg": 0.2
        }

def calculate_co2_savings(category, weight):
    """Calculate CO2 savings based on category and weight"""
    rate = CO2_RATES.get(category, 0)
    return round(weight * rate, 2)

def find_nearby_locations(lat, lon, category):
    """Find nearby disposal locations using OpenStreetMap Nominatim"""
    try:
        # Define query parameters based on category
        query_params = {
            'recyclable': 'recycling center',
            'e-waste': 'electronics recycling',
            'donation': 'charity donation thrift store',
            'textile_recycle': 'clothing donation textile recycling',
            'hazardous': 'hazardous waste facility',
            'organic': 'composting facility',
            'general_trash': 'waste disposal landfill'
        }
        
        query = query_params.get(category, 'waste disposal')
        
        # Search using Nominatim
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': query,
            'format': 'jsonv2',
            'lat': lat,
            'lon': lon,
            'limit': 5,
            'bounded': 1,
            'viewbox': f"{lon-0.1},{lat-0.1},{lon+0.1},{lat+0.1}"
        }
        
        headers = {'User-Agent': 'BinBuddy/1.0'}
        response = requests.get(url, params=params, headers=headers, timeout=5)
        
        if response.status_code == 200:
            results = response.json()
            suggestions = []
            
            for result in results[:5]:
                # Calculate distance (approximate)
                result_lat = float(result['lat'])
                result_lon = float(result['lon'])
                distance = calculate_distance(lat, lon, result_lat, result_lon)
                
                # Determine type based on category
                suggestion_type = "dropoff"
                if category in ['donation', 'textile_recycle']:
                    suggestion_type = "donate"
                elif category == 'general_trash':
                    suggestion_type = "dump"
                
                suggestions.append({
                    "type": suggestion_type,
                    "name": result.get('display_name', 'Unknown Location'),
                    "distance_km": round(distance, 1),
                    "lat": result_lat,
                    "lon": result_lon
                })
            
            return suggestions
        
    except Exception as e:
        print(f"Error finding locations: {e}")
    
    # Return default suggestion if API fails
    return [{
        "type": "dropoff",
        "name": "Check local waste management website for locations",
        "distance_km": 0.0,
        "lat": lat,
        "lon": lon
    }]

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
        user_weight = data.get('weight')
        lat = data.get('lat')
        lon = data.get('lon')
        
        if not image_data or not lat or not lon:
            return jsonify({'error': 'Missing required fields: image, lat, lon'}), 400
        
        # Classify image with Gemini
        classification = classify_image_with_gemini(image_data)
        
        # Determine weight
        weight = user_weight if user_weight else classification.get('estimated_weight_kg', DEFAULT_WEIGHTS.get(classification['category'], 0.2))
        
        # Calculate CO2 savings
        co2_saved = calculate_co2_savings(classification['category'], weight)
        
        # Get disposal methods
        disposal_methods = DISPOSAL_METHODS.get(classification['category'], ["Consult local waste management guidelines"])
        
        # Find nearby locations
        suggestions = find_nearby_locations(lat, lon, classification['category'])
        
        # Create response
        response = {
            "image_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "category": classification['category'],
            "subtype": classification['subtype'],
            "quality": classification.get('quality'),
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 