import './App.css';
import supabase from './supabase-client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import React, { useState, useEffect } from 'react';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signUp = async () =>{
    await supabase.auth.signInWithOAuth({provider: "google",});
  }


  if (!session) {
    return (<>
    <button onClick={signUp}>Sign in with Google</button>
    </>);
  } else {
    return (
      <div>
        Logged in!
        <button onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  
}

export default App;
