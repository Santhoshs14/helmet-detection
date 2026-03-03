import cv2
import threading
import time
import logging

logger = logging.getLogger("helmet_vision")

class CameraStream:
    """Handles an independent asynchronous camera feed."""
    def __init__(self, src):
        self.src = src
        self.stream = cv2.VideoCapture(src, cv2.CAP_DSHOW)
        self.stream.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        # Test if it actually opened
        if not self.stream.isOpened():
            logger.error(f"Failed to open camera source: {src}")
            self.grabbed = False
            self.frame = None
        else:
            self.grabbed, self.frame = self.stream.read()
        
        self.stopped = False
        self.thread = None

    def start(self):
        if not self.stream.isOpened():
            return self
        self.stopped = False
        self.thread = threading.Thread(target=self.update, daemon=True)
        self.thread.start()
        logger.info(f"Camera Stream started: {self.src}")
        return self

    def update(self):
        while True:
            if self.stopped:
                return
            (self.grabbed, self.frame) = self.stream.read()

    def read(self):
        if self.frame is not None:
            return self.grabbed, self.frame.copy()
        return False, None

    def release(self):
        self.stopped = True
        if self.thread is not None:
            self.thread.join(timeout=1.0)
        if self.stream.isOpened():
            self.stream.release()
        logger.info(f"Camera Stream stopped: {self.src}")

class CameraManager:
    """Manages multiple camera instances active at once."""
    def __init__(self):
        self.cameras = {}   # Dict holding { "camera_id": CameraStream }
        self.lock = threading.Lock()

    def get_camera(self, camera_id):
        """Returns the streaming instance of the camera or starts one."""
        with self.lock:
            # Add logic: if the camera_id is an integer or string that represents int
            src = camera_id
            if isinstance(src, str) and src.isdigit():
                src = int(src)
                
            if camera_id not in self.cameras:
                logger.info(f"Initializing new camera: {camera_id}")
                cam = CameraStream(src)
                cam.start()
                self.cameras[camera_id] = cam
            return self.cameras[camera_id]

    def stop_camera(self, camera_id):
        with self.lock:
            if camera_id in self.cameras:
                self.cameras[camera_id].release()
                del self.cameras[camera_id]
                return True
            return False

    def release_all(self):
        with self.lock:
            for cam_id in list(self.cameras.keys()):
                self.cameras[cam_id].release()
            self.cameras.clear()

# Global manager instance to be imported by the server
manager = CameraManager()
