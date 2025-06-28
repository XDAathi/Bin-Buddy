# 🌱 BinBuddy - Smart Waste Classification & Disposal Assistant

BinBuddy is a sustainability app that uses AI to classify waste items and provide smart disposal recommendations. Built with React Vite frontend and Flask backend, it leverages Google's Gemini Vision API for image classification and OpenStreetMap for finding nearby disposal locations.

## ✨ Features

- **🔍 AI-Powered Classification**: Uses Google Gemini Vision API to identify waste items from photos
- **📊 CO₂ Impact Calculation**: Estimates environmental savings based on proper disposal
- **📍 Location-Based Recommendations**: Finds nearby recycling centers, donation sites, and disposal facilities
- **🎯 Category Detection**: Supports 7 waste categories:
  - Recyclable (plastic, glass, paper, cardboard)
  - Organic (food waste, yard waste)
  - E-waste (electronics, batteries)
  - Donation (clothing, furniture, books)
  - Textile Recycling (worn clothing, fabrics)
  - Hazardous (chemicals, paint, batteries)
  - General Trash (last resort)
- **📱 Responsive Design**: Beautiful, modern UI that works on all devices
- **⚡ Fast Performance**: Optimized with Vite and efficient API calls

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Axios** - HTTP client for API calls
- **Lucide React** - Beautiful icons
- **CSS3** - Custom styling with gradients and animations

### Backend
- **Flask** - Python web framework
- **Google Generative AI** - Gemini Vision API for image classification
- **OpenStreetMap Nominatim** - Location-based search
- **Pillow** - Image processing
- **Flask-CORS** - Cross-origin requests

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **Google Gemini API Key** - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bin-buddy
   ```

2. **Set up environment variables**
   ```bash
   # Create .env file in root directory
   echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

1. **Start the Flask backend** (Terminal 1)
   ```bash
   cd backend
   python app.py
   ```
   Backend will run on `http://localhost:5000`

2. **Start the React frontend** (Terminal 2)
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on `http://localhost:3000`

3. **Open your browser** and go to `http://localhost:3000`

## 📖 Usage

1. **Upload Image**: Take a photo or select an image of the waste item
2. **Optional Weight**: Enter the weight in kg (or let AI estimate it)
3. **Location Detection**: Allow location access for nearby recommendations
4. **Get Results**: View classification, CO₂ savings, and disposal options
5. **Find Locations**: See nearby recycling centers and donation sites

## 🔧 API Endpoints

### `/api/classify` (POST)
Classifies waste item and returns recommendations.

**Request:**
```json
{
  "image": "base64_encoded_image",
  "weight": 0.5,
  "lat": 37.7749,
  "lon": -122.4194
}
```

**Response:**
```json
{
  "image_id": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "category": "recyclable",
  "subtype": "plastic_bottle",
  "quality": "good",
  "weight": 0.5,
  "co2_saved": 0.51,
  "disposal_methods": ["Clean before recycling", "..."],
  "suggestions": [
    {
      "type": "dropoff",
      "name": "Local Recycling Center",
      "distance_km": 1.2,
      "lat": 37.7749,
      "lon": -122.4194
    }
  ]
}
```

### `/api/health` (GET)
Health check endpoint.

## 🌍 Environmental Impact

BinBuddy calculates CO₂ savings using industry-standard rates:

| Material | CO₂ Saved (kg/kg) |
|----------|------------------|
| Plastic | 1.02 |
| Glass | 0.31 |
| Paper | 0.46 |
| E-waste | 15.0 |
| Donation | 25.0 |
| Textile | 5.6 |

## 🎨 Design Features

- **Modern UI**: Clean, intuitive interface with smooth animations
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Visual Feedback**: Color-coded categories and interactive elements
- **Accessibility**: Proper contrast ratios and semantic HTML

## 🔒 Privacy & Security

- **No Data Storage**: No images or personal data are stored
- **Local Processing**: All operations run locally
- **Secure APIs**: Uses HTTPS for all external API calls
- **Location Privacy**: Location is only used for finding nearby facilities

## 🚧 Development

### Project Structure
```
bin-buddy/
├── backend/
│   └── app.py              # Flask application
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── App.css         # Styling
│   │   └── main.jsx        # React entry point
│   ├── index.html          # HTML template
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite configuration
├── requirements.txt        # Python dependencies
├── env_setup.txt          # Environment setup guide
└── README.md              # This file
```

### Environment Variables
```bash
GEMINI_API_KEY=your_api_key_here
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

**Backend:**
```bash
# Use a production WSGI server like Gunicorn
pip install gunicorn
gunicorn -w 4 backend.app:app
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is for educational and demonstration purposes.

## 🔗 API Credits

- **Google Gemini API** - Image classification
- **OpenStreetMap Nominatim** - Location services
- **Lucide Icons** - Beautiful iconography

## 💡 Future Enhancements

- [ ] Barcode scanning for packaged items
- [ ] Social sharing of sustainability achievements
- [ ] Gamification with points and badges
- [ ] Integration with local waste management systems
- [ ] Batch processing for multiple items
- [ ] Carbon footprint tracking over time

---

**🌱 Making waste disposal smarter and more sustainable, one item at a time!**