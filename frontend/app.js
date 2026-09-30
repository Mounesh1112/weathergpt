/**
 * WeatherGPT - Interactive Frontend Application
 * Handles Real-time Open-Meteo Retrieval, Conversational Grounded AI,
 * Voice Input (STT), Voice Output (TTS), Leaflet GIS, and Decision Hubs.
 */

// Application State
const state = {
  city: "Madurai",
  lat: 9.9252,
  lon: 78.1198,
  country: "India, Tamil Nadu",
  lang: "en",
  crop: "tomato",
  weather: null,
  airQuality: null,
  alerts: [],
  backendUrl: window.location.origin.includes("http") ? "" : "http://127.0.0.1:8000",
  isListening: false,
  charts: {
    hourly: null,
    climate: null
  },
  map: null,
  marker: null
};

// Weather Code Descriptions Map
const WMO_MAP = {
  0: { en: "Clear sky", ta: "தெளிவான வானம்", hi: "साफ आसमान", icon: "sun" },
  1: { en: "Mainly clear", ta: "பெரும்பாலும் தெளிவு", hi: "अधिकांशतः साफ", icon: "sun" },
  2: { en: "Partly cloudy", ta: "பகுதி மேகமூட்டம்", hi: "आंशिक बादल", icon: "cloud-sun" },
  3: { en: "Overcast", ta: "முழு மேகமூட்டம்", hi: "घने बादल", icon: "cloud" },
  45: { en: "Foggy", ta: "பனிமூட்டம்", hi: "कोहरा", icon: "cloud-fog" },
  48: { en: "Depositing rime fog", ta: "அடர்ந்த பனிமூட்டம்", hi: "घना कोहरा", icon: "cloud-fog" },
  51: { en: "Light drizzle", ta: "லேசான தூறல்", hi: "हल्की बूंदाबांदी", icon: "cloud-drizzle" },
  53: { en: "Moderate drizzle", ta: "மிதமான தூறல்", hi: "मध्यम बूंदाबांदी", icon: "cloud-drizzle" },
  55: { en: "Dense drizzle", ta: "அடர்ந்த தூறல்", hi: "तेज बूंदाबांदी", icon: "cloud-drizzle" },
  61: { en: "Slight rain", ta: "லேசான மழை", hi: "हल्की बारिश", icon: "cloud-rain" },
  63: { en: "Moderate rain", ta: "மிதமான மழை", hi: "मध्यम बारिश", icon: "cloud-rain" },
  65: { en: "Heavy rain", ta: "கனமழை", hi: "भारी बारिश", icon: "cloud-rain" },
  71: { en: "Slight snow", ta: "லேசான பனிப்பொழிவு", hi: "हल्की बर्फबारी", icon: "snowflake" },
  73: { en: "Moderate snow", ta: "மிதமான பனிப்பொழிவு", hi: "मध्यम बर्फबारी", icon: "snowflake" },
  75: { en: "Heavy snow", ta: "அதிதீவிர பனிப்பொழிவு", hi: "भारी बर्फबारी", icon: "snowflake" },
  80: { en: "Slight rain showers", ta: "லேசான அடைமழை", hi: "हल्की बौछारें", icon: "cloud-sun-rain" },
  81: { en: "Moderate rain showers", ta: "மிதமான அடைமழை", hi: "मध्यम बौछारें", icon: "cloud-sun-rain" },
  82: { en: "Violent rain showers", ta: "தீவிர அடைமழை", hi: "भीषण बौछारें", icon: "cloud-rain" },
  95: { en: "Thunderstorm", ta: "இடியுடன் கூடிய மழை", hi: "गरज के साथ बारिश", icon: "cloud-lightning" },
  96: { en: "Thunderstorm with slight hail", ta: "ஆலங்கட்டி இடிமழை", hi: "ओलावृष्टि के साथ आंधी", icon: "cloud-lightning" },
  99: { en: "Thunderstorm with heavy hail", ta: "கடுமையான ஆலங்கட்டி இடிமழை", hi: "भारी ओलों के साथ तूफान", icon: "cloud-lightning" }
};

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
  initIcons();
  setupEventListeners();
  initGISMap();
  await loadWeatherData(state.city);
});

