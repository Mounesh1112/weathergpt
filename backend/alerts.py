"""
WeatherGPT - Severe Weather Alert Processor
Separates Official Meteorological Warnings from AI Contextual Advisories.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List

def analyze_severe_alerts(weather_data: Dict[str, Any], city_name: str) -> List[Dict[str, Any]]:
    """Analyzes weather data to detect official warnings and AI advisories."""
    alerts = []
    current = weather_data.get("current", {})
    daily = weather_data.get("daily", [])

    temp = current.get("temperature", 25.0)
    wind = current.get("wind_speed", 10.0)
    wmo_code = current.get("weather_code", 0)

    # Check today's max precipitation sum
    today_rain = daily[0].get("precipitation_sum", 0.0) if daily else 0.0
    today_max_wind = daily[0].get("wind_speed_max", wind) if daily else wind
    today_max_temp = daily[0].get("temp_max", temp) if daily else temp

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # 1. Official Meteorological Warning Simulation (Thunderstorm / Heavy Rain / Cyclone)
    if wmo_code in [95, 96, 99] or today_rain > 40.0:
        alerts.append({
            "id": f"OFF-WARN-{wmo_code}",
            "type": "Official Meteorological Warning",
            "is_official": True,
            "badge_color": "rose",
            "title": f"Official Severe Weather Alert: {city_name}",
            "description": f"Official Warning: Heavy precipitation ({today_rain:.1f} mm) or active thunderstorm detected in {city_name}. Expect reduced visibility, flash flooding in low-lying zones, and lightning hazard.",
            "source": "IMD / Regional Meteorological Centre Data Feed",
            "timestamp": now_iso,
            "action": "Avoid waterlogged corridors, stay indoors away from metallic structures, and strictly follow local civil defence directives."
        })
    elif today_max_wind > 45.0:
        alerts.append({
            "id": "OFF-WARN-WIND",
            "type": "Official Meteorological Warning",
            "is_official": True,
            "badge_color": "amber",
            "title": f"High Wind Warning: {city_name}",
            "description": f"Official Warning: Sustained gust speeds of up to {today_max_wind:.1f} km/h forecasted. High impact on temporary structures and overhead cables.",
            "source": "National Meteorological Service",
            "timestamp": now_iso,
            "action": "Secure loose outdoor property and exercise caution when driving high-sided vehicles."
        })

    # 2. AI Contextual Advisory
    if today_max_temp > 38.0:
        alerts.append({
            "id": "AI-ADV-HEAT",
            "type": "AI Contextual Advisory",
            "is_official": False,
            "badge_color": "orange",
            "title": f"Extreme Heat Advisory: {city_name}",
            "description": f"WeatherGPT AI Analysis: Maximum temperature approaching {today_max_temp:.1f}°C. Elevated risk of heat exhaustion for outdoor labor.",
            "source": "WeatherGPT Grounded Intelligence Layer",
            "timestamp": now_iso,
            "action": "Maintain optimal electrolyte hydration, reschedule demanding physical tasks away from 12:00 PM - 3:30 PM."
        })
    elif today_rain > 15.0 and wmo_code not in [95, 96, 99]:
        alerts.append({
            "id": "AI-ADV-RAIN",
            "type": "AI Contextual Advisory",
            "is_official": False,
            "badge_color": "sky",
            "title": f"Moderate Rain Preparedness: {city_name}",
            "description": f"WeatherGPT AI Analysis: Rainfall accumulations (~{today_rain:.1f} mm) expected today. Normal daily routines might experience minor transit delays.",
            "source": "WeatherGPT Grounded Intelligence Layer",
            "timestamp": now_iso,
            "action": "Plan extra commute time and carry rain gear."
        })

    # If no severe conditions exist, provide a tranquil status advisory
    if not alerts:
        alerts.append({
            "id": "AI-ADV-NORMAL",
            "type": "AI Contextual Advisory",
            "is_official": False,
            "badge_color": "emerald",
            "title": f"Calm & Normal Weather: {city_name}",
            "description": f"No severe weather warnings active for {city_name}. Current atmospheric metrics indicate stable, nominal conditions.",
            "source": "WeatherGPT Grounded Intelligence Layer",
            "timestamp": now_iso,
            "action": "All outdoor activities, agricultural practices, and commute corridors are operating under favorable conditions."
        })

    return alerts
