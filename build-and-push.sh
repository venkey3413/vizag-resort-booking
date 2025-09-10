#!/bin/bash

# Docker Hub username (replace with your username)
DOCKER_USERNAME="your-dockerhub-username"
IMAGE_TAG="latest"

# Build and push main server
docker build -f Dockerfile.main -t $DOCKER_USERNAME/vizag-resort-main:$IMAGE_TAG .
docker push $DOCKER_USERNAME/vizag-resort-main:$IMAGE_TAG

# Build and push admin server
docker build -f Dockerfile.admin -t $DOCKER_USERNAME/vizag-resort-admin:$IMAGE_TAG .
docker push $DOCKER_USERNAME/vizag-resort-admin:$IMAGE_TAG

# Build and push booking server
docker build -f Dockerfile.booking -t $DOCKER_USERNAME/vizag-resort-booking:$IMAGE_TAG .
docker push $DOCKER_USERNAME/vizag-resort-booking:$IMAGE_TAG

# Build and push gateway server
docker build -f Dockerfile.gateway -t $DOCKER_USERNAME/vizag-resort-gateway:$IMAGE_TAG .
docker push $DOCKER_USERNAME/vizag-resort-gateway:$IMAGE_TAG

echo "All images pushed to Docker Hub!"