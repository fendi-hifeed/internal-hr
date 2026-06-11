FROM python:3.12-slim

WORKDIR /app

# Install system deps for asyncpg, pillow, AND curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Expose port
EXPOSE 8001

# Run with uvicorn (bind to 0.0.0.0 for Docker networking)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
