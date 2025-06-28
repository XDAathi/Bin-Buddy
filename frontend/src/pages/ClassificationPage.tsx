import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  MapPin, 
  Leaf, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Navigation,
  Plus
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import toast from 'react-hot-toast'

interface ClassificationResult {
  image_id: string
  timestamp: string
  category: string
  subtype: string
  quality?: string
  weight: number
  co2_saved: number
  disposal_methods: string[]
  suggestions: Array<{
    type: string
    name: string
    distance_km: number
    lat: number
    lon: number
  }>
}

export default function ClassificationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    // Get user location first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          }
          setUserLocation(coords)
          
          // Only classify if we have an image and haven't classified yet
          const image = location.state?.image
          if (image && !result && !loading) {
            classifyImage(image)
          }
        },
        (error) => {
          console.error('Error getting location:', error)
          // Default to New York coordinates for demo
          const coords = { lat: 40.7128, lon: -74.0060 }
          setUserLocation(coords)
          
          // Only classify if we have an image and haven't classified yet
          const image = location.state?.image
          if (image && !result && !loading) {
            classifyImage(image)
          }
        }
      )
    } else {
      const coords = { lat: 40.7128, lon: -74.0060 }
      setUserLocation(coords)
      
      // Only classify if we have an image and haven't classified yet
      const image = location.state?.image
      if (image && !result && !loading) {
        classifyImage(image)
      }
    }
  }, []) // Remove dependencies to prevent re-runs

  const classifyImage = async (imageFile: File) => {
    if (!userLocation) return

    setLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('lat', userLocation.lat.toString())
      formData.append('lon', userLocation.lon.toString())

      const response = await fetch('http://127.0.0.1:5000/api/classify', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Classification failed')
      }

      const data = await response.json()
      setResult(data)
      toast.success('Item classified successfully!')
    } catch (error) {
      console.error('Classification error:', error)
      toast.error('Failed to classify item. Please try again.')
      
      // Mock result for demo purposes
      setResult({
        image_id: 'demo-id',
        timestamp: new Date().toISOString(),
        category: 'recyclable',
        subtype: 'plastic_bottle',
        weight: 0.05,
        co2_saved: 0.051,
        disposal_methods: [
          'Rinse the bottle thoroughly',
          'Remove the cap and label',
          'Place in recycling bin'
        ],
        suggestions: [
          {
            type: 'dropoff',
            name: 'Green Recycling Center',
            distance_km: 2.3,
            lat: userLocation.lat + 0.01,
            lon: userLocation.lon + 0.01
          },
          {
            type: 'dropoff',
            name: 'EcoPoint Collection',
            distance_km: 3.7,
            lat: userLocation.lat - 0.02,
            lon: userLocation.lon + 0.02
          }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  const addToTrip = async () => {
    if (!result) return

    try {
      const response = await fetch('http://127.0.0.1:5000/api/item/add_trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_id: result.image_id
        })
      })

      if (response.ok) {
        toast.success('Item added to trip!')
        navigate('/trips')
      } else {
        throw new Error('Failed to add to trip')
      }
    } catch (error) {
      console.error('Add to trip error:', error)
      toast.error('Failed to add item to trip')
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      recyclable: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      organic: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'e-waste': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      donation: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      textile_recycle: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      hazardous: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      general_trash: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
    return colors[category as keyof typeof colors] || colors.general_trash
  }

  if (loading) {
    return (
      <div className="container-fluid section-padding">
        <div className="max-w-2xl mx-auto text-center">
          <div className="loading-spinner w-12 h-12 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Analyzing Your Item...
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Our AI is classifying your item and finding disposal options nearby.
          </p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="container-fluid section-padding">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Classification Data
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please upload an image to classify an item.
          </p>
          <Link to="/" className="btn btn-primary">
            Upload Image
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid section-padding">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          
          <div className="text-right">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4 mr-1" />
              {new Date(result.timestamp).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Classification Details */}
          <div className="space-y-6">
            {/* Classification Result */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Classification Result
                </h2>
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <div className="mt-1">
                    <span className={`badge ${getCategoryColor(result.category)}`}>
                      {result.category.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Type</label>
                  <p className="mt-1 text-gray-900 dark:text-white font-medium">
                    {result.subtype.replace('_', ' ')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Weight</label>
                    <p className="mt-1 text-gray-900 dark:text-white font-medium">
                      {result.weight}kg
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">CO₂ Saved</label>
                    <div className="mt-1 flex items-center">
                      <Leaf className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {result.co2_saved}kg
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Disposal Methods */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Disposal Instructions
              </h3>
              <ul className="space-y-2">
                {result.disposal_methods.map((method, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{method}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={addToTrip}
                className="btn btn-primary flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Trip
              </button>
              <Link to="/dashboard" className="btn btn-outline flex-1">
                View Dashboard
              </Link>
            </div>
          </div>

          {/* Right Column - Map and Locations */}
          <div className="space-y-6">
            {/* Map */}
            {userLocation && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Nearby Disposal Locations
                </h3>
                <div className="h-64 rounded-lg overflow-hidden">
                  <MapContainer
                    center={[userLocation.lat, userLocation.lon]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* User location */}
                    <Marker position={[userLocation.lat, userLocation.lon]}>
                      <Popup>Your Location</Popup>
                    </Marker>
                    
                    {/* Disposal locations */}
                    {result.suggestions.map((suggestion, index) => (
                      <Marker key={index} position={[suggestion.lat, suggestion.lon]}>
                        <Popup>
                          <div className="text-sm">
                            <div className="font-medium">{suggestion.name}</div>
                            <div className="text-gray-600">{suggestion.distance_km}km away</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            )}

            {/* Location List */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Suggested Locations
              </h3>
              <div className="space-y-3">
                {result.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {suggestion.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {suggestion.distance_km}km away
                      </div>
                    </div>
                    <button className="btn btn-ghost p-2">
                      <Navigation className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 