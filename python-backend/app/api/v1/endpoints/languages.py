from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

def _get_supported_languages_data():
    """
    Helper function to return supported languages data
    """
    # Create a dictionary with language codes and their human-readable names
    languages = {
        "english": "English",
        "simplified-chinese": "Chinese (Simplified)",
        "traditional-chinese": "Chinese (Traditional)",
        "german": "German",
        "japanese": "Japanese",
        "spanish": "Spanish",
        "french": "French"
    }
    
    return {
        "languages": languages
    }

@router.get("/")
def get_supported_languages():
    """
    Get list of supported languages (with trailing slash)
    """
    return _get_supported_languages_data()

@router.get("")
def get_supported_languages_no_slash():
    """
    Get list of supported languages (without trailing slash)
    """
    return _get_supported_languages_data() 