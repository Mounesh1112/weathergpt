"""
WeatherGPT - Grounded Conversational AI Engine
Performs intent detection, entity extraction (location, time),
retrieves meteorological grounding, and synthesizes contextual multilingual responses.
"""

import os
import re
from typing import Dict, Any, Optional

from weather_service import geocode_city, fetch_weather, get_wmo_description
from advisory import evaluate_agriculture_advisory, evaluate_travel_advisory

# Simple language detection
def detect_language(query: str) -> str:
    # Check for Tamil Unicode range \u0B80-\u0BFF
    if re.search(r'[\u0B80-\u0BFF]', query):
        return "ta"
    # Check for Devanagari Unicode range \u0900-\u097F
    if re.search(r'[\u0900-\u097F]', query):
        return "hi"
    return "en"

# Extract city name heuristics if specified in query
def extract_location(query: str, fallback_city: str = "Madurai") -> str:
    # Patterns like "in <City>", "at <City>", "for <City>"
    match = re.search(r'\b(?:in|at|for|near)\s+([A-Za-z\s]+?)(?:\s+(?:tomorrow|today|tonight|this|now|\?|$))', query, re.IGNORECASE)
    if match:
        city = match.group(1).strip()
        if len(city) > 2 and city.lower() not in ["the", "my", "our", "an"]:
            return city

    # Tamil patterns (e.g., "மதுரையில்", "சென்னையில்")
    if "மதுரை" in query:
        return "Madurai"
    if "சென்னை" in query:
        return "Chennai"
    if "கோவை" in query or "கோயம்புத்தூர்" in query:
        return "Coimbatore"
    if "திருச்சி" in query:
        return "Tiruchirappalli"

    # Hindi patterns
    if "मदुरै" in query:
        return "Madurai"
    if "चेन्नई" in query:
        return "Chennai"
    if "दिल्ली" in query:
        return "Delhi"
    if "मुंबई" in query:
        return "Mumbai"

    # Check standalone common city mentions
    common_cities = ["Madurai", "Chennai", "Coimbatore", "Bangalore", "Bengaluru", "Hyderabad", "Delhi", "Mumbai", "Kolkata", "Tirunelveli", "Salem", "Trichy", "London", "New York", "Tokyo", "Paris"]
    for c in common_cities:
        if re.search(rf'\b{c}\b', query, re.IGNORECASE):
            return c

    return fallback_city

# Detect intent
def extract_intent(query: str) -> Dict[str, Any]:
    q = query.lower()
    intent = "general_forecast"
    time_frame = "today"

    if any(w in q for w in ["tomorrow", "நாளை", "कल"]):
        time_frame = "tomorrow"
    elif any(w in q for w in ["tonight", "night", "இரவு", "रात"]):
        time_frame = "tonight"

    if any(w in q for w in ["rain", "rainy", "raining", "shower", "மழை", "மழையா", "மழை பெய்யுமா", "बारिश", "बरसात"]):
        intent = "rain"
    elif any(w in q for w in ["temp", "temperature", "hot", "cold", "heat", "வெப்பம்", "சூடு", "குளிர்", "तापमान", "गर्मी", "सर्दी"]):
        intent = "temperature"
    elif any(w in q for w in ["umbrella", "குடை", "छाता"]):
        intent = "umbrella"
    elif any(w in q for w in ["spray", "pesticide", "fertilizer", "மருந்து", "பூச்சிக்கொல்லி", "कीटनाशक", "छिड़काव"]):
        intent = "pesticide"
    elif any(w in q for w in ["water", "irrigate", "irrigation", "பாசனம்", "தண்ணீர்", "सिंचाई"]):
        intent = "irrigation"
    elif any(w in q for w in ["travel", "drive", "trip", "road", "பயணம்", "ரோடு", "यात्रा", "सफर"]):
        intent = "travel"
    elif any(w in q for w in ["wind", "storm", "cyclone", "காற்று", "புயல்", "हवा", "आंधी", "तूफान"]):
        intent = "wind"

    return {"intent": intent, "time_frame": time_frame}


