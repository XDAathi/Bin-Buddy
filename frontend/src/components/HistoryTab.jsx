import React, { useState, useEffect } from 'react';
import { 
  Calendar, Trash2, Recycle, AlertCircle, Search, Filter, Check, X, MapPin, 
  Package, Heart, ChevronDown, ChevronRight, RotateCcw, Trash, CheckCircle2,
  Store, Zap, Car, Smartphone, Monitor, Sofa, Shirt, Apple, TreePine, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as MdIcons from 'react-icons/md';
import { getUserClassificationsWithImages } from '../supabase_integration_with_images';
import { updateClassificationCompletion, deleteClassification } from '../utils/supabase-integration';
import toast from 'react-hot-toast';

const HistoryTab = ({ user }) => {
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [groupBy, setGroupBy] = useState('location'); // 'location', 'category', 'date'
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [completedItems, setCompletedItems] = useState(new Set());
  const [hoveredItem, setHoveredItem] = useState(null);

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
            specific_category: item.specific_category,
            created_at: item.created_at,
            co2_saved: item.co2_saved_kg,
            weight_kg: item.weight_kg,
            recyclable: item.recyclable,
            donation_worthy: item.donation_worthy,
            confidence: item.confidence,
            color: item.color,
            icon: item.icon,
            image_url: item.image_url,
            disposal_methods: item.disposal_methods || [],
            location_suggestions: item.location_suggestions || [],
            location_query: item.location_query || '',
            completed: item.completed || false, // Use database value
            waste_image_id: item.waste_image_id
          }));
          setClassifications(transformedData);
          
          // Initialize completedItems state from database data
          const completedIds = new Set(
            transformedData.filter(item => item.completed).map(item => item.id)
          );
          setCompletedItems(completedIds);
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

  // Helper functions
  // eslint-disable-next-line no-unused-vars
  const getIconFromMaterialName = (iconName, size = 24, color = 'currentColor') => {
    if (!iconName || typeof iconName !== 'string') {
      return <MdIcons.MdRecycling size={size} color={color} />;
    }
    
    const iconKey = iconName.replace('material/', '');
    const IconComponent = MdIcons[iconKey];
    
    if (IconComponent) {
      return <IconComponent size={size} color={color} />;
    }
    
    return <MdIcons.MdRecycling size={size} color={color} />;
  };

  const getDisposalTypeIcon = (type, size = 24) => {
    switch (type) {
      case 'donate':
        return <Heart className={`h-${size/4} w-${size/4} text-pink-600`} />;
      case 'dropoff':
        return <Store className={`h-${size/4} w-${size/4} text-blue-600`} />;
      case 'dispose':
        return <Trash2 className={`h-${size/4} w-${size/4} text-gray-600`} />;
      default:
        return <Package className={`h-${size/4} w-${size/4} text-gray-600`} />;
    }
  };

  const getCategoryIcon = (category, size = 24) => {
    switch (category?.toLowerCase()) {
      case 'electronic':
      case 'electronics':
        return <Smartphone className={`h-${size/4} w-${size/4} text-blue-600`} />;
      case 'furniture':
        return <Sofa className={`h-${size/4} w-${size/4} text-amber-600`} />;
      case 'textile':
      case 'clothing':
        return <Shirt className={`h-${size/4} w-${size/4} text-purple-600`} />;
      case 'organic':
        return <Apple className={`h-${size/4} w-${size/4} text-green-600`} />;
      case 'recyclable':
        return <Recycle className={`h-${size/4} w-${size/4} text-teal-600`} />;
      case 'hazardous':
        return <AlertCircle className={`h-${size/4} w-${size/4} text-red-600`} />;
      default:
        return <Package className={`h-${size/4} w-${size/4} text-gray-600`} />;
    }
  };

  const openInMaps = (item) => {
    const primaryLocation = item.location_suggestions?.[0];
    if (primaryLocation && primaryLocation.lat && primaryLocation.lon) {
      const url = `https://maps.apple.com/?q=${primaryLocation.lat},${primaryLocation.lon}`;
      window.open(url, '_blank');
    } else if (primaryLocation && primaryLocation.name) {
      const query = encodeURIComponent(primaryLocation.name);
      const url = `https://maps.apple.com/?q=${query}`;
      window.open(url, '_blank');
    }
  };

  const toggleItemCompletion = async (itemId) => {
    if (!user) return;
    const isCurrentlyCompleted = completedItems.has(itemId);
    const newCompletionStatus = !isCurrentlyCompleted;
    const currentItem = classifications.find(item => item.id === itemId);
    const itemsWithSameName = classifications.filter(item => item.display_name === currentItem?.display_name);
    try {
      const updatePromises = itemsWithSameName.map(item => updateClassificationCompletion(item.id, newCompletionStatus, user.id));
      const results = await Promise.all(updatePromises);
      const successfulUpdates = results.filter(result => result.success);
      if (successfulUpdates.length > 0) {
        setCompletedItems(prev => {
          const newCompleted = new Set(prev);
          itemsWithSameName.forEach(item => {
            if (newCompletionStatus) {
              newCompleted.add(item.id);
            } else {
              newCompleted.delete(item.id);
            }
          });
          return newCompleted;
        });
        setClassifications(prev => prev.map(item => {
          const shouldUpdate = itemsWithSameName.some(sameNameItem => sameNameItem.id === item.id);
          return shouldUpdate ? { ...item, completed: newCompletionStatus } : item;
        }));
        toast.success(newCompletionStatus ? 'Marked as completed!' : 'Marked as incomplete!');
      } else {
        toast.error('Failed to update completion.');
      }
    } catch (error) {
      toast.error('Error toggling completion.');
    }
  };

  const toggleGroupCompletion = async (groupItems) => {
    if (!user) return;
    
    const incompleteItems = groupItems.filter(item => !completedItems.has(item.id));
    
    try {
      const updatePromises = incompleteItems.map(item => 
        updateClassificationCompletion(item.id, true, user.id)
      );
      
      const results = await Promise.all(updatePromises);
      const successfulUpdates = results.filter(result => result.success);
      
      if (successfulUpdates.length > 0) {
        setCompletedItems(prev => {
          const newCompleted = new Set(prev);
          incompleteItems.forEach(item => newCompleted.add(item.id));
          return newCompleted;
        });
        
        setClassifications(prev => 
          prev.map(item => {
            const shouldUpdate = incompleteItems.some(incompleteItem => incompleteItem.id === item.id);
            return shouldUpdate ? { ...item, completed: true } : item;
          })
        );
        
        console.log(`${successfulUpdates.length} items in group marked as completed`);
      }
    } catch (error) {
      console.error('Error completing group:', error);
    }
  };

  // Async deleteItem that persists to DB
  const deleteItem = async (itemId) => {
    if (!user) return;
    const originalClassifications = [...classifications];
    setClassifications(prev => prev.filter(item => item.id !== itemId));
    setCompletedItems(prev => {
      const newCompleted = new Set(prev);
      newCompleted.delete(itemId);
      return newCompleted;
    });
    try {
      const { success, error } = await deleteClassification(itemId, user.id);
      if (!success) {
        toast.error('Failed to delete item.');
        setClassifications(originalClassifications);
      } else {
        toast.success('Item deleted!');
      }
    } catch (err) {
      toast.error('Unexpected error deleting item.');
      setClassifications(originalClassifications);
    }
  };

  const toggleGroupExpansion = (groupKey) => {
    setExpandedGroups(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(groupKey)) {
        newExpanded.delete(groupKey);
      } else {
        newExpanded.add(groupKey);
      }
      return newExpanded;
    });
  };

  // Filter classifications and separate completed/incomplete
  const allFilteredClassifications = classifications.filter(item => {
    const matchesSearch = item.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterCategory === 'all' || item.main_category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const incompleteClassifications = allFilteredClassifications.filter(item => !completedItems.has(item.id));
  const completedClassifications = allFilteredClassifications.filter(item => completedItems.has(item.id));

  // Group classifications (incomplete items only)
  const groupClassifications = (items) => {
    const groups = {};
    
    items.forEach(item => {
      let groupKey;
      let groupName;
      
      if (groupBy === 'location') {
        // Group by disposal type and location
        const primaryLocation = item.location_suggestions?.[0];
        if (primaryLocation) {
          groupKey = `${primaryLocation.type}-${primaryLocation.name}`;
          groupName = `${primaryLocation.type === 'donate' ? '💝 Donate' : primaryLocation.type === 'dropoff' ? '📦 Drop-off' : '🗑️ Dispose'} at ${primaryLocation.name}`;
        } else {
          groupKey = 'unknown-location';
          groupName = '❓ Unknown Location';
        }
      } else if (groupBy === 'category') {
        groupKey = item.main_category;
        groupName = item.main_category.charAt(0).toUpperCase() + item.main_category.slice(1);
      } else {
        // Group by date
        const date = new Date(item.created_at).toDateString();
        groupKey = date;
        groupName = date;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: groupName,
          items: [],
          type: groupBy === 'location' ? (item.location_suggestions?.[0]?.type || 'unknown') : 'category'
        };
      }
      
      groups[groupKey].items.push(item);
    });
    
    return groups;
  };

  const groupedIncompleteClassifications = groupClassifications(incompleteClassifications);
  // Don't group completed items - just use the flat list

  // Start groups closed by default
  useEffect(() => {
    // Groups start collapsed - user can expand as needed
    setExpandedGroups(new Set());
  }, [Object.keys(groupedIncompleteClassifications).join(',')]);

  // Debug completion state (remove in production)
  useEffect(() => {
    if (classifications.length > 0) {
      console.log('Completed items:', Array.from(completedItems));
      console.log('Available classifications:', classifications.map(c => ({ id: c.id, name: c.display_name })));
    }
  }, [completedItems, classifications]);

  // Calculate stats
  const totalCO2Saved = classifications.reduce((sum, item) => sum + item.co2_saved, 0);
  const completedCO2 = classifications
    .filter(item => completedItems.has(item.id))
    .reduce((sum, item) => sum + item.co2_saved, 0);
  const totalItems = classifications.length;
  const completedItemsCount = completedItems.size;

  // eslint-disable-next-line no-unused-vars
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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto px-4 py-6"
      >
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-eco"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-7xl mx-auto px-4 py-6 space-y-8"
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-center space-y-4"
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Disposal History & Progress
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Track your items and group them for efficient disposal
        </p>
        <div className="w-32 h-1 bg-green-eco mx-auto rounded-full"></div>
      </motion.div>

      {/* Enhanced Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="grid md:grid-cols-4 gap-6"
      >
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 shadow-lg border border-blue-200/30 dark:border-blue-700/30 backdrop-blur-sm">
          <div className="space-y-4 text-center">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-lg w-fit mx-auto">
              <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Total Items
            </h3>
            <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {totalItems}
            </p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 shadow-lg border border-green-200/30 dark:border-green-700/30 backdrop-blur-sm">
          <div className="space-y-4 text-center">
            <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-lg w-fit mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Completed
            </h3>
            <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {completedItemsCount}
            </p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 shadow-lg border border-purple-200/30 dark:border-purple-700/30 backdrop-blur-sm">
          <div className="space-y-4 text-center">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl shadow-lg w-fit mx-auto">
              <Recycle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Potential CO₂ Saved
            </h3>
            <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {totalCO2Saved.toFixed(1)}kg
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20 rounded-2xl p-6 shadow-lg border border-teal-200/30 dark:border-teal-700/30 backdrop-blur-sm">
          <div className="space-y-4 text-center">
            <div className="p-3 bg-gradient-to-br from-teal-500/20 to-green-500/20 rounded-xl shadow-lg w-fit mx-auto">
              <RotateCcw className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              CO₂ Impact
            </h3>
            <p className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">
              {completedCO2.toFixed(1)}kg
            </p>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Search className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-4 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white text-lg font-medium placeholder-gray-500 dark:placeholder-gray-400 backdrop-blur-sm transition-all duration-200"
            />
          </div>
          
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg z-10 pointer-events-none">
              <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="appearance-none pl-14 pr-10 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white text-lg font-medium backdrop-blur-sm transition-all duration-200 cursor-pointer"
              style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'currentColor\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>"), linear-gradient(to bottom, transparent 0%, transparent 100%)', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
            >
              <option value="all">All Categories</option>
              <option value="furniture">Furniture</option>
              <option value="electronic">Electronics</option>
              <option value="recyclable">Recyclables</option>
              <option value="organic">Organic</option>
              <option value="clothing">Clothing</option>
              <option value="hazardous">Hazardous</option>
            </select>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg z-10 pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="appearance-none pl-14 pr-10 py-4 border-2 border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-green-500/50 focus:border-green-400/50 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white text-lg font-medium backdrop-blur-sm transition-all duration-200 cursor-pointer"
              style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'currentColor\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>"), linear-gradient(to bottom, transparent 0%, transparent 100%)', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
            >
              <option value="location">Group by Location</option>
              <option value="category">Group by Category</option>
              <option value="date">Group by Date</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Pending Items Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="space-y-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg">
            <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pending Disposal ({incompleteClassifications.length})
          </h2>
        </div>

        {Object.keys(groupedIncompleteClassifications).length === 0 ? (
          <div className="card text-center py-12">
            <div className="space-y-4">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto" />
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                No pending items
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {searchTerm || filterCategory !== 'all' 
                  ? "Try adjusting your search or filter criteria."
                  : "All items have been completed! Great job!"
                }
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {Object.entries(groupedIncompleteClassifications).map(([groupKey, group], index) => (
              <motion.div 
                key={groupKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {/* Modern Group Card */}
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden backdrop-blur-sm">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroupExpansion(groupKey)}
                    className="w-full flex items-center justify-between p-6 hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-white/80 dark:hover:from-gray-700/50 dark:hover:to-gray-800/50 transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl shadow-lg backdrop-blur-sm ${
                        group.type === 'donate' ? 'bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-200/30' :
                        group.type === 'dropoff' ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-200/30' :
                        group.type === 'dispose' ? 'bg-gradient-to-br from-gray-500/20 to-slate-500/20 border border-gray-200/30' :
                        'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-200/30'
                      }`}>
                        {getDisposalTypeIcon(group.type, 28)}
                      </div>
                      
                      <div className="flex flex-col items-start">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                          {group.name}
                        </h3>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-semibold border border-blue-200/30">
                            {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                          </span>
                          <span className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-semibold border border-green-200/30">
                            {group.items.reduce((sum, item) => sum + item.co2_saved, 0).toFixed(1)}kg CO₂
                          </span>
                          {/* Location info */}
                          {group.items[0]?.location_suggestions?.[0] && (
                            <span className="bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-semibold border border-gray-200/30 flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{group.items[0].location_suggestions[0].address || group.items[0].location_suggestions[0].name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Complete All Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroupCompletion(group.items);
                        }}
                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center space-x-1"
                        title="Complete all items in this group"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">All</span>
                      </button>
                      
                      {/* Open in Maps Button */}
                      {group.items[0]?.location_suggestions?.[0] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openInMaps(group.items[0]);
                          }}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
                          title="Open location in maps"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                      
                      <div className={`p-2 rounded-lg transition-all duration-300 ${
                        expandedGroups.has(groupKey) ? 'bg-gray-200/50 dark:bg-gray-700/50 rotate-180' : 'bg-gray-100/50 dark:bg-gray-800/50'
                      }`}>
                        <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                    </div>
                  </button>

                  {/* Group Items */}
                  <AnimatePresence>
                    {expandedGroups.has(groupKey) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-gray-200/30 dark:border-gray-700/30 pt-6 px-6 pb-6"
                      >
                        <div className="grid gap-5">
                          {group.items.map((item) => (
                            <motion.div 
                              key={item.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3 }}
                              className={`flex items-center space-x-5 p-5 rounded-2xl border-2 transition-all duration-300 relative group shadow-lg backdrop-blur-sm ${
                                completedItems.has(item.id) 
                                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-400 dark:border-green-600 shadow-green-300/50 dark:shadow-green-900/30' 
                                  : 'bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-800/50 dark:to-gray-900/50 border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300/70 dark:hover:border-gray-600/70 hover:shadow-xl hover:-translate-y-1'
                              }`}
                              onMouseEnter={() => setHoveredItem(item.id)}
                              onMouseLeave={() => setHoveredItem(null)}
                            >
                              <div className="flex-shrink-0 relative">
                                <img
                                  src={
                                    item.image_url ||
                                    (item.waste_image_id
                                      ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${item.waste_image_id}.jpg`
                                      : undefined)
                                  }
                                  alt={item.display_name}
                                  className="w-16 h-16 object-cover rounded-lg"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    const fallback = e.target.parentNode.querySelector('.fallback-icon');
                                    if (fallback) {
                                      fallback.style.display = 'flex';
                                    }
                                  }}
                                />
                                <div 
                                  className="fallback-icon w-16 h-16 rounded-lg flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-2 border-gray-200 dark:border-gray-600"
                                  style={{ display: 'none' }}
                                >
                                  {getCategoryIcon(item.main_category, 24)}
                                </div>
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {item.display_name}
                                  </h4>
                                  {item.donation_worthy && (
                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                                      💝 Donate
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {item.weight_kg}kg • {item.co2_saved}kg CO₂ saved
                                </div>
                              </div>

                              <button
                                onClick={() => toggleItemCompletion(item.id)}
                                className={`p-3 rounded-lg transition-all duration-200 ${
                                  completedItems.has(item.id)
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                                title={completedItems.has(item.id) ? 'Mark as incomplete' : 'Mark as completed'}
                              >
                                <Check className="h-5 w-5" />
                              </button>
                                
                              {hoveredItem === item.id && (
                                <button
                                  onClick={() => deleteItem(item.id)}
                                  className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 shadow-lg z-10"
                                  title="Delete item"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Completed Items Section */}
      {completedClassifications.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="space-y-6 mt-12"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Completed Items ({completedClassifications.length})
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-green-200 to-transparent dark:from-green-800"></div>
          </div>

          {/* Simple list of completed items */}
          <div className="grid gap-4">
            {completedClassifications.map((item, index) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex items-center space-x-4 p-4 rounded-xl border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 transition-all duration-200 relative opacity-80"
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {/* Delete Button - Top Right Corner */}
                {hoveredItem === item.id && (
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 shadow-lg z-10"
                    title="Delete item"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Item Image */}
                <div className="flex-shrink-0 relative">
                  <img
                    src={
                      item.image_url ||
                      (item.waste_image_id
                        ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${item.waste_image_id}.jpg`
                        : undefined)
                    }
                    alt={item.display_name}
                    className="w-16 h-16 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentNode.querySelector('.fallback-icon');
                      if (fallback) {
                        fallback.style.display = 'flex';
                      }
                    }}
                  />
                  <div 
                    className="fallback-icon w-16 h-16 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-900 border-2 border-green-200 dark:border-green-600 opacity-80"
                    style={{ display: 'none' }}
                  >
                    {getCategoryIcon(item.main_category, 24)}
                  </div>
                </div>

                {/* Item Details */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      ✅ {item.display_name}
                    </h4>
                    {item.donation_worthy && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium opacity-80">
                        💝 Donated
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {item.weight_kg}kg • {item.co2_saved}kg CO₂ saved
                  </div>
                </div>

                {/* Undo Button */}
                <button
                  onClick={() => toggleItemCompletion(item.id)}
                  className="p-3 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500 transition-all duration-200"
                  title="Mark as incomplete"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default HistoryTab; 