# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies (PortAudio for sounddevice)
RUN apt-get update && apt-get install -y \
    portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Expose port 8000 for the app to be accessible
EXPOSE 8000

# Run the app using Gunicorn with 4 threads (default port 8000)
CMD ["gunicorn", "--threads", "4", "-b", "0.0.0.0:8000", "app:app"]
