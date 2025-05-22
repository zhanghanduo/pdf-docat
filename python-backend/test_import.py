try:
    import fitz
    print('PyMuPDF imported successfully as fitz')
except ImportError as e:
    print(f'Error importing PyMuPDF: {e}')

try:
    import pymupdf
    print('PyMuPDF imported successfully as pymupdf')
except ImportError as e:
    print(f'Error importing PyMuPDF: {e}')
