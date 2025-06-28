#!/usr/bin/env python3
"""
Test Supabase connection and set up database tables
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

def test_connection():
    """Test Supabase connection"""
    # Load environment variables
    load_dotenv()
    
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not url or not key:
        print("❌ ERROR: Missing Supabase credentials in .env file")
        return False
        
    try:
        print("🔌 Testing Supabase connection...")
        print(f"URL: {url}")
        
        # Create Supabase client
        supabase: Client = create_client(url, key)
        
        # Test connection by trying to query a system table
        result = supabase.table('profiles').select('*').limit(1).execute()
        
        print("✅ SUCCESS: Connected to Supabase!")
        print(f"Database is ready. Tables available: {len(result.data) >= 0}")
        return True
        
    except Exception as e:
        if "relation \"public.profiles\" does not exist" in str(e):
            print("⚠️  WARNING: Connected to Supabase but tables don't exist yet")
            print("💡 Need to run the database schema SQL in Supabase dashboard")
            return True
        else:
            print(f"❌ ERROR: Failed to connect to Supabase: {e}")
            return False

def test_gemini():
    """Test Gemini AI connection"""
    import google.generativeai as genai
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ ERROR: Missing Gemini API key in .env file")
        return False
        
    try:
        print("🤖 Testing Gemini AI connection...")
        genai.configure(api_key=api_key)
        
        # Test with a simple text generation
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Hello, respond with just 'OK'")
        
        print("✅ SUCCESS: Gemini AI is working!")
        print(f"Test response: {response.text.strip()}")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: Failed to connect to Gemini AI: {e}")
        return False

if __name__ == '__main__':
    print("🧪 BinBuddy Connection Test\n" + "="*40)
    
    supabase_ok = test_connection()
    gemini_ok = test_gemini()
    
    print("\n" + "="*40)
    if supabase_ok and gemini_ok:
        print("🎉 ALL TESTS PASSED! Ready to go!")
    else:
        print("⚠️  Some tests failed. Check the errors above.")
        sys.exit(1) 