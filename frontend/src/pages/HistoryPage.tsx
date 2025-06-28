import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Clock, 
  Leaf, 
  MapPin, 
  Filter,
  Search,
  Package
} from 'lucide-react'

interface HistoryItem {
  id: string
  category: string
  subtype: string
  weight: number
  co2_saved: number
  status: 'pending' | 'planned' | 'completed'
  timestamp: string
  trip_id?: string
}

interface Trip {
  trip_id: string
  items: HistoryItem[]
  total_co2: number
  status: 'planned' | 'in_progress' | 'completed'
  created_at: string
}

interface HistoryData {
  trips: Trip[]
  individual_items: HistoryItem[]
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/history')
      if (response.ok) {
        const historyData = await response.json()
        setData(historyData)
      } else {
        throw new Error('Failed to fetch history')
      }
    } catch (error) {
      console.error('History error:', error)
      // Mock data for demo
      setData({
        trips: [
          {
            trip_id: '1',
            items: [
              {
                id: '1',
                category: 'recyclable',
                subtype: 'plastic_bottle',
                weight: 0.05,
                co2_saved: 0.051,
                status: 'completed',
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                trip_id: '1'
              }
            ],
            total_co2: 0.051,
            status: 'completed',
            created_at: new Date(Date.now() - 86400000).toISOString()
          }
        ],
        individual_items: [
          {
            id: '2',
            category: 'e-waste',
            subtype: 'smartphone',
            weight: 0.5,
            co2_saved: 7.5,
            status: 'pending',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          }
        ]
      })
    } finally {
      setLoading(false)
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
      planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const allItems = data ? [
    ...data.trips.flatMap(trip => trip.items),
    ...data.individual_items
  ] : []

  const filteredItems = allItems.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter
    const matchesSearch = search === '' || 
      item.subtype.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <div className="container-fluid section-padding">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading history...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">History</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Track your sustainability journey and completed actions
            </p>
          </div>
          <Link to="/classify" className="btn btn-primary mt-4 sm:mt-0">
            Add New Item
          </Link>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="input min-w-32"
              >
                <option value="all">All Items</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {allItems.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Items</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {allItems.filter(item => item.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Completed</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <Leaf className="h-5 w-5 mr-1" />
              {allItems.reduce((sum, item) => sum + item.co2_saved, 0).toFixed(2)}kg
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">CO₂ Saved</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {data?.trips.length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Trips Planned</div>
          </div>
        </div>

        {/* Items List */}
        {filteredItems.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Items ({filteredItems.length})
            </h2>
            
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div key={item.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`badge ${getCategoryColor(item.category)}`}>
                          {item.category.replace('_', ' ')}
                        </span>
                        <span className={`badge ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                        {item.trip_id && (
                          <span className="badge badge-secondary">
                            Trip #{item.trip_id.slice(-4)}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {item.subtype.replace('_', ' ')}
                      </h3>
                      
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center text-green-600 dark:text-green-400 mb-1">
                        <Leaf className="h-4 w-4 mr-1" />
                        <span className="font-medium">{item.co2_saved}kg CO₂</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {item.weight}kg
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No items found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {search || filter !== 'all' 
                ? 'Try adjusting your filters or search terms'
                : 'Start by classifying your first item!'
              }
            </p>
            <Link to="/classify" className="btn btn-primary">
              Classify Item
            </Link>
          </div>
        )}

        {/* Trips Section */}
        {data && data.trips.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Trips
            </h2>
            
            <div className="grid gap-4">
              {data.trips.slice(0, 3).map((trip) => (
                <div key={trip.trip_id} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-primary-500" />
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Trip #{trip.trip_id.slice(-4)}
                      </h3>
                      <span className={`badge ${getStatusColor(trip.status)}`}>
                        {trip.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <Leaf className="h-4 w-4 mr-1" />
                      <span className="font-medium">{trip.total_co2}kg CO₂</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {trip.items.length} items • Created {new Date(trip.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {trip.items.slice(0, 3).map((item) => (
                      <span key={item.id} className={`badge ${getCategoryColor(item.category)} text-xs`}>
                        {item.subtype.replace('_', ' ')}
                      </span>
                    ))}
                    {trip.items.length > 3 && (
                      <span className="badge badge-secondary text-xs">
                        +{trip.items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <Link to="/trips" className="btn btn-outline w-full">
              View All Trips
            </Link>
          </div>
        )}
      </div>
    </div>
  )
} 