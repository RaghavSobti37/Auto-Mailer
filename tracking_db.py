import sqlite3
from pathlib import Path
from datetime import datetime

class TrackingDB:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_conn(self):
        return sqlite3.connect(self.db_path, check_same_thread=False)

    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS campaigns (
                    campaign_id TEXT PRIMARY KEY,
                    subject TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS sent_emails (
                    tracking_id TEXT PRIMARY KEY,
                    campaign_id TEXT,
                    recipient TEXT,
                    status TEXT DEFAULT 'sent',
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    opens INTEGER DEFAULT 0,
                    clicks INTEGER DEFAULT 0,
                    registered INTEGER DEFAULT 0,
                    FOREIGN KEY (campaign_id) REFERENCES campaigns (campaign_id)
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS link_clicks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tracking_id TEXT,
                    url TEXT,
                    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tracking_id) REFERENCES sent_emails (tracking_id)
                )
            ''')
            
            # Safe migrations if returning to existing DB
            cursor = conn.execute("PRAGMA table_info(sent_emails)")
            columns = [col[1] for col in cursor.fetchall()]
            if 'status' not in columns:
                conn.execute("ALTER TABLE sent_emails ADD COLUMN status TEXT DEFAULT 'sent'")
            if 'registered' not in columns:
                conn.execute("ALTER TABLE sent_emails ADD COLUMN registered INTEGER DEFAULT 0")
                
            conn.commit()

    def create_campaign(self, campaign_id: str, subject: str):
        with self._get_conn() as conn:
            conn.execute(
                "INSERT INTO campaigns (campaign_id, subject) VALUES (?, ?)",
                (campaign_id, subject)
            )
            conn.commit()

    def record_sent_email(self, tracking_id: str, campaign_id: str, recipient: str, status: str = 'sent'):
        with self._get_conn() as conn:
            conn.execute(
                "INSERT INTO sent_emails (tracking_id, campaign_id, recipient, status) VALUES (?, ?, ?, ?)",
                (tracking_id, campaign_id, recipient, status)
            )
            conn.commit()

    def update_status(self, tracking_id: str, status: str):
        with self._get_conn() as conn:
            conn.execute("UPDATE sent_emails SET status = ? WHERE tracking_id = ?", (status, tracking_id))
            conn.commit()

    def record_open(self, tracking_id: str):
        with self._get_conn() as conn:
            conn.execute(
                "UPDATE sent_emails SET opens = opens + 1 WHERE tracking_id = ?",
                (tracking_id,)
            )
            conn.commit()

    def record_click(self, tracking_id: str, url: str):
        with self._get_conn() as conn:
            conn.execute(
                "UPDATE sent_emails SET clicks = clicks + 1 WHERE tracking_id = ?",
                (tracking_id,)
            )
            conn.execute(
                "INSERT INTO link_clicks (tracking_id, url) VALUES (?, ?)",
                (tracking_id, url)
            )
            conn.commit()

    def record_registration(self, tracking_id: str):
        with self._get_conn() as conn:
            conn.execute(
                "UPDATE sent_emails SET registered = 1 WHERE tracking_id = ?",
                (tracking_id,)
            )
            conn.commit()

    def get_campaign_stats(self, campaign_id: str):
        with self._get_conn() as conn:
            cursor = conn.execute("""
                SELECT 
                    COUNT(*), 
                    SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN opens > 0 THEN 1 ELSE 0 END), 
                    SUM(CASE WHEN clicks > 0 THEN 1 ELSE 0 END),
                    SUM(CASE WHEN registered > 0 THEN 1 ELSE 0 END)
                FROM sent_emails WHERE campaign_id = ?
            """, (campaign_id,))
            row = cursor.fetchone()
            return {
                "total": row[0] or 0,
                "sent": row[1] or 0,
                "failed": row[2] or 0,
                "opens": row[3] or 0,
                "clicks": row[4] or 0,
                "registered": row[5] or 0
            }

    def get_all_campaigns(self):
        with self._get_conn() as conn:
            cursor = conn.execute("""
                SELECT c.campaign_id, c.subject, c.created_at,
                       COUNT(s.tracking_id) as total,
                       SUM(CASE WHEN s.status='sent' THEN 1 ELSE 0 END) as sent,
                       SUM(CASE WHEN s.status='failed' THEN 1 ELSE 0 END) as failed,
                       SUM(CASE WHEN s.opens > 0 THEN 1 ELSE 0 END) as opens,
                       SUM(CASE WHEN s.clicks > 0 THEN 1 ELSE 0 END) as clicks,
                       SUM(CASE WHEN s.registered > 0 THEN 1 ELSE 0 END) as registered
                FROM campaigns c
                LEFT JOIN sent_emails s ON c.campaign_id = s.campaign_id
                GROUP BY c.campaign_id
                ORDER BY c.created_at DESC
            """)
            campaigns = []
            for row in cursor.fetchall():
                campaigns.append({
                    "id": row[0],
                    "subject": row[1],
                    "createdAt": row[2],
                    "stats": {
                        "total": row[3] or 0,
                        "sent": row[4] or 0,
                        "failed": row[5] or 0,
                        "opens": row[6] or 0,
                        "clicks": row[7] or 0,
                        "registered": row[8] or 0
                    }
                })
            return campaigns
