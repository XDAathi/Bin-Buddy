import React from 'react';
import sdg3 from '../assets/sdg_icons_color_goal_3.svg';
import sdg8 from '../assets/sdg_icons_color_goal_8.svg';
import sdg12 from '../assets/sdg_icons_color_goal_12.svg';
import sdg13 from '../assets/sdg_icons_color_goal_13.svg';
import { Camera, Bot, MapPin, Leaf } from 'lucide-react';

// Reuse the logo SVG from HomeTab for consistency
const BinBuddyLogo = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="#22c55e" />
    <path d="M20 10a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 110 16 8 8 0 010-16zm-2.5 7.5a1.5 1.5 0 113 0v3a1.5 1.5 0 11-3 0v-3zm5 0a1.5 1.5 0 113 0v3a1.5 1.5 0 11-3 0v-3z" fill="#fff" />
  </svg>
);

const howItWorks = [
  {
    icon: <Camera className="h-12 w-12 text-green-400" />,
    title: 'Snap a Photo',
    desc: 'Take a picture of your waste item using your phone or computer.'
  },
  {
    icon: <Bot className="h-12 w-12 text-blue-400" />,
    title: 'AI Classifies',
    desc: 'Our AI instantly identifies the item and suggests the best disposal method.'
  },
  {
    icon: <MapPin className="h-12 w-12 text-purple-400" />,
    title: 'Find Locations',
    desc: 'Get nearby recycling, donation, or drop-off locations tailored to your item.'
  },
  {
    icon: <Leaf className="h-12 w-12 text-emerald-400" />,
    title: 'Track Your Impact',
    desc: 'See your CO₂ savings and progress toward a more sustainable lifestyle.'
  },
];

const LandingPage = ({ onSignIn, onGetStarted }) => (
  <div className="min-h-screen flex flex-col relative overflow-x-hidden overflow-y-auto bg-gradient-to-b from-gray-900 via-gray-950 to-black">
    {/* Animated background: stars and circles */}
    <div className="fixed inset-0 z-0 pointer-events-none">
      <svg width="100%" height="100%" className="absolute inset-0 opacity-30">
        <defs>
          <radialGradient id="star" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: 60 }).map((_, i) => (
          <circle
            key={i}
            cx={Math.random() * 100 + "%"}
            cy={Math.random() * 100 + "%"}
            r={Math.random() * 1.2 + 0.3}
            fill="url(#star)"
            opacity={Math.random() * 0.7 + 0.2}
          />
        ))}
      </svg>
      <div className="absolute w-96 h-96 bg-green-400 bg-opacity-20 rounded-full blur-3xl animate-pulse-slow left-[-10%] top-[-10%]" style={{animationDelay: '0s'}} />
      <div className="absolute w-80 h-80 bg-blue-400 bg-opacity-20 rounded-full blur-3xl animate-pulse-slow right-[-8%] top-[20%]" style={{animationDelay: '2s'}} />
      <div className="absolute w-72 h-72 bg-purple-400 bg-opacity-20 rounded-full blur-3xl animate-pulse-slow left-[30%] bottom-[-12%]" style={{animationDelay: '4s'}} />
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.7; }
          50% { transform: scale(1.1) translateY(10px); opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
      `}</style>
    </div>

    {/* Top bar */}
    <div className="flex justify-between items-center px-8 py-6 z-10 relative">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 flex items-center justify-center">
          <BinBuddyLogo />
        </div>
        <span className="text-2xl font-bold text-white tracking-tight">Bin Buddy</span>
      </div>
      <div className="flex items-center space-x-4">
        <button
          onClick={onSignIn}
          className="px-6 py-2 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition"
        >
          Sign In
        </button>
        <button
          onClick={onGetStarted}
          className="px-6 py-2 rounded-full bg-green-500 text-white font-semibold shadow-lg hover:bg-green-400 transition"
        >
          Get Started
        </button>
      </div>
    </div>

    {/* Hero Section */}
    <section className="flex flex-col justify-center items-center text-center z-10 relative px-4 min-h-[70vh]">
      <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight drop-shadow-lg">
        Smarter Waste, Greener Planet
      </h1>
      <p className="text-lg md:text-2xl text-gray-300 max-w-2xl mx-auto mb-10">
        Bin Buddy helps you manage your waste smarter. Snap a photo, get instant AI-powered recycling guidance, and track your environmental impact. Make sustainability simple, intuitive, and even a little fun.
      </p>
      <button
        onClick={onGetStarted}
        className="px-10 py-4 rounded-full bg-green-500 text-white font-bold text-xl shadow-xl hover:bg-green-400 transition mb-8"
      >
        Get Started
      </button>
    </section>

    {/* How It Works Section (modern card grid) */}
    <section className="relative z-10 py-20 px-4 bg-gradient-to-b from-transparent to-gray-950">
      <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">How It Works</h2>
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {howItWorks.map((step, i) => (
          <div
            key={i}
            className="rounded-2xl flex flex-col items-center justify-center p-8 bg-white/5 dark:bg-gray-900/80 border border-white/10 dark:border-gray-700 backdrop-blur-xl shadow-xl transition-transform duration-300 hover:scale-105 hover:shadow-2xl"
            style={{ minHeight: 220 }}
          >
            <span className="mb-4">{step.icon}</span>
            <h3 className="text-xl font-bold text-green-300 mb-2 text-center">{step.title}</h3>
            <p className="text-gray-200 text-base text-center">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Subtle divider for smooth transition */}
    <div className="w-full h-4 bg-gradient-to-b from-gray-950 to-gray-950/90" />

    {/* UN Goals FLIP CARD Section (identical to HomeTab) */}
    <section className="relative z-10 py-20 px-4 bg-gradient-to-b from-transparent to-gray-950">
      <div className="max-w-6xl mx-auto rounded-2xl p-10 bg-white/5 dark:bg-gray-900/80 border border-white/10 dark:border-gray-700 backdrop-blur-xl shadow-xl">
        <div className="text-center space-y-8">
          <h2 className="text-2xl font-bold text-white">
            UN Sustainability Goals We're Supporting
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
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
          <div className="text-sm text-gray-300 italic">
            Hover over each card to learn why we're targeting these specific goals
          </div>
        </div>
      </div>
      {/* Flip card styles */}
      <style>{`
        .flip-card {
          perspective: 1200px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 220px;
          transition: transform 0.6s cubic-bezier(.4,2,.6,1);
          transform-style: preserve-3d;
        }
        .group:hover .flip-card-inner, .flip-card:focus .flip-card-inner {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .flip-card-front {
          z-index: 2;
        }
        .flip-card-back {
          transform: rotateY(180deg);
          z-index: 3;
        }
      `}</style>
    </section>

    {/* Footer */}
    <footer className="w-full flex justify-center items-center pb-8 z-10 relative">
      <span className="text-gray-400 text-sm">Made by Aathi & Jacob</span>
    </footer>
  </div>
);

export default LandingPage; 