# Resort Booking Web Application

A simple web application for managing resort bookings with image upload and price/description editing capabilities.

## Features

- Add new resorts with images, prices, and descriptions
- Edit existing resort information
- Upload and display resort images
- Delete resorts
- Responsive design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and go to `http://localhost:3000`

## API Endpoints

- `GET /api/resorts` - Get all resorts
- `POST /api/resorts` - Add new resort (with image upload)
- `PUT /api/resorts/:id` - Update resort (with image upload)
- `DELETE /api/resorts/:id` - Delete resort

## File Structure

- `server.js` - Express server with API endpoints
- `public/` - Static files (HTML, CSS, JS)
- `uploads/` - Uploaded images storage