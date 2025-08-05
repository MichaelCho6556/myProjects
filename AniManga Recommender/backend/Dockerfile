FROM python:3.10-slim

# Install system dependencies for cryptography and psycopg2
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better layer caching
COPY requirements.txt .

# Upgrade pip to latest version
RUN pip install --upgrade pip

# Install cryptography first to avoid conflicts
RUN pip install --no-cache-dir cryptography==41.0.7

# Install PyJWT specifically (this often fixes the import issue)
RUN pip install --no-cache-dir PyJWT==2.10.1

# Install all other requirements
RUN pip install --no-cache-dir -r requirements.txt

# Install production server
RUN pip install --no-cache-dir gunicorn==22.0.0

# Verify that JWT can be imported (catch issues early)
RUN python -c "import jwt; print('✅ JWT imported successfully:', jwt.__version__)"
RUN python -c "import flask; print('✅ Flask imported successfully:', flask.__version__)"

# Copy the application code
COPY . .

# Set production environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port (Render uses PORT env var)
EXPOSE 10000

# Production command with gunicorn
# The PORT env var is set by Render, default to 10000 for local testing
CMD exec gunicorn --bind 0.0.0.0:${PORT:-10000} --workers 2 --timeout 120 --log-level info --access-logfile - --error-logfile - app:app