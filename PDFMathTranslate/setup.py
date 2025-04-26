from setuptools import setup, find_packages

setup(
    name="pdf2zh",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "python-dotenv",
        "requests",
    ],
    description="PDF processing and translation utilities",
)