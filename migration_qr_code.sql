-- Migration: Add QR Code and Check-in tracking to bookings table
-- Run this SQL on your database

-- Add qr_code column to store QR code image data URL
ALTER TABLE bookings ADD COLUMN qr_code TEXT;

-- Add checked_in column to track if ticket has been scanned
ALTER TABLE bookings ADD COLUMN checked_in INTEGER DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_booking_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_checked_in ON bookings(checked_in);

-- Display success message
SELECT 'Migration completed successfully!' as message;
