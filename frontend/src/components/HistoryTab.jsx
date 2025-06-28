import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, Recycle, AlertCircle, Search, Filter } from 'lucide-react';
import { getUserClassificationsWithImages } from '../utils/supabase-integration';

const HistoryTab = ({ user }) => {
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    const fetchClassifications = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await getUserClassificationsWithImages(user.id);
        
        if (error) {
          console.error('Error fetching classifications:', error);
          setClassifications([]);
        } else {
          // Transform the data to match our component's expected format
          const transformedData = data.map(item => ({
            id: item.id,
            display_name: item.display_name,
            main_category: item.main_category,
            created_at: item.created_at,
            co2_saved: item.co2_saved_kg,
            weight_kg: item.weight_kg,
            recyclable: item.recyclable,
            confidence: item.confidence,
            color: item.color,
            image_url: item.image_url
          }));
          setClassifications(transformedData);
        }
      } catch (err) {
        console.error('Unexpected error fetching classifications:', err);
        setClassifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClassifications();
  }, [user]);

  const filteredClassifications = classifications.filter(item => {
    const matchesSearch = item.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterCategory === 'all' || item.main_category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const totalCO2Saved = classifications.reduce((sum, item) => sum + item.co2_saved, 0);
  const totalItems = classifications.length;

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'recyclable':
        return <Recycle className="h-5 w-5 text-blue-recycle" />;
      case 'electronic':
        return <AlertCircle className="h-5 w-5 text-orange-ewaste" />;
      case 'organic':
        return <div className="h-5 w-5 bg-green-eco rounded-full" />;
      default:
        return <Trash2 className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-eco"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Your History
        </h1>
        <div className="w-24 h-1 bg-green-eco mx-auto rounded-full"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card text-center">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Total Items Analyzed
            </h3>
            <p className="text-3xl font-bold text-green-eco">{totalItems}</p>
          </div>
        </div>
        
        <div className="card text-center">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              CO₂ Saved
            </h3>
            <p className="text-3xl font-bold text-green-eco">{totalCO2Saved.toFixed(2)}kg</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-eco focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-eco focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="recyclable">Recyclable</option>
              <option value="electronic">Electronic</option>
              <option value="organic">Organic</option>
              <option value="hazardous">Hazardous</option>
            </select>
          </div>
        </div>
      </div>

      {/* Classifications List */}
      <div className="space-y-4">
        {filteredClassifications.length === 0 ? (
          <div className="card text-center py-12">
            <div className="space-y-4">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                No items found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || filterCategory !== 'all' 
                  ? "Try adjusting your search or filter criteria."
                  : "Start analyzing items to see your history here."
                }
              </p>
            </div>
          </div>
        ) : (
          filteredClassifications.map((item) => (
            <div key={item.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-4">
                {/* Item image placeholder */}
                <div 
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: item.color + '20' }}
                >
                  {getCategoryIcon(item.main_category)}
                </div>

                {/* Item details */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.display_name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.confidence === 'high' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : item.confidence === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {item.confidence} confidence
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.main_category} • {item.weight_kg}kg • {formatDate(item.created_at)}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      CO₂ saved: {item.co2_saved}kg
                    </span>
                    {item.recyclable && (
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-full text-xs">
                        Recyclable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryTab; 