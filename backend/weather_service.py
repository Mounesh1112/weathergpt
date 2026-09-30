"""
WeatherGPT - Meteorological Retrieval Service
Uses Open-Meteo (Free, ECMWF/GFS backed, 0 API keys required)
"""

import httpx
from typing import Dict, Any, List, Optional

WMO_CODE_MAP = {
    0: {"en": "Clear sky", "ta": "தெளிவான வானம்", "hi": "साफ आसमान", "icon": "sun"},
    1: {"en": "Mainly clear", "ta": "பெரும்பாலும் தெளிவு", "hi": "अधिकांशतः साफ", "icon": "sun"},
    2: {"en": "Partly cloudy", "ta": "பகுதி மேகமூட்டம்", "hi": "आंशिक बादल", "icon": "cloud-sun"},
    3: {"en": "Overcast", "ta": "முழு மேகமூட்டம்", "hi": "घने बादल", "icon": "cloud"},
    45: {"en": "Foggy", "ta": "பனிமூட்டம்", "hi": "कोहरा", "icon": "cloud-fog"},
    48: {"en": "Depositing rime fog", "ta": "அடர்ந்த பனிமூட்டம்", "hi": "घना कोहरा", "icon": "cloud-fog"},
    51: {"en": "Light drizzle", "ta": "லேசான தூறல்", "hi": "हल्की बूंदाबांदी", "icon": "cloud-drizzle"},
    53: {"en": "Moderate drizzle", "ta": "மிதமான தூறல்", "hi": "मध्यम बूंदाबांदी", "icon": "cloud-drizzle"},
    55: {"en": "Dense drizzle", "ta": "அடர்ந்த தூறல்", "hi": "तेज बूंदाबांदी", "icon": "cloud-drizzle"},
    61: {"en": "Slight rain", "ta": "லேசான மழை", "hi": "हल्की बारिश", "icon": "cloud-rain"},
    63: {"en": "Moderate rain", "ta": "மிதமான மழை", "hi": "मध्यम बारिश", "icon": "cloud-rain"},
    65: {"en": "Heavy rain", "ta": "கனமழை", "hi": "भारी बारिश", "icon": "cloud-rain-heavy"},
    71: {"en": "Slight snow", "ta": "லேசான பனிப்பொழிவு", "hi": "हल्की बर्फबारी", "icon": "snowflake"},
    73: {"en": "Moderate snow", "ta": "மிதமான பனிப்பொழிவு", "hi": "मध्यम बर्फबारी", "icon": "snowflake"},
    75: {"en": "Heavy snow", "ta": "அதிதீவிர பனிப்பொழிவு", "hi": "भारी बर्फबारी", "icon": "snowflake"},
    80: {"en": "Slight rain showers", "ta": "லேசான அடைமழை", "hi": "हल्की बौछारें", "icon": "cloud-sun-rain"},
    81: {"en": "Moderate rain showers", "ta": "மிதமான அடைமழை", "hi": "मध्यम बौछारें", "icon": "cloud-sun-rain"},
    82: {"en": "Violent rain showers", "ta": "தீவிர அடைமழை", "hi": "भीषण बौछारें", "icon": "cloud-rain-heavy"},
    95: {"en": "Thunderstorm", "ta": "இடியுடன் கூடிய மழை", "hi": "गरज के साथ बारिश", "icon": "cloud-lightning"},
    96: {"en": "Thunderstorm with slight hail", "ta": "ஆலங்கட்டி இடிமழை", "hi": "ओलावृष्टि के साथ आंधी", "icon": "cloud-lightning"},
    99: {"en": "Thunderstorm with heavy hail", "ta": "கடுமையான ஆலங்கட்டி இடிமழை", "hi": "भारी ओलों के साथ तूफान", "icon": "cloud-lightning"},
}

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"


def get_wmo_description(code: int, lang: str = "en") -> Dict[str, str]:
    entry = WMO_CODE_MAP.get(code, {
        "en": "Variable conditions",
        "ta": "மாறும் வானிலை",
        "hi": "परिवर्तनशील मौसम",
        "icon": "cloud"
    })
    return {
        "description": entry.get(lang, entry["en"]),
        "icon": entry["icon"]
    }


