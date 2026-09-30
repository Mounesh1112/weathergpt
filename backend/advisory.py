"""
WeatherGPT - Domain Decision Support Engine
Generates Agricultural, Commute, and Outdoor advisories based on meteorological metrics.
"""

from typing import Dict, Any, List

def evaluate_agriculture_advisory(weather_data: Dict[str, Any], crop: str = "tomato", lang: str = "en") -> Dict[str, Any]:
    """Evaluates crop-specific spray, irrigation, and disease risk advisories."""
    current = weather_data.get("current", {})
    hourly = weather_data.get("hourly", [])
    daily = weather_data.get("daily", [])

    temp = current.get("temperature", 28.0)
    humidity = current.get("humidity", 65.0)
    wind_speed = current.get("wind_speed", 10.0)

    # Next 12-hour max rain probability
    next_12h_probs = [h.get("rain_prob", 0) for h in hourly[:12]]
    max_rain_prob_12h = max(next_12h_probs) if next_12h_probs else 0

    # Next 48-hour total rain
    rain_48h = sum([d.get("precipitation_sum", 0) for d in daily[:2]]) if daily else 0.0

    # 1. Spray Suitability
    spray_suitable = True
    spray_reasons = []

    if wind_speed > 15.0:
        spray_suitable = False
        spray_reasons.append(f"High wind speed ({wind_speed} km/h) causes chemical drift.")
    if max_rain_prob_12h > 30:
        spray_suitable = False
        spray_reasons.append(f"High rain probability ({max_rain_prob_12h}%) will wash away pesticides.")
    if temp > 35.0:
        spray_suitable = False
        spray_reasons.append(f"High temperature ({temp}°C) accelerates chemical evaporation/leaf scorch.")

    if spray_suitable:
        spray_status = "Optimal Window"
        spray_color = "emerald"
        spray_advisory = "Conditions are ideal for foliar spray and pesticide application. Low wind and dry canopy expected."
    else:
        spray_status = "Unsuitable / High Risk"
        spray_color = "amber"
        spray_advisory = "Delay spraying. " + " ".join(spray_reasons)

    # 2. Irrigation Advice
    if rain_48h > 15.0:
        irrigation_status = "Postpone Irrigation"
        irrigation_color = "blue"
        irrigation_advisory = f"Significant rainfall (~{rain_48h:.1f} mm) is expected over the next 48 hours. Avoid waterlogging; save irrigation energy."
    elif rain_48h > 5.0:
        irrigation_status = "Light / Selective Irrigation"
        irrigation_color = "sky"
        irrigation_advisory = f"Moderate rain (~{rain_48h:.1f} mm) forecasted. Monitor soil moisture before running pumps."
    else:
        irrigation_status = "Irrigation Recommended"
        irrigation_color = "emerald"
        irrigation_advisory = f"Dry period ahead with minimal rain ({rain_48h:.1f} mm). Maintain optimal root-zone moisture for {crop.capitalize()}."

    # 3. Disease & Fungal Risk
    if humidity > 80 and temp > 24:
        disease_risk = "Elevated Risk"
        disease_color = "rose"
        disease_advisory = f"High relative humidity ({humidity}%) and warm temperature ({temp}°C) create favorable conditions for fungal pathogens (e.g. blight, powdery mildew) in {crop.capitalize()}."
    elif humidity > 70:
        disease_risk = "Moderate Risk"
        disease_color = "amber"
        disease_advisory = f"Moderate humidity levels ({humidity}%). Regularly scout field borders and crop underside."
    else:
        disease_risk = "Low Risk"
        disease_color = "emerald"
        disease_advisory = "Atmospheric conditions are dry and unfavorable for airborne fungal spore propagation."

    # Multilingual translations for summary if requested
    if lang == "ta":
        if spray_suitable:
            spray_advisory_ta = "மருந்து தெளிப்பதற்கு உகந்த நேரம். குறைவான காற்று மற்றும் மழை வாய்ப்பு குறைவு."
        else:
            spray_advisory_ta = f"மருந்து தெளிப்பதை தள்ளிப்போடவும். காற்று ({wind_speed} கி.மீ/ம) அல்லது மழை வாய்ப்பு ({max_rain_prob_12h}%) அதிகம்."
        return {
            "crop": crop,
            "spray_status": "பொருத்தமானது" if spray_suitable else "தவிர்க்கவும்",
            "spray_color": spray_color,
            "spray_advisory": spray_advisory_ta,
            "irrigation_status": "பாசனம் தேவை" if rain_48h <= 5.0 else "பாசனம் தள்ளிவைக்கவும்",
            "irrigation_color": irrigation_color,
            "irrigation_advisory": f"அடுத்த 48 மணிநேரத்தில் எதிர்பார்க்கப்படும் மழை: {rain_48h:.1f} மி.மீ.",
            "disease_risk": disease_risk,
            "disease_color": disease_color,
            "disease_advisory": disease_advisory
        }
    elif lang == "hi":
        if spray_suitable:
            spray_advisory_hi = "कीटनाशक छिड़काव के लिए मौसम अनुकूल है। हवा की गति कम है और बारिश की संभावना नहीं है।"
        else:
            spray_advisory_hi = f"छिड़काव टालें। तेज हवा ({wind_speed} km/h) या बारिश की संभावना ({max_rain_prob_12h}%) है।"
        return {
            "crop": crop,
            "spray_status": "अनुकूल" if spray_suitable else "छिड़काव से बचें",
            "spray_color": spray_color,
            "spray_advisory": spray_advisory_hi,
            "irrigation_status": "सिंचाई की सलाह" if rain_48h <= 5.0 else "सिंचाई टालें",
            "irrigation_color": irrigation_color,
            "irrigation_advisory": f"अगले 48 घंटों में संभावित वर्षा: {rain_48h:.1f} मिमी.",
            "disease_risk": disease_risk,
            "disease_color": disease_color,
            "disease_advisory": disease_advisory
        }

    return {
        "crop": crop,
        "spray_status": spray_status,
        "spray_color": spray_color,
        "spray_advisory": spray_advisory,
        "irrigation_status": irrigation_status,
        "irrigation_color": irrigation_color,
        "irrigation_advisory": irrigation_advisory,
        "disease_risk": disease_risk,
        "disease_color": disease_color,
        "disease_advisory": disease_advisory,
        "metrics": {
            "wind_speed": wind_speed,
            "humidity": humidity,
            "temp": temp,
            "max_rain_prob_12h": max_rain_prob_12h,
            "rain_48h": round(rain_48h, 1)
        }
    }


def evaluate_travel_advisory(weather_data: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluates umbrella, commute, and road safety advisories."""
    current = weather_data.get("current", {})
    hourly = weather_data.get("hourly", [])

    rain_probs = [h.get("rain_prob", 0) for h in hourly[:12]]
    max_rain = max(rain_probs) if rain_probs else 0
    wmo_code = current.get("weather_code", 0)
    wind_speed = current.get("wind_speed", 0)

    umbrella_needed = max_rain > 35 or current.get("precipitation", 0) > 0.2
    travel_caution = wmo_code in [45, 48, 65, 82, 95, 96, 99] or wind_speed > 40

    if umbrella_needed:
        umbrella_text = "Yes, carry an umbrella. Rain probability reaches up to " + f"{max_rain}% today."
    else:
        umbrella_text = "Umbrella not needed. Weather is expected to remain largely dry."

    if travel_caution:
        commute_text = "Exercise caution while driving: reduced visibility or slippery road conditions anticipated."
        commute_color = "amber"
    else:
        commute_text = "Road conditions normal. Favorable conditions for daily commute and travel."
        commute_color = "emerald"

    return {
        "umbrella_needed": umbrella_needed,
        "umbrella_text": umbrella_text,
        "commute_text": commute_text,
        "commute_color": commute_color,
        "max_rain_prob": max_rain
    }