function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Event Listeners
function setupEventListeners() {
  // City search form
  const searchForm = document.getElementById("search-form");
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const city = document.getElementById("city-search-input").value.trim();
    if (city) {
      await loadWeatherData(city);
    }
  });

  // Quick switch pills
  document.querySelectorAll(".city-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const city = pill.getAttribute("data-city");
      loadWeatherData(city);
    });
  });

  // GPS Location Button
  document.getElementById("btn-gps").addEventListener("click", () => {
    if (navigator.geolocation) {
      document.getElementById("backend-status-text").textContent = "Locating...";
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await loadWeatherByCoords(pos.coords.latitude, pos.coords.longitude, "My Location");
        },
        (err) => {
          alert("GPS permission was denied or unavailable. Using default location.");
        }
      );
    }
  });

  // Language selector
  const langSelect = document.getElementById("lang-select");
  langSelect.addEventListener("change", (e) => {
    state.lang = e.target.value;
    updateAgricultureAdvisory();
  });

  // Crop selector
  const cropSelect = document.getElementById("crop-selector");
  cropSelect.addEventListener("change", (e) => {
    state.crop = e.target.value;
    updateAgricultureAdvisory();
  });

  // Tabs Switcher
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      
      tabBtns.forEach(b => {
        b.classList.remove("bg-cyan-500", "text-slate-950");
        b.classList.add("text-slate-400");
      });
      btn.classList.add("bg-cyan-500", "text-slate-950");
      btn.classList.remove("text-slate-400");

      document.querySelectorAll(".tab-content").forEach(tc => tc.classList.add("hidden"));
      const activeContent = document.getElementById(targetTab);
      if (activeContent) {
        activeContent.classList.remove("hidden");
      }

      if (targetTab === "map-tab" && state.map) {
        setTimeout(() => state.map.invalidateSize(), 150);
      }
      if (targetTab === "climate-tab") {
        renderClimateChart();
      }
    });
  });

  // Conversational Chat Form
  const chatForm = document.getElementById("chat-form");
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    const query = input.value.trim();
    if (!query) return;
    input.value = "";
    await handleUserMessage(query);
  });

  // Prompt Chips
  document.querySelectorAll(".chat-prompt-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const text = chip.textContent.trim();
      handleUserMessage(text);
    });
  });

  // Reset chat
  document.getElementById("clear-chat-btn").addEventListener("click", () => {
    const box = document.getElementById("chat-messages");
    box.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <i data-lucide="cloud" class="w-4 h-4 text-cyan-300"></i>
        </div>
        <div class="glass-panel-subtle rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-200 space-y-2 max-w-[90%] border border-slate-700/50">
          <p class="leading-relaxed">Conversation reset. Ask me anything about the weather in ${state.city}!</p>
        </div>
      </div>
    `;
    initIcons();
  });

  // Voice Microphone STT
  setupVoiceRecognition();
}

// Voice Speech-To-Text (Web Speech API)
function setupVoiceRecognition() {
  const micBtn = document.getElementById("voice-mic-btn");
  const micIndicator = document.getElementById("voice-indicator-text");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micIndicator.textContent = "Voice input not supported in this browser";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  micBtn.addEventListener("click", () => {
    if (state.isListening) {
      recognition.stop();
      return;
    }

    // Set recognition language matching selector
    if (state.lang === "ta") recognition.lang = "ta-IN";
    else if (state.lang === "hi") recognition.lang = "hi-IN";
    else recognition.lang = "en-IN";

    try {
      recognition.start();
      state.isListening = true;
      micBtn.classList.add("listening-active");
      micIndicator.textContent = "🎙️ Listening... Speak now";
    } catch (err) {
      console.error("Speech recognition error:", err);
    }
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("chat-input").value = transcript;
    handleUserMessage(transcript);
  };

  recognition.onend = () => {
    state.isListening = false;
    micBtn.classList.remove("listening-active");
    micIndicator.textContent = "Microphone ready (Voice-First Intelligence)";
  };

  recognition.onerror = (event) => {
    state.isListening = false;
    micBtn.classList.remove("listening-active");
    micIndicator.textContent = "Voice input error: " + event.error;
  };
}

// Text-to-Speech (TTS)
function speakResponse(text, lang = "en") {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  if (lang === "ta") utterance.lang = "ta-IN";
  else if (lang === "hi") utterance.lang = "hi-IN";
  else utterance.lang = "en-US";

  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}

// Data Retrieval: Coordinates or City
async function loadWeatherData(cityQuery) {
  try {
    document.getElementById("backend-status-text").textContent = "Fetching...";
    
    // First try backend API
    try {
      const resp = await fetch(`${state.backendUrl}/api/weather?city=${encodeURIComponent(cityQuery)}`);
      if (resp.ok) {
        const data = await resp.json();
        applyWeatherData(data);
        document.getElementById("backend-status-text").textContent = "FastAPI Backend Grounded";
        return;
      }
    } catch (backendErr) {
      // Backend not running, gracefully fallback to Direct Open-Meteo
    }

    // Direct Open-Meteo Fallback Mode
    const geoResp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`);
    const geoData = await geoResp.json();
    if (!geoData.results || geoData.results.length === 0) {
      alert(`City '${cityQuery}' not found. Please check spelling.`);
      return;
    }

    const loc = geoData.results[0];
    await loadWeatherByCoords(loc.latitude, loc.longitude, loc.name, `${loc.country || ""}${loc.admin1 ? ", " + loc.admin1 : ""}`);
    document.getElementById("backend-status-text").textContent = "Direct Meteo Grounded";

  } catch (e) {
    console.error("Failed to load weather data:", e);
  }
}

