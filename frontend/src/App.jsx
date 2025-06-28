import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Camera, 
  Upload, 
  MapPin, 
  Leaf, 
  Trash2, 
  Recycle, 
  Gift,
  Zap,
  AlertTriangle,
  Clock,
  CheckCircle,
  Loader
} from 'lucide-react'
import './App.css'

const CATEGORY_ICONS = {
  recyclable: Recycle,
  organic: Leaf,
  'e-waste': Zap,
  donation: Gift,
  textile_recycle: Gift,
  hazardous: AlertTriangle,
  general_trash: Trash2
}

const CATEGORY_COLORS = {
  recyclable: '#10B981',
  organic: '#84CC16',
  'e-waste': '#F59E0B',
  donation: '#8B5CF6',
  textile_recycle: '#EC4899',
  hazardous: '#EF4444',
  general_trash: '#6B7280'
}

function App() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [weight, setWeight] = useState('')
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Get user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          setError('Please enable location access for better recommendations')
        }
      )
    }
  }, [])

  const handleImageSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
      setResult(null)
      setError(null)
    }
  }

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedImage) {
      setError('Please select an image first')
      return
    }

    if (!location) {
      setError('Location is required for finding nearby disposal sites')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const imageBase64 = await convertImageToBase64(selectedImage)
      
      const requestData = {
        image: imageBase64,
        lat: location.lat,
        lon: location.lon
      }

      if (weight && parseFloat(weight) > 0) {
        requestData.weight = parseFloat(weight)
      }

      const response = await axios.post('/api/classify', requestData)
      setResult(response.data)
    } catch (error) {
      console.error('Error classifying image:', error)
      setError(
        error.response?.data?.error || 
        'Failed to classify image. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setWeight('')
    setResult(null)
    setError(null)
  }

  const CategoryIcon = result ? CATEGORY_ICONS[result.category] || Trash2 : null
  const categoryColor = result ? CATEGORY_COLORS[result.category] || '#6B7280' : null

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header-content">
            <Recycle className="header-icon" />
            <h1>BinBuddy</h1>
            <p>Smart Waste Classification & Disposal Assistant</p>
          </div>
        </header>

        <main className="main">
          {!result ? (
            <form onSubmit={handleSubmit} className="upload-form">
              <div className="upload-section">
                <div className="image-upload">
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="file-input"
                  />
                  <label htmlFor="image" className="upload-label">
                    {imagePreview ? (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Preview" />
                        <div className="upload-overlay">
                          <Camera size={24} />
                          <span>Change Image</span>
                        </div>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <Upload size={48} />
                        <h3>Upload Waste Item Image</h3>
                        <p>Take a photo or select an image from your device</p>
                      </div>
                    )}
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="weight">Weight (kg) - Optional</label>
                  <input
                    type="number"
                    id="weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0.5"
                    step="0.1"
                    min="0"
                    className="weight-input"
                  />
                  <small>Leave empty for automatic estimation</small>
                </div>

                <div className="location-status">
                  <MapPin size={16} />
                  <span>
                    {location 
                      ? 'Location detected' 
                      : 'Detecting location...'
                    }
                  </span>
                </div>

                {error && (
                  <div className="error-message">
                    <AlertTriangle size={16} />
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={!selectedImage || !location || loading}
                  className="submit-button"
                >
                  {loading ? (
                    <>
                      <Loader className="spinner" size={20} />
                      Analyzing...
                    </>
                  ) : (
                    'Classify & Find Disposal Options'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="results">
              <div className="result-header">
                <div className="result-icon" style={{backgroundColor: categoryColor}}>
                  {CategoryIcon && <CategoryIcon size={32} />}
                </div>
                <div className="result-title">
                  <h2>{result.subtype.replace(/_/g, ' ').toUpperCase()}</h2>
                  <p className="category-badge" style={{backgroundColor: categoryColor}}>
                    {result.category.replace(/_/g, ' ').toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="result-grid">
                <div className="result-card">
                  <h3>
                    <Leaf size={20} />
                    Environmental Impact
                  </h3>
                  <div className="impact-stats">
                    <div className="stat">
                      <span className="stat-value">{result.weight}</span>
                      <span className="stat-label">kg weight</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{result.co2_saved}</span>
                      <span className="stat-label">kg CO₂ saved</span>
                    </div>
                  </div>
                  {result.quality && (
                    <div className="quality-indicator">
                      <CheckCircle size={16} />
                      <span>Quality: {result.quality}</span>
                    </div>
                  )}
                </div>

                <div className="result-card">
                  <h3>
                    <Clock size={20} />
                    Disposal Methods
                  </h3>
                  <ul className="disposal-list">
                    {result.disposal_methods.map((method, index) => (
                      <li key={index}>{method}</li>
                    ))}
                  </ul>
                </div>

                <div className="result-card">
                  <h3>
                    <MapPin size={20} />
                    Nearby Locations
                  </h3>
                  <div className="locations-list">
                    {result.suggestions.map((suggestion, index) => (
                      <div key={index} className="location-item">
                        <div className="location-info">
                          <h4>{suggestion.name}</h4>
                          <p className="location-type">{suggestion.type}</p>
                        </div>
                        <div className="location-distance">
                          {suggestion.distance_km} km
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={handleReset} className="reset-button">
                Analyze Another Item
              </button>
            </div>
          )}
        </main>

        <footer className="footer">
          <p>🌱 BinBuddy - Making waste disposal smarter and more sustainable</p>
        </footer>
      </div>
    </div>
  )
}

export default App 