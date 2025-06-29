import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Award, Target, TreePine, Recycle, BarChart3, PieChart as PieChartIcon, Zap, Globe, Calendar, 
  Users, Star, Trophy, Medal, Flame, Sparkles, Check, MapPin, Activity, Leaf, Trash2, Factory,
  LineChart as LineChartIcon, BarChart as BarChartIcon, Wind, Droplets, Sun
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Cell, 
  LineChart, Line, Area, AreaChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart 
} from 'recharts';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { 
  getUserStats, 
  getRealWeeklyProgress, 
  getRealCategoryBreakdown, 
  getRealDailyActivity, 
  getRealMonthlyTrends,
  getUserFirstClassificationDate
} from '../utils/supabase-integration';

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

  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [previousAchievements, setPreviousAchievements] = useState([]);

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
  ];

  useEffect(() => {
    const fetchRealStats = async () => {
      if (!user || !user.id) {
        setLoading(false);
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
        setLoading(false);
      }
    };

    fetchRealStats();
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
          recent_achievements: achievements.map(a => a.title)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiSummary(data.summary);
      } else {
        throw new Error('Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      setAiSummary("Based on analysis of your waste management activities, you have processed " + 
        stats.totalItems + " items, saving " + stats.totalCO2Saved + "kg of CO₂. " +
        (Object.keys(categoryBreakdown).length > 0 ? 
          "Your top category is " + Object.entries(categoryBreakdown).sort((a,b) => b[1].count - a[1].count)[0][0] + 
          " (" + Object.entries(categoryBreakdown).sort((a,b) => b[1].count - a[1].count)[0][1].percentage + "%)." : 
          "Continue analyzing items to build your impact profile.") +
        " Keep up the environmental stewardship!"
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
  
  if (loading) {
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

  const EmptyState = ({ icon: Icon, message }) => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
      <Icon className="w-16 h-16 mb-4 opacity-50" />
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
  const CustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, ...props }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CardLayout = ({ title, icon: Icon, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card"
    >
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  );

  return (
    <>
      <Toaster />
      <div className="flex max-w-full mx-auto px-4 py-6 gap-6">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Your Environmental Impact
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-blue-500 mx-auto rounded-full"></div>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              {getImpactMessage(stats.totalCO2Saved)}
            </p>
          </motion.div>

          {/* Big Stats Grid - More dynamic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Stats */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="card p-6 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <Recycle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-4xl font-bold text-green-500">{stats.totalCO2Saved.toFixed(1)}kg</p>
              <p className="text-lg text-gray-600 dark:text-gray-400">CO₂ Saved</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="card p-6 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-4xl font-bold text-blue-500">{stats.totalItems}</p>
              <p className="text-lg text-gray-600 dark:text-gray-400">Items Analyzed</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="card p-6 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-4xl font-bold text-orange-500">{stats.totalWeight.toFixed(1)}kg</p>
              <p className="text-lg text-gray-600 dark:text-gray-400">Total Weight</p>
            </motion.div>
          </div>

          {/* AI Summary Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Environmental Impact Analysis</h3>
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
                className="text-gray-700 dark:text-gray-300 leading-relaxed"
              >
                {aiSummary}
              </motion.p>
            )}
          </motion.div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Progress Chart */}
            <CardLayout title="Weekly Progress" icon={BarChartIcon}>
              {stats.progressData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.progressData}>
                    <defs>
                      <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="week" tick={{ fill: '#666' }} />
                    <YAxis tick={{ fill: '#666' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="items" stroke="#82ca9d" fillOpacity={1} fill="url(#colorProgress)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={BarChartIcon} message="Analyze items to see your weekly progress." />}
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
                      labelLine={false}
                      label={<CustomizedLabel />}
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
            <CardLayout title="Monthly Trends" icon={Calendar}>
              {stats.monthlyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                   <ComposedChart data={stats.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="month" tick={{ fill: '#666' }} />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tick={{ fill: '#666' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tick={{ fill: '#666' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar yAxisId="left" dataKey="items" fill="#8884d8" name="Items" />
                    <Line yAxisId="right" type="monotone" dataKey="co2Saved" stroke="#82ca9d" name="CO₂ Saved" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={Calendar} message="Monthly trends will appear here." />}
            </CardLayout>
            
            <CardLayout title="Category Analysis" icon={Zap}>
              {stats.radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis />
                    <Radar name="Mike" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={Zap} message="Category analysis requires more data." />}
            </CardLayout>

            <CardLayout title="Daily Activity" icon={Activity}>
              {stats.dailyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="day" tick={{ fill: '#666' }} />
                    <YAxis tick={{ fill: '#666' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="items" stroke="#8884d8" />
                  </LineChart>
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
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="w-80 sticky top-20 h-[calc(100vh-6rem)]"
        >
          <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border-2 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Award className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Achievements</h3>
            </div>
            
            <div className="space-y-3 max-h-[calc(100vh-20rem)] overflow-y-auto">
              {stats.achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.05 }}
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
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 1.2 + index * 0.05 }}
                        className="w-6 h-6 bg-green-eco rounded-full flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
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
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.achievements.filter(a => a.unlocked).length / stats.achievements.length) * 100}%` }}
                  transition={{ delay: 1.5, duration: 1 }}
                  className="bg-gradient-to-r from-green-eco to-blue-500 h-2 rounded-full"
                ></motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default FootPrintTab; 