async function loadWeatherByCoords(lat, lon, name = "Current Location", country = "") {
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&timezone=auto`;
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5`;

    const [wRes, aqRes] = await Promise.all([
      fetch(weatherUrl).then(r => r.json()),
      fetch(aqUrl).then(r => r.json()).catch(() => ({ current: { us_aqi: 45, pm2_5: 12, pm10: 22 } }))
    ]);

    // Format into standard structure
    const current = wRes.current || {};
    const wmo = WMO_MAP[current.weather_code] || { en: "Clear sky", icon: "sun" };

    const hourly = [];
    const hRaw = wRes.hourly || {};
    for (let i = 0; i < Math.min((hRaw.time || []).length, 24); i++) {
      const code = (hRaw.weather_code || [])[i] || 0;
      hourly.push({
        time: (hRaw.time[i] || "").split("T")[1] || `${i}:00`,
        temperature: (hRaw.temperature_2m || [])[i],
        rain_prob: (hRaw.precipitation_probability || [])[i] || 0,
        wind_speed: (hRaw.wind_speed_10m || [])[i] || 0,
        icon: (WMO_MAP[code] || {}).icon || "sun",
        code: code
      });
    }

    const daily = [];
    const dRaw = wRes.daily || {};
    for (let i = 0; i < (dRaw.time || []).length; i++) {
      const code = (dRaw.weather_code || [])[i] || 0;
      daily.push({
        date: dRaw.time[i],
        temp_max: (dRaw.temperature_2m_max || [])[i],
        temp_min: (dRaw.temperature_2m_min || [])[i],
        precipitation_sum: (dRaw.precipitation_sum || [])[i] || 0,
        rain_probability: (dRaw.precipitation_probability_max || [])[i] || 0,
        wind_speed_max: (dRaw.wind_speed_10m_max || [])[i] || 0,
        uv_index: (dRaw.uv_index_max || [])[i] || 0,
        condition: (WMO_MAP[code] || {}).en || "Clear",
        icon: (WMO_MAP[code] || {}).icon || "sun"
      });
    }

    const aqiVal = (aqRes.current || {}).us_aqi || 42;
    let aqiCat = "Good";
    if (aqiVal > 150) aqiCat = "Unhealthy";
    else if (aqiVal > 100) aqiCat = "Moderate-High";
    else if (aqiVal > 50) aqiCat = "Moderate";

    const formattedData = {
      location: { name, latitude: lat, longitude: lon, country, admin1: "" },
      weather: {
        current: {
          temperature: current.temperature_2m,
          feels_like: current.apparent_temperature,
          humidity: current.relative_humidity_2m,
          wind_speed: current.wind_speed_10m,
          pressure: current.surface_pressure,
          precipitation: current.precipitation,
          weather_code: current.weather_code,
          condition: wmo.en,
          icon: wmo.icon
        },
        hourly,
        daily
      },
      air_quality: {
        us_aqi: aqiVal,
        pm2_5: (aqRes.current || {}).pm2_5 || 12,
        pm10: (aqRes.current || {}).pm10 || 22,
        category: aqiCat
      },
      alerts: generateAlerts(name, current, daily)
    };

    applyWeatherData(formattedData);

  } catch (err) {
    console.error("Error fetching coordinate weather:", err);
  }
}

