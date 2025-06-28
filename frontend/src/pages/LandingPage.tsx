
import { Link, useNavigate } from 'react-router-dom'
import { 
  Camera, 
  Leaf, 
  Recycle, 
  TrendingUp, 
  MapPin, 
  Award,
  Upload,
  ArrowRight
} from 'lucide-react'
import ImageUpload from '../components/ImageUpload'

export default function LandingPage() {
  const navigate = useNavigate()

  const handleImageUpload = (file: File) => {
    // Navigate to classification page with the image
    navigate('/classify', { state: { image: file } })
  }

  const features = [
    {
      icon: Camera,
      title: 'AI-Powered Classification',
      description: 'Upload a photo and instantly get accurate item categorization and disposal guidance.'
    },
    {
      icon: MapPin,
      title: 'Smart Location Finding',
      description: 'Find nearby recycling centers, donation points, and disposal facilities tailored to your items.'
    },
    {
      icon: TrendingUp,
      title: 'Carbon Footprint Tracking',
      description: 'Monitor your environmental impact and see how much CO₂ you\'ve saved through proper disposal.'
    },
    {
      icon: Recycle,
      title: 'Trip Planning',
      description: 'Group items by location for efficient disposal trips and maximize your environmental impact.'
    }
  ]

  const stats = [
    { value: '25kg', label: 'Avg CO₂ Saved/Item', icon: Leaf },
    { value: '95%', label: 'Classification Accuracy', icon: Award },
    { value: '1M+', label: 'Items Processed', icon: Recycle },
    { value: '500+', label: 'Partner Locations', icon: MapPin }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container-fluid section-padding">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-eco rounded-2xl flex items-center justify-center shadow-eco-lg">
              <Leaf className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Hero Content */}
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Sustainable Waste Management
            <span className="block text-gradient-eco">Made Simple</span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            AI-powered classification, smart disposal guidance, and carbon footprint tracking. 
            Join the movement for responsible consumption and environmental protection.
          </p>

          {/* UN SDG Goals */}
          <div className="flex justify-center items-center space-x-6 mb-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-2">
                <span className="text-sm font-bold text-primary-700 dark:text-primary-300">3</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Good Health</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-2">
                <span className="text-sm font-bold text-primary-700 dark:text-primary-300">8</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Economic Growth</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-2">
                <span className="text-sm font-bold text-primary-700 dark:text-primary-300">12</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Responsible Consumption</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-2">
                <span className="text-sm font-bold text-primary-700 dark:text-primary-300">13</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Climate Action</p>
            </div>
          </div>

          {/* Main CTA - Image Upload */}
          <div className="card max-w-lg mx-auto p-8 mb-12">
            <div className="text-center mb-6">
              <Upload className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Start Your Journey
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Upload a photo of any item to get instant classification and disposal guidance
              </p>
            </div>

            <ImageUpload onImageUpload={handleImageUpload} />

            <div className="flex items-center justify-center mt-6 text-sm text-gray-500 dark:text-gray-400">
              <span>Or</span>
            </div>

            <Link 
              to="/dashboard" 
              className="btn btn-outline w-full mt-4 group"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-gray-800 py-16">
        <div className="container-fluid">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="section-padding">
        <div className="container-fluid">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How BinBuddy Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Our AI-powered platform makes sustainable waste management effortless and impactful
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card card-hover p-6">
                <div className="w-12 h-12 bg-gradient-eco rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-eco text-white py-16">
        <div className="container-fluid text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already making a positive environmental impact through better waste management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/classify" className="btn bg-white text-primary-600 hover:bg-gray-50">
              Start Classifying Items
            </Link>
            <Link to="/dashboard" className="btn btn-outline border-white text-white hover:bg-white hover:text-primary-600">
              View Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 