import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Leaf, 
  Package, 
  MapPin, 
  Plus, 
  Calendar,
  Award,
  Target
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface DashboardData {
  co2_total: number
  item_count: number
  breakdown_by_category: Record<string, number>
  recent_items: Array<{
    id: string
    category: string
    subtype: string
    co2_saved: number
    timestamp: string
  }>
}

const CATEGORY_COLORS = {
  recyclable: '#3b82f6',
  organic: '#22c55e', 
  'e-waste': '#8b5cf6',
  donation: '#ec4899',
  textile_recycle: '#6366f1',
  hazardous: '#ef4444',
  general_trash: '#6b7280'
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/dashboard')
      if (response.ok) {
        const dashboardData = await response.json()
        setData(dashboardData)
      } else {
        throw new Error('Failed to fetch dashboard data')
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      // Mock data for demo
      setData({
        co2_total: 12.47,
        item_count: 23,
        breakdown_by_category: {
          recyclable: 8,
          organic: 5,
          'e-waste': 3,
          donation: 4,
          textile_recycle: 2,
          hazardous: 1
        },
        recent_items: [
          {
            id: '1',
            category: 'recyclable',
            subtype: 'plastic_bottle',
            co2_saved: 0.051,
            timestamp: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: '2', 
            category: 'e-waste',
            subtype: 'smartphone',
            co2_saved: 7.5,
            timestamp: new Date(Date.now() - 172800000).toISOString()
          }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  // Mock trend data for chart
  const trendData = [
    { date: '6 days ago', co2: 1.2 },
    { date: '5 days ago', co2: 2.8 },
    { date: '4 days ago', co2: 1.9 },
    { date: '3 days ago', co2: 4.1 },
    { date: '2 days ago', co2: 0.8 },
    { date: 'Yesterday', co2: 1.6 },
    { date: 'Today', co2: 0.051 }
  ]

  const categoryData = data ? Object.entries(data.breakdown_by_category).map(([category, count]) => ({
    name: category.replace('_', ' '),
    value: count,
    color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]
  })) : []

  if (loading) {
    return (
      <div className="container-fluid section-padding">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container-fluid section-padding">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Welcome to BinBuddy!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Start by classifying your first item to see your impact.
          </p>
          <Link to="/classify" className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Classify First Item
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid section-padding">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Track your environmental impact and sustainability journey
            </p>
          </div>
          <Link to="/classify" className="btn btn-primary mt-4 sm:mt-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card card-eco p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Total CO₂ Saved</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.co2_total}kg
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Items Processed</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.item_count}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Impact Level</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.co2_total > 10 ? 'High' : data.co2_total > 5 ? 'Medium' : 'Growing'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* CO2 Trend Chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                CO₂ Savings Trend
              </h3>
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="input text-sm py-1 px-2"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    className="text-sm"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    className="text-sm"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'CO₂ (kg)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--tw-colors-gray-800)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'var(--tw-colors-gray-100)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="co2" 
                    stroke="var(--tw-colors-primary-500)" 
                    strokeWidth={3}
                    dot={{ fill: 'var(--tw-colors-primary-500)', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Items by Category
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Link to="/classify" className="btn btn-outline w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Classify New Item
              </Link>
              <Link to="/trips" className="btn btn-outline w-full justify-start">
                <MapPin className="h-4 w-4 mr-2" />
                Plan Disposal Trip
              </Link>
              <Link to="/history" className="btn btn-outline w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                View History
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h3>
              <Link to="/history" className="text-sm text-primary-600 hover:text-primary-700">
                View All
              </Link>
            </div>
            
            {data.recent_items.length > 0 ? (
              <div className="space-y-3">
                {data.recent_items.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`badge ${item.category === 'recyclable' ? 'badge-primary' : 'badge-secondary'}`}>
                          {item.category}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {item.subtype.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <Leaf className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{item.co2_saved}kg</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Goals Section */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sustainability Goals
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Target className="h-8 w-8 text-primary-500 mx-auto mb-2" />
              <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Goal</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">50kg CO₂</div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round((data.co2_total / 50) * 100)}% complete
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Package className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-sm text-gray-600 dark:text-gray-400">Items Target</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">100 items</div>
              <div className="text-xs text-gray-500 mt-1">
                {data.item_count}/100 items
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Award className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-sm text-gray-600 dark:text-gray-400">Next Badge</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">Eco Warrior</div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.max(0, 20 - data.co2_total)}kg to go
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 