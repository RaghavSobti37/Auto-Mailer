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
                    recipient_name TEXT,
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
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS unsubscribes (
                    email TEXT PRIMARY KEY,
                    campaign_id TEXT,
                    tracking_id TEXT,
                    reason TEXT,
                    unsubscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Safe migrations if returning to existing DB
            cursor = conn.execute("PRAGMA table_info(sent_emails)")
            columns = [col[1] for col in cursor.fetchall()]
            if 'status' not in columns:
                conn.execute("ALTER TABLE sent_emails ADD COLUMN status TEXT DEFAULT 'sent'")
            if 'registered' not in columns:
                conn.execute("ALTER TABLE sent_emails ADD COLUMN registered INTEGER DEFAULT 0")
            if 'recipient_name' not in columns:
                conn.execute("ALTER TABLE sent_emails ADD COLUMN recipient_name TEXT")
            
            cursor = conn.execute("PRAGMA table_info(unsubscribes)")
            columns = [col[1] for col in cursor.fetchall()]
            if 'reason' not in columns:
                conn.execute("ALTER TABLE unsubscribes ADD COLUMN reason TEXT")
                
            conn.commit()

    def create_campaign(self, campaign_id: str, subject: str):
        with self._get_conn() as conn:
            conn.execute(
                "INSERT INTO campaigns (campaign_id, subject) VALUES (?, ?)",
                (campaign_id, subject)
            )
            conn.commit()

    def record_sent_email(self, tracking_id: str, campaign_id: str, recipient: str, recipient_name: str = "", status: str = 'sent'):
        with self._get_conn() as conn:
            conn.execute(
                "INSERT INTO sent_emails (tracking_id, campaign_id, recipient, recipient_name, status) VALUES (?, ?, ?, ?, ?)",
                (tracking_id, campaign_id, recipient, recipient_name, status)
            )
            conn.commit()

    def update_status(self, tracking_id: str, status: str):
        with self._get_conn() as conn:
            conn.execute("UPDATE sent_emails SET status = ? WHERE tracking_id = ?", (status, tracking_id))
            conn.commit()

    def record_open(self, tracking_id: str):
        with self._get_conn() as conn:
            conn.execute(
                "UPDATE sent_emails SET opens = opens + 1, status = 'opened' WHERE tracking_id = ? AND (status = 'sent' OR status = 'delivered')",
                (tracking_id,)
            )
            # If it was just 'sent', it's now 'opened'
            conn.execute(
                "UPDATE sent_emails SET status = 'opened' WHERE tracking_id = ? AND status = 'sent'",
                (tracking_id,)
            )
            conn.commit()

    def mark_bounce(self, email: str, campaign_id: str = None):
        """Mark a recipient as failed/bounced. If campaign_id is provided, only that campaign is updated."""
        with self._get_conn() as conn:
            if campaign_id:
                conn.execute(
                    "UPDATE sent_emails SET status = 'failed' WHERE recipient = ? AND campaign_id = ?",
                    (email.lower().strip(), campaign_id)
                )
            else:
                # Update most recent occurrence if campaign not specified
                conn.execute(
                    "UPDATE sent_emails SET status = 'failed' WHERE recipient = ? AND sent_at = (SELECT MAX(sent_at) FROM sent_emails WHERE recipient = ?)",
                    (email.lower().strip(), email.lower().strip())
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
                    SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as bounced,
                    SUM(CASE WHEN registered > 0 THEN 1 ELSE 0 END) as registered,
                    SUM(CASE WHEN clicks > 0 AND registered = 0 THEN 1 ELSE 0 END) as clicked_not_reg,
                    SUM(CASE WHEN (opens > 0 OR clicks > 0) AND clicks = 0 AND registered = 0 THEN 1 ELSE 0 END) as opened_not_clicked,
                    SUM(CASE WHEN status='sent' AND opens = 0 AND clicks = 0 AND registered = 0 THEN 1 ELSE 0 END) as delivered_not_opened,
                    SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as total_delivered,
                    SUM(CASE WHEN opens > 0 OR clicks > 0 THEN 1 ELSE 0 END) as unique_opens,
                    SUM(CASE WHEN clicks > 0 THEN 1 ELSE 0 END) as unique_clicks,
                    SUM(opens),
                    SUM(clicks)
                FROM sent_emails WHERE campaign_id = ?
            """, (campaign_id,))
            row = cursor.fetchone()
            total = row[0] or 0
            return {
                "total": total,
                "bounced": row[1] or 0,
                "failed": row[1] or 0,
                "registered": row[2] or 0,
                "clicked_only": row[3] or 0,
                "opened_only": row[4] or 0,
                "delivered_only": row[5] or 0,
                "delivered": row[6] or 0,
                "opens": row[7] or 0,      # Unique opens
                "clicks": row[8] or 0,     # Unique clicks
                "total_opens": row[9] or 0,
                "total_clicks": row[10] or 0,
                # Funnel data for pie chart (mutually exclusive segments)
                "funnel": {
                    "Bounced": row[1] or 0,
                    "Delivered": row[5] or 0,
                    "Opened": row[4] or 0,
                    "Clicked": row[3] or 0,
                    "Registered": row[2] or 0
                }
            }

    def delete_campaign(self, campaign_id: str):
        with self._get_conn() as conn:
            # Delete link clicks first (via join or subquery)
            conn.execute("""
                DELETE FROM link_clicks 
                WHERE tracking_id IN (SELECT tracking_id FROM sent_emails WHERE campaign_id = ?)
            """, (campaign_id,))
            # Delete sent emails
            conn.execute("DELETE FROM sent_emails WHERE campaign_id = ?", (campaign_id,))
            # Delete campaign itself
            conn.execute("DELETE FROM campaigns WHERE campaign_id = ?", (campaign_id,))
            conn.commit()

    def get_unsubscribed_list(self):
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT email, reason, unsubscribed_at FROM unsubscribes ORDER BY unsubscribed_at DESC")
            return [{"email": r[0], "reason": r[1], "at": r[2]} for r in cursor]

    def remove_unsubscribe(self, email: str):
        with self._get_conn() as conn:
            conn.execute("DELETE FROM unsubscribes WHERE email = ?", (email,))
            conn.commit()

    def get_all_campaigns(self):
        with self._get_conn() as conn:
            cursor = conn.execute("""
                SELECT c.campaign_id, c.subject, c.created_at,
                       COUNT(s.tracking_id) as total,
                       SUM(CASE WHEN s.status='sent' THEN 1 ELSE 0 END) as sent,
                       SUM(CASE WHEN s.status='failed' THEN 1 ELSE 0 END) as failed,
                       SUM(s.opens) as total_vol_opens,
                       SUM(s.clicks) as total_vol_clicks,
                       SUM(CASE WHEN s.registered > 0 THEN 1 ELSE 0 END) as registered,
                       SUM(CASE WHEN s.opens > 0 OR s.clicks > 0 THEN 1 ELSE 0 END) as unique_opens,
                       SUM(CASE WHEN s.clicks > 0 THEN 1 ELSE 0 END) as unique_clicks,
                       -- Funnel segments
                       SUM(CASE WHEN s.status='sent' AND s.opens = 0 AND s.clicks = 0 AND s.registered = 0 THEN 1 ELSE 0 END) as delivered_only,
                       SUM(CASE WHEN (s.opens > 0 OR s.clicks > 0) AND s.clicks = 0 AND s.registered = 0 THEN 1 ELSE 0 END) as opened_only,
                       SUM(CASE WHEN s.clicks > 0 AND s.registered = 0 THEN 1 ELSE 0 END) as clicked_only
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
                        "bounced": row[5] or 0,
                        "total_opens": row[6] or 0,
                        "total_clicks": row[7] or 0,
                        "registered": row[8] or 0,
                        "opens": row[9] or 0,      # Unique opens
                        "clicks": row[10] or 0,     # Unique clicks
                        "funnel": {
                            "Bounced": row[5] or 0,
                            "Delivered": row[11] or 0,
                            "Opened": row[12] or 0,
                            "Clicked": row[13] or 0,
                            "Registered": row[8] or 0
                        }
                    }
                })
            return campaigns

    def record_unsubscribe(self, email: str, campaign_id: str, tracking_id: str, reason: str = ""):
        with self._get_conn() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO unsubscribes (email, campaign_id, tracking_id, reason) VALUES (?, ?, ?, ?)",
                (email.lower().strip(), campaign_id, tracking_id, reason)
            )
            conn.commit()

    def is_unsubscribed(self, email: str) -> bool:
        if not email:
            return False
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT 1 FROM unsubscribes WHERE email = ?", (email.lower().strip(),))
            return cursor.fetchone() is not None

    def get_all_unsubscribes(self) -> list[str]:
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT email FROM unsubscribes ORDER BY unsubscribed_at DESC")
            return [row[0] for row in cursor.fetchall()]
