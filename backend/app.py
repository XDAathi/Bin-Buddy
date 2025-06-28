"""
BinBuddy Flask Backend API
==========================

Main Flask application providing REST API endpoints for the BinBuddy 
sustainability app. Handles item classification, disposal suggestions,
trip management, and carbon footprint tracking.

Endpoints:
- POST /api/classify - Classify uploaded items and get disposal suggestions
- POST /api/item/add_trip - Add items to disposal trips  
- POST /api/trip/complete - Mark trips as completed
- GET /api/dashboard - Get user dashboard statistics
- GET /api/history - Get trip history

Author: BinBuddy Team
Created for UN SDG Hackathon
"""

import os
import uuid
import json
import io
import requests
import time
from datetime import datetime, timezone
from collections import defaultdict
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from werkzeug.utils import secure_filename
from PIL import Image
import base64
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

# Configure Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

# Initialize Supabase client only if credentials are provided
supabase = None
if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL != 'your-supabase-url':
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase client initialized successfully")
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")
        supabase = None
else:
    print("Supabase credentials not configured - running in demo mode")

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Rate limiting - simple in-memory store (use Redis in production)
request_counts = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # 1 minute window
MAX_REQUESTS_PER_WINDOW = 10  # Max 10 classify requests per minute per IP

def is_rate_limited(ip_address):
    """Check if IP address has exceeded rate limit"""
    now = time.time()
    # Clean old requests outside the window
    request_counts[ip_address] = [
        timestamp for timestamp in request_counts[ip_address] 
        if now - timestamp < RATE_LIMIT_WINDOW
    ]
    
    # Check if under limit
    if len(request_counts[ip_address]) >= MAX_REQUESTS_PER_WINDOW:
        return True
    
    # Add current request
    request_counts[ip_address].append(now)
    return False

# Carbon footprint rates (kg CO₂ saved per kg of material)
CO2_RATES = {
    'recyclable': 1.02,  # Plastic average
    'organic': 0.0,
    'e-waste': 15.0,  # Average of 10-20
    'donation': 25.0,
    'textile_recycle': 5.6,
    'hazardous': 0.0,
    'general_trash': 0.0
}

# OpenStreetMap query mappings
OSM_QUERIES = {
    'recyclable': 'amenity=recycling',
    'donation': 'amenity=charity',
    'textile_recycle': 'shop=clothes_donation',
    'e-waste': 'amenity=recycling electronics',
    'hazardous': 'amenity=recycling hazardous_waste',
    'general_trash': 'amenity=dump',
    'organic': 'amenity=recycling organic'
}

