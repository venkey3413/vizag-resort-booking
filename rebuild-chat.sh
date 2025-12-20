#!/bin/bash

# Stop and remove chat-system container
docker-compose down chat-system

# Remove the chat-system image to force rebuild
docker rmi vizag-resort-booking_chat-system 2>/dev/null || true

# Rebuild and start chat-system
docker-compose up --build -d chat-system

# Show logs
docker-compose logs chat-system