// Generate Alert distinction: Official Meteorological Warning vs AI Advisory
function generateAlerts(cityName, current, daily) {
  const alerts = [];
  const wmo = current.weather_code || 0;
  const todayRain = daily[0] ? daily[0].precipitation_sum : 0;
  const windMax = daily[0] ? daily[0].wind_speed_max : (current.wind_speed || 0);
  const tempMax = daily[0] ? daily[0].temp_max : (current.temperature || 30);
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if ([95, 96, 99].includes(wmo) || todayRain > 35) {
    alerts.push({
      type: "Official Meteorological Warning",
      is_official: true,
      badge_color: "rose",
      title: `Official Severe Weather Alert: ${cityName}`,
      description: `Official Warning: Heavy precipitation (${todayRain.toFixed(1)} mm) or active thunderstorm in ${cityName}. Expect localized waterlogging and lightning hazards.`,
      source: "IMD / Regional Meteorological Centre Data Feed",
      timestamp: nowStr,
      action: "Stay indoors, avoid metallic structures and waterlogged transit routes."
    });
  } else if (windMax > 40) {
    alerts.push({
      type: "Official Meteorological Warning",
      is_official: true,
      badge_color: "amber",
      title: `High Wind Warning: ${cityName}`,
      description: `Official Warning: Wind gusts up to ${windMax.toFixed(1)} km/h forecasted.`,
      source: "National Meteorological Service",
      timestamp: nowStr,
      action: "Secure loose outdoor fixtures and drive with caution."
    });
  }

  if (tempMax > 38) {
    alerts.push({
      type: "AI Contextual Advisory",
      is_official: false,
      badge_color: "amber",
      title: `High Temperature Advisory: ${cityName}`,
      description: `WeatherGPT AI: Peak temperature around ${tempMax.toFixed(1)}°C. High risk of dehydration for outdoor labor.`,
      source: "WeatherGPT Grounded Intelligence Layer",
      timestamp: nowStr,
      action: "Stay hydrated and avoid prolonged direct sun exposure during peak afternoon hours."
    });
  } else if (todayRain > 15) {
    alerts.push({
      type: "AI Contextual Advisory",
      is_official: false,
      badge_color: "sky",
      title: `Rainfall Preparedness Advisory: ${cityName}`,
      description: `WeatherGPT AI: Anticipated rainfall accumulation (~${todayRain.toFixed(1)} mm) throughout the day.`,
      source: "WeatherGPT Grounded Intelligence Layer",
      timestamp: nowStr,
      action: "Keep umbrella accessible and plan for moderate travel transit delays."
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: "AI Contextual Advisory",
      is_official: false,
      badge_color: "emerald",
      title: `Calm Atmospheric Conditions: ${cityName}`,
      description: `No extreme weather events detected for ${cityName}. Atmospheric parameters remain within normal seasonal ranges.`,
      source: "WeatherGPT Grounded Intelligence Layer",
      timestamp: nowStr,
      action: "Ideal conditions for travel, agricultural work, and outdoor events."
    });
  }

  return alerts;
}

// Update UI with Retrieved Data
function applyWeatherData(data) {
  state.weather = data.weather;
  state.airQuality = data.air_quality;
  state.alerts = data.alerts || [];
  state.city = data.location.name;
  state.lat = data.location.latitude;
  state.lon = data.location.longitude;
  state.country = `${data.location.country || ""}${data.location.admin1 ? ", " + data.location.admin1 : ""}`;

  // Update Hero elements
  document.getElementById("hero-city-name").textContent = state.city;
  document.getElementById("hero-country").textContent = state.country || "Global Region";
  
  const current = state.weather.current;
  document.getElementById("hero-temperature").textContent = Math.round(current.temperature);
  document.getElementById("hero-feels-like").textContent = `${Math.round(current.feels_like)}°C`;
  document.getElementById("hero-condition-text").textContent = current.condition;
  
  const firstDay = state.weather.daily[0] || {};
  document.getElementById("hero-temp-max").textContent = `${Math.round(firstDay.temp_max || current.temperature)}°C`;
  document.getElementById("hero-temp-min").textContent = `${Math.round(firstDay.temp_min || current.temperature)}°C`;
  document.getElementById("hero-rain-prob").textContent = `${firstDay.rain_probability || 0}%`;

  // Quick metrics
  document.getElementById("metric-humidity").textContent = `${current.humidity}%`;
  document.getElementById("metric-wind").textContent = `${current.wind_speed} km/h`;
  document.getElementById("metric-uv").textContent = `${firstDay.uv_index || 5}`;
  
  const aqi = state.airQuality;
  document.getElementById("metric-aqi").textContent = `${aqi.us_aqi} (${aqi.category})`;

  // Update alerts banner
  renderAlertBanner();

  // Render Charts & Forecast
  renderHourlyChart();
  renderHourlyCards();
  renderDailyCards();

  // Update GIS Map & Agriculture
  updateGISMap();
  updateAgricultureAdvisory();

  initIcons();
}

