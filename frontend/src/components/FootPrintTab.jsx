import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Target, TreePine, Recycle } from 'lucide-react';
import { getUserStats } from '../utils/supabase-integration';

const FootPrintTab = ({ user }) => {
  const [stats, setStats] = useState({
    totalCO2Saved: 0,
    totalItems: 0,
    totalWeight: 0,
    monthlyProgress: [],
    categoryBreakdown: {},
    achievements: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userStats = await getUserStats(user.id);
        
        if (userStats) {
          // For now, we'll use some mock data for monthly progress and achievements
          // TODO: Implement these queries in the database
          const mockMonthlyProgress = [
            { month: 'Jan', co2: 2.3, items: 8 },
            { month: 'Feb', co2: 4.1, items: 12 },
            { month: 'Mar', co2: 3.8, items: 11 },
            { month: 'Apr', co2: 5.5, items: 16 }
          ];

          const achievements = [
            { 
              id: 1, 
              title: 'First Steps', 
              description: 'Analyzed your first item', 
              unlocked: userStats.total_classifications > 0, 
              icon: '🎯' 
            },
            { 
              id: 2, 
              title: 'Eco Warrior', 
              description: 'Saved 10kg of CO₂', 
              unlocked: userStats.total_co2_saved >= 10, 
              icon: '🌱' 
            },
            { 
              id: 3, 
              title: 'Recycling Champion', 
              description: 'Analyzed 25 items', 
              unlocked: userStats.total_classifications >= 25, 
              icon: '♻️' 
            },
            { 
              id: 4, 
              title: 'Century Club', 
              description: 'Analyze 100 items', 
              unlocked: userStats.total_classifications >= 100, 
              icon: '💯' 
            }
          ];

          setStats({
            totalCO2Saved: userStats.total_co2_saved || 0,
            totalItems: userStats.total_classifications || 0,
            totalWeight: userStats.total_weight_processed || 0,
            monthlyProgress: mockMonthlyProgress,
            categoryBreakdown: {
              recyclable: { count: 0, co2: 0, percentage: 0 },
              electronic: { count: 0, co2: 0, percentage: 0 },
              organic: { count: 0, co2: 0, percentage: 0 },
              hazardous: { count: 0, co2: 0, percentage: 0 }
            },
            achievements
          });
        }
      } catch (err) {
        console.error('Error fetching user stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, timeRange]);

  const getImpactMessage = (co2Saved) => {
    if (co2Saved < 5) return "Great start! Keep going!";
    if (co2Saved < 15) return "You're making a real difference!";
    if (co2Saved < 30) return "Impressive environmental impact!";
    return "You're an eco champion!";
  };

  const categoryColors = {
    recyclable: '#2196F3',
    electronic: '#FF9800',
    organic: '#4CAF50',
    hazardous: '#F44336'
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-eco"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Your FootPrint
        </h1>
        <div className="w-24 h-1 bg-green-eco mx-auto rounded-full"></div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {getImpactMessage(stats.totalCO2Saved)}
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="card">
        <div className="flex justify-center">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {['week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-green-eco text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-green-eco'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <TreePine className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-eco">{stats.totalCO2Saved}kg</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">CO₂ Saved</p>
            </div>
          </div>
        </div>

        <div className="card text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
              <Recycle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.totalItems}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Items Analyzed</p>
            </div>
          </div>
        </div>

        <div className="card text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.totalWeight}kg</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Weight</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Progress Chart */}
      <div className="card">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Monthly Progress</span>
          </h3>
          
                     <div className="space-y-3">
             {stats.monthlyProgress.map((month) => (
              <div key={month.month} className="flex items-center space-x-4">
                <div className="w-12 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {month.month}
                </div>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative">
                  <div
                    className="bg-green-eco h-4 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(month.co2 / Math.max(...stats.monthlyProgress.map(m => m.co2))) * 100}%` }}
                  ></div>
                </div>
                <div className="w-16 text-sm font-medium text-gray-900 dark:text-white">
                  {month.co2}kg
                </div>
                <div className="w-16 text-sm text-gray-600 dark:text-gray-400">
                  {month.items} items
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Category Breakdown</span>
          </h3>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(stats.categoryBreakdown).map(([category, data]) => (
              <div key={category} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {category}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {data.percentage}%
                  </span>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${data.percentage}%`,
                        backgroundColor: categoryColors[category]
                      }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>{data.count} items</span>
                  <span>{data.co2}kg CO₂</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Achievements</span>
          </h3>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {stats.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  achievement.unlocked
                    ? 'border-green-eco bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {achievement.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.unlocked && (
                    <div className="w-6 h-6 bg-green-eco rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FootPrintTab; 