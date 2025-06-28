import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2, CheckCircle, Heart, TreePine } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import UN SDG Images
import sdg3 from '../assets/sdg_icons_color_goal_3.svg';
import sdg8 from '../assets/sdg_icons_color_goal_8.svg';
import sdg12 from '../assets/sdg_icons_color_goal_12.svg';
import sdg13 from '../assets/sdg_icons_color_goal_13.svg';

// Fix default marker icons for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDE5LjQwMzYgMTkuNDAzNiAyNSAxMi41IDI1QzUuNTk2NDQgMjUgMCAxOS40MDM2IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiMzQjgyRjYiLz4KPHBhdGggZD0iTTEyLjUgNDBMMTIuNSAyNSIgc3Ryb2tlPSIjMzk4MkY2IiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+',
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEMxOS40MDM2IDAgMjUgNS41OTY0NCAyNSAxMi41QzI1IDE5LjQwMzYgMTkuNDAzNiAyNSAxMi41IDI1QzUuNTk2NDQgMjUgMCAxOS40MDM2IDAgMTIuNUMwIDUuNTk2NDQgNS41OTY0NCAwIDEyLjUgMFoiIGZpbGw9IiMzQjgyRjYiLz4KPHBhdGggZD0iTTEyLjUgNDBMMTIuNSAyNSIgc3Ryb2tlPSIjMzk4MkY2IiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+',
  shadowUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDEiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCA0MSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGVsbGlwc2UgY3g9IjIwLjUiIGN5PSIyMC41IiByeD0iMjAuNSIgcnk9IjIwLjUiIGZpbGw9IiMwMDAwMDAiIGZpbGwtb3BhY2l0eT0iMC4yIi8+Cjwvc3ZnPg==',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Create custom marker icons
const createCustomIcon = (color) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
    className: 'custom-marker'
  });
};

const userIcon = L.divIcon({
  html: `<div style="background-color: #3B82F6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: 'user-marker'
});

const MapComponent = ({ userLocation, locations }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    // Initialize map
    mapInstanceRef.current = L.map(mapRef.current, {
      attributionControl: false
    }).setView([userLocation.lat, userLocation.lon], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    // Add user marker
    L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup('You are here')
      .openPopup();

    // Add location markers
    locations.forEach((location) => {
      const color = location.type === 'donate' ? '#10B981' : 
                   location.type === 'dropoff' ? '#F59E0B' : '#EF4444';
      
      L.marker([location.lat, location.lon], { icon: createCustomIcon(color) })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="text-align: center; padding: 4px;">
            <strong>${location.name}</strong><br>
            <small>${location.distance_km}km away</small><br>
            <small style="color: ${color};">${location.type}</small>
          </div>
        `);
    });

    // Fit map to show all markers
    if (locations.length > 0) {
      const group = new L.featureGroup([
        L.marker([userLocation.lat, userLocation.lon]),
        ...locations.map(loc => L.marker([loc.lat, loc.lon]))
      ]);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
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
        className="h-48 rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ height: '200px' }}
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
  const [selectedImage, setSelectedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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
    try {
      // Get user location
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

      // Convert image to base64 for API
      const imageDataUrl = selectedImage.preview;

      // Call Flask API directly
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl,
          lat: currentLocation.lat,
          lon: currentLocation.lon
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const apiResponse = await response.json();
      setResult(apiResponse);
      
      if (onClassificationComplete) {
        onClassificationComplete(apiResponse);
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
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* How to Use Section */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          How to Use?
        </h1>
        <div className="w-24 h-1 bg-green-eco mx-auto rounded-full"></div>
      </div>

      {/* Upload Section */}
      <div className="card max-w-2xl mx-auto">
        <div className="text-center space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload or Capture items
          </h2>
          
          {!selectedImage ? (
            <div className="space-y-4">
              {/* Camera Icon */}
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Camera className="h-12 w-12 text-gray-400" />
                </div>
              </div>

              {/* Upload buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="btn-primary flex items-center justify-center space-x-2"
                >
                  <Camera className="h-5 w-5" />
                  <span>Take Photo</span>
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary flex items-center justify-center space-x-2"
                >
                  <Upload className="h-5 w-5" />
                  <span>Upload Image</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image preview */}
              <div className="flex justify-center">
                <img
                  src={selectedImage.preview}
                  alt="Selected item"
                  className="max-w-full max-h-64 rounded-lg shadow-md"
                />
              </div>

              {/* Analysis section */}
              {!result ? (
                <div className="space-y-4">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="btn-primary w-full sm:w-auto mx-auto flex items-center justify-center space-x-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <span>Analyze</span>
                    )}
                  </button>
                  
                  <button
                    onClick={resetAnalysis}
                    className="btn-secondary w-full sm:w-auto mx-auto"
                  >
                    Choose Different Image
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {result.error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-red-700 dark:text-red-300">{result.error}</p>
                    </div>
                  ) : (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                          Analysis Complete!
                        </h3>
                      </div>
                      
                      <div className="text-center space-y-2">
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {result.display_name}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300">
                          Category: {result.main_category}
                        </p>
                        <p className="text-green-600 dark:text-green-400 font-semibold">
                          CO₂ Savings: {result.co2_saved}kg
                        </p>
                      </div>

                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Disposal Instructions:
                        </h4>
                        <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                          {result.disposal_methods?.map((method, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="text-green-600 mt-1">•</span>
                              <span>{method}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Nearby Locations */}
                      {result.suggestions && result.suggestions.length > 0 ? (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                            <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <span>Nearby Disposal Locations</span>
                          </h4>
                          <div className="space-y-3">
                            {result.suggestions.slice(0, 3).map((location, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                                    {location.name}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {location.distance_km}km away • {location.type}
                                  </p>
                                </div>
                                <button
                                  onClick={() => window.open(`https://maps.google.com/search/${location.name}/@${location.lat},${location.lon},15z`, '_blank')}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 transition-colors"
                                >
                                  View Map
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          {/* Interactive Map */}
                          {userLocation && (
                            <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
                              <MapComponent 
                                userLocation={userLocation}
                                locations={result.suggestions.slice(0, 5)}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
                            <svg className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <span>Location Services Unavailable</span>
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Please search online for "{result.location_query}" in your area.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <button
                    onClick={resetAnalysis}
                    className="btn-primary w-full sm:w-auto mx-auto"
                  >
                    Analyze Another Item
                  </button>
                </div>
              )}
            </div>
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
        </div>
      </div>

      {/* UN Sustainability Goals Section */}
      <div className="card">
        <div className="text-center space-y-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            UN Sustainability Goals We're Supporting
          </h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Goal 12: Responsible Consumption and Production */}
            <div className="flip-card group">
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
            </div>

            {/* Goal 13: Climate Action */}
            <div className="flip-card group">
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
            </div>

            {/* Goal 8: Decent Work and Economic Growth */}
            <div className="flip-card group">
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
            </div>

            {/* Goal 3: Good Health and Well-being */}
            <div className="flip-card group">
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
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 italic">
            Hover over each card to learn why we're targeting these specific goals
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeTab; 