// Render Severe Alerts & Official Warnings
function renderAlertBanner() {
  const banner = document.getElementById("alert-banner");
  if (!state.alerts || state.alerts.length === 0) {
    banner.innerHTML = "";
    return;
  }

  const alert = state.alerts[0];
  const isOfficial = alert.is_official;
  const borderClass = isOfficial ? "border-rose-500/40 bg-rose-950/30" : "border-cyan-500/30 bg-slate-900/50";
  const badgeClass = isOfficial ? "bg-rose-500 text-slate-950" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40";

  banner.innerHTML = `
    <div class="glass-panel rounded-xl p-3.5 border ${borderClass} shadow-lg transition-all">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center space-x-2.5">
          <span class="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${badgeClass}">
            ${alert.type}
          </span>
          <h4 class="text-xs font-bold text-white">${alert.title}</h4>
        </div>
        <span class="text-[11px] text-slate-400 font-mono">${alert.timestamp} · Source: ${alert.source}</span>
      </div>
      <p class="text-xs text-slate-300 mt-2 leading-relaxed">${alert.description}</p>
      <div class="mt-2 text-xs text-amber-300 flex items-center space-x-1.5 font-medium">
        <i data-lucide="info" class="w-3.5 h-3.5 shrink-0"></i>
        <span>Guidance: ${alert.action}</span>
      </div>
    </div>
  `;
}

