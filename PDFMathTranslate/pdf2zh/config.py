"""
Configuration management for PDFMathTranslate
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ConfigManager:
    """Configuration manager for PDFMathTranslate"""
    _config = {
        "GEMINI_API_KEY": os.environ.get("GEMINI_API_KEY", ""),
        "OPENROUTER_API_KEY": os.environ.get("OPENROUTER_API_KEY", ""),
    }

    @classmethod
    def get(cls, key, default=None):
        """Get configuration value"""
        return cls._config.get(key, default)

    @classmethod
    def set(cls, key, value):
        """Set configuration value"""
        cls._config[key] = value
        return True

    @classmethod
    def get_all(cls):
        """Get all configuration values"""
        return cls._config.copy()