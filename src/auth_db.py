"""User authentication and profile management database."""
import sqlite3
import secrets
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any
import json

class AuthDB:
    """Handles user accounts, email profiles, SMTP settings, and analytics."""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        try:
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass
        self._init_db()

    def _get_conn(self):
        return sqlite3.connect(self.db_path, check_same_thread=False)

    def _init_db(self):
        """Create all required tables for user auth and profiles."""
        with self._get_conn() as conn:
            # Users table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    google_id TEXT UNIQUE,
                    name TEXT,
                    picture_url TEXT,
                    session_token TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    is_active INTEGER DEFAULT 1
                )
            ''')
            
            # Email & App Key Profiles
            conn.execute('''
                CREATE TABLE IF NOT EXISTS email_profiles (
                    profile_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    email_address TEXT NOT NULL,
                    app_key TEXT NOT NULL,
                    display_name TEXT,
                    is_default INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
                    UNIQUE(user_id, email_address)
                )
            ''')
            
            # SMTP Configurations
            conn.execute('''
                CREATE TABLE IF NOT EXISTS smtp_profiles (
                    smtp_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    smtp_host TEXT NOT NULL,
                    smtp_port INTEGER NOT NULL,
                    is_default INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
                )
            ''')
            
            # Campaign Analytics per User
            conn.execute('''
                CREATE TABLE IF NOT EXISTS user_campaigns (
                    campaign_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    email_profile_id TEXT,
                    smtp_profile_id TEXT,
                    campaign_name TEXT,
                    subject TEXT,
                    sent_count INTEGER DEFAULT 0,
                    delivered_count INTEGER DEFAULT 0,
                    failed_count INTEGER DEFAULT 0,
                    open_count INTEGER DEFAULT 0,
                    click_count INTEGER DEFAULT 0,
                    unsubscribe_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'draft',
                    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
                    FOREIGN KEY (email_profile_id) REFERENCES email_profiles (profile_id),
                    FOREIGN KEY (smtp_profile_id) REFERENCES smtp_profiles (smtp_id)
                )
            ''')
            
            # Activity Log
            conn.execute('''
                CREATE TABLE IF NOT EXISTS activity_log (
                    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    campaign_id TEXT,
                    action TEXT,
                    details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
                    FOREIGN KEY (campaign_id) REFERENCES user_campaigns (campaign_id) ON DELETE CASCADE
                )
            ''')
            
            conn.commit()

    # ─────────────────────────────────────────────────────────────────────────
    # USER MANAGEMENT
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_or_create_user(self, email: str, google_id: str, name: str = "", picture_url: str = "") -> Dict[str, Any]:
        """Get existing user or create new one from Google OAuth."""
        with self._get_conn() as conn:
            cursor = conn.execute(
                "SELECT user_id, email, name, picture_url FROM users WHERE email = ?",
                (email,)
            )
            row = cursor.fetchone()
            if row:
                # Update last login
                conn.execute(
                    "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = ?",
                    (email,)
                )
                conn.commit()
                return {"user_id": row[0], "email": row[1], "name": row[2], "picture_url": row[3]}
            
            # Create new user
            user_id = f"user_{secrets.token_hex(8)}"
            conn.execute(
                '''INSERT INTO users (user_id, email, google_id, name, picture_url, last_login)
                   VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)''',
                (user_id, email, google_id, name, picture_url)
            )
            conn.commit()
            return {"user_id": user_id, "email": email, "name": name, "picture_url": picture_url}
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user by ID."""
        with self._get_conn() as conn:
            cursor = conn.execute(
                "SELECT user_id, email, name, picture_url FROM users WHERE user_id = ? AND is_active = 1",
                (user_id,)
            )
            row = cursor.fetchone()
            if row:
                return {"user_id": row[0], "email": row[1], "name": row[2], "picture_url": row[3]}
            return None
    
    def create_session_token(self, user_id: str) -> str:
        """Generate and store session token for user."""
        token = secrets.token_urlsafe(32)
        with self._get_conn() as conn:
            conn.execute(
                "UPDATE users SET session_token = ? WHERE user_id = ?",
                (token, user_id)
            )
            conn.commit()
        return token
    
    def get_user_by_session(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate session token and return user."""
        with self._get_conn() as conn:
            cursor = conn.execute(
                "SELECT user_id, email, name, picture_url FROM users WHERE session_token = ? AND is_active = 1",
                (token,)
            )
            row = cursor.fetchone()
            if row:
                return {"user_id": row[0], "email": row[1], "name": row[2], "picture_url": row[3]}
            return None
    
    # ─────────────────────────────────────────────────────────────────────────
    # EMAIL PROFILES
    # ─────────────────────────────────────────────────────────────────────────
    
    def create_email_profile(self, user_id: str, email_address: str, app_key: str, display_name: str = "") -> Dict[str, Any]:
        """Add email + app key profile for user."""
        profile_id = f"profile_{secrets.token_hex(8)}"
        with self._get_conn() as conn:
            conn.execute(
                '''INSERT INTO email_profiles (profile_id, user_id, email_address, app_key, display_name)
                   VALUES (?, ?, ?, ?, ?)''',
                (profile_id, user_id, email_address, app_key, display_name or email_address)
            )
            conn.commit()
        return {"profile_id": profile_id, "email": email_address, "display_name": display_name or email_address}
    
    def get_user_email_profiles(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all email profiles for user."""
        with self._get_conn() as conn:
            cursor = conn.execute(
                '''SELECT profile_id, email_address, display_name, is_default FROM email_profiles
                   WHERE user_id = ? ORDER BY is_default DESC, created_at DESC''',
                (user_id,)
            )
            return [
                {"profile_id": row[0], "email": row[1], "display_name": row[2], "is_default": bool(row[3])}
                for row in cursor.fetchall()
            ]
    
    def get_email_profile(self, profile_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve complete email profile (with app key)."""
        with self._get_conn() as conn:
            cursor = conn.execute(
                "SELECT profile_id, email_address, app_key, display_name FROM email_profiles WHERE profile_id = ?",
                (profile_id,)
            )
            row = cursor.fetchone()
            if row:
                return {"profile_id": row[0], "email": row[1], "app_key": row[2], "display_name": row[3]}
            return None
    
    def set_default_email_profile(self, user_id: str, profile_id: str) -> bool:
        """Set email profile as default for user."""
        with self._get_conn() as conn:
            # Clear other defaults
            conn.execute("UPDATE email_profiles SET is_default = 0 WHERE user_id = ?", (user_id,))
            # Set this one
            result = conn.execute(
                "UPDATE email_profiles SET is_default = 1 WHERE profile_id = ? AND user_id = ?",
                (profile_id, user_id)
            )
            conn.commit()
            return result.rowcount > 0
    
    def delete_email_profile(self, profile_id: str, user_id: str) -> bool:
        """Delete email profile."""
        with self._get_conn() as conn:
            result = conn.execute(
                "DELETE FROM email_profiles WHERE profile_id = ? AND user_id = ?",
                (profile_id, user_id)
            )
            conn.commit()
            return result.rowcount > 0
    
    # ─────────────────────────────────────────────────────────────────────────
    # SMTP PROFILES
    # ─────────────────────────────────────────────────────────────────────────
    
    def create_smtp_profile(self, user_id: str, name: str, smtp_host: str, smtp_port: int) -> Dict[str, Any]:
        """Create SMTP configuration profile."""
        smtp_id = f"smtp_{secrets.token_hex(8)}"
        with self._get_conn() as conn:
            conn.execute(
                '''INSERT INTO smtp_profiles (smtp_id, user_id, name, smtp_host, smtp_port)
                   VALUES (?, ?, ?, ?, ?)''',
                (smtp_id, user_id, name, smtp_host, smtp_port)
            )
            conn.commit()
        return {"smtp_id": smtp_id, "name": name, "host": smtp_host, "port": smtp_port}
    
    def get_user_smtp_profiles(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all SMTP profiles for user."""
        with self._get_conn() as conn:
            cursor = conn.execute(
                '''SELECT smtp_id, name, smtp_host, smtp_port, is_default FROM smtp_profiles
                   WHERE user_id = ? ORDER BY is_default DESC, created_at DESC''',
                (user_id,)
            )
            return [
                {"smtp_id": row[0], "name": row[1], "host": row[2], "port": row[3], "is_default": bool(row[4])}
                for row in cursor.fetchall()
            ]
    
    def get_smtp_profile(self, smtp_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve SMTP profile details."""
        with self._get_conn() as conn:
            cursor = conn.execute(
                "SELECT smtp_id, name, smtp_host, smtp_port FROM smtp_profiles WHERE smtp_id = ?",
                (smtp_id,)
            )
            row = cursor.fetchone()
            if row:
                return {"smtp_id": row[0], "name": row[1], "host": row[2], "port": row[3]}
            return None
    
    def set_default_smtp_profile(self, user_id: str, smtp_id: str) -> bool:
        """Set SMTP profile as default."""
        with self._get_conn() as conn:
            conn.execute("UPDATE smtp_profiles SET is_default = 0 WHERE user_id = ?", (user_id,))
            result = conn.execute(
                "UPDATE smtp_profiles SET is_default = 1 WHERE smtp_id = ? AND user_id = ?",
                (smtp_id, user_id)
            )
            conn.commit()
            return result.rowcount > 0
    
    def delete_smtp_profile(self, smtp_id: str, user_id: str) -> bool:
        """Delete SMTP profile."""
        with self._get_conn() as conn:
            result = conn.execute(
                "DELETE FROM smtp_profiles WHERE smtp_id = ? AND user_id = ?",
                (smtp_id, user_id)
            )
            conn.commit()
            return result.rowcount > 0
    
    # ─────────────────────────────────────────────────────────────────────────
    # CAMPAIGN ANALYTICS
    # ─────────────────────────────────────────────────────────────────────────
    
    def create_user_campaign(self, user_id: str, campaign_id: str, campaign_name: str, subject: str,
                            email_profile_id: str = "", smtp_profile_id: str = "") -> bool:
        """Create campaign record linked to user and profiles."""
        with self._get_conn() as conn:
            conn.execute(
                '''INSERT INTO user_campaigns (campaign_id, user_id, email_profile_id, smtp_profile_id, campaign_name, subject)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                (campaign_id, user_id, email_profile_id or None, smtp_profile_id or None, campaign_name, subject)
            )
            conn.commit()
            return True
    
    def update_campaign_stats(self, campaign_id: str, **kwargs) -> bool:
        """Update campaign stats (sent, delivered, failed, opens, clicks, unsubscribes)."""
        allowed_fields = {'sent_count', 'delivered_count', 'failed_count', 'open_count', 'click_count', 'unsubscribe_count', 'status'}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return False
        
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        with self._get_conn() as conn:
            conn.execute(
                f"UPDATE user_campaigns SET {set_clause} WHERE campaign_id = ?",
                tuple(updates.values()) + (campaign_id,)
            )
            conn.commit()
        return True
    
    def get_user_campaigns(self, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get campaigns for user with analytics."""
        with self._get_conn() as conn:
            cursor = conn.execute(
                '''SELECT campaign_id, campaign_name, subject, sent_count, delivered_count, failed_count,
                          open_count, click_count, created_at, status
                   FROM user_campaigns
                   WHERE user_id = ?
                   ORDER BY created_at DESC
                   LIMIT ?''',
                (user_id, limit)
            )
            return [
                {
                    "campaign_id": row[0],
                    "name": row[1],
                    "subject": row[2],
                    "sent": row[3],
                    "delivered": row[4],
                    "failed": row[5],
                    "opens": row[6],
                    "clicks": row[7],
                    "created_at": row[8],
                    "status": row[9]
                }
                for row in cursor.fetchall()
            ]
    
    def log_activity(self, user_id: str, action: str, campaign_id: str = "", details: str = "") -> bool:
        """Log user action for analytics/auditing."""
        with self._get_conn() as conn:
            conn.execute(
                "INSERT INTO activity_log (user_id, campaign_id, action, details) VALUES (?, ?, ?, ?)",
                (user_id, campaign_id or None, action, details)
            )
            conn.commit()
        return True
