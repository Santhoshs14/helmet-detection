import os
import cv2
import time
import tempfile
import pandas as pd
import numpy as np
import streamlit as st
import mediapipe as mp
from datetime import datetime
from PIL import Image
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# ----------------- Configuration & Setup -----------------
st.set_page_config(page_title="Smart Traffic Helmet Enforcement", layout="wide", page_icon="🚦")

VIOLATIONS_DIR = "violations"
os.makedirs(VIOLATIONS_DIR, exist_ok=True)

# Session state initialization for analytics
if 'violations_log' not in st.session_state:
    st.session_state['violations_log'] = []
    st.session_state['total_violations'] = 0

# ----------------- Sidebar -----------------
st.sidebar.title("🚦 System Controls")

# 1. Traffic Signal Simulation
signal_state = st.sidebar.radio("Traffic Signal Status", ["🔴 RED (Enforcing)", "🟡 YELLOW (Warning)", "🟢 GREEN (Safe)"])
is_enforcing = "RED" in signal_state

st.sidebar.markdown("---")

# 2. Input Source
input_mode = st.sidebar.selectbox("Select Input Source", ["Live Webcam", "Upload Image", "Upload Video"])

# 3. Detection Tuning
conf_threshold = st.sidebar.slider("Detection Confidence", 0.1, 1.0, 0.5, 0.05)

# 4. Region of Interest (Stop Line)
st.sidebar.markdown("---")
st.sidebar.write("📐 Enforcement Zone (ROI)")
roi_percent = st.sidebar.slider("Stop Line position (% from top)", 10, 95, 60, 5)

st.sidebar.markdown("---")
if st.sidebar.button("Clear Violation Logs"):
    st.session_state['violations_log'] = []
    st.session_state['total_violations'] = 0
    st.rerun()

# ----------------- Main UI Layout -----------------
st.title("Smart Traffic Helmet Enforcement System")
st.markdown("This system demonstrates automated helmet detection at traffic signals. It enforces rules when the light is **RED** and logs violations for individuals crossing the **Stop Line** without a helmet.")

# Analytics Row
m1, m2, m3, m4 = st.columns(4)
metric_fps = m1.empty()
metric_helmets = m2.empty()
metric_no_helmets = m3.empty()
metric_violations = m4.empty()

# Layout for Video and logs
col1, col2 = st.columns([2, 1])

with col1:
    st.subheader("Live Feed / Processing Window")
    video_placeholder = st.empty()
    stop_btn = st.button("Stop/Reset Video", key="stop_btn")

with col2:
    st.subheader("Violation Logs")
    log_placeholder = st.empty()
    export_placeholder = st.empty()

def update_metrics(fps, helmets, no_helmets):
    metric_fps.metric("Processing FPS", f"{fps:.1f}")
    metric_helmets.metric("Helmets Detected", helmets)
    metric_no_helmets.metric("Without Helmet", no_helmets)
    metric_violations.metric("Total Violations", st.session_state['total_violations'])

def render_logs():
    with log_placeholder.container():
        if st.session_state['violations_log']:
            df = pd.DataFrame(st.session_state['violations_log'])
            st.dataframe(df[['Timestamp', 'Confidence', 'File']])
            
            csv = df.to_csv(index=False).encode('utf-8')
            export_placeholder.download_button(
                label="📥 Download Violation Report (CSV)",
                data=csv,
                file_name=f"traffic_violations_{datetime.now().strftime('%Y%m%d_%H%M')}.csv",
                mime="text/csv"
            )
        else:
            st.info("No violations recorded in this session.")

# Update metrics and logs initially
update_metrics(0, 0, 0)
render_logs()


# ----------------- Model Initialization -----------------
try:
    base_options = python.BaseOptions(model_asset_path='best.tflite')
    options = vision.ObjectDetectorOptions(base_options=base_options, score_threshold=conf_threshold)
    detector = vision.ObjectDetector.create_from_options(options)
except Exception as e:
    st.error(f"Failed to load detection model. Ensure 'best.tflite' exists. Error: {e}")
    st.stop()


