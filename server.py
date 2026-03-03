import os
import cv2
import time
import random
import datetime
import numpy as np
import threading
import asyncio
import json
import logging
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Depends, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

import database
import auth
from camera_manager import manager as cam_manager

# ----------------- Logging Setup -----------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("helmet_vision.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("helmet_vision")

# ----------------- App Initialization -----------------
database.init_db()
auth.ensure_default_admin()
os.makedirs("violations", exist_ok=True)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Helmet Detection API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.mount("/violations", StaticFiles(directory="violations"), name="violations")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled explicit error for {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "error": str(exc)},
    )

# ----------------- Global State -----------------
state = {
    "total_monitored": database.get_total_monitored(),
    "current_helmets": 0,
    "current_no_helmets": 0,
}

# Hardware Control State
hw_state = {
    "camera_active": True,
    "camera_source": 0,
    "camera_lock": threading.Lock()
}

CONFIDENCE_THRESHOLD = 0.5

# ----------------- MediaPipe Setup -----------------
try:
    base_options = python.BaseOptions(model_asset_path='best.tflite')
    options = vision.ObjectDetectorOptions(base_options=base_options, score_threshold=CONFIDENCE_THRESHOLD)
    detector = vision.ObjectDetector.create_from_options(options)
except Exception as e:
    logger.error(f"Failed to load detection model: {e}")
    detector = None

# ----------------- Advanced Simulated ALPR -----------------
current_active_plate = None
plate_clear_time = 0

def simulate_alpr():
    global current_active_plate, plate_clear_time
    current_time = time.time()
    
    # If the simulated vehicle has left the frame (time expired)
    if current_time > plate_clear_time:
        if random.random() > 0.15: # 85% success read rate
            states = ['MH', 'KA', 'DL', 'TN', 'GJ']
            districts = [str(i).zfill(2) for i in range(1, 25)]
            letters = ['AB', 'CD', 'EF', 'XY', 'ZZ']
            nums = [str(random.randint(1000, 9999))]
            current_active_plate = f"{random.choice(states)} {random.choice(districts)} {random.choice(letters)} {random.choice(nums)}"
        else:
            current_active_plate = None
        
        # Vehicle is in view for 5 to 8 seconds
        plate_clear_time = current_time + random.uniform(5.0, 8.0)
        return current_active_plate, True # True = New Plate Detected
    
    return current_active_plate, False # False = Still looking at the same plate

last_violation_time = 0

# ----------------- Alert Monitoring -----------------
recent_violation_timestamps = []
last_alert_times = {}

def check_alerts(current_time):
    global recent_violation_timestamps, last_alert_times
    rules = database.get_alert_rules()
    
    recent_violation_timestamps = [t for t in recent_violation_timestamps if current_time - t < 3600]
    
    for rule in rules:
        if not rule['is_active']: continue
        rule_id = rule['id']
        last_alert = last_alert_times.get(rule_id, 0)
        
        # Debounce alerts (don't fire more than once per time window)
        if current_time - last_alert < (rule['time_window_minutes'] * 60):
            continue
            
        if rule['condition_type'] == 'violations_count':
            window_start = current_time - (rule['time_window_minutes'] * 60)
            count = sum(1 for t in recent_violation_timestamps if t >= window_start)
            if count >= rule['threshold_count']:
                timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                msg = f"{count} violations detected in the last {rule['time_window_minutes']} minutes."
                database.add_alert(timestamp_str, rule_id, msg)
                last_alert_times[rule_id] = current_time

