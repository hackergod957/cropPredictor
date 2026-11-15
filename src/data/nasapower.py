import requests
import requests_cache

BASE = "https://power.larc.nasa.gov/api/temporal/climatology/point"

def fetch_climate(lat:float,lon:float) -> dict :


    params = {
    "parameters" :",".join(["T2M", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN", "RH2M"]),
    "community" : "AG",
    "latitude" : lat,
    "longitude" : lon,
    "format" : "JSON"
    }   

    
    req = requests_cache.CachedSession("data/raw/cache").get(BASE,params=params,timeout=(3, 8))

    req.raise_for_status()

    data = req.json()

    fill_value = data["header"]["fill_value"]

    climate = data["properties"]["parameter"]

    annual_values = {}

    for variable, values in climate.items():
        value = values["ANN"]

        if value == fill_value:
            raise ValueError(
                f"No data available for '{variable}' "
                f"(API returned fill value {fill_value})."
            )

        annual_values[variable] = value

    

    coordinates = data["geometry"]["coordinates"]

    return {
        "temperature" : annual_values["T2M"],
        "humidity" : annual_values["RH2M"],
        "rainfall" : annual_values["PRECTOTCORR"] * 30.4,
        "elevation" : coordinates[2] if len(coordinates) > 2 else None
    }

        