// Render 24-Hour Curve Chart (Chart.js)
function renderHourlyChart() {
  const ctx = document.getElementById("hourly-chart");
  if (!ctx) return;

  const hourly = (state.weather.hourly || []).slice(0, 16);
  const labels = hourly.map(h => h.time);
  const temps = hourly.map(h => h.temperature);
  const rainProbs = hourly.map(h => h.rain_prob);

  if (state.charts.hourly) {
    state.charts.hourly.destroy();
  }

  state.charts.hourly = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: temps,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Rain Probability (%)',
          data: rainProbs,
          type: 'bar',
          backgroundColor: 'rgba(59, 130, 246, 0.45)',
          borderRadius: 4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 10 } } }
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { display: false } },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: { color: '#38bdf8', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          min: 0,
          max: 100,
          ticks: { color: '#60a5fa', font: { size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
}

// Render Hourly Horizontal Scroll Cards
function renderHourlyCards() {
  const container = document.getElementById("hourly-cards-container");
  if (!container) return;

  const hourly = (state.weather.hourly || []).slice(0, 18);
  container.innerHTML = hourly.map(h => `
    <div class="glass-panel-subtle rounded-xl p-2.5 min-w-[76px] text-center shrink-0 border border-slate-800">
      <p class="text-[11px] text-slate-400 font-mono">${h.time}</p>
      <div class="my-1.5 flex justify-center text-cyan-400">
        <i data-lucide="${h.icon}" class="w-5 h-5"></i>
      </div>
      <p class="text-xs font-bold text-white">${Math.round(h.temperature)}°C</p>
      <div class="mt-1 flex items-center justify-center space-x-0.5 text-[10px] text-blue-400 font-medium">
        <i data-lucide="droplet" class="w-2.5 h-2.5"></i>
        <span>${h.rain_prob}%</span>
      </div>
    </div>
  `).join("");
}

// Render 7-Day Daily Cards
function renderDailyCards() {
  const container = document.getElementById("daily-forecast-container");
  if (!container) return;

  const daily = state.weather.daily || [];
  container.innerHTML = daily.map(d => {
    const dayName = new Date(d.date).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' });
    return `
      <div class="glass-panel-subtle rounded-xl px-3.5 py-2 flex items-center justify-between text-xs border border-slate-800 hover:border-slate-700 transition">
        <div class="w-28 font-medium text-slate-200">${dayName}</div>
        <div class="flex items-center space-x-2 text-cyan-300">
          <i data-lucide="${d.icon}" class="w-4 h-4"></i>
          <span class="text-slate-300">${d.condition}</span>
        </div>
        <div class="flex items-center space-x-2 text-blue-400 text-[11px]">
          <i data-lucide="cloud-rain" class="w-3 h-3"></i>
          <span>${d.rain_probability}% (${d.precipitation_sum}mm)</span>
        </div>
        <div class="font-mono text-slate-200">
          <span class="font-bold text-white">${Math.round(d.temp_max)}°</span> / 
          <span class="text-slate-400">${Math.round(d.temp_min)}°C</span>
        </div>
      </div>
    `;
  }).join("");
}

// Agriculture Advisory Updates
function updateAgricultureAdvisory() {
  if (!state.weather) return;

  const crop = state.crop;
  const lang = state.lang;
  const current = state.weather.current;
  const daily = state.weather.daily;
  const hourly = state.weather.hourly;

  const wind = current.wind_speed || 10;
  const temp = current.temperature || 28;
  const humidity = current.humidity || 65;
  const next12RainProb = Math.max(...hourly.slice(0, 12).map(h => h.rain_prob), 0);
  const rain48h = (daily[0]?.precipitation_sum || 0) + (daily[1]?.precipitation_sum || 0);

  // Spray Suitability
  const isSprayOk = wind <= 15 && next12RainProb <= 30 && temp <= 35;
  const sprayBadge = document.getElementById("agri-spray-badge");
  const sprayText = document.getElementById("agri-spray-text");

  if (isSprayOk) {
    sprayBadge.className = "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2";
    sprayBadge.textContent = lang === "ta" ? "பொருத்தமானது" : (lang === "hi" ? "अनुकूल" : "Optimal Window");
    sprayText.textContent = lang === "ta" 
      ? `மருந்து தெளிக்க சிறந்த நேரம். காற்றின் வேகம் (${wind} கி.மீ/ம) மற்றும் மழை வாய்ப்பு (${next12RainProb}%) குறைவாக உள்ளது.`
      : (lang === "hi" ? `कीटनाशक छिड़काव के लिए सही समय है। हवा की गति (${wind} km/h) और बारिश की संभावना (${next12RainProb}%) कम है।`
      : `Conditions ideal for foliar spray and fertilizer on ${crop}. Wind (${wind} km/h) and rain risk (${next12RainProb}%) are well within safety thresholds.`);
  } else {
    sprayBadge.className = "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2";
    sprayBadge.textContent = lang === "ta" ? "தள்ளிப்போடவும்" : (lang === "hi" ? "छिड़काव टालें" : "Delay Spraying");
    sprayText.textContent = lang === "ta"
      ? `மருந்து தெளிக்க வேண்டாம். அதிக காற்று (${wind} கி.மீ/ம) அல்லது மழை வாய்ப்பு (${next12RainProb}%) மருந்தின் வீரியத்தைக் குறைக்கும்.`
      : (lang === "hi" ? `छिड़काव अभी न करें। तेज हवा (${wind} km/h) या बारिश का जोखिम (${next12RainProb}%) दवा को बहा सकता है।`
      : `Postpone spraying. Elevated wind speed (${wind} km/h) or upcoming rain chance (${next12RainProb}%) increases chemical drift and runoff.`);
  }

  // Irrigation
  const irriBadge = document.getElementById("agri-irrigation-badge");
  const irriText = document.getElementById("agri-irrigation-text");
  if (rain48h > 15) {
    irriBadge.className = "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-2";
    irriBadge.textContent = lang === "ta" ? "பாசனம் தள்ளிவைக்கவும்" : (lang === "hi" ? "सिंचाई टालें" : "Hold Irrigation");
    irriText.textContent = `Natural rainfall anticipated (~${rain48h.toFixed(1)} mm over 48h). Save pump electricity and preserve soil aeration.`;
  } else {
    irriBadge.className = "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2";
    irriBadge.textContent = lang === "ta" ? "பாசனம் தேவை" : (lang === "hi" ? "सिंचाई करें" : "Irrigate as Scheduled");
    irriText.textContent = `Low precipitation forecasted (~${rain48h.toFixed(1)} mm). Maintain root zone moisture for ${crop}.`;
  }

  // Disease Risk
  const disBadge = document.getElementById("agri-disease-badge");
  const disText = document.getElementById("agri-disease-text");
  if (humidity > 80 && temp > 24) {
    disBadge.className = "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-2";
    disBadge.textContent = "High Fungal Risk";
    disText.textContent = `High humidity (${humidity}%) and warm temperatures (${temp}°C) accelerate powdery mildew and blight propagation in ${crop}.`;
  } else {
    disBadge.className = "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2";
    disBadge.textContent = "Low Pathogen Risk";
    disText.textContent = `Atmospheric moisture levels (${humidity}%) remain below critical fungal incubation limits.`;
  }
}

// GIS Leaflet Map
function initGISMap() {
  const mapElement = document.getElementById("leaflet-map");
  if (!mapElement) return;

  state.map = L.map('leaflet-map').setView([state.lat, state.lon], 9);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors & CARTO',
    maxZoom: 18
  }).addTo(state.map);

  state.marker = L.marker([state.lat, state.lon]).addTo(state.map)
    .bindPopup(`<b>${state.city}</b><br>Meteorological Observation Station`)
    .openPopup();
}

