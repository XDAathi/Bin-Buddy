import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  TrendingUp, Award, Target, TreePine, Recycle, BarChart3, PieChart as PieChartIcon, Zap, Globe, Calendar, 
  Users, Star, Trophy, Medal, Flame, Sparkles, Check, MapPin, Activity, Leaf, Trash2, Factory,
  LineChart as LineChartIcon, BarChart as BarChartIcon, Wind, Droplets, Sun, Image as ImageIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Cell, 
  LineChart, Line, Area, AreaChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart 
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import { 
  getUserStats, 
  getRealWeeklyProgress, 
  getRealCategoryBreakdown, 
  getRealDailyActivity, 
  getRealMonthlyTrends,
  getUserFirstClassificationDate
} from '../utils/supabase-integration';
import { getUserClassificationsWithImages } from '../supabase_integration_with_images';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';

const FootPrintTab = ({ user }) => {
  const [stats, setStats] = useState({
    totalCO2Saved: 0,
    totalItems: 0,
    totalWeight: 0,
    progressData: [],
    categoryBreakdown: [],
    achievements: [],
    monthlyTrends: [],
    dailyActivity: [],
    daysSinceFirstItem: 0,
    radarData: []
  });

  const [statsLoading, setStatsLoading] = useState(true);
  const [classificationsLoading, setClassificationsLoading] = useState(true);
  const [allClassifications, setAllClassifications] = useState([]);
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [previousAchievements, setPreviousAchievements] = useState([]);

  // Derived count of items that are not yet completed (matches History "Pending Disposal")
  const completedItemsCount = allClassifications.filter(item => item.completed).length;

  // More detailed and engaging achievement system
  const achievementSystem = [
    { id: 1, title: 'First Step', description: 'Analyzed your first item', condition: (stats) => stats.totalItems > 0, icon: Target },
    { id: 2, title: 'Eco Starter', description: 'Saved 5kg of CO₂', condition: (stats) => stats.totalCO2Saved >= 5, icon: TreePine },
    { id: 3, title: 'Recycling Novice', description: 'Analyzed 10 items', condition: (stats) => stats.totalItems >= 10, icon: Recycle },
    { id: 4, title: 'Heavy Lifter', description: 'Processed 25kg of waste', condition: (stats) => stats.totalWeight >= 25, icon: Factory},
    { id: 5, title: 'Green Influencer', description: 'Active for 7 days', condition: (stats) => stats.daysSinceFirstItem >= 7, icon: Calendar },
    { id: 6, title: 'Category Explorer', description: 'Classified 3 different categories', condition: (stats) => stats.categoryBreakdown.length >= 3, icon: Zap },
    { id: 7, title: 'Eco Warrior', description: 'Saved 25kg of CO₂', condition: (stats) => stats.totalCO2Saved >= 25, icon: Leaf },
    { id: 8, title: 'Recycling Champion', description: 'Analyzed 50 items', condition: (stats) => stats.totalItems >= 50, icon: Medal },
    { id: 9, title: 'Planet Protector', description: 'Saved 100kg of CO₂', condition: (stats) => stats.totalCO2Saved >= 100, icon: Globe },
    { id: 10, title: 'Sustainability Star', description: 'Analyzed 200 items', condition: (stats) => stats.totalItems >= 200, icon: Star },
    { id: 11, title: 'Waste Wizard', description: 'Processed 100kg of waste', condition: (stats) => stats.totalWeight >= 100, icon: Sparkles },
    { id: 12, title: 'Environmental Hero', description: 'Saved 500kg of CO₂', condition: (stats) => stats.totalCO2Saved >= 500, icon: Trophy },
    { id: 13, title: 'Master Analyst', description: 'Analyzed 500 items', condition: (stats) => stats.totalItems >= 500, icon: BarChart3 },
    { id: 14, title: 'Category Connoisseur', description: 'Classified 5 different categories', condition: (stats) => stats.categoryBreakdown.length >= 5, icon: Wind },
    { id: 15, title: 'Eco Veteran', description: 'Active for 30 days', condition: (stats) => stats.daysSinceFirstItem >= 30, icon: Flame },
  ];

  // Restore correct allLocations and mapCenter logic
  const allLocations = useMemo(() =>
    allClassifications
      .flatMap(item => item.location_suggestions || [])
      .filter(loc => loc && typeof loc.lat === 'number' && typeof loc.lon === 'number')
  , [allClassifications]);

  const mapCenter = useMemo(() =>
    allLocations.length > 0
      ? { lat: allLocations[0].lat, lon: allLocations[0].lon }
      : { lat: 40.7128, lon: -74.0060 }
  , [allLocations]);

  useEffect(() => {
    const fetchRealStats = async () => {
      if (!user || !user.id) {
        setStatsLoading(false);
        return;
      }
      try {
        const [
          userStats,
          weeklyProgress,
          categoryData,
          dailyActivity,
          monthlyTrends,
          firstClassificationDate
        ] = await Promise.all([
          getUserStats(user.id),
          getRealWeeklyProgress(user.id),
          getRealCategoryBreakdown(user.id),
          getRealDailyActivity(user.id),
          getRealMonthlyTrends(user.id),
          getUserFirstClassificationDate(user.id)
        ]);
        if (userStats) {
          const daysSinceFirstItem = firstClassificationDate 
            ? Math.floor((Date.now() - new Date(firstClassificationDate).getTime()) / (24 * 60 * 60 * 1000))
            : 0;
            
          const categoryBreakdown = Object.entries(categoryData).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            ...value
          }));

          const extendedStats = {
            totalCO2Saved: userStats.total_co2_saved || 0,
            totalItems: userStats.total_classifications || 0,
            totalWeight: userStats.total_weight_processed || 0,
            daysSinceFirstItem,
            categoryBreakdown
          };

          const achievements = achievementSystem.map(ach => ({
            ...ach,
            unlocked: ach.condition(extendedStats)
          }));

          const newlyUnlocked = achievements.filter(a => a.unlocked && !previousAchievements.find(p => p.id === a.id && p.unlocked));
          if (newlyUnlocked.length > 0 && previousAchievements.length > 0) {
            newlyUnlocked.forEach(showAchievementNotification);
          }
          setPreviousAchievements(achievements);
          
          const radarData = [
            { subject: 'Recycling', A: (categoryData.recyclable?.percentage || 0), fullMark: 100 },
            { subject: 'Electronics', A: (categoryData.electronic?.percentage || 0), fullMark: 100 },
            { subject: 'Organics', A: (categoryData.organic?.percentage || 0), fullMark: 100 },
            { subject: 'Hazardous', A: (categoryData.hazardous?.percentage || 0), fullMark: 100 },
            { subject: 'Other', A: (categoryData.other?.percentage || 0), fullMark: 100 },
          ];

          setStats({
            totalCO2Saved: userStats.total_co2_saved || 0,
            totalItems: userStats.total_classifications || 0,
            totalWeight: userStats.total_weight_processed || 0,
            progressData: weeklyProgress,
            categoryBreakdown,
            achievements,
            monthlyTrends,
            dailyActivity,
            daysSinceFirstItem,
            radarData
          });

          generateAISummary(extendedStats, categoryBreakdown, achievements.filter(a => a.unlocked));
        }
      } catch (err) {
        console.error('Error fetching real user stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    const fetchAllClassifications = async () => {
      if (!user || !user.id) {
        setClassificationsLoading(false);
        return;
      }
      const { data } = await getUserClassificationsWithImages(user.id, 100);
      setAllClassifications(data || []);
      setClassificationsLoading(false);
    };

    fetchRealStats();
    fetchAllClassifications();
  }, [user]);

  const generateAISummary = async (stats, categoryBreakdown, achievements) => {
    setLoadingSummary(true);
    try {
      const response = await fetch('/api/generate_summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          total_co2_saved: stats.totalCO2Saved,
          total_items: stats.totalItems,
          total_weight: stats.totalWeight,
          category_breakdown: categoryBreakdown,
          recent_achievements: achievements.map(a => a.title),
          detailed: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.summary);
      } else {
        throw new Error('Failed to generate summary');
      }
    } catch {
      setAiSummary(
        `You have processed ${stats.totalItems} items, saving ${stats.totalCO2Saved}kg of CO₂ across ${stats.totalWeight}kg of waste.\n` +
        (Object.keys(categoryBreakdown).length > 0 ?
          `Top category: ${Object.entries(categoryBreakdown).sort((a,b) => b[1].count - a[1].count)[0][0]} (${Object.entries(categoryBreakdown).sort((a,b) => b[1].count - a[1].count)[0][1].percentage}%).\n` :
          '') +
        `Keep up the environmental stewardship! For even greater impact, focus on high-CO₂-saving materials and increase your recycling frequency.`
      );
    } finally {
      setLoadingSummary(false);
    }
  };

  const showAchievementNotification = (achievement) => {
    toast.custom(() => (
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border-l-4 border-green-500 max-w-md"
      >
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/20">
            <achievement.icon className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white">Achievement Unlocked!</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">{achievement.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{achievement.description}</p>
          </div>
        </div>
      </motion.div>
    ), {
      duration: 4000,
      position: 'top-right'
    });
  };

  const getImpactMessage = (co2Saved) => {
    if (co2Saved < 5) return "Every action counts. Keep up the great start! 🌱";
    if (co2Saved < 25) return "You're making a tangible difference. Well done! 🌍";
    if (co2Saved < 100) return "Your impact is growing significantly. Amazing work! ⚡";
    return "You are a true environmental champion! 🏆";
  };

  const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28'];

  const impactComparison = [
    { name: 'Energy Saved', value: stats.totalCO2Saved * 1.5, unit: 'kWh', icon: Zap },
    { name: 'Water Saved', value: stats.totalCO2Saved * 3, unit: 'liters', icon: Droplets },
    { name: 'Trees Planted Equiv.', value: stats.totalCO2Saved / 22, unit: '', icon: TreePine },
  ];
  
  if (statsLoading || classificationsLoading) {
    return (
      <div className="max-w-full mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-b-2 border-green-eco"
          />
        </div>
      </div>
    );
  }

  const EmptyState = ({ icon, message }) => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
      {React.createElement(icon, { className: "w-16 h-16 mb-4 opacity-50" })}
      <p className="text-center">{message}</p>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="label font-bold text-gray-900 dark:text-white">{`${label}`}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>
              {`${p.name}: ${p.value.toFixed(1)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const RADIAN = Math.PI / 180;
  const CustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CardLayout = ({ title, icon, children }) => (
    <div className="card">
      <div className="flex items-center space-x-3 mb-4">
        {icon && (
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            {React.createElement(icon, { className: "w-5 h-5 text-gray-500" })}
          </div>
        )}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );

  // MapComponent (adapted from HomeTab)
  const createCustomIcon = (color) => {
    return L.divIcon({
      html: `
        <div style="background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1); position: relative;">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
      className: 'custom-marker'
    });
  };
  const userIcon = L.divIcon({
    html: `<div style="background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0,0,0,0.1); position: relative; animation: pulse 2s infinite;"><div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div></div><style>@keyframes pulse {0% { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0,0,0,0.1); }50% { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6), 0 2px 4px rgba(0,0,0,0.2); }100% { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0,0,0,0.1); }}</style>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    className: 'user-marker'
  });
  const MapComponent = ({ userLocation, locations }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    useEffect(() => {
      if (!mapRef.current || !userLocation || !locations) return;
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch { /* ignore cleanup errors */ }
        mapInstanceRef.current = null;
      }
      if (mapRef.current) { mapRef.current._leaflet_id = null; mapRef.current.innerHTML = ''; }
      setTimeout(() => {
        try {
          mapInstanceRef.current = L.map(mapRef.current, { attributionControl: false }).setView([userLocation.lat, userLocation.lon], 12);
          L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap contributors © CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(mapInstanceRef.current);
          L.marker([userLocation.lat, userLocation.lon], { icon: userIcon }).addTo(mapInstanceRef.current).bindPopup('You are here');
          const validLocations = locations.filter(l => l && typeof l.lat === 'number' && typeof l.lon === 'number');
          validLocations.forEach(loc => {
            const markerIcon = createCustomIcon(loc.type === 'donate' ? '#34D399' : loc.type === 'dropoff' ? '#F59E0B' : loc.type === 'dispose' ? '#EF4444' : '#2563EB');
            L.marker([loc.lat, loc.lon], { icon: markerIcon }).addTo(mapInstanceRef.current);
          });
          // Ensure interactions are enabled (in case Leaflet default settings were altered elsewhere)
          mapInstanceRef.current.dragging.enable();
          mapInstanceRef.current.touchZoom.enable();
          mapInstanceRef.current.doubleClickZoom.enable();
          mapInstanceRef.current.scrollWheelZoom.enable();
          mapInstanceRef.current.boxZoom.enable();
          mapInstanceRef.current.keyboard.enable();
        } catch (e) { console.error('Map init error', e); }
      }, 50);
      // Cleanup
      return () => {
        if (mapInstanceRef.current) {
          try { mapInstanceRef.current.remove(); } catch { /* ignore */ }
          mapInstanceRef.current = null;
        }
      };
    }, [userLocation, locations]);
    return <div ref={mapRef} className="w-full h-full"/>;
  };
  const MemoizedMapComponent = React.memo(MapComponent);

  // Gallery component for monthly images
  const Gallery = ({ items }) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {items.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 dark:text-gray-500">No images uploaded this month.</div>
        ) : (
          items.map((item, idx) => {
            const id = item.waste_image_id || item.image_url || idx;
            return (
              <div key={id} className="relative w-full h-32">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.display_name || 'Uploaded item'}
                    className="w-full h-32 object-cover rounded-lg shadow-md"
                  />
                ) : (
                  <div className="fallback-icon absolute inset-0 w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.waste_image_id || 'No image'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  // Helper: get 8 most recent images
  const galleryItems = [...allClassifications]
    .filter(item => item.image_url)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  return (
    <>
      <Toaster />
      <div className="flex max-w-full mx-auto px-4 py-6 gap-6">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Your Environmental Impact
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-blue-500 mx-auto rounded-full"></div>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              {getImpactMessage(stats.totalCO2Saved)}
            </p>
          </div>

          {/* Big Stats Grid - More dynamic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Stats */}
            <div className="card p-6 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-800/50">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <Recycle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-4xl font-bold text-green-500">{stats.totalCO2Saved.toFixed(1)}kg</p>
              <p className="text-lg text-gray-600 dark:text-gray-400">CO₂ Saved</p>
            </div>

            <div className="card p-6 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-800/50">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-4xl font-bold text-blue-500">{completedItemsCount}</p>
              <p className="text-lg text-gray-600 dark:text-gray-400">Completed Items</p>
            </div>

            <div className="card p-6 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-800/50">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-4xl font-bold text-orange-500">{stats.totalWeight.toFixed(1)}kg</p>
              <p className="text-lg text-gray-600 dark:text-gray-400">Total Weight</p>
            </div>
          </div>

          {/* Gemini AI Summary Card */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Detailed Environmental Impact Summary</h3>
            </div>
            {loadingSummary ? (
              <div className="flex items-center space-x-2">
                <div className="animate-pulse w-4 h-4 bg-purple-500 rounded-full"></div>
                <p className="text-gray-600 dark:text-gray-400">Generating personalized insights...</p>
              </div>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line text-lg"
              >
                {aiSummary}
              </motion.p>
            )}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Progress Chart */}
            <CardLayout title="Drop-off Locations Map" icon={BarChartIcon}>
              <div style={{ height: 320, borderRadius: 16, overflow: 'hidden' }}>
                {user && allLocations.length > 0 ? (
                  <MemoizedMapComponent
                    userLocation={mapCenter}
                    locations={allLocations}
                  />
                ) : <EmptyState icon={MapPin} message="No drop-off locations yet. Add items to see your map!" />}
              </div>
            </CardLayout>

            {/* Category Pie Chart */}
            <CardLayout title="Category Distribution" icon={PieChartIcon}>
              {stats.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.categoryBreakdown}
                      dataKey="percentage"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {stats.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={PieChartIcon} message="No category data yet. Start analyzing!" />}
            </CardLayout>
          </div>

          {/* New row for more charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CardLayout title="Gallery" icon={Calendar}>
              {user && galleryItems.length > 0 ? (
                <Gallery items={galleryItems} />
              ) : <EmptyState icon={Calendar} message="No images uploaded this month." />}
            </CardLayout>
            
            <CardLayout title="Category Analysis" icon={Zap}>
              {stats.radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
                    <PolarGrid stroke="#555" strokeOpacity={0.3}/>
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#fff', fontWeight: 'bold', fontSize: 18 }} />
                    <PolarRadiusAxis tick={{ fill: '#aaa', fontSize: 12 }} stroke="#555" />
                    <Radar name="Category" dataKey="A" stroke="#4F46E5" strokeWidth={2} fill="#6366F1" fillOpacity={0.4} label />
                  </RadarChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={Zap} message="Category analysis requires more data." />}
            </CardLayout>

            <CardLayout title="Daily Activity" icon={Activity}>
              {stats.dailyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="day" tick={{ fill: '#666' }} />
                    <YAxis tick={{ fill: '#666' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="items" stroke="#8884d8" fill="#8884d8" fillOpacity={0.5} dot={{ r: 5, fill: '#fff', stroke: '#8884d8', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={Activity} message="Your daily activity will be shown here." />}
            </CardLayout>
          </div>

          {/* Impact Equivalents */}
          <CardLayout title="Impact Equivalents" icon={Globe}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              {impactComparison.map(item => (
                <div key={item.name} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <item.icon className="w-10 h-10 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {item.value.toFixed(1)} {item.unit}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">{item.name}</p>
                </div>
              ))}
            </div>
          </CardLayout>
        </div>

        {/* Floating Achievements Sidebar */}
        <div className="w-80 sticky top-6 h-[calc(100vh-3rem)]">
          <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border-2 border-yellow-200 dark:border-yellow-800 h-full flex flex-col">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Award className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Achievements</h3>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto">
              {stats.achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-lg border transition-all hover:scale-105 cursor-pointer ${
                    achievement.unlocked
                      ? 'border-green-eco bg-green-50 dark:bg-green-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        achievement.unlocked ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      <achievement.icon className={`w-5 h-5 ${achievement.unlocked ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {achievement.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {achievement.description}
                      </p>
                    </div>
                    {achievement.unlocked && (
                      <div 
                        className="w-6 h-6 bg-green-eco rounded-full flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Achievement Progress */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                <span className="text-sm font-bold text-green-eco">
                  {stats.achievements.filter(a => a.unlocked).length}/{stats.achievements.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-eco to-blue-500 h-2 rounded-full"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FootPrintTab; 