# ----------------- Core Processing Function -----------------
def process_frame(frame):
    current_helmets = 0
    current_no_helmets = 0
    
    # Store dimensions
    h_frame, w_frame, _ = frame.shape
    
    # Calculate Stop Line Y position
    line_y = int(h_frame * (roi_percent / 100.0))
    
    # Draw ROI line (Stop Line)
    line_color = (0, 0, 255) if is_enforcing else (0, 255, 0) # Red if enforcing, Green otherwise
    cv2.line(frame, (0, line_y), (w_frame, line_y), line_color, 3)
    cv2.putText(frame, "STOP LINE", (10, line_y - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, line_color, 2)
    
    # Prepare image for MediaPipe
    frame_rgb_mp = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb_mp)
    
    # Detect
    detection_result = detector.detect(mp_image)
    
    for detection in detection_result.detections:
        bbox = detection.bounding_box
        x = int(bbox.origin_x)
        y = int(bbox.origin_y)
        w = int(bbox.width)
        h = int(bbox.height)
        
        category = detection.categories[0]
        cat_name = category.category_name
        score = round(category.score, 2)
        
        # Determine if detection is "In Enforcement Zone" (bottom of bounding box crosses the line)
        in_zone = (y + h) > line_y
        
        # Colors and labeling
        if cat_name == "Helmet":
            color = (0, 255, 0) # BGR Green
            current_helmets += 1
        else: # No_Helmet
            color = (0, 0, 255) # BGR Red
            current_no_helmets += 1
            
            # CHECK FOR VIOLATION
            if is_enforcing and in_zone:
                # Add cooldown to avoid taking too many screenshots of the same violator rapidly
                if 'last_violation_time' not in st.session_state or (time.time() - st.session_state['last_violation_time']) > 2.0:
                    st.session_state['total_violations'] += 1
                    timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
                    filename = f"viol_{timestamp_str}.jpg"
                    filepath = os.path.join(VIOLATIONS_DIR, filename)
                    
                    # Highlight violation directly on the frame before saving
                    snapshot_frame = frame.copy()
                    cv2.putText(snapshot_frame, "VIOLATION LOGGED", (x, max(0, y - 40)), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,0,255), 3)
                    cv2.rectangle(snapshot_frame, (x, y), (x + w, y + h), color, 3)
                    
                    # Save snapshot
                    cv2.imwrite(filepath, snapshot_frame)
                    
                    st.session_state['violations_log'].append({
                        "Timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        "Class": cat_name,
                        "Confidence": score,
                        "Coordinates": f"({x}, {y}, {w}, {h})",
                        "File": filename
                    })
                    st.session_state['last_violation_time'] = time.time()
                    render_logs() # Update UI
        
        # Draw dynamic bounding boxes
        cv2.rectangle(frame, (x, y), (x + w, y + h), color, 3)
        label = f"{cat_name} {score}"
        
        # Text background for better readability
        (t_w, t_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(frame, (x, y - t_h - 10), (x + t_w, y), color, -1)
        cv2.putText(frame, label, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
    return frame, current_helmets, current_no_helmets

# ----------------- Execution Logic -----------------

if input_mode == "Live Webcam":
    if not stop_btn:
        cap = cv2.VideoCapture(0)
        prev_time = time.time()
        while cap.isOpened() and not stop_btn:
            ret, frame = cap.read()
            if not ret:
                st.error("Failed to read from webcam.")
                break
            
            frame = cv2.flip(frame, 1) # Mirror
            processed_frame, h_count, nh_count = process_frame(frame)
            
            # FPS Calculation
            curr_time = time.time()
            fps = 1 / (curr_time - prev_time) if curr_time > prev_time else 0
            prev_time = curr_time
            
            # Update UI
            update_metrics(fps, h_count, nh_count)
            video_placeholder.image(cv2.cvtColor(processed_frame, cv2.COLOR_BGR2RGB), width="stretch")
            
        cap.release()
        
elif input_mode == "Upload Image":
    img_file = st.sidebar.file_uploader("Choose an image", type=["jpg", "jpeg", "png"])
    if img_file is not None:
        file_bytes = np.asarray(bytearray(img_file.read()), dtype=np.uint8)
        frame = cv2.imdecode(file_bytes, 1)
        
        processed_frame, h_count, nh_count = process_frame(frame)
        update_metrics(0, h_count, nh_count)
        video_placeholder.image(cv2.cvtColor(processed_frame, cv2.COLOR_BGR2RGB), width="stretch")

elif input_mode == "Upload Video":
    video_file = st.sidebar.file_uploader("Choose a video", type=["mp4", "mov", "avi"])
    if video_file is not None and not stop_btn:
        tfile = tempfile.NamedTemporaryFile(delete=False)
        tfile.write(video_file.read())
        cap = cv2.VideoCapture(tfile.name)
        
        prev_time = time.time()
        while cap.isOpened() and not stop_btn:
            ret, frame = cap.read()
            if not ret:
                st.info("End of video reached.")
                break
                
            processed_frame, h_count, nh_count = process_frame(frame)
            
            # FPS Calculation
            curr_time = time.time()
            fps = 1 / (curr_time - prev_time) if curr_time > prev_time else 0
            prev_time = curr_time
            
            # Update UI
            update_metrics(fps, h_count, nh_count)
            video_placeholder.image(cv2.cvtColor(processed_frame, cv2.COLOR_BGR2RGB), width="stretch")
            
            # Allow Streamlit UI thread to breathe
            time.sleep(0.01)
            
        cap.release()
        os.unlink(tfile.name) # Cleanup