# ----------------- Frame Processing -----------------
def generate_frames(camera_id: str):
    global state, last_violation_time, hw_state
    
    stream = cam_manager.get_camera(camera_id)
    
    while True:
        # Check active state
        if not hw_state["camera_active"]:
            # Yield offline frame
            fallback = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(fallback, "CAMERA STOPPED", (150, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (100, 100, 100), 2)
            ret, buffer = cv2.imencode('.jpg', fallback, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.5)
            continue
            
        success, frame = stream.read()
        if not success or frame is None:
            time.sleep(0.01)
            continue
            
        frame = cv2.flip(frame, 1)
        h_frame, w_frame, _ = frame.shape
        
        # Reset counters
        current_helmets = 0
        current_no_helmets = 0
        
        if detector:
            frame_rgb_mp = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb_mp)
            detection_result = detector.detect(mp_image)
            
            if len(detection_result.detections) > 0:
                if random.random() < 0.05: 
                    state["total_monitored"] += 1
                    database.increment_total_monitored()
            
            pending_violations = []

            for detection in detection_result.detections:
                bbox = detection.bounding_box
                x, y, w, h = int(bbox.origin_x), int(bbox.origin_y), int(bbox.width), int(bbox.height)
                
                cat = detection.categories[0]
                cat_name = cat.category_name
                score = round(cat.score, 2)
                
                if cat_name == "Helmet":
                    color = (0, 255, 0)
                    current_helmets += 1
                else: 
                    color = (0, 0, 255)
                    current_no_helmets += 1
                    
                    plate_text, is_new_plate = simulate_alpr()
                    current_time = time.time()
                    
                    if is_new_plate or (current_time - last_violation_time) > 10.0:
                        timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        status_str = "Logged" if plate_text else "Read Failure"
                        snapshot_filename = f"violation_{int(current_time)}.jpg"
                        
                        pending_violations.append((timestamp_str, score, plate_text, status_str, snapshot_filename))
                        recent_violation_timestamps.append(current_time)
                        last_violation_time = current_time
                
                cv2.rectangle(frame, (x, y), (x + w, y + h), color, 3)
                label = f"{cat_name} {score}"
                (t_w, t_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(frame, (x, y - t_h - 10), (x + t_w, y), color, -1)
                cv2.putText(frame, label, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                
                if cat_name == "No_Helmet":
                   plate_display = current_active_plate if current_active_plate else "SCANNING..."
                   cv2.putText(frame, f"[ ALPR: {plate_display} ]", (x, y + h + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                   
            if len(pending_violations) > 0:
                cv2.imwrite(f"violations/{pending_violations[0][4]}", frame)
                for v in pending_violations:
                    database.add_violation(*v, camera_id=int(camera_id) if camera_id.isdigit() else 0)
                check_alerts(time.time())
                   
        # Update Global State Thread-safely
        state["current_helmets"] = current_helmets
        state["current_no_helmets"] = current_no_helmets

        # Compress to lower quality for web streaming to reduce lag
        ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

# ----------------- API Endpoints -----------------
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "helmet_vision_core"}

@app.post("/login")
@limiter.limit("5/minute")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    user = database.get_user(form_data.username)
    if not user or not auth.verify_password(form_data.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer", "role": user["role"]}

@app.get("/video_feed")
def video_feed(camera_id: str = "0"):
    """Streams the processed webcam frames."""
    return StreamingResponse(generate_frames(camera_id), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/stats")
def get_stats():
    """Returns the current state and violation logs fallback for HTTP polling."""
    out = dict(state)
    out["violations"] = database.get_recent_violations(100)
    return JSONResponse(content=out)

# --- WebSocket stats streaming ---
@app.websocket("/ws/stats")
async def websocket_stats(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            out = dict(state)
            # Add violations to state
            out["violations"] = database.get_recent_violations(100)
            # Add recent alerts to state
            out["alerts"] = database.get_recent_alerts(20)
            await websocket.send_json(out)
            await asyncio.sleep(1.0) # Send updates every 1 second
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS error: {e}")

@app.get("/camera/status")
def get_cam_status():
    return JSONResponse(content={
        "camera_active": hw_state["camera_active"],
        "camera_source": hw_state["camera_source"]
    })

@app.post("/camera/start")
def start_cam(admin: dict = Depends(auth.get_current_active_admin)):
    hw_state["camera_active"] = True
    return {"message": "Camera start signal sent"}

class CameraSourceRequest(BaseModel):
    source: int

@app.post("/camera/source")
def set_cam_source(req: CameraSourceRequest, admin: dict = Depends(auth.get_current_active_admin)):
    with hw_state["camera_lock"]:
        cam_manager.stop_camera(hw_state["camera_source"])
        hw_state["camera_source"] = req.source
    return {"message": f"Switched to camera source {req.source}"}

@app.get("/cameras")
def get_cameras_endpoint():
    return JSONResponse(content={"cameras": database.get_cameras()})

@app.get("/locations")
def get_locations_endpoint():
    return JSONResponse(content={"locations": database.get_locations()})

class LocationCreate(BaseModel):
    name: str
    coordinates: str

@app.post("/locations")
def create_location(req: LocationCreate, admin: dict = Depends(auth.get_current_active_admin)):
    loc_id = database.add_location(req.name, req.coordinates)
    return {"message": "Location created", "id": loc_id}

class CameraUpdate(BaseModel):
    name: str
    location_id: int

@app.put("/cameras/{camera_id}")
def update_camera_endpoint(camera_id: int, req: CameraUpdate, admin: dict = Depends(auth.get_current_active_admin)):
    database.update_camera(camera_id, req.name, req.location_id)
    return {"message": "Camera updated"}

@app.post("/camera/stop")
def stop_cam(admin: dict = Depends(auth.get_current_active_admin)):
    hw_state["camera_active"] = False
    cam_manager.release_all()
    # Clear immediate stats
    state["current_helmets"] = 0
    state["current_no_helmets"] = 0
    return {"message": "Camera stop signal sent"}

@app.post("/reset")
def reset_logs(admin: dict = Depends(auth.get_current_active_admin)):
    """Clears the violations log."""
    global state, recent_violation_timestamps
    database.clear_violations()
    state["total_monitored"] = 0
    recent_violation_timestamps.clear()
    return {"message": "Logs cleared"}

@app.get("/violations/export")
def export_violations(admin: dict = Depends(auth.get_current_active_admin)):
    """Exports all violations as a CSV file."""
    import csv
    import io
    
    # Get all violations (for export, we might want more than just the recent 100)
    violations = database.get_recent_violations(10000) 
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["ID", "Timestamp", "Category", "Confidence", "Plate", "Status", "Image File"])
    
    # Write data
    for v in violations:
        writer.writerow([
            v.get("id", ""),
            v.get("timestamp", ""),
            "No Helmet",
            f"{v.get('confidence', 0):.2f}",
            v.get("plate", "UNREADABLE"),
            v.get("status", ""),
            v.get("image_path", "")
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=violations_report.csv"}
    )

# --- Alerts Endpoints ---
@app.get("/alerts")
def get_alerts(admin: dict = Depends(auth.get_current_active_admin)):
    return JSONResponse(content={"alerts": database.get_recent_alerts(100)})

@app.get("/alerts/rules")
def get_alert_rules_endpoint(admin: dict = Depends(auth.get_current_active_admin)):
    return JSONResponse(content={"rules": database.get_alert_rules()})

class AlertRuleUpdate(BaseModel):
    is_active: bool
    play_sound: bool

@app.put("/alerts/rules/{rule_id}")
def update_alert_rule_endpoint(rule_id: int, req: AlertRuleUpdate, admin: dict = Depends(auth.get_current_active_admin)):
    database.update_alert_rule(rule_id, req.is_active, req.play_sound)
    return {"message": "Rule updated"}

@app.post("/alerts/{alert_id}/dismiss")
def dismiss_alert_endpoint(alert_id: int, admin: dict = Depends(auth.get_current_active_admin)):
    database.dismiss_alert(alert_id)
    return {"message": "Alert dismissed"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
