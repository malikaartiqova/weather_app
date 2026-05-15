# 🌦️ Ob-havo Tahlil Tizimi

**Flask + NumPy + Pandas** asosidagi ob-havo ma'lumotlarini statistik tahlil va anomaliyalarni aniqlash tizimi.

---

## 📁 Loyiha Tuzilishi

```
weather_app/
├── app.py                  # Flask backend
├── requirements.txt        # Python paketlar
├── generate_data.py        # Namuna CSV yaratuvchi
├── data/
│   └── weather_data.csv    # Tarixiy ob-havo ma'lumotlari
├── templates/
│   └── index.html          # Asosiy sahifa
└── static/
    ├── css/style.css       # Dizayn
    └── js/main.js          # Frontend mantiq
```

---

## 🚀 Ishga Tushirish

### 1. Kerakli paketlarni o'rnatish
```bash
pip install -r requirements.txt
```

### 2. (Ixtiyoriy) OpenWeatherMap API kaliti
[openweathermap.org](https://openweathermap.org/api) dan bepul API kaliti oling va muhit o'zgaruvchisiga qo'shing:

**Linux/Mac:**
```bash
export OWM_API_KEY=your_api_key_here
```

**Windows:**
```cmd
set OWM_API_KEY=your_api_key_here
```

### 3. Serverni ishga tushirish
```bash
python app.py
```

Brauzerda oching: **http://localhost:5000**

---

## 📊 Imkoniyatlar

### Dashboard
- **KPI kartochkalar**: harorat, namlik, shamol, bosim o'rtachalari
- **Vaqt qatori grafigi**: barcha ko'rsatkichlar uchun interaktiv grafik
- **Oylik o'rtachalar**: bar chart shaklida

### Anomaliyalar
- **Z-score usuli** bilan avtomatik anomaliya aniqlash (z > 2.5)
- Scatter plot — anomaliyalar joylashuvi
- Jadval: sana, ko'rsatkich, qiymat, z-score, daraja

### Statistika
- **NumPy** yordamida hisoblangan: o'rtacha, mediana, standart og'ish, min, maks, kvartilar
- Harorat taqsimot histogrammasi

### Jonli Ma'lumotlar
- OpenWeatherMap API orqali ixtiyoriy shahar ob-havosi
- 5-kunlik prognoz

---

## 🔌 API Endpointlar

| Endpoint | Tavsif |
|---|---|
| `GET /api/statistics` | Barcha ustunlar statistikasi |
| `GET /api/anomalies` | Z-score anomaliyalari |
| `GET /api/timeseries?column=temperature` | Vaqt qatori ma'lumotlari |
| `GET /api/monthly` | Oylik o'rtachalar |
| `POST /api/upload` | CSV fayl yuklash |
| `GET /api/live-weather?city=Tashkent` | Joriy ob-havo (OWM) |
| `GET /api/forecast?city=Tashkent` | 5-kunlik prognoz (OWM) |

---

## 🛠️ Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Backend | Python · Flask |
| Tahlil | NumPy · Pandas |
| API | OpenWeatherMap |
| Frontend | HTML5 · CSS3 · JavaScript |
| Grafiklar | Chart.js |
| Shriftlar | Space Mono · Syne |
