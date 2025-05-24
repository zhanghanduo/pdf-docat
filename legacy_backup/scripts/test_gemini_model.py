#!/usr/bin/env python3
"""
Test script to verify Gemini 2.5 Flash model configuration.
"""

import requests
import json
import os

# PDF service configuration
PDF_SERVICE_URL = os.environ.get('PDF_SERVICE_URL', 'http://localhost:5000')

def test_health_check():
    """Test if the PDF service is running."""
    try:
        response = requests.get(f"{PDF_SERVICE_URL}/health/check", timeout=5)
        print(f"Health check: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_get_models():
    """Test getting available models."""
    try:
        response = requests.get(f"{PDF_SERVICE_URL}/config/models", timeout=5)
        models = response.json()
        print(f"Available models: {json.dumps(models, indent=2)}")
        return models
    except Exception as e:
        print(f"Failed to get models: {e}")
        return None

def test_set_gemini_model(model="gemini-2.5-flash-preview-05-20"):
    """Test setting the Gemini model."""
    try:
        response = requests.post(
            f"{PDF_SERVICE_URL}/config/model",
            json={
                "service": "gemini",
                "model": model
            },
            timeout=5
        )
        result = response.json()
        print(f"Set model result: {result}")
        return response.status_code == 200
    except Exception as e:
        print(f"Failed to set model: {e}")
        return False

def test_set_api_key(api_key):
    """Test setting the Gemini API key."""
    try:
        response = requests.post(
            f"{PDF_SERVICE_URL}/config/api-key",
            json={
                "service": "gemini",
                "api_key": api_key
            },
            timeout=5
        )
        result = response.json()
        print(f"Set API key result: {result}")
        return response.status_code == 200
    except Exception as e:
        print(f"Failed to set API key: {e}")
        return False

def main():
    """Main test function."""
    print("Testing Gemini 2.5 Flash Model Configuration")
    print("=" * 50)
    
    # Test health check
    print("\n1. Testing health check...")
    if not test_health_check():
        print("Service is not running. Please start the PDF service first.")
        return
    
    # Test getting models
    print("\n2. Testing get models...")
    models = test_get_models()
    if not models:
        print("Failed to get models.")
        return
    
    # Check if Gemini 2.5 Flash is available
    gemini_models = models.get('gemini', [])
    target_model = "gemini-2.5-flash-preview-05-20"
    
    if target_model in gemini_models:
        print(f"✓ {target_model} is available")
    else:
        print(f"✗ {target_model} is not in the available models list")
        print(f"Available Gemini models: {gemini_models}")
    
    # Test setting model
    print(f"\n3. Testing set model to {target_model}...")
    if test_set_gemini_model(target_model):
        print(f"✓ Successfully set model to {target_model}")
    else:
        print(f"✗ Failed to set model to {target_model}")
    
    # Test setting API key (if provided)
    api_key = os.environ.get('GEMINI_API_KEY')
    if api_key:
        print("\n4. Testing set API key...")
        if test_set_api_key(api_key):
            print("✓ Successfully set API key")
        else:
            print("✗ Failed to set API key")
    else:
        print("\n4. Skipping API key test (GEMINI_API_KEY not set)")
    
    print("\n" + "=" * 50)
    print("Test completed!")

if __name__ == '__main__':
    main() 