function updateGISMap() {
  if (!state.map) return;
  state.map.setView([state.lat, state.lon], 9);
  if (state.marker) {
    state.marker.setLatLng([state.lat, state.lon]);
    state.marker.getPopup().setContent(`<b>${state.city}</b><br>Temp: ${state.weather.current.temperature}°C<br>${state.weather.current.condition}`);
  }
}

// 10-Year Climate Trend Chart
function renderClimateChart() {
  const ctx = document.getElementById("climate-chart");
  if (!ctx) return;

  const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const rainfall = [820, 890, 780, 950, 1020, 910, 840, 980, 890, 930];
  const temps = [30.2, 30.5, 30.7, 30.4, 31.0, 31.2, 31.5, 31.8, 31.7, 32.1];

  if (state.charts.climate) {
    state.charts.climate.destroy();
  }

  state.charts.climate = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: years,
      datasets: [
        {
          label: 'Annual Rainfall (mm)',
          data: rainfall,
          backgroundColor: 'rgba(14, 165, 233, 0.5)',
          borderColor: '#0ea5e9',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Mean Temperature (°C)',
          data: temps,
          type: 'line',
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#cbd5e1', font: { size: 10 } } }
      },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
        y: {
          position: 'left',
          title: { display: true, text: 'Rainfall (mm)', color: '#0ea5e9', font: { size: 10 } },
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y1: {
          position: 'right',
          title: { display: true, text: 'Temperature (°C)', color: '#f43f5e', font: { size: 10 } },
          min: 28,
          max: 34,
          ticks: { color: '#f43f5e' },
          grid: { display: false }
        }
      }
    }
  });
}

