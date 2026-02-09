from typing import Dict, Any, List
import random
import time

from adapter_base import Adapter


class SmartGlassesAdapter(Adapter):
    id = "smart-glasses-mock"
    name = "Smart Glasses (Mock)"
    version = "0.1.0"

    def __init__(self):
        self.connected = False
        self.device = {
            "id": "glasses-001",
            "name": "VisionGlass X",
            "vendor": "Acme",
            "model": "VX-1",
            "protocol": "REST"
        }
        self.battery = 0.8
        self.last_ping = None

    def capabilities(self) -> Dict[str, Any]:
        return {
            "read": ["battery", "status", "imu.yaw", "imu.pitch", "imu.roll"],
            "write": ["vibrate", "display_text", "set_brightness"]
        }

    def discover(self) -> List[Dict[str, Any]]:
        return [self.device]

    def connect(self, config: Dict[str, Any]) -> bool:
        self.connected = True
        self.last_ping = time.time()
        return True

    def read(self) -> Dict[str, Any]:
        if not self.connected:
            return {"error": "not connected"}
            
        self.battery = max(0.0, self.battery - 0.001)
        return {
            "device": self.device,
            "state": {
                "battery": round(self.battery, 3),
                "status": "ready",
                "imu.yaw": round(random.uniform(-15, 15), 2),
                "imu.pitch": round(random.uniform(-10, 10), 2),
                "imu.roll": round(random.uniform(-8, 8), 2)
            }
        }

    def write(self, command: Dict[str, Any]) -> Dict[str, Any]:
        if not self.connected:
            return {"error": "not connected"}
        return {"ok": True, "echo": command}

ADAPTERS = [SmartGlassesAdapter()]