def allowed_file(filename):
    """Check if uploaded file has allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def classify_item_with_ai(image_data, weight=None):
    """
    Classify item using Google Gemini AI for real image analysis
    """
    if not GEMINI_API_KEY:
        print("No Gemini API key configured, using fallback classification")
        return classify_item_fallback()
    
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Convert image data to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Resize image if too large (to reduce API costs)
        max_size = 1024
        if image.width > max_size or image.height > max_size:
            image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Create prompt for classification
        prompt = """
        Analyze this image and classify the waste item. Respond with ONLY a JSON object in this exact format:
        {
            "category": "one of: recyclable, organic, e-waste, donation, textile_recycle, hazardous, general_trash",
            "subtype": "specific item name (e.g., plastic_bottle, smartphone, t-shirt)",
            "quality": "excellent, good, fair, poor, or null",
            "disposal_methods": ["step 1", "step 2", "step 3"]
        }
        
        Categories:
        - recyclable: plastic bottles, cans, paper, cardboard, glass
        - organic: food waste, compostable materials  
        - e-waste: electronics, batteries, phones, computers
        - donation: clothing, books, furniture in good condition
        - textile_recycle: worn clothing, fabric
        - hazardous: chemicals, paint, batteries
        - general_trash: everything else
        """
        
        # Generate classification with timeout
        response = model.generate_content([prompt, image])
        result_text = response.text.strip()
        
        # Parse JSON response
        if result_text.startswith('```json'):
            result_text = result_text.split('```json')[1].split('```')[0].strip()
        elif result_text.startswith('```'):
            result_text = result_text.split('```')[1].strip()
            
        result = json.loads(result_text)
        
        # Validate required fields
        required_fields = ['category', 'subtype', 'disposal_methods']
        if not all(field in result for field in required_fields):
            raise ValueError("AI response missing required fields")
            
        return result
        
    except json.JSONDecodeError as e:
        print(f"AI returned invalid JSON: {e}")
        return classify_item_fallback()
    except Exception as e:
        print(f"AI Classification error: {e}")
        return classify_item_fallback()

def classify_item_fallback():
    """
    Fallback classification when AI is unavailable
    """
    return {
        'category': 'recyclable',
        'subtype': 'plastic_bottle',
        'quality': 'good',
        'disposal_methods': [
            'rinse container thoroughly',
            'remove any labels if possible', 
            'place in recycling bin'
        ]
    }

def get_disposal_locations(lat, lon, category):
    """
    Get disposal locations near user using OpenStreetMap Nominatim API
    """
    
    if category not in OSM_QUERIES:
        return get_dummy_locations(lat, lon, category)
    
    # Nominatim API endpoint  
    base_url = "https://nominatim.openstreetmap.org/search"
    
    # Query parameters
    params = {
        'q': OSM_QUERIES[category],
        'format': 'jsonv2',
        'lat': lat,
        'lon': lon,
        'limit': 3,
        'bounded': 1,
        'viewbox': f"{lon-0.05},{lat+0.05},{lon+0.05},{lat-0.05}"  # ~5km radius
    }
    
    # Headers to identify the app (required by Nominatim)
    headers = {
        'User-Agent': 'BinBuddy/1.0 (sustainability-app; contact@binbuddy.com)'
    }
    
    try:
        # Add delay to respect Nominatim usage policy (max 1 request/second)
        time.sleep(1.5)
        
        response = requests.get(base_url, params=params, headers=headers, timeout=15)
        
        if response.status_code == 403:
            print("Nominatim API rate limited, using fallback")
            return get_dummy_locations(lat, lon, category)
        elif response.status_code >= 500:
            print("Nominatim API server error, using fallback")  
            return get_dummy_locations(lat, lon, category)
            
        response.raise_for_status()
        locations = response.json()
        
        if not locations:
            return get_dummy_locations(lat, lon, category)
            
        suggestions = []
        
        for location in locations:
            # Calculate approximate distance (simplified)
            lat_diff = float(location['lat']) - lat
            lon_diff = float(location['lon']) - lon
            distance_km = ((lat_diff ** 2 + lon_diff ** 2) ** 0.5) * 111  # Rough conversion
            
            suggestion = {
                'type': 'dropoff' if category in ['recyclable', 'e-waste'] else 'donate' if category == 'donation' else 'dump',
                'name': location.get('display_name', 'Unknown Location'),
                'distance_km': round(distance_km, 2),
                'lat': float(location['lat']),
                'lon': float(location['lon'])
            }
            suggestions.append(suggestion)
        
        return suggestions[:3]  # Return top 3 closest
        
    except Exception as e:
        print(f"Error fetching locations: {e}")
        return get_dummy_locations(lat, lon, category)

def get_dummy_locations(lat, lon, category):
    """Return dummy locations when API is unavailable"""
    location_types = {
        'recyclable': 'Local Recycling Center',
        'e-waste': 'Electronics Recycling Hub', 
        'donation': 'Goodwill Donation Center',
        'textile_recycle': 'Textile Recycling Drop-off',
        'hazardous': 'Hazardous Waste Facility',
        'organic': 'Composting Center'
    }
    
    name = location_types.get(category, 'Waste Management Center')
    
    return [
        {
            'type': 'dropoff',
            'name': name,
            'distance_km': 2.5,
            'lat': lat + 0.01,
            'lon': lon + 0.01
        }
    ]

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now(timezone.utc).isoformat()})

@app.route('/api/classify', methods=['POST'])
def classify_endpoint():
    """
    Classify uploaded item and provide disposal suggestions
    
    Expected input:
    - image: uploaded file
    - weight (optional): item weight in kg
    - lat: user latitude
    - lon: user longitude
    
    Returns:
    - JSON with classification, CO₂ savings, and disposal suggestions
    """
    
    try:
        # Rate limiting check
        client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        if is_rate_limited(client_ip):
            return jsonify({
                'error': 'Rate limit exceeded. Please wait before making another request.',
                'retry_after': RATE_LIMIT_WINDOW
            }), 429
        
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Get additional parameters
        weight = request.form.get('weight', type=float)
        lat = request.form.get('lat', type=float)
        lon = request.form.get('lon', type=float)
        
        if lat is None or lon is None:
            return jsonify({'error': 'Location coordinates required'}), 400
        
        # Process image
        image_data = file.read()
        
        # Classify item
        classification = classify_item_with_ai(image_data, weight)
        
        # Estimate weight if not provided
        if weight is None:
            weight_estimates = {
                'plastic_bottle': 0.05,
                'electronics': 0.5,
                'clothing': 0.3,
                'food_waste': 0.2
            }
            weight = weight_estimates.get(classification['subtype'], 0.1)
        
        # Calculate CO₂ savings
        co2_rate = CO2_RATES.get(classification['category'], 0)
        co2_saved = weight * co2_rate
        
        # Get disposal suggestions
        suggestions = get_disposal_locations(lat, lon, classification['category'])
        
        # Generate response
        image_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        
        result = {
            'image_id': image_id,
            'timestamp': timestamp,
            'category': classification['category'],
            'subtype': classification['subtype'],
            'quality': classification.get('quality'),
            'weight': weight,
            'co2_saved': round(co2_saved, 3),
            'disposal_methods': classification['disposal_methods'],
            'suggestions': suggestions
        }
        
        # Store in database (for trip planning)
        if supabase:
            try:
                supabase.table('items').insert({
                    'id': image_id,
                    'category': classification['category'],
                    'subtype': classification['subtype'],
                    'weight': weight,
                    'co2_saved': co2_saved,
                    'timestamp': timestamp,
                    'status': 'pending',
                    'user_lat': lat,
                    'user_lon': lon
                }).execute()
            except Exception as db_error:
                print(f"Database error: {db_error}")
        else:
            print("Database not configured - running in demo mode")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Classification error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/item/add_trip', methods=['POST'])
def add_to_trip():
    """Add item to a disposal trip"""
    
    try:
        data = request.get_json()
        image_id = data.get('image_id')
        
        if not image_id:
            return jsonify({'error': 'image_id required'}), 400
        
        # Create or find trip (simplified - using location-based grouping)
        trip_id = str(uuid.uuid4())
        
        # Update item with trip assignment
        if supabase:
            try:
                supabase.table('items').update({
                    'trip_id': trip_id,
                    'status': 'planned'
                }).eq('id', image_id).execute()
            except Exception as db_error:
                print(f"Database error: {db_error}")
        else:
            print("Database not configured - running in demo mode")
        
        return jsonify({
            'success': True,
            'trip_id': trip_id,
            'message': 'Item added to trip successfully'
        })
        
    except Exception as e:
        print(f"Add trip error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/trip/complete', methods=['POST'])
def complete_trip():
    """Mark trip as completed and update carbon savings"""
    
    try:
        data = request.get_json()
        trip_id = data.get('trip_id')
        
        if not trip_id:
            return jsonify({'error': 'trip_id required'}), 400
        
        # Update all items in trip to completed
        if supabase:
            try:
                result = supabase.table('items').update({
                    'status': 'completed',
                    'completed_at': datetime.now(timezone.utc).isoformat()
                }).eq('trip_id', trip_id).execute()
                
                # Calculate total CO₂ saved for this trip
                items = result.data
                total_co2 = sum(item.get('co2_saved', 0) for item in items)
                
            except Exception as db_error:
                print(f"Database error: {db_error}")
                total_co2 = 0
        else:
            print("Database not configured - running in demo mode")
            total_co2 = 0.5  # Demo value
        
        return jsonify({
            'success': True,
            'trip_id': trip_id,
            'co2_saved': total_co2,
            'message': 'Trip completed successfully'
        })
        
    except Exception as e:
        print(f"Complete trip error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    """Get user dashboard statistics"""
    
    try:
        # Get all completed items for stats
        if supabase:
            try:
                result = supabase.table('items').select('*').eq('status', 'completed').execute()
                items = result.data
            except Exception as db_error:
                print(f"Database error: {db_error}")
                items = []
        else:
            print("Database not configured - returning demo data")
            items = [
                {'category': 'recyclable', 'co2_saved': 0.5},
                {'category': 'donation', 'co2_saved': 1.2},
                {'category': 'e-waste', 'co2_saved': 2.1}
            ]
        
        # Calculate statistics
        total_co2 = sum(item.get('co2_saved', 0) for item in items)
        item_count = len(items)
        
        # Category breakdown
        category_counts = {}
        for item in items:
            category = item.get('category', 'unknown')
            category_counts[category] = category_counts.get(category, 0) + 1
        
        dashboard = {
            'co2_total': round(total_co2, 3),
            'item_count': item_count,
            'breakdown_by_category': category_counts,
            'recent_items': items[-5:] if items else []  # Last 5 items
        }
        
        return jsonify(dashboard)
        
    except Exception as e:
        print(f"Dashboard error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """Get trip history with grouped items"""
    
    try:
        # Get all items grouped by trip
        if supabase:
            try:
                result = supabase.table('items').select('*').order('timestamp', desc=True).execute()
                items = result.data
            except Exception as db_error:
                print(f"Database error: {db_error}")
                items = []
        else:
            print("Database not configured - returning demo data")
            items = [
                {
                    'id': 'demo-1',
                    'category': 'recyclable',
                    'subtype': 'plastic_bottle',
                    'co2_saved': 0.5,
                    'status': 'completed',
                    'trip_id': 'trip-1',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            ]
        
        # Group items by trip_id
        trips = {}
        individual_items = []
        
        for item in items:
            trip_id = item.get('trip_id')
            if trip_id:
                if trip_id not in trips:
                    trips[trip_id] = {
                        'trip_id': trip_id,
                        'items': [],
                        'total_co2': 0,
                        'status': item.get('status', 'pending'),
                        'created_at': item.get('timestamp')
                    }
                trips[trip_id]['items'].append(item)
                trips[trip_id]['total_co2'] += item.get('co2_saved', 0)
            else:
                individual_items.append(item)
        
        # Convert to list and round CO₂ values
        trip_list = []
        for trip in trips.values():
            trip['total_co2'] = round(trip['total_co2'], 3)
            trip_list.append(trip)
        
        history = {
            'trips': trip_list,
            'individual_items': individual_items
        }
        
        return jsonify(history)
        
    except Exception as e:
        print(f"History error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Development server
    app.run(debug=True, host='0.0.0.0', port=5000) 