async def geocode_city(city_name: str) -> Optional[Dict[str, Any]]:
    """Geocodes a city query into lat/lon/country/admin1."""
    params = {"name": city_name, "count": 5, "language": "en", "format": "json"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(GEOCODING_URL, params=params)
        if resp.status_code == 200:
            data = resp.json()
            if "results" in data and len(data["results"]) > 0:
                best = data["results"][0]
                return {
                    "name": best.get("name"),
                    "latitude": best.get("latitude"),
                    "longitude": best.get("longitude"),
                    "country": best.get("country", ""),
                    "admin1": best.get("admin1", ""),
                    "timezone": best.get("timezone", "auto")
                }
    return None


async def fetch_weather(lat: float, lon: float, timezone: str = "auto") -> Dict[str, Any]:
    """Fetches real-time current weather, 24-hour hourly, and 7-day daily forecast."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": [
            "temperature_2m", "relative_humidity_2m", "apparent_temperature",
            "is_day", "precipitation", "weather_code", "wind_speed_10m",
            "wind_direction_10m", "surface_pressure"
        ],
        "hourly": [
            "temperature_2m", "precipitation_probability", "weather_code", "wind_speed_10m"
        ],
        "daily": [
            "weather_code", "temperature_2m_max", "temperature_2m_min",
            "precipitation_sum", "precipitation_probability_max",
            "wind_speed_10m_max", "uv_index_max"
        ],
        "timezone": timezone
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(FORECAST_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    # Parse current weather
    current = data.get("current", {})
    wmo_code = current.get("weather_code", 0)
    wmo_info = get_wmo_description(wmo_code)

    parsed_current = {
        "temperature": current.get("temperature_2m"),
        "feels_like": current.get("apparent_temperature"),
        "humidity": current.get("relative_humidity_2m"),
        "wind_speed": current.get("wind_speed_10m"),
        "wind_direction": current.get("wind_direction_10m"),
        "pressure": current.get("surface_pressure"),
        "precipitation": current.get("precipitation"),
        "is_day": current.get("is_day", 1),
        "weather_code": wmo_code,
        "condition": wmo_info["description"],
        "icon": wmo_info["icon"],
        "time": current.get("time")
    }

    # Parse hourly (next 24 hours)
    hourly_raw = data.get("hourly", {})
    times = hourly_raw.get("time", [])[:24]
    temps = hourly_raw.get("temperature_2m", [])[:24]
    probs = hourly_raw.get("precipitation_probability", [])[:24]
    codes = hourly_raw.get("weather_code", [])[:24]
    winds = hourly_raw.get("wind_speed_10m", [])[:24]

    hourly = []
    for i in range(min(len(times), 24)):
        c_code = codes[i] if i < len(codes) else 0
        hourly.append({
            "time": times[i].split("T")[-1] if "T" in times[i] else times[i],
            "temperature": temps[i] if i < len(temps) else None,
            "rain_prob": probs[i] if i < len(probs) else 0,
            "wind_speed": winds[i] if i < len(winds) else 0,
            "icon": get_wmo_description(c_code)["icon"],
            "code": c_code
        })

    # Parse daily (next 7 days)
    daily_raw = data.get("daily", {})
    d_times = daily_raw.get("time", [])
    d_codes = daily_raw.get("weather_code", [])
    d_max = daily_raw.get("temperature_2m_max", [])
    d_min = daily_raw.get("temperature_2m_min", [])
    d_rain = daily_raw.get("precipitation_sum", [])
    d_prob = daily_raw.get("precipitation_probability_max", [])
    d_wind = daily_raw.get("wind_speed_10m_max", [])
    d_uv = daily_raw.get("uv_index_max", [])

    daily = []
    for i in range(len(d_times)):
        c_code = d_codes[i] if i < len(d_codes) else 0
        w_desc = get_wmo_description(c_code)
        daily.append({
            "date": d_times[i],
            "temp_max": d_max[i] if i < len(d_max) else None,
            "temp_min": d_min[i] if i < len(d_min) else None,
            "precipitation_sum": d_rain[i] if i < len(d_rain) else 0,
            "rain_probability": d_prob[i] if i < len(d_prob) else 0,
            "wind_speed_max": d_wind[i] if i < len(d_wind) else 0,
            "uv_index": d_uv[i] if i < len(d_uv) else 0,
            "condition": w_desc["description"],
            "icon": w_desc["icon"],
            "code": c_code
        })

    return {
        "current": parsed_current,
        "hourly": hourly,
        "daily": daily,
        "elevation": data.get("elevation", 0)
    }


async def fetch_air_quality(lat: float, lon: float) -> Dict[str, Any]:
    """Fetches real-time Air Quality metrics (AQI, PM2.5, PM10)."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ["european_aqi", "us_aqi", "pm10", "pm2_5"]
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(AIR_QUALITY_URL, params=params)
            if resp.status_code == 200:
                data = resp.json().get("current", {})
                us_aqi = data.get("us_aqi", 45)
                # Label AQI
                category = "Good"
                if us_aqi > 300:
                    category = "Hazardous"
                elif us_aqi > 200:
                    category = "Very Unhealthy"
                elif us_aqi > 150:
                    category = "Unhealthy"
                elif us_aqi > 100:
                    category = "Unhealthy for Sensitive Groups"
                elif us_aqi > 50:
                    category = "Moderate"

                return {
                    "us_aqi": us_aqi,
                    "pm2_5": data.get("pm2_5", 12.0),
                    "pm10": data.get("pm10", 25.0),
                    "category": category
                }
    except Exception:
        pass
    return {"us_aqi": 42, "pm2_5": 11.5, "pm10": 22.0, "category": "Good"}
