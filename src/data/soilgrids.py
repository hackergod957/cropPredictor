import requests
import requests_cache

URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
# Keep the optional soil lookup within the Express request budget.
DEFAULT_PH = 6.5
DEPTH = "0-5cm"


def fetch_soil(lat: float, lon: float) -> dict:
    params = {
        "lat": lat,
        "lon": lon,
        "property": "phh2o",
        "depth": DEPTH,
        "value": "mean",
    }

    try:
        req = requests_cache.CachedSession("data/raw/cache", expire_after=86400).get(URL, params=params, timeout=(2, 3))
        req.raise_for_status()

        layer = req.json()["properties"]["layers"][0]
        raw = layer["depths"][0]["values"]["mean"]

    except (requests.RequestException, KeyError, IndexError, ValueError):
        return {"ph": DEFAULT_PH, "ph_is_default": True}

    if raw is None:
        return {"ph": DEFAULT_PH, "ph_is_default": True}

    return {
        "ph": raw / layer["unit_measure"]["d_factor"],
        "ph_is_default": False,
    }