import asyncio
import sys
import os

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from weather_service import geocode_city, fetch_weather, fetch_air_quality
from ai_engine import process_chat_query
from advisory import evaluate_agriculture_advisory, evaluate_travel_advisory
from alerts import analyze_severe_alerts

async def test_all():
    print("=== Testing Geocoding ===")
    geo = await geocode_city("Madurai")
    assert geo is not None, "Failed to geocode Madurai"
    print(f"Geocoded: {geo['name']} ({geo['latitude']}, {geo['longitude']}) - {geo['country']}")

    print("\n=== Testing Live Weather Fetch (Open-Meteo) ===")
    weather = await fetch_weather(geo["latitude"], geo["longitude"])
    curr = weather["current"]
    print(f"Temp: {curr['temperature']}C, Condition: {curr['condition']}, Humidity: {curr['humidity']}%")
    assert len(weather["hourly"]) > 0, "Hourly forecast empty"
    assert len(weather["daily"]) > 0, "Daily forecast empty"

    print("\n=== Testing Air Quality ===")
    aq = await fetch_air_quality(geo["latitude"], geo["longitude"])
    print(f"AQI: {aq['us_aqi']} ({aq['category']}), PM2.5: {aq['pm2_5']}")

    print("\n=== Testing Agriculture Advisory ===")
    agri = evaluate_agriculture_advisory(weather, crop="tomato", lang="en")
    print(f"Spray Status: {agri['spray_status']}")
    print(f"Irrigation: {agri['irrigation_status']}")

    print("\n=== Testing Alerts Distinction ===")
    alerts = analyze_severe_alerts(weather, "Madurai")
    for a in alerts:
        print(f"Alert Type: [{a['type']}] - {a['title']}")

    print("\n=== Testing Conversational AI (English) ===")
    chat1 = await process_chat_query("Will it rain tomorrow in Madurai?")
    print(f"Q: Will it rain tomorrow in Madurai?\nA: {chat1['response']}")

    print("\n=== Testing Conversational AI (Tamil) ===")
    chat2 = await process_chat_query("நாளைக்கு மழை பெய்யுமா?")
    print(f"Q: நாளைக்கு மழை பெய்யுமா?\nA: {chat2['response']}")

    print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_all())
