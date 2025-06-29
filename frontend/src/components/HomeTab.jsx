import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, CheckCircle, Heart, TreePine, ChevronDown, MapPin, Star, Mail, Info, ExternalLink, Navigation, Package, Trash2, Clipboard, Recycle, LeafyGreen } from 'lucide-react';
import { motion } from 'framer-motion';
import * as MdIcons from 'react-icons/md';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import supabase from '../supabase-client';
import { upsertUser } from '../supabase-crud';
import { handleWasteClassificationWithImage } from '../supabase_integration_with_images';

// Import UN SDG Images
import sdg3 from '../assets/sdg_icons_color_goal_3.svg';
import sdg8 from '../assets/sdg_icons_color_goal_8.svg';
import sdg12 from '../assets/sdg_icons_color_goal_12.svg';
import sdg13 from '../assets/sdg_icons_color_goal_13.svg';

// Fix default marker icons for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDE5LjQwMzYgMTkuNDAzNiAyNSAxMi41IDI1QzUuNTk2NDQgMjUgMCAxOS40MDM2IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiMzQjgyRjYiLz4KPHBhdGggZD0iTTEyLjUgNDBMMTIuNSAyNSIgc3Ryb2tlPSIjMzk4MkY2IiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+',
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDE5LjQwMzYgMTkuNDAzNiAyNSAxMi41IDI1QzUuNTk2NDQgMjUgMCAxOS40MDM2IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiMzQjgyRjYiLz4KPHBhdGggZD0iTTEyLjUgNDBMMTIuNSAyNSIgc3Ryb2tlPSIjMzk4MkY2IiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+',
  shadowUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDEiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCA0MSA0MSIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGVsbGlwc2UgY3g9IjIwLjUiIGN5PSIyMC41IiByeD0iMjAuNSIgcnk9IjIwLjUiIGZpbGw9IiMwMDAwMDAiIGZpbGwtb3BhY2l0eT0iMC4yIi8+Cjwvc3ZnPg==',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Create custom marker icons with modern styling
const createCustomIcon = (color) => {
  return L.divIcon({
    html: `
      <div style="
        background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
        width: 24px; 
        height: 24px; 
        border-radius: 50%; 
        border: 3px solid white; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
    className: 'custom-marker'
  });
};

const userIcon = L.divIcon({
  html: `
    <div style="
      background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%);
      width: 20px; 
      height: 20px; 
      border-radius: 50%; 
      border: 3px solid white; 
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0,0,0,0.1);
      position: relative;
      animation: pulse 2s infinite;
    ">
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 6px;
        height: 6px;
        background-color: white;
        border-radius: 50%;
      "></div>
    </div>
    <style>
      @keyframes pulse {
        0% { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0,0,0,0.1); }
        50% { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6), 0 2px 4px rgba(0,0,0,0.2); }
        100% { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0,0,0,0.1); }
      }
    </style>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: 'user-marker'
});

