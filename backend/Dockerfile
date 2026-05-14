FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libexpat1 \
    libgomp1 \
    libsqlite3-0 \
    libcurl4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DATA_DIR=/app/data
ENV GDAL_CACHEMAX=256
ENV CPL_VSIL_CURL_CACHE_SIZE=67108864
ENV GDAL_HTTP_MAX_RETRY=3
ENV GDAL_HTTP_RETRY_DELAY=2
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
