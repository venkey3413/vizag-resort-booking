#!/usr/bin/env python3
"""
Setup script to connect chat app to existing resort booking database
"""
import os
import sqlite3
from pathlib import Path

def setup_database():
    """Connect to existing resort booking database"""
    
    # Path to main resort booking database
    main_db_path = "../resort_booking.db"
    chat_db_path = "./app.db"
    
    if os.path.exists(main_db_path):
        print(f"Found main database at {main_db_path}")
        # Create symbolic link to main database
        if os.path.exists(chat_db_path):
            os.remove(chat_db_path)
        os.symlink(os.path.abspath(main_db_path), chat_db_path)
        print("Linked chat app to main resort booking database")
    else:
        print("Main database not found, creating new database...")
        # Create basic database structure
        conn = sqlite3.connect(chat_db_path)
        cursor = conn.cursor()
        
        # Create resorts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS resorts (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                location TEXT,
                price REAL,
                description TEXT,
                image TEXT,
                gallery TEXT,
                videos TEXT,
                map_link TEXT,
                available INTEGER DEFAULT 1
            )
        ''')
        
        # Create bookings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY,
                resort_id INTEGER,
                guest_name TEXT,
                email TEXT,
                phone TEXT,
                check_in DATE,
                check_out DATE,
                guests INTEGER,
                base_price REAL,
                platform_fee REAL,
                total_price REAL,
                booking_reference TEXT,
                transaction_id TEXT,
                payment_status TEXT DEFAULT 'pending',
                status TEXT DEFAULT 'pending',
                booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (resort_id) REFERENCES resorts (id)
            )
        ''')
        
        # Insert sample resort data
        cursor.execute('''
            INSERT OR IGNORE INTO resorts (id, name, location, price, description, available)
            VALUES (1, 'Royal Orchid', 'Visakhapatnam Beach', 2500, 'Luxury beachfront resort', 1)
        ''')
        
        conn.commit()
        conn.close()
        print("Created new database with sample data")

def setup_rag_data():
    """Setup RAG knowledge base with resort information"""
    
    # Create chroma_store directory
    os.makedirs("chroma_store", exist_ok=True)
    
    # Sample resort knowledge for RAG
    knowledge_data = [
        "Vizag Resort Booking offers luxury accommodations in Visakhapatnam with beachfront views.",
        "Check-in time is 2:00 PM and check-out time is 11:00 AM.",
        "Cancellation policy: Free cancellation up to 24 hours before check-in.",
        "Payment methods: UPI, credit card, and bank transfer accepted.",
        "Resort amenities include swimming pool, spa, restaurant, and beach access.",
        "Pet policy: Pets are allowed with prior approval and additional charges.",
        "Royal Orchid Resort features 50 rooms with ocean views and modern amenities.",
        "Contact information: Phone +91-XXXXXXXXXX, Email: info@vizagresortbooking.in"
    ]
    
    # Save knowledge data to text file for RAG ingestion
    with open("resort_knowledge.txt", "w") as f:
        for item in knowledge_data:
            f.write(item + "\n\n")
    
    print("Created resort knowledge base for RAG system")

if __name__ == "__main__":
    print("Setting up Vizag Resort Chat App database...")
    setup_database()
    setup_rag_data()
    print("Setup completed!")
    print("\nNext steps:")
    print("1. Set your OpenAI API key in .env file")
    print("2. Run: python -c 'from rag_graph import build_graph; build_graph()' to initialize RAG")
    print("3. Start the application: uvicorn main:app --host 0.0.0.0 --port 8000")