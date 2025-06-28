import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  MapPin, 
  Leaf, 
  CheckCircle, 
  Plus,
  Navigation,
  Calendar
} from 'lucide-react'

interface TripItem {
  id: string
  category: string
  subtype: string
  weight: number
  co2_saved: number
  status: 'pending' | 'planned' | 'completed'
}

interface Trip {
  trip_id: string
  name: string
  destination_name?: string
  destination_lat?: number
  destination_lon?: number
  items: TripItem[]
  total_co2: number
  status: 'planned' | 'in_progress' | 'completed'
  created_at: string
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrips()
  }, [])

  const fetchTrips = async () => {
    try {
      const response = await fetch('/api/history')
      if (response.ok) {
        const data = await response.json()
        setTrips(data.trips || [])
      } else {
        throw new Error('Failed to fetch trips')
      }
    } catch (error) {
      console.error('Trips error:', error)
      // Mock data for demo
      setTrips([
        {
          trip_id: '1',
          name: 'Recycling Center Trip',
          destination_name: 'Green Recycling Center',
          destination_lat: 40.7128,
          destination_lon: -74.0060,
          items: [
            {
              id: '1',
              category: 'recyclable',
              subtype: 'plastic_bottle',
              weight: 0.05,
              co2_saved: 0.051,
              status: 'planned'
            },
            {
              id: '2',
              category: 'recyclable',
              subtype: 'aluminum_can',
              weight: 0.02,
              co2_saved: 0.031,
              status: 'planned'
            }
          ],
          total_co2: 0.082,
          status: 'planned',
          created_at: new Date().toISOString()
        },
        {
          trip_id: '2',
          name: 'E-waste Disposal',
          destination_name: 'Electronics Disposal Hub',
          items: [
            {
              id: '3',
              category: 'e-waste',
              subtype: 'smartphone',
              weight: 0.5,
              co2_saved: 7.5,
              status: 'completed'
            }
          ],
          total_co2: 7.5,
          status: 'completed',
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const completeTrip = async (tripId: string) => {
    try {
      const response = await fetch('/api/trip/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trip_id: tripId })
      })

      if (response.ok) {
        // Update local state
        setTrips(prevTrips => 
          prevTrips.map(trip => 
            trip.trip_id === tripId 
              ? { ...trip, status: 'completed' as const }
              : trip
          )
        )
      }
    } catch (error) {
      console.error('Complete trip error:', error)
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

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'in_progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      planned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    }
    return colors[status as keyof typeof colors] || colors.planned
  }

  if (loading) {
    return (
      <div className="container-fluid section-padding">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading trips...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid section-padding">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Trips</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Plan and track your disposal trips for maximum efficiency
            </p>
          </div>
          <Link to="/classify" className="btn btn-primary mt-4 sm:mt-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Items
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {trips.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Trips</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {trips.filter(trip => trip.status === 'planned').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Planned</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center justify-center">
              <Leaf className="h-5 w-5 mr-1" />
              {trips.reduce((sum, trip) => sum + trip.total_co2, 0).toFixed(2)}kg
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total CO₂ Impact</div>
          </div>
        </div>

        {/* Trips List */}
        {trips.length > 0 ? (
          <div className="space-y-4">
            {trips.map((trip) => (
              <div key={trip.trip_id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {trip.name || `Trip #${trip.trip_id.slice(-4)}`}
                      </h3>
                      <span className={`badge ${getStatusColor(trip.status)}`}>
                        {trip.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {trip.destination_name && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {trip.destination_name}
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-1" />
                      Created {new Date(trip.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center text-green-600 dark:text-green-400 mb-1">
                      <Leaf className="h-4 w-4 mr-1" />
                      <span className="font-semibold">{trip.total_co2}kg CO₂</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {trip.items.length} items
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Items in this trip:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {trip.items.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`badge ${getCategoryColor(item.category)} text-xs`}>
                            {item.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {item.weight}kg
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.subtype.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400 flex items-center">
                          <Leaf className="h-3 w-3 mr-1" />
                          {item.co2_saved}kg CO₂
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {trip.status === 'planned' && (
                    <>
                      <button
                        onClick={() => completeTrip(trip.trip_id)}
                        className="btn btn-primary"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </button>
                      {trip.destination_lat && trip.destination_lon && (
                        <a
                          href={`https://maps.google.com/maps?q=${trip.destination_lat},${trip.destination_lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          Get Directions
                        </a>
                      )}
                    </>
                  )}
                  
                  {trip.status === 'completed' && (
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No trips planned yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Start by classifying items and adding them to trips for efficient disposal.
            </p>
            <Link to="/classify" className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Classify Items
            </Link>
          </div>
        )}

        {/* Tips */}
        <div className="card p-6 bg-gradient-eco-light">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            💡 Trip Planning Tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>• Group items by location to minimize travel</li>
            <li>• Plan trips when you have multiple items for the same destination</li>
            <li>• Check facility hours before departing</li>
            <li>• Bring identification for e-waste and hazardous materials</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 