const MapComponent = ({ userLocation, locations }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !userLocation || !locations) return;

    // Clean up previous map instance
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        console.warn('Error removing previous map instance:', e);
      }
      mapInstanceRef.current = null;
    }
    
    // Clear any existing map container data
    if (mapRef.current) {
      mapRef.current._leaflet_id = null;
      mapRef.current.innerHTML = '';
    }

    // Wait for DOM to be ready
    setTimeout(() => {
      try {
        // Initialize map
        mapInstanceRef.current = L.map(mapRef.current, {
          attributionControl: false
        }).setView([userLocation.lat, userLocation.lon], 13);

        // Add CartoDB Positron tiles for a clean, modern look
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(mapInstanceRef.current);

        // Add user marker
        L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('You are here')
          .openPopup();

        // Add location markers (with safety checks)
        const validLocations = locations.filter(location => 
          location && 
          typeof location.lat === 'number' && 
          typeof location.lon === 'number' &&
          !isNaN(location.lat) && 
          !isNaN(location.lon)
        );

        validLocations.forEach((location) => {
          const color = location.type === 'donate' ? '#10B981' : 
                       location.type === 'dropoff' ? '#F59E0B' : '#EF4444';
          
          L.marker([location.lat, location.lon], { icon: createCustomIcon(color) })
            .addTo(mapInstanceRef.current)
            .bindPopup(`
              <div style="
                text-align: center; 
                padding: 12px; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                border-radius: 8px;
                background: white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              ">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
                  ${location.name || 'Unknown Location'}
                </div>
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">
                  📍 ${location.distance_km || 'N/A'}km away
                </div>
                <div style="
                  display: inline-block;
                  background: ${color}20;
                  color: ${color};
                  padding: 4px 8px;
                  border-radius: 12px;
                  font-size: 12px;
                  font-weight: 500;
                  text-transform: capitalize;
                ">
                  ${location.type || 'dropoff'}
                </div>
              </div>
            `);
        });

        // Fit map to show all markers
        if (validLocations.length > 0) {
          try {
            const markers = [
              L.marker([userLocation.lat, userLocation.lon]),
              ...validLocations.map(loc => L.marker([loc.lat, loc.lon]))
            ];
            const group = new L.featureGroup(markers);
            mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
          } catch (fitError) {
            console.warn('Error fitting map bounds:', fitError);
            // Fallback to default zoom
            mapInstanceRef.current.setView([userLocation.lat, userLocation.lon], 13);
          }
        }

      } catch (mapError) {
        console.error('Error initializing map:', mapError);
      }
    }, 100); // Small delay to ensure DOM is ready

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (cleanupError) {
          console.warn('Error during map cleanup:', cleanupError);
          mapInstanceRef.current = null;
        }
      }
    };
  }, [userLocation, locations]);

  return (
    <div className="mt-4">
      <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        Location Overview
      </h5>
      <div 
        ref={mapRef} 
        className="h-80 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
        style={{ height: '320px' }}
      />
      
      {/* Legend */}
      <div className="flex justify-center space-x-4 mt-3 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
          <span className="text-gray-700 dark:text-gray-300">You</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
          <span className="text-gray-700 dark:text-gray-300">Donate</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-orange-500 rounded-full border border-white"></div>
          <span className="text-gray-700 dark:text-gray-300">Drop-off</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
          <span className="text-gray-700 dark:text-gray-300">Dispose</span>
        </div>
      </div>
    </div>
  );
};

const HomeTab = ({ onClassificationComplete, user }) => {
  // Convert material icon names to React Material Design icons
  const getIconFromMaterialName = (iconName, size = 24, color = 'currentColor') => {
    if (!iconName || typeof iconName !== 'string') {
      return <MdIcons.MdRecycling size={size} color={color} />;
    }
    
    // Extract the icon name from the format "material/MdIconName"
    const iconKey = iconName.replace('material/', '');
    
    // Get the icon component from react-icons/md
    const IconComponent = MdIcons[iconKey];
    
    if (IconComponent) {
      return <IconComponent size={size} color={color} />;
    }
    
    // Fallback icon if the specified icon doesn't exist
    return <MdIcons.MdRecycling size={size} color={color} />;
  };

  // Helper function to format category names (camelCase to proper case, underscores to spaces)
  const formatCategoryName = (categoryName) => {
    if (!categoryName || typeof categoryName !== 'string') {
      return 'Unknown';
    }
    
    return categoryName
      // Replace underscores with spaces
      .replace(/_/g, ' ')
      // Add space before capital letters (camelCase to words)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Capitalize first letter of each word
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper function to categorize disposal methods based on item size and type
  const categorizeDisposalMethods = (methods, result) => {
    if (!methods || !Array.isArray(methods)) return { standard: [], special: [] };
    
    const standard = [];
    const special = [];
    
    // Only show standard disposal for small items (under 1kg) or explicitly recyclable items
    const isSmallItem = result.weight < 1.0;
    const isExplicitlyRecyclable = result.recyclable === true;
    
    methods.forEach(method => {
      const lowerMethod = method.toLowerCase();
      const isStandardDisposal = (
        lowerMethod.includes('garbage') || 
        lowerMethod.includes('trash') || 
        lowerMethod.includes('recycling') || 
        lowerMethod.includes('recycle') || 
        lowerMethod.includes('compost') ||
        lowerMethod.includes('bin') ||
        lowerMethod.includes('regular waste') ||
        lowerMethod.includes('household waste')
      );
      
      // Only categorize as standard if it's a small item or explicitly recyclable
      if (isStandardDisposal && (isSmallItem || isExplicitlyRecyclable)) {
        standard.push(method);
      } else {
        special.push(method);
      }
    });
    
    return { standard, special };
  };

  // Helper function to get icon for disposal method
  const getDisposalIcon = (method) => {
    const lowerMethod = method.toLowerCase();
    if (lowerMethod.includes('recycling') || lowerMethod.includes('recycle')) {
      return <Recycle className="w-6 h-6 text-green-600" />;
    } else if (lowerMethod.includes('compost')) {
      return <LeafyGreen className="w-6 h-6 text-green-700" />;
    } else if (lowerMethod.includes('garbage') || lowerMethod.includes('trash')) {
      return <Trash2 className="w-6 h-6 text-gray-600" />;
    }
    return <Package className="w-6 h-6 text-blue-600" />;
  };


  const [selectedImage, setSelectedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isDisposalOpen, setIsDisposalOpen] = useState(false);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);

  const openDesktopCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setShowCameraModal(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      alert('Could not access camera: ' + err.message);
    }
  };

  const handleImageSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage({ file, preview: reader.result });
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !user) return;

    setIsAnalyzing(true);
    setIsDisposalOpen(false);
    try {
      // Get user location
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user?.id) throw new Error('User not authenticated');

      // 2. Add user to users table (if not exists)
      await upsertUser({
        id: user.id,
        email: user.email,
        username: user.email?.split('@')[0] || 'User'
      });
      
      const currentLocation = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lon: position.coords.longitude
            });
          },
          () => resolve({ lat: 40.7128, lon: -74.0060 }) // Default to NYC
        );
      });
      
      setUserLocation(currentLocation);

      // Use the new integration function that handles image upload to bucket
      const result = await handleWasteClassificationWithImage(
        selectedImage.file, 
        currentLocation, 
        user.id
      );

      if (result) {
        setResult(result);
        
        if (onClassificationComplete) {
          onClassificationComplete(result);
        }
      } else {
        throw new Error('Classification failed');
      }

    } catch (error) {
      console.error('Analysis failed:', error);
      setResult({
        error: 'Analysis failed. Please try again.',
        display_name: 'Error'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setResult(null);
    setIsDisposalOpen(false);
    setShowAllLocations(false);
    // Close camera modal if open
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setShowCameraModal(false);
    setCameraStream(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Upload Section - Only shown when no results */}
      {!result && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto rounded-2xl p-8 bg-white/5 dark:bg-gray-900/80 border border-white/10 dark:border-gray-700 backdrop-blur-xl shadow-xl"
        >
          <div className="text-center space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="space-y-2"
            >
              <h2 className="text-2xl font-bold text-white">
                Start Your Analysis
              </h2>
              <p className="text-gray-300">
                Take a photo or upload an image to identify and get disposal guidance
              </p>
            </motion.div>
            
            {!selectedImage ? (
              <div className="space-y-6">
                {/* Enhanced Camera Icon */}
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="flex justify-center"
                >
                  <div className="w-32 h-32 bg-gradient-to-br from-green-100/20 to-blue-100/20 dark:from-green-900/30 dark:to-blue-900/30 rounded-2xl flex items-center justify-center border-2 border-dashed border-green-300/50 dark:border-green-600/50 backdrop-blur-sm">
                    <Camera className="h-16 w-16 text-green-400" />
                  </div>
                </motion.div>

                {/* Enhanced Upload buttons */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (window.innerWidth > 768) {
                        // Desktop: open camera modal
                        openDesktopCamera();
                      } else {
                        // Mobile: open native camera/file picker
                        cameraInputRef.current?.click();
                      }
                    }}
                    className="flex items-center justify-center space-x-3 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 bg-green-500 text-white hover:bg-green-400"
                  >
                    <Camera className="h-6 w-6" />
                    <span>Take Photo</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center space-x-3 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 bg-white/10 text-white hover:bg-white/20 border border-white/20"
                  >
                    <Upload className="h-6 w-6" />
                    <span>Upload Image</span>
                  </motion.button>
                </motion.div>
                
                {/* Helpful tip */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center space-x-2 text-blue-300">
                    <p className="text-sm font-medium">
                      <strong>Tip:</strong> For best results, take clear photos with good lighting and focus on a single item
                    </p>
                  </div>
                </motion.div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                {/* Image Preview */}
                <div className="flex justify-center">
                  <div className="relative w-80 h-64">
                    <img
                      src={selectedImage.preview}
                      alt="Selected"
                      className="w-full h-full object-cover rounded-xl shadow-lg"
                    />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 z-10"
                      aria-label="Remove image"
                    >
                      <span className="text-2xl leading-none flex items-center justify-center w-full h-full">×</span>
                    </button>
                  </div>
                </div>

                {/* Analyze Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full flex items-center justify-center space-x-3 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 bg-green-500 text-white hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-6 w-6" />
                      <span>Analyze Image</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Results Section - Only shown when we have results */}
      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Updated header text for results */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="rounded-2xl p-8 bg-white/5 dark:bg-gray-900/80 border border-white/10 dark:border-gray-700 backdrop-blur-xl shadow-xl"
          >
            <div className="text-center space-y-3 mb-8">
              <h2 className="text-4xl font-bold text-white">
                Analysis Complete
              </h2>
              <p className="text-xl text-gray-300">
                Here's what we found and how to properly dispose of your item
              </p>
            </div>

            {result.error ? (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-300">{result.error}</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Image and Main Classification - Side by Side */}
                <div className="flex gap-8 items-stretch">
                  {/* Image Preview */}
                  <div className="flex-shrink-0">
                    <img
                      src={selectedImage.preview}
                      alt="Analyzed item"
                      className="w-64 h-full object-cover rounded-xl shadow-lg"
                    />
                  </div>

                  {/* Main Classification Header */}
                  <div 
                    className="flex-1 rounded-xl p-8 border-2 shadow-lg"
                    style={{ 
                      backgroundColor: `${result.color || '#10B981'}80`,
                      borderColor: result.color || '#10B981',
                      color: '#FFFFFF'
                    }}
                  >
                    <div className="space-y-6">
                      <div className="flex items-center space-x-6">
                        <div className="bg-white/20 rounded-full p-6 backdrop-blur-sm">
                          {getIconFromMaterialName(result.icon, 64, '#FFFFFF')}
                        </div>
                        <div>
                          <h3 className="text-4xl font-bold mb-3">
                            {result.display_name}
                          </h3>
                          <div className="flex items-center space-x-4 text-lg font-medium opacity-90">
                            <span className="bg-white/20 px-4 py-2 rounded-full">{result.weight}kg</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Environmental Impact */}
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 border border-white/30">
                        <div className="flex items-center justify-center space-x-3 mb-4">
                          <TreePine 
                            size={32} 
                            color='#FFFFFF' 
                          />
                          <span className="text-2xl font-bold">Environmental Impact</span>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                          <div className="text-center">
                            <p className="text-4xl font-bold">{result.co2_saved}kg</p>
                            <p className="text-lg font-medium opacity-90">CO₂ Saved</p>
                          </div>
                          <div className="text-center">
                            <p className="text-4xl font-bold">{result.co2_rate}x</p>
                            <p className="text-lg font-medium opacity-90">Impact Rate</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Item Properties */}
                <div className="grid grid-cols-3 gap-6">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className={`p-8 rounded-xl text-center border-2 shadow-md transition-all duration-200 backdrop-blur-sm ${
                      result.recyclable 
                        ? 'bg-green-500/20 border-green-500/30 text-green-300 hover:shadow-green-500/20 hover:bg-green-500/30' 
                        : 'bg-red-500/20 border-red-500/30 text-red-300 hover:shadow-red-500/20 hover:bg-red-500/30'
                    }`}
                  >
                    <div className="text-5xl mb-4">{result.recyclable ? '♻️' : '❌'}</div>
                    <div className="font-bold text-2xl mb-2">Recyclable</div>
                    <div className="text-lg font-medium opacity-90">{result.recyclable ? 'Yes' : 'No'}</div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className={`p-8 rounded-xl text-center border-2 shadow-md transition-all duration-200 backdrop-blur-sm ${
                      result.donation_worthy 
                        ? 'bg-blue-500/20 border-blue-500/30 text-blue-300 hover:shadow-blue-500/20 hover:bg-blue-500/30' 
                        : 'bg-gray-500/20 border-gray-500/30 text-gray-300 hover:shadow-gray-500/20 hover:bg-gray-500/30'
                    }`}
                  >
                    <div className="text-5xl mb-4">{result.donation_worthy ? '💝' : '🚫'}</div>
                    <div className="font-bold text-2xl mb-2">Donatable</div>
                    <div className="text-lg font-medium opacity-90">{result.donation_worthy ? 'Yes' : 'No'}</div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="p-8 rounded-xl text-center border-2 shadow-md transition-all duration-200 bg-purple-500/20 border-purple-500/30 text-purple-300 backdrop-blur-sm hover:shadow-purple-500/20 hover:bg-purple-500/30"
                  >
                    <div className="text-5xl mb-4">🌱</div>
                    <div className="font-bold text-2xl mb-2">CO₂ Saved</div>
                    <div className="text-lg font-medium opacity-90">{result.co2_saved?.toFixed(2) || '0.00'} kg</div>
                  </motion.div>
                </div>

                {/* Disposal Methods */}
                {result.disposal_methods && result.disposal_methods.length > 0 && (() => {
                  const { standard, special } = categorizeDisposalMethods(result.disposal_methods, result);
                  
                  return (
                    <div className="space-y-6">
                      {/* Standard Disposal Methods - Always Visible */}
                      {standard.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                          className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-8 backdrop-blur-sm"
                        >
                          <h4 className="font-bold text-white mb-6 flex items-center space-x-3">
                            <Recycle className="w-8 h-8 text-green-400" />
                            <span className="text-2xl">Easy Disposal</span>
                          </h4>
                          <div className="grid gap-4">
                            {standard.map((method, index) => (
                              <motion.div 
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                                whileHover={{ scale: 1.02, x: 5 }}
                                className="flex items-center space-x-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                              >
                                <div className="flex-shrink-0">
                                  {getDisposalIcon(method)}
                                </div>
                                <p className="text-gray-200 font-medium text-lg flex-1">
                                  {method}
                                </p>
                                <div className="flex-shrink-0 bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                                  Standard
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Special Disposal Methods - Collapsible */}
                      {special.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5, duration: 0.5 }}
                          className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-8 backdrop-blur-sm"
                        >
                          <button
                            onClick={() => setIsDisposalOpen(!isDisposalOpen)}
                            className="w-full flex items-center justify-between text-left group hover:bg-white/20 dark:hover:bg-gray-800/20 rounded-lg p-3 -m-3 transition-colors"
                          >
                            <h4 className="font-bold text-white flex items-center space-x-3">
                              <Info className="w-8 h-8 text-orange-400" />
                              <span className="text-2xl">Special Disposal Instructions</span>
                            </h4>
                            <ChevronDown 
                              className={`w-7 h-7 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${
                                isDisposalOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          
                          <div className={`transition-all duration-300 overflow-hidden ${
                            isDisposalOpen ? 'max-h-screen opacity-100 mt-6' : 'max-h-0 opacity-0'
                          }`}>
                            <div className="grid gap-4">
                              {special.map((method, index) => (
                                <motion.div 
                                  key={index}
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                                  whileHover={{ scale: 1.02, x: -5 }}
                                  className="flex items-center space-x-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                                >
                                  <div className="flex-shrink-0">
                                    {getDisposalIcon(method)}
                                  </div>
                                  <p className="text-gray-200 font-medium text-lg flex-1">
                                    {method}
                                  </p>
                                  <div className="flex-shrink-0 bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-sm font-medium">
                                    Special
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })()}

                {/* Nearby Locations */}
                {result.suggestions && result.suggestions.length > 0 ? (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-3">
                      <MapPin className="w-8 h-8 text-blue-500" />
                      <span className="text-2xl">Nearby Locations ({result.suggestions.length})</span>
                    </h4>
                    
                    {/* Interactive Map */}
                    {userLocation && (
                      <div className="mb-8 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-white/50 dark:border-gray-700/50">
                        <MapComponent 
                          userLocation={userLocation}
                          locations={result.suggestions}
                        />
                      </div>
                    )}
                    
                    <div className="grid gap-6">
                      {result.suggestions.slice(0, showAllLocations ? 10 : 5).map((location, index) => (
                        <div key={index} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-6 border border-white/50 dark:border-gray-700/50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <div className="flex-shrink-0">
                                  {location.type === 'donate' ? (
                                    <Heart className="w-6 h-6 text-red-500" />
                                  ) : location.type === 'dropoff' ? (
                                    <Package className="w-6 h-6 text-blue-500" />
                                  ) : (
                                    <Trash2 className="w-6 h-6 text-gray-500" />
                                  )}
                                </div>
                                <h5 className="font-bold text-gray-900 dark:text-white text-xl">
                                  {location.name}
                                </h5>
                                {location.rating && (
                                  <div className="flex items-center space-x-2 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-full">
                                    <Star className="w-5 h-5 text-yellow-500" />
                                    <span className="text-yellow-700 dark:text-yellow-300 text-lg font-medium">
                                      {location.rating}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-2 text-lg">
                                <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                                  <Navigation className="w-5 h-5" />
                                  <span className="font-medium">{location.distance_km}km away</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="capitalize px-3 py-1 rounded-full text-sm font-medium" 
                                        style={{
                                          backgroundColor: location.type === 'donate' ? '#DBEAFE' : location.type === 'dropoff' ? '#FEF3C7' : '#FEE2E2',
                                          color: location.type === 'donate' ? '#1E40AF' : location.type === 'dropoff' ? '#92400E' : '#DC2626'
                                        }}>
                                    {location.type}
                                  </span>
                                </div>
                                
                                {location.address && (
                                  <div className="flex items-start space-x-3 text-gray-500 dark:text-gray-500">
                                    <Mail className="w-5 h-5 mt-0.5" />
                                    <span className="line-clamp-2">{location.address}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lon}&zoom=15&layers=M`, '_blank')}
                              className="ml-6 bg-blue-500 hover:bg-blue-600 text-white text-lg font-medium px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 shadow-md"
                            >
                              <ExternalLink className="w-5 h-5" />
                              <span>Open Map</span>
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Show More/Less Button */}
                      {result.suggestions.length > 5 && (
                        <div className="flex justify-center mt-6 mb-8">
                          <button
                            onClick={() => setShowAllLocations(!showAllLocations)}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-md text-base min-w-max"
                          >
                            {showAllLocations ? 'Show Less' : `Show More (${result.suggestions.length - 5} more)`}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-8">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-3">
                      <MapPin className="w-8 h-8 text-gray-500" />
                      <span className="text-2xl">Location Services Unavailable</span>
                    </h4>
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-6">
                      <p className="text-gray-600 dark:text-gray-400 mb-3 text-lg">
                        Search online for locations near you:
                      </p>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded px-4 py-3 font-mono text-lg text-gray-800 dark:text-gray-200">
                        "{result.location_query}"
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-center pt-8">
              <button
                onClick={resetAnalysis}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 border-2 border-green-600 hover:border-green-700 min-w-max"
              >
                <span>Analyze Another Item</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleImageSelect(e.target.files[0])}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleImageSelect(e.target.files[0])}
        className="hidden"
      />

      {/* UN Sustainability Goals Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="rounded-2xl p-10 bg-white/5 dark:bg-gray-900/80 border border-white/10 dark:border-gray-700 backdrop-blur-xl shadow-xl"
      >
        <div className="text-center space-y-8">
          <h2 className="text-2xl font-bold text-white">
            UN Sustainability Goals We're Supporting
          </h2>
          
          <div className="grid grid-cols-4 gap-6">
            {/* Goal 12: Responsible Consumption and Production */}
            <motion.div 
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flip-card group"
            >
              <div className="flip-card-inner">
                <div className="flip-card-front sdg-card-official" style={{ backgroundColor: '#BF8B2E' }}>
                  <img src={sdg12} alt="SDG Goal 12" className="w-full h-full object-cover rounded-lg" />
                </div>
                <div className="flip-card-back" style={{ backgroundColor: '#BF8B2E' }}>
                  <div className="flex flex-col items-center justify-center h-full text-white p-4 text-center">
                    <div className="text-sm font-medium leading-tight">
                      Bin Buddy promotes sustainable consumption by helping users properly dispose of items, extending product lifecycles through donation, and reducing waste sent to landfills.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Goal 13: Climate Action */}
            <motion.div 
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flip-card group"
            >
              <div className="flip-card-inner">
                <div className="flip-card-front sdg-card-official" style={{ backgroundColor: '#3F7E44' }}>
                  <img src={sdg13} alt="SDG Goal 13" className="w-full h-full object-cover rounded-lg" />
                </div>
                <div className="flip-card-back" style={{ backgroundColor: '#3F7E44' }}>
                  <div className="flex flex-col items-center justify-center h-full text-white p-4 text-center">
                    <div className="text-sm font-medium leading-tight">
                      Every item properly recycled or donated reduces CO₂ emissions. Bin Buddy tracks your environmental impact, showing real CO₂ savings from your waste disposal choices.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Goal 8: Decent Work and Economic Growth */}
            <motion.div 
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flip-card group"
            >
              <div className="flip-card-inner">
                <div className="flip-card-front sdg-card-official" style={{ backgroundColor: '#A21942' }}>
                  <img src={sdg8} alt="SDG Goal 8" className="w-full h-full object-cover rounded-lg" />
                </div>
                <div className="flip-card-back" style={{ backgroundColor: '#A21942' }}>
                  <div className="flex flex-col items-center justify-center h-full text-white p-4 text-center">
                    <div className="text-sm font-medium leading-tight">
                      By directing items to donation centers and recycling facilities, we support jobs in the circular economy and sustainable waste management industries.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Goal 3: Good Health and Well-being */}
            <motion.div 
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="flip-card group"
            >
              <div className="flip-card-inner">
                <div className="flip-card-front sdg-card-official" style={{ backgroundColor: '#4C9F38' }}>
                  <img src={sdg3} alt="SDG Goal 3" className="w-full h-full object-cover rounded-lg" />
                </div>
                <div className="flip-card-back" style={{ backgroundColor: '#4C9F38' }}>
                  <div className="flex flex-col items-center justify-center h-full text-white p-4 text-center">
                    <div className="text-sm font-medium leading-tight">
                      Proper disposal prevents harmful chemicals from contaminating environments and reduces health risks from poor working conditions in waste management.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="text-sm text-gray-300 italic">
            Hover over each card to learn why we're targeting these specific goals
          </div>
        </div>
      </motion.div>

      {/* Camera Modal (for desktop) */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
          <div className="flex flex-col items-center max-w-full p-8">
            <div className="bg-white rounded-xl p-2 shadow-2xl mb-6">
              <video ref={videoRef} className="rounded-lg" autoPlay playsInline style={{ width: 400, maxWidth: '80vw' }} />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  // Capture photo from video stream
                  if (!videoRef.current) return;
                  const video = videoRef.current;
                  const canvas = document.createElement('canvas');
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  canvas.toBlob(blob => {
                    if (blob) {
                      const file = new File([blob], 'captured.jpg', { type: 'image/jpeg' });
                      handleImageSelect(file);
                    }
                    // Stop camera and close modal
                    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
                    setShowCameraModal(false);
                    setCameraStream(null);
                  }, 'image/jpeg');
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-lg transition-colors"
              >
                Capture
              </button>
              <button
                onClick={() => {
                  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
                  setShowCameraModal(false);
                  setCameraStream(null);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeTab;