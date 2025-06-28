# Bin Buddy 🗂️♻️

AI-powered waste classification for a sustainable future. Bin Buddy helps users identify and properly dispose of waste items using computer vision and machine learning.

## Features

- 📸 **Image Classification**: Upload or capture photos of waste items for AI-powered identification
- 🌱 **Environmental Impact**: Track CO₂ savings and environmental impact
- 📊 **Analytics Dashboard**: View your waste classification history and footprint
- 🏆 **Achievements**: Unlock achievements for your eco-friendly actions
- 🌙 **Dark Mode**: Full dark mode support
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- **React 19** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **Vite** - Fast build tool and dev server

### Backend
- **Python Flask** - Web framework
- **Google Gemini AI** - Computer vision for waste classification
- **Supabase** - Database and authentication
- **Image processing** - PIL for image handling

### Database
- **PostgreSQL** (via Supabase) - User data, classifications, and analytics
- **Supabase Storage** - Image storage with user isolation

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Supabase account
- Google Gemini API key

### Backend Setup

1. **Install Python dependencies**:
```bash
cd backend
pip install -r requirements.txt
```

2. **Set up environment variables**:
Create a `.env` file in the `backend` directory:
```bash
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

3. **Set up Supabase database**:
   - Create a new Supabase project
   - Run the SQL schema in `supabase_schema_with_images.sql`
   - Create a storage bucket named `waste-images`
   - Enable RLS (Row Level Security) policies

4. **Start the Flask server**:
```bash
python app.py
```

### Frontend Setup

1. **Install dependencies**:
```bash
cd frontend
npm install
```

2. **Set up environment variables**:
Create a `.env` file in the `frontend` directory:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

3. **Start the development server**:
```bash
npm run dev
```

## Usage

1. **Sign up/Login**: Use Google OAuth or email/password authentication
2. **Upload Image**: Take a photo or upload an image of a waste item
3. **Get Classification**: AI analyzes the item and provides:
   - Item identification
   - Disposal instructions
   - CO₂ impact calculation
   - Nearby disposal locations
4. **Track Progress**: View your history and environmental impact in the dashboard

## Project Structure

```
bin-buddy/
├── backend/
│   ├── app.py                 # Flask server
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Navigation.jsx
│   │   │   ├── HomeTab.jsx
│   │   │   ├── HistoryTab.jsx
│   │   │   └── FootPrintTab.jsx
│   │   ├── utils/
│   │   │   └── supabase-integration.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
├── supabase_schema_with_images.sql
└── README.md
```

## API Endpoints

- `POST /api/classify` - Classify waste item from image
- `GET /api/health` - Health check endpoint
- `GET /api/icons` - Get available icon sets

## Database Schema

### Main Tables
- `users` - User profiles and aggregate stats
- `waste_images` - Image metadata and storage paths
- `waste_classifications` - Classification results and analysis
- `disposal_locations` - Nearby disposal/recycling locations
- `daily_analytics` - Aggregated daily statistics

## Development

### Available Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Backend:**
- `python app.py` - Start Flask development server

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Environment Variables

### Backend (.env)
```
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### Frontend (.env)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

## Deployment

### Frontend (Vercel/Netlify)
1. Build the frontend: `npm run build`
2. Deploy the `dist` folder
3. Set environment variables in your hosting platform

### Backend (Railway/Heroku)
1. Push to your git repository
2. Connect to your hosting platform
3. Set environment variables
4. Deploy

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue on GitHub or contact the development team.

---

Built with ♻️ for a sustainable future
