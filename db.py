import psycopg2
import os

conn = psycopg2.connect(
    dbname=os.getenv("POSTGRES_DB"),
    user=os.getenv("POSTGRES_USER"),
    password=os.getenv("POSTGRES_PASSWORD"),
    host="postgres"
)

def init_db():
    with conn.cursor() as c:
        c.execute("""
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          chat_id TEXT,
          sender TEXT,
          message TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
        """)
        conn.commit()

def save(chat_id, sender, message):
    with conn.cursor() as c:
        c.execute(
            "INSERT INTO messages (chat_id, sender, message) VALUES (%s,%s,%s)",
            (chat_id, sender, message)
        )
        conn.commit()

def load_history(chat_id):
    with conn.cursor() as c:
        c.execute(
            "SELECT sender, message FROM messages WHERE chat_id=%s ORDER BY id",
            (chat_id,)
        )
        return c.fetchall()