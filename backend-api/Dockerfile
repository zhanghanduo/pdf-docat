FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Clone PDFMathTranslate repository (v2-rc branch)
RUN git clone https://github.com/awwaawwa/PDFMathTranslate.git

# Install PDFMathTranslate
WORKDIR /app/PDFMathTranslate
RUN git checkout v2-rc || echo "Warning: v2-rc branch not found, using default branch"
RUN pip install -e .

# Go back to app directory
WORKDIR /app

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads outputs logs

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=8000

# Run the application
CMD ["python", "main.py"] 