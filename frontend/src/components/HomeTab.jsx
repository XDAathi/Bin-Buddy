import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, Heart, TreePine } from 'lucide-react';

const HomeTab = ({ onClassificationComplete, user }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
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
      const userLocation = await new Promise((resolve) => {
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
          lat: userLocation.lat,
          lon: userLocation.lon
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
    <div className="max-w-4xl mx-auto p-6 space-y-8">
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
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            UN Sustainability Goals
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Heart className="h-6 w-6 text-red-500" />
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  Why you should Donate...
                </span>
              </div>
              
              <div className="text-left space-y-3 text-gray-700 dark:text-gray-300">
                <p>• Reduces waste sent to landfills</p>
                <p>• Helps families and communities in need</p>
                <p>• Supports circular economy principles</p>
                <p>• Minimizes environmental impact</p>
                <p>• Creates positive social impact</p>
              </div>
            </div>
            
            <div className="flex justify-center">
              <div className="w-32 h-32 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <TreePine className="h-16 w-16 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeTab; 