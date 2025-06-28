"""
BinBuddy Backend Configuration
==============================

Configuration management for the BinBuddy Flask backend.
Handles environment variables and application settings.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class"""
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv('SUPABASE_URL', 'your-supabase-project-url')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', 'your-supabase-anon-key')
    
    # Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # File Upload Configuration
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # API Configuration
    NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search'
    NOMINATIM_RATE_LIMIT = 1  # seconds between requests
    
    # Carbon footprint rates (kg CO₂ saved per kg of material)
    CO2_RATES = {
        'recyclable': 1.02,  # Plastic average
        'organic': 0.0,
        'e-waste': 15.0,  # Average of 10-20
        'donation': 25.0,
        'textile_recycle': 5.6,
        'hazardous': 0.0,
        'general_trash': 0.0
    }

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    FLASK_ENV = 'development'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    FLASK_ENV = 'production'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 