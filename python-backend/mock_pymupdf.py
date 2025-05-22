"""
Mock module for pymupdf that redirects to fitz
"""
import sys
from types import ModuleType

try:
    # Try to import fitz (the actual PyMuPDF module)
    import fitz
    
    # Create a mock module for pymupdf
    class MockPyMuPDF(ModuleType):
        def __getattr__(self, name):
            # Redirect all attribute access to fitz
            return getattr(fitz, name)
    
    # Create the mock module
    mock_pymupdf = MockPyMuPDF('pymupdf')
    
    # Add it to sys.modules
    sys.modules['pymupdf'] = mock_pymupdf
    
    print("Mock pymupdf module created and redirected to fitz")
except ImportError:
    print("Warning: Could not import fitz, mock pymupdf module not created")
