#!/bin/bash

echo "▶ Starting CBSE Geo Map App (Local – Cloud Run style)"

set -e

export PORT=8080

echo "▶ Building Docker image..."
docker build -t cbse-geo-map .

echo "▶ Running container on http://localhost:8080"
docker run --rm -p 8080:8080 cbse-geo-map
