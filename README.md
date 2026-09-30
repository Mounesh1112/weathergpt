# 🌦️ WeatherGPT — AI-Powered Conversational Weather Intelligence Platform

> **"WeatherGPT doesn't just tell you the weather. It understands your question, retrieves verified meteorological data, and explains what that weather means for your decisions."**

---

## 🌟 Key Highlights & Innovations

1. **Grounded Meteorological AI (Zero Hallucination)**:
   - LLMs are never permitted to invent temperatures or rainfall numbers.
   - User Intent & Entities (Location, Date/Time) $\rightarrow$ Open-Meteo High-Resolution Numerical Data $\rightarrow$ Grounded Natural Language Synthesis.
2. **Domain Decision Support**:
   - **Agricultural Advisory Hub**: Precision evaluation of pesticide spray suitability (wind $< 15$ km/h, rain probability $< 30\%$), 48-hour irrigation scheduling, and fungal disease risk based on relative humidity.
   - **Travel & Commute Advisor**: Dynamic umbrella recommendation and road safety visibility index.
3. **Official Warning vs. AI Advisory Compliance**:
   - Strictly separates official government alerts (IMD / Regional Meteorological Centres) from heuristic AI contextual advisories.
4. **Multilingual & Voice-First Accessibility**:
   - Full support for English, Tamil (தமிழ்), and Hindi (हिन्दी).
   - Voice Input (Speech-to-Text via Web Speech API) + Voice Playback (Text-to-Speech).
5. **Interactive GIS Weather Map & Decadal Climate Analytics**:
   - Interactive Leaflet map with weather station markers.
   - 10-year historical climate trend chart (2017–2026) contrasting short-term weather from long-term climate warming.

---

## 🏗️ System Architecture

```text
                                  WEATHERGPT WEB APP
                     (Responsive Glassmorphic Dashboard & Voice Chat)
                                        │
                                        ▼
                               API / Client Gateway
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
     FastAPI Backend                                    Browser Direct Mode
  (REST Endpoints + AI Engine)                         (Zero setup static mode)
             │                                                     │
             └──────────────────────────┬──────────────────────────┘
                                        │
                                        ▼
                             Intent & Entity Extractor
                       (Location, Date, Time, Decision Type)
                                        │
                                        ▼
                             Open-Meteo Meteorological APIs
                       ├── Geocoding API (Global & Indian cities)
                       ├── Forecast API (Current, 24h Hourly, 7-Day)
                       ├── Air Quality API (PM2.5, PM10, AQI)
                       └── Historical Climate API (10-Year Trends)
                                        │
                                        ▼
                             Grounded Reasoning Engine
                       ├── Contextual Decision Advisories
                       │    ├── Agriculture (Pesticide, Irrigation, Crop Risk)
                       │    └── Travel & Commute (Rain, Umbrella, Visibility)
                       └── Official Alert Distinguisher (Official Warning vs AI Advisory)
                                        │
                                        ▼
                               Multilingual & Voice Engine
                       ├── Language Processor (English, தமிழ், हिन्दी)
                       └── Web Speech API (STT & TTS)
```

---

## 🚀 How to Run

### Method 1: Double-Click Runner (Windows)
Double-click `run.bat` in the root folder. It will launch the FastAPI server and open `http://localhost:8000`.

### Method 2: Python Command Line
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Open your browser at `http://localhost:8000`.

### Method 3: Instant Browser Mode (Zero Dependencies)
You can directly open `frontend/index.html` in Chrome, Edge, or Firefox. The application includes a resilient client-side grounding engine that connects directly to Open-Meteo APIs!

---

## 🎤 5-Minute Competition Demo Script

1. **Pitch**: Open with: *"Judges, current weather apps show raw numbers that rural farmers and daily commuters struggle to interpret. WeatherGPT converts numerical weather data into actionable decisions."*
2. **Demo 1 (Real-time Grounding)**: Type or speak: *"Will it rain tomorrow in Madurai?"* Show the exact probability retrieved from the live meteorological feed.
3. **Demo 2 (Multilingual Voice)**: Switch to Tamil and click the mic: *"நாளைக்கு மழை பெய்யுமா?"* Click **Speak** to demonstrate voice response in Tamil.
4. **Demo 3 (Agricultural Precision)**: Open the **Agri Advisory** tab. Switch between Tomato and Paddy. Show the pesticide spray window indicator calculating chemical drift risks based on real-time wind speed.
5. **Demo 4 (Official Alert Distinction)**: Point to the Severe Weather Banner: explain how the platform clearly marks official government warnings vs AI advisory summaries for disaster safety.
6. **Demo 5 (Decadal Climate Trend)**: Open the **10-Yr Climate** tab to demonstrate 10-year warming trends and precipitation shifts.

---

## 📁 Project Structure

```text
weathergpt/
├── backend/
│   ├── main.py              # FastAPI application & route definitions
│   ├── weather_service.py   # Open-Meteo retrieval & WMO weather mapping
│   ├── ai_engine.py         # Grounded NLP parser & multilingual response synthesis
│   ├── advisory.py          # Agricultural, Travel, and Commute decision logic
│   ├── alerts.py            # Severe alert analyzer separating official warnings
│   └── requirements.txt     # Backend dependencies
├── frontend/
│   ├── index.html           # Full Glassmorphic web dashboard
│   ├── app.js               # Client logic, STT/TTS voice, Leaflet GIS, Chart.js
│   └── styles.css           # Custom Glassmorphic design & animations
├── run.bat                  # One-click Windows runner
└── README.md                # Comprehensive documentation
```
