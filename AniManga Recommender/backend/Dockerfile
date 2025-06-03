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

# Verify that JWT can be imported (catch issues early)
RUN python -c "import jwt; print('✅ JWT imported successfully:', jwt.__version__)"
RUN python -c "import flask; print('✅ Flask imported successfully:', flask.__version__)"

# Copy the application code
COPY . .

# Set Flask environment variables (Flask best practices)
ENV FLASK_APP=app.py
ENV FLASK_ENV=development
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5000
ENV PYTHONPATH=/app

EXPOSE 5000

# Use proper Flask CLI command (as you requested!)
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000", "--debug"]