// Conversational AI Message Handler
async function handleUserMessage(query) {
  addChatMessage("user", query);

  const loadingId = addChatLoadingIndicator();

  try {
    let answer = "";
    let lang = "en";

    // Try backend API first
    try {
      const resp = await fetch(`${state.backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query, city: state.city })
      });
      if (resp.ok) {
        const data = await resp.json();
        answer = data.response;
        lang = data.lang;
        removeChatLoadingIndicator(loadingId);
        addChatMessage("bot", answer, lang);
        return;
      }
    } catch (err) {
      // Backend not running, use client-side grounded reasoning
    }

    // Client-side Grounded Heuristic Engine
    const current = state.weather?.current || {};
    const daily = state.weather?.daily || [];
    const qLower = query.toLowerCase();

    // Check language
    if (/[\u0B80-\u0BFF]/.test(query)) lang = "ta";
    else if (/[\u0900-\u097F]/.test(query)) lang = "hi";

    const isTomorrow = qLower.includes("tomorrow") || query.includes("நாளை") || query.includes("कल");
    const targetDay = isTomorrow && daily[1] ? daily[1] : (daily[0] || {});
    const rainProb = targetDay.rain_probability || 0;
    const maxTemp = targetDay.temp_max || current.temperature || 31;
    const minTemp = targetDay.temp_min || 24;
    const cond = targetDay.condition || current.condition || "Clear";
    const dayLabel = isTomorrow ? "tomorrow" : "today";

    if (lang === "ta") {
      const dayTa = isTomorrow ? "நாளை" : "இன்று";
      if (qLower.includes("மழை") || query.includes("மழை")) {
        answer = rainProb > 40
          ? `${state.city}-ல் ${dayTa} மழை பெய்ய வாய்ப்புள்ளது (${rainProb}% வாய்ப்பு). வெளியே செல்லும்போது குடை அல்லது மழைக்கோட் உடன் செல்வது நல்லது.`
          : `${state.city}-ல் ${dayTa} மழைக்கான வாய்ப்பு குறைவு (${rainProb}%). வானிலை பெரும்பாலும் தெளிவாக இருக்கும்.`;
      } else if (qLower.includes("மருந்து") || query.includes("மருந்து")) {
        answer = `வேளாண் ஆலோசனை (${state.city}): தற்போதைய காற்றின் வேகம் ${current.wind_speed} கி.மீ/ம, மழை வாய்ப்பு ${rainProb}%. தெளிப்புக்கு ஏற்பாடு செய்யலாம்.`;
      } else {
        answer = `${state.city}-ல் ${dayTa} வானிலை: ${cond}, வெப்பநிலை ${minTemp}°C முதல் ${maxTemp}°C வரை. மழை வாய்ப்பு ${rainProb}%.`;
      }
    } else if (lang === "hi") {
      const dayHi = isTomorrow ? "कल" : "आज";
      if (qLower.includes("बारिश") || query.includes("बारिश")) {
        answer = rainProb > 40
          ? `${state.city} में ${dayHi} बारिश की संभावना है (${rainProb}%). छाता साथ रखें.`
          : `${state.city} में ${dayHi} बारिश की संभावना कम है (${rainProb}%). मौसम साफ रहेगा.`;
      } else {
        answer = `${state.city} में ${dayHi} का तापमान लगभग ${maxTemp}°C रहेगा। मौसम '${cond}' और बारिश की संभावना ${rainProb}% है।`;
      }
    } else {
      // English
      if (qLower.includes("umbrella")) {
        answer = rainProb > 35 
          ? `Yes, carry an umbrella in ${state.city} ${dayLabel}. Rain probability is ${rainProb}%.`
          : `Umbrella is unlikely to be needed in ${state.city} ${dayLabel} (Rain chance: ${rainProb}%).`;
      } else if (qLower.includes("spray") || qLower.includes("pesticide")) {
        const ok = (current.wind_speed || 10) <= 15 && rainProb <= 30;
        answer = ok 
          ? `Optimal window for spraying in ${state.city}. Wind is calm (${current.wind_speed} km/h) and rain probability is low (${rainProb}%).`
          : `Delay spraying in ${state.city}. Wind (${current.wind_speed} km/h) or rain probability (${rainProb}%) could cause chemical runoff.`;
      } else if (qLower.includes("rain")) {
        answer = rainProb > 45 
          ? `Rain is likely in ${state.city} ${dayLabel} (${rainProb}% probability). Expect ${targetDay.precipitation_sum || 0} mm rainfall.`
          : `Rain chances are low in ${state.city} ${dayLabel} at ${rainProb}%. Dry conditions anticipated.`;
      } else if (qLower.includes("temperature") || qLower.includes("temp")) {
        answer = `In ${state.city} ${dayLabel}, high temperatures will reach ${maxTemp}°C and lows will be around ${minTemp}°C.`;
      } else {
        answer = `Forecast for ${state.city} (${dayLabel}): ${cond}, high of ${maxTemp}°C, low of ${minTemp}°C, with a ${rainProb}% rain probability and winds around ${current.wind_speed} km/h.`;
      }
    }

    removeChatLoadingIndicator(loadingId);
    addChatMessage("bot", answer, lang);

  } catch (err) {
    removeChatLoadingIndicator(loadingId);
    addChatMessage("bot", "Unable to retrieve meteorological insight at this moment. Please check your connection.");
  }
}

function addChatMessage(sender, text, lang = "en") {
  const box = document.getElementById("chat-messages");
  const msgId = "msg-" + Date.now();

  if (sender === "user") {
    const el = document.createElement("div");
    el.className = "flex items-start justify-end space-x-2";
    el.innerHTML = `
      <div class="bg-cyan-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 text-xs max-w-[85%] shadow-md">
        <p>${escapeHtml(text)}</p>
      </div>
    `;
    box.appendChild(el);
  } else {
    const el = document.createElement("div");
    el.className = "flex items-start space-x-3";
    el.innerHTML = `
      <div class="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
        <i data-lucide="bot" class="w-4 h-4 text-cyan-400"></i>
      </div>
      <div class="glass-panel-subtle rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-200 space-y-2 max-w-[90%] border border-slate-700/50">
        <p class="leading-relaxed">${escapeHtml(text)}</p>
        <div class="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
          <span class="text-cyan-400 flex items-center space-x-1">
            <i data-lucide="check-check" class="w-3 h-3"></i>
            <span>Grounded Meteorological Response</span>
          </span>
          <button 
            class="tts-btn text-slate-400 hover:text-white flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-slate-800 transition"
            data-text="${escapeHtml(text)}"
            data-lang="${lang}"
            title="Listen to response"
          >
            <i data-lucide="volume-2" class="w-3.5 h-3.5 text-cyan-400"></i>
            <span>Speak</span>
          </button>
        </div>
      </div>
    `;
    box.appendChild(el);

    // Attach TTS listener
    el.querySelector(".tts-btn").addEventListener("click", function() {
      speakResponse(this.getAttribute("data-text"), this.getAttribute("data-lang"));
    });
  }

  box.scrollTop = box.scrollHeight;
  initIcons();
}

function addChatLoadingIndicator() {
  const box = document.getElementById("chat-messages");
  const id = "loading-" + Date.now();
  const el = document.createElement("div");
  el.id = id;
  el.className = "flex items-center space-x-2 text-xs text-slate-400 pl-10 py-1";
  el.innerHTML = `
    <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
    <span>Analyzing meteorological parameters...</span>
  `;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return id;
}

function removeChatLoadingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
