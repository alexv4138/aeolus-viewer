"""Example local producer. Replace the generated values with a real sensor adapter."""
import json
import os
import time
import urllib.request
from datetime import datetime, timezone

URL = os.getenv("AGGREGATOR_URL", "http://127.0.0.1:8787/v1/readings")
TURBINE_ID = os.getenv("TURBINE_ID", "turbine-01")
SENSOR_ID = os.getenv("SENSOR_ID", "local-demo-script")

while True:
    payload = {
        "turbineId": TURBINE_ID,
        "sensorId": SENSOR_ID,
        "observedAt": datetime.now(timezone.utc).isoformat(),
        "readings": {
            "windSpeed": {"value": 6.2, "unit": "m/s"},
            "rotorSpeed": {"value": 18.4, "unit": "rpm"},
            "generatorTemperature": {"value": 42.1, "unit": "°C"},
        },
    }
    request = urllib.request.Request(URL, data=json.dumps(payload).encode(), headers={"content-type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=5) as response:
        print(response.status, response.read().decode())
    time.sleep(5)
