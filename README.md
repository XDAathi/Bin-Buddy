# BinBuddy 🌱

**Sustainable Waste Management & Carbon Footprint Tracking App**

BinBuddy is a comprehensive sustainability application targeting UN Sustainable Development Goals 3, 8, 12, and 13. It helps users properly dispose of items, track their carbon footprint, and make environmentally conscious decisions.

## 🎯 Hackathon Goals

**Targeting UN SDGs:**
- **Goal 12**: Responsible Consumption and Production
- **Goal 13**: Climate Action  
- **Goal 8**: Decent Work and Economic Growth
- **Goal 3**: Good Health and Well-being

## ✨ Features

- **AI-Powered Item Classification**: Upload photos to get instant item categorization
- **Smart Disposal Suggestions**: Find nearby recycling centers, donation points, and disposal facilities
- **Carbon Footprint Tracking**: Monitor your environmental impact with real-time CO₂ savings
- **Trip Planning**: Group items by location for efficient disposal runs
- **Comprehensive History**: Track all your sustainability actions
- **Mobile-First Design**: Responsive design ready for mobile deployment

## 🏗️ Architecture

### Frontend (React + Vite)
- Modern React 18 with TypeScript
- Tailwind CSS for styling
- Dark/Light mode support
- Mobile-responsive design
- PWA capabilities for future Capacitor deployment

### Backend (Flask)
- Python Flask REST API
- Supabase (PostgreSQL) database
- OpenStreetMap integration for location services
- AI-powered image classification
- Vercel deployment ready

### Database (Supabase)
- User management and authentication
- Item classification history
- Trip organization and tracking
- Carbon footprint analytics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- Supabase account

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📱 App Flow

1. **Landing Page**: Upload item image + optional weight
2. **Classification**: AI analyzes item and provides disposal suggestions
3. **Trip Planning**: Add items to disposal trips
4. **Dashboard**: View carbon savings and statistics
5. **History**: Track completed actions and plan future trips

## 🔗 API Endpoints

- `POST /api/classify` - Classify uploaded item images
- `POST /api/item/add_trip` - Add items to disposal trips
- `POST /api/trip/complete` - Mark trips as completed
- `GET /api/dashboard` - Get user statistics
- `GET /api/history` - Get trip history

## 🎨 Design System

- **Theme**: Green-focused sustainability palette
- **Modes**: Dark and light mode support
- **Typography**: Modern, accessible font stack
- **Components**: Reusable, mobile-first design system

## 📊 Carbon Impact Calculation

Different categories have varying CO₂ savings per kg:
- **Plastic**: 1.02 kg CO₂/kg
- **Glass**: 0.31 kg CO₂/kg  
- **Paper**: 0.46 kg CO₂/kg
- **E-waste**: 10-20 kg CO₂/kg
- **Donations**: 25 kg CO₂/kg
- **Textiles**: 5.6 kg CO₂/kg

## 🌍 Location Services

Integration with OpenStreetMap/Nominatim for finding:
- Recycling centers
- Donation points
- E-waste facilities
- Hazardous waste disposal
- General waste management

## 📱 Future Mobile Deployment

The app is designed for easy Capacitor integration:
- PWA-ready architecture
- Mobile-optimized UI/UX
- Camera integration prepared
- Offline capabilities planned

## 🤝 Contributing

This project was built for a hackathon focusing on environmental sustainability. Contributions welcome!

## 📄 License

MIT License - Built for positive environmental impact