# Resort Booking Web Application

A comprehensive resort booking website with admin panel for managing resorts and bookings.

## Features

- **User Features:**
  - Browse available resorts with images and details
  - Search and filter resorts by location
  - Book resorts with guest information
  - Responsive design for all devices

- **Admin Features:**
  - Add new resorts with image upload
  - Edit existing resort information
  - Delete resorts
  - View all bookings
  - Manage resort amenities and pricing

## Setup Instructions

1. Install Node.js from https://nodejs.org/

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and go to `http://localhost:3000`

## API Endpoints

- `GET /api/resorts` - Get all resorts
- `POST /api/resorts` - Add new resort (with image upload)
- `PUT /api/resorts/:id` - Update resort (with image upload)
- `DELETE /api/resorts/:id` - Delete resort
- `POST /api/bookings` - Create new booking
- `GET /api/bookings` - Get all bookings

## File Structure

```
resort-booking-app/
├── server.js              # Express server with API endpoints
├── package.json           # Dependencies and scripts
├── public/                # Static frontend files
│   ├── index.html        # Main HTML file
│   ├── style.css         # CSS styling
│   └── script.js         # JavaScript functionality
├── uploads/              # Uploaded images storage
└── README.md            # This file
```

## Technologies Used

- **Backend:** Node.js, Express.js, Multer (file uploads)
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Storage:** File system (images), In-memory (data)
- **Styling:** CSS Grid, Flexbox, Font Awesome icons

## Usage

### For Customers:
1. Browse resorts on the homepage
2. Use search and location filters
3. Click "Book Now" on any resort
4. Fill in booking details and submit

### For Administrators:
1. Navigate to the Admin section
2. Use "Add Resort" tab to add new resorts
3. Use "Manage Resorts" tab to edit/delete existing resorts
4. Use "Bookings" tab to view all customer bookings

## Production Deployment

For production deployment:
1. Use a proper database (MongoDB, PostgreSQL)
2. Implement user authentication
3. Add payment gateway integration
4. Use cloud storage for images (AWS S3, Cloudinary)
5. Add email notifications for bookings
6. Implement booking cancellation and modification