async def process_chat_query(user_query: str, current_city: str = "Madurai") -> Dict[str, Any]:
    """
    Main Grounded Processing Pipeline:
    1. Language Detection
    2. Intent & Entity (Location, Time) Extraction
    3. Live Meteorological Retrieval (Open-Meteo)
    4. Grounded Reasoning Response Synthesis
    """
    lang = detect_language(user_query)
    target_city = extract_location(user_query, current_city)
    intent_info = extract_intent(user_query)
    intent = intent_info["intent"]
    time_frame = intent_info["time_frame"]

    # Retrieve Geocoding & Weather Data
    geo = await geocode_city(target_city)
    if not geo:
        # Fallback to current city if geocoding fails
        target_city = current_city
        geo = await geocode_city(target_city)

    if not geo:
        return {
            "query": user_query,
            "response": f"I could not locate '{target_city}'. Please verify the spelling or choose another location.",
            "lang": lang,
            "city": target_city,
            "intent": intent,
            "grounded": False
        }

    weather = await fetch_weather(geo["latitude"], geo["longitude"], geo["timezone"])
    current = weather.get("current", {})
    daily = weather.get("daily", [])

    # Select day based on time_frame
    day_idx = 1 if time_frame == "tomorrow" and len(daily) > 1 else 0
    target_day = daily[day_idx] if daily else {}

    temp_now = current.get("temperature", 28)
    condition_now = current.get("condition", "Partly Cloudy")
    rain_prob = target_day.get("rain_probability", 0)
    rain_sum = target_day.get("precipitation_sum", 0)
    temp_max = target_day.get("temp_max", temp_now)
    temp_min = target_day.get("temp_min", temp_now)
    wind_speed = target_day.get("wind_speed_max", current.get("wind_speed", 10))

    # Grounded answer synthesis
    answer = ""

    if lang == "ta":
        # Tamil Grounded Responses
        time_ta = "நாளை" if time_frame == "tomorrow" else "இன்று"
        if intent == "rain":
            if rain_prob > 50:
                answer = f"{target_city}-ல் {time_ta} மழை பெய்வதற்கான சாத்தியக்கூறு அதிகம் உள்ளது ({rain_prob}% வாய்ப்பு, சுமார் {rain_sum} மி.மீ மழை எதிர்பார்க்கப்படுகிறது). வெளியே செல்லும்போது குடை அல்லது மழைக்கோட் உடன் செல்வது நல்லது."
            elif rain_prob > 20:
                answer = f"{target_city}-ல் {time_ta} லேசான தூறல் அல்லது மேகமூட்டம் இருக்க வாய்ப்புள்ளது ({rain_prob}% வாய்ப்பு). கடுமையான மழைக்கான வாய்ப்பு குறைவாகவே உள்ளது."
            else:
                answer = f"{target_city}-ல் {time_ta} மழைக்கான வாய்ப்பு மிகக் குறைவு ({rain_prob}%). வானிலை பெரும்பாலும் தெளிவாகவும் வறண்டதாகவும் இருக்கும்."
        elif intent == "temperature":
            answer = f"{target_city}-ல் {time_ta} அதிகபட்ச வெப்பநிலை {temp_max}°C ஆகவும், குறைந்தபட்ச வெப்பநிலை {temp_min}°C ஆகவும் இருக்கும். தற்போதுள்ள வெப்பநிலை {temp_now}°C ({condition_now})."
        elif intent == "umbrella":
            if rain_prob > 40:
                answer = f"ஆம்! {target_city}-ல் {time_ta} மழை பெய்ய {rain_prob}% வாய்ப்பு இருப்பதால் நீங்கள் கண்டிப்பாக குடை எடுத்துச் செல்வது நல்லது."
            else:
                answer = f"குடை எடுத்துச் செல்ல வேண்டிய அவசியமில்லை. {target_city}-ல் {time_ta} மழை வாய்ப்பு குறைவுதான் ({rain_prob}%)."
        elif intent == "pesticide":
            agri = evaluate_agriculture_advisory(weather, "crop", lang="ta")
            answer = f"வேளாண் ஆலோசனை ({target_city}): {agri['spray_advisory']} (காற்றின் வேகம்: {wind_speed} கி.மீ/ம, மழை வாய்ப்பு: {rain_prob}%)."
        elif intent == "irrigation":
            agri = evaluate_agriculture_advisory(weather, "crop", lang="ta")
            answer = f"பாசன ஆலோசனை ({target_city}): {agri['irrigation_status']}. {agri['irrigation_advisory']}"
        elif intent == "travel":
            answer = f"பயண ஆலோசனை ({target_city}): {time_ta} வானிலை நிலை {condition_now}, காற்றின் வேகம் {wind_speed} கி.மீ/ம. சாலைகள் இயல்பாக இருக்கும்."
        else:
            answer = f"{target_city}-ல் {time_ta} வானிலை: நிலைமை '{condition_now}', வெப்பநிலை {temp_max}°C முதல் {temp_min}°C வரை. மழை பெய்யும் வாய்ப்பு {rain_prob}%."

    elif lang == "hi":
        # Hindi Grounded Responses
        time_hi = "कल" if time_frame == "tomorrow" else "आज"
        if intent == "rain":
            if rain_prob > 50:
                answer = f"{target_city} में {time_hi} बारिश की प्रबल संभावना है ({rain_prob}% संभावना, लगभग {rain_sum} मिमी बारिश)। बाहर निकलते समय छाता साथ रखें।"
            elif rain_prob > 20:
                answer = f"{target_city} में {time_hi} हल्की बूंदाबांदी हो सकती है ({rain_prob}% संभावना)। भारी बारिश का अनुमान नहीं है।"
            else:
                answer = f"{target_city} में {time_hi} बारिश की संभावना बहुत कम है ({rain_prob}%)। मौसम मुख्यतः साफ और शुष्क रहेगा।"
        elif intent == "temperature":
            answer = f"{target_city} में {time_hi} अधिकतम तापमान लगभग {temp_max}°C और न्यूनतम तापमान {temp_min}°C रहेगा। वर्तमान तापमान {temp_now}°C है।"
        elif intent == "umbrella":
            if rain_prob > 40:
                answer = f"हाँ, छाता साथ रखना बेहतर होगा। {target_city} में {time_hi} बारिश की संभावना {rain_prob}% है।"
            else:
                answer = f"छाते की आवश्यकता नहीं है। {target_city} में {time_hi} बारिश की संभावना केवल {rain_prob}% है।"
        elif intent in ["pesticide", "spray"]:
            agri = evaluate_agriculture_advisory(weather, "crop", lang="hi")
            answer = f"कृषि परामर्श ({target_city}): {agri['spray_advisory']} (हवा: {wind_speed} किमी/घंटा, बारिश की संभावना: {rain_prob}%)।"
        elif intent == "irrigation":
            agri = evaluate_agriculture_advisory(weather, "crop", lang="hi")
            answer = f"सिंचाई परामर्श ({target_city}): {agri['irrigation_status']}. {agri['irrigation_advisory']}"
        else:
            answer = f"{target_city} में {time_hi} का मौसम: स्थिति '{condition_now}', तापमान {temp_min}°C से {temp_max}°C, और बारिश की संभावना {rain_prob}% है।"

    else:
        # English Grounded Responses
        time_str = "tomorrow" if time_frame == "tomorrow" else "today"
        if intent == "rain":
            if rain_prob > 60:
                answer = f"High probability of rain in {target_city} {time_str} ({rain_prob}% chance, ~{rain_sum} mm precipitation expected). Keep rain protection handy."
            elif rain_prob > 25:
                answer = f"Scattered light showers or overcast skies are possible in {target_city} {time_str} ({rain_prob}% chance). Heavy downpours are unlikely."
            else:
                answer = f"Dry conditions are expected in {target_city} {time_str}. Rain probability is low at {rain_prob}% with clear or mild cloud cover."
        elif intent == "temperature":
            answer = f"In {target_city}, expect highs around {temp_max}°C and lows near {temp_min}°C {time_str}. Current temperature is {temp_now}°C ({condition_now})."
        elif intent == "umbrella":
            trav = evaluate_travel_advisory(weather)
            answer = f"{trav['umbrella_text']} for {target_city} ({time_str})."
        elif intent == "pesticide":
            agri = evaluate_agriculture_advisory(weather, "crops", lang="en")
            answer = f"Agricultural Advisory ({target_city}): {agri['spray_advisory']} [Status: {agri['spray_status']} | Wind: {wind_speed} km/h | Rain Chance: {rain_prob}%]."
        elif intent == "irrigation":
            agri = evaluate_agriculture_advisory(weather, "crops", lang="en")
            answer = f"Irrigation Advisory ({target_city}): {agri['irrigation_advisory']} [Status: {agri['irrigation_status']}]."
        elif intent == "travel":
            trav = evaluate_travel_advisory(weather)
            answer = f"Travel & Road Safety Advisory ({target_city}): {trav['commute_text']} Wind speeds around {wind_speed} km/h."
        elif intent == "wind":
            answer = f"Wind speeds in {target_city} are expected up to {wind_speed} km/h {time_str}. " + ("Caution: gusty winds." if wind_speed > 35 else "Calm to moderate breezes.")
        else:
            answer = f"Weather forecast for {target_city} ({time_str}): {condition_now} with temperatures ranging from {temp_min}°C to {temp_max}°C. Rain probability is {rain_prob}% and wind is {wind_speed} km/h."

    return {
        "query": user_query,
        "response": answer,
        "lang": lang,
        "city": target_city,
        "coordinates": {"lat": geo["latitude"], "lon": geo["longitude"]},
        "intent": intent,
        "time_frame": time_frame,
        "grounded_data": {
            "temp": temp_now,
            "condition": condition_now,
            "rain_prob": rain_prob,
            "temp_max": temp_max,
            "temp_min": temp_min,
            "wind_speed": wind_speed
        },
        "grounded": True
    }
