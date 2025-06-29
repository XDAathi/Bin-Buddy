import './App.css';
import supabase from './supabase-client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import BinBuddyLogo from './components/BinBuddyLogo';

// Import components
import Navigation from './components/Navigation';
import HomeTab from './components/HomeTab';
import HistoryTab from './components/HistoryTab';
import FootPrintTab from './components/FootPrintTab';

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(true); // true = dark mode by default
  const [showAuth, setShowAuth] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // If user is authenticated, ensure they go to homepage
      if (session) {
        setShowLanding(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // If user is authenticated, ensure they go to homepage
      if (session) {
        setShowLanding(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
    setShowLanding(false);
  };

  const handleClassificationComplete = (result) => {
    // TODO: This can be used to refresh history or update stats
    console.log('Classification completed:', result);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab onClassificationComplete={handleClassificationComplete} user={session?.user} />;
      case 'history':
        return <HistoryTab user={session?.user} />;
      case 'footprint':
        return <FootPrintTab user={session?.user} />;
      default:
        return <HomeTab onClassificationComplete={handleClassificationComplete} user={session?.user} />;
    }
  };

  if (!session) {
    if (!showAuth) {
      return (
        <LandingPage
          onSignIn={() => setShowAuth(true)}
          onGetStarted={() => setShowAuth(true)}
        />
      );
    }
    return (
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
          <button
            onClick={() => setShowAuth(false)}
            className="px-6 py-2 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition"
          >
            Back to Home
          </button>
        </div>

        {/* Auth Section */}
        <div className="flex-1 flex items-center justify-center z-10 relative px-4">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="flex justify-center items-center space-x-3 mb-8">
                <div className="w-12 h-12 flex items-center justify-center">
                  <BinBuddyLogo />
                </div>
                <h1 className="text-3xl font-bold text-white">
                  Welcome Back
                </h1>
              </div>
              <h2 className="text-xl text-gray-300 mb-8">
                AI-powered waste classification for a sustainable future
              </h2>
            </div>

            <div className="rounded-2xl p-8 bg-white/5 dark:bg-gray-900/80 border border-white/10 dark:border-gray-700 backdrop-blur-xl shadow-xl">
              <div className="space-y-6">
                <button
                  onClick={signInWithGoogle}
                  className="w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-transparent text-gray-300">Or</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Auth
                    supabaseClient={supabase}
                    appearance={{
                      theme: ThemeSupa,
                      variables: {
                        default: {
                          colors: {
                            brand: '#22c55e',
                            brandAccent: '#16a34a',
                            brandButtonText: '#ffffff',
                            defaultButtonBackground: 'rgba(255, 255, 255, 0.1)',
                            defaultButtonBackgroundHover: 'rgba(255, 255, 255, 0.2)',
                            defaultButtonBorder: 'rgba(255, 255, 255, 0.1)',
                            defaultButtonText: '#ffffff',
                            dividerBackground: 'rgba(255, 255, 255, 0.2)',
                            inputBackground: 'rgba(255, 255, 255, 0.05)',
                            inputBorder: 'rgba(255, 255, 255, 0.1)',
                            inputBorderHover: 'rgba(255, 255, 255, 0.2)',
                            inputBorderFocus: '#22c55e',
                            inputText: '#ffffff',
                            inputLabelText: '#d1d5db',
                            inputPlaceholder: '#9ca3af',
                            messageText: '#d1d5db',
                            messageTextDanger: '#fca5a5',
                            anchorTextColor: '#22c55e',
                            anchorTextHoverColor: '#16a34a',
                          },
                        },
                      },
                    }}
                    providers={[]}
                    redirectTo={window.location.origin}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full flex justify-center items-center pb-8 z-10 relative">
          <span className="text-gray-400 text-sm">Made by Aathi & Jacob</span>
        </footer>
      </div>
    );
  }

  // If user is logged in and wants to see landing page
  if (showLanding) {
    return (
      <LandingPage
        onSignIn={() => setShowLanding(false)}
        onGetStarted={() => setShowLanding(false)}
      />
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          user={session.user}
          signOut={signOut}
          onLogoClick={() => setShowLanding(true)}
        />

        <main>
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
