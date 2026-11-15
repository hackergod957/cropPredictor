from src.data.soilgrids import fetch_soil
from src.data.nasapower import fetch_climate
import time

points = [(41.95, -93.95), (30.90, 75.60), (27.60, 84.35), (47.50, 1.80)]

for lat, lon in points:
    print((lat, lon), fetch_soil(lat, lon))
    print(fetch_climate(27.71, 85.32)["rainfall"])
    time.sleep(12)  # public API is rate limited (~5 calls/min)