import sqlite3

DB_PATH = "helmet_vision.db"

def get_connection():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS violations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            confidence REAL NOT NULL,
            plate TEXT,
            status TEXT NOT NULL,
            image_path TEXT
        )
    ''')
    
    # Simple migration hook to add image_path if it doesn't exist on an older DB
    try:
        cursor.execute('ALTER TABLE violations ADD COLUMN image_path TEXT')
    except sqlite3.OperationalError:
        pass # Column already exists
        
    try:
        cursor.execute('ALTER TABLE violations ADD COLUMN camera_id INTEGER')
    except sqlite3.OperationalError:
        pass

    # Phase 5.2: Geo-Tagging & Locations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            coordinates TEXT
        )
    ''')
    cursor.execute('''
        INSERT OR IGNORE INTO locations (id, name, coordinates)
        VALUES (1, 'Default Gateway', '0,0')
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cameras (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            source TEXT NOT NULL,
            location_id INTEGER,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY(location_id) REFERENCES locations(id)
        )
    ''')
    # Default camera fallback
    cursor.execute('''
        INSERT OR IGNORE INTO cameras (id, name, source, location_id, is_active)
        VALUES (0, 'Front Gate USB', '0', 1, 1)
    ''')
        
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            total_monitored INTEGER DEFAULT 0
        )
    ''')
    cursor.execute('INSERT OR IGNORE INTO stats (id, total_monitored) VALUES (1, 0)')

    # Phase 3.3: Alerts schema
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alert_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            condition_type TEXT NOT NULL,
            threshold_count INTEGER NOT NULL,
            time_window_minutes INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            play_sound BOOLEAN DEFAULT 1
        )
    ''')
    # Insert a default rule if none exists
    cursor.execute('''
        INSERT OR IGNORE INTO alert_rules (id, name, condition_type, threshold_count, time_window_minutes, is_active, play_sound)
        VALUES (1, 'High Violation Frequency', 'violations_count', 3, 5, 1, 1)
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            rule_id INTEGER,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'new',
            FOREIGN KEY(rule_id) REFERENCES alert_rules(id)
        )
    ''')

    # Phase 4.2: Auth schema
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'viewer'
        )
    ''')
    # Default admin user fallback if empty (password '12345' hashed will be done in server.py or auth.py)
    # We will let auth.py handle default user seeding to avoid circular hash deps here.

    conn.commit()
    conn.close()

def add_violation(timestamp: str, confidence: float, plate: str, status: str, image_path: str = None, camera_id: int = 0):
    conn = get_connection()
    conn.execute(
        'INSERT INTO violations (timestamp, confidence, plate, status, image_path, camera_id) VALUES (?, ?, ?, ?, ?, ?)',
        (timestamp, confidence, plate, status, image_path, camera_id)
    )
    conn.commit()
    conn.close()

def get_recent_violations(limit: int = 100):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.execute('''
        SELECT v.*, c.name as camera_name, l.name as location_name 
        FROM violations v
        LEFT JOIN cameras c ON v.camera_id = c.id
        LEFT JOIN locations l ON c.location_id = l.id
        ORDER BY v.id DESC LIMIT ?
    ''', (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def increment_total_monitored():
    conn = get_connection()
    conn.execute('UPDATE stats SET total_monitored = total_monitored + 1 WHERE id = 1')
    conn.commit()
    conn.close()

def get_total_monitored():
    conn = get_connection()
    cursor = conn.execute('SELECT total_monitored FROM stats WHERE id = 1')
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else 0

def clear_violations():
    conn = get_connection()
    conn.execute('DELETE FROM violations')
    conn.execute('UPDATE stats SET total_monitored = 0 WHERE id = 1')
    conn.commit()
    conn.close()

# --- Geo-Tagging API Methods ---
def get_cameras():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.execute('''
        SELECT c.*, l.name as location_name 
        FROM cameras c
        LEFT JOIN locations l ON c.location_id = l.id
    ''')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_locations():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.execute('SELECT * FROM locations')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_location(name: str, coordinates: str):
    conn = get_connection()
    cursor = conn.execute(
        'INSERT INTO locations (name, coordinates) VALUES (?, ?)',
        (name, coordinates)
    )
    loc_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return loc_id

def update_camera(camera_id: int, name: str, location_id: int):
    conn = get_connection()
    conn.execute(
        'UPDATE cameras SET name = ?, location_id = ? WHERE id = ?',
        (name, location_id, camera_id)
    )
    conn.commit()
    conn.close()

# --- Alerts & Notifications Methods ---
def get_alert_rules():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.execute('SELECT * FROM alert_rules')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_alert_rule(rule_id: int, is_active: bool, play_sound: bool):
    conn = get_connection()
    conn.execute(
        'UPDATE alert_rules SET is_active = ?, play_sound = ? WHERE id = ?',
        (1 if is_active else 0, 1 if play_sound else 0, rule_id)
    )
    conn.commit()
    conn.close()

def add_alert(timestamp: str, rule_id: int, message: str):
    conn = get_connection()
    conn.execute(
        'INSERT INTO alerts (timestamp, rule_id, message) VALUES (?, ?, ?)',
        (timestamp, rule_id, message)
    )
    conn.commit()
    conn.close()

def get_recent_alerts(limit: int = 50):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.execute('''
        SELECT a.id, a.timestamp, a.message, a.status, r.name as rule_name, r.play_sound
        FROM alerts a
        LEFT JOIN alert_rules r ON a.rule_id = r.id
        ORDER BY a.id DESC LIMIT ?
    ''', (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def dismiss_alert(alert_id: int):
    conn = get_connection()
    conn.execute('UPDATE alerts SET status = "dismissed" WHERE id = ?', (alert_id,))
    conn.commit()
    conn.close()

# --- Auth Methods ---
def get_user(username: str):
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.execute('SELECT * FROM users WHERE username = ?', (username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_user(username: str, password_hash: str, role: str = 'viewer'):
    conn = get_connection()
    try:
        conn.execute(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            (username, password_hash, role)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()
