from flask import Flask, jsonify, render_template, request
import pandas as pd
import numpy as np
import requests
import os
from datetime import datetime

app = Flask(__name__)

# OpenWeatherMap API key (muhit o'zgaruvchisidan olish)
OWM_API_KEY = os.environ.get("OWM_API_KEY", "")
OWM_BASE_URL = "http://api.openweathermap.org/data/2.5"
CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "weather_data.csv")

# ─── Yordamchi funksiyalar ────────────────────────────────────────────────────

def load_csv_data():
    df = pd.read_csv(CSV_PATH, parse_dates=["date"])
    return df


def detect_anomalies(df, column, z_threshold=2.5):
    """Z-score usuli bilan anomaliyalarni topish."""
    mean = df[column].mean()
    std  = df[column].std()
    z_scores = np.abs((df[column] - mean) / std)
    anomalies = df[z_scores > z_threshold].copy()
    anomalies["z_score"] = z_scores[z_scores > z_threshold].values
    anomalies["column"] = column
    return anomalies


def compute_statistics(df):
    numeric_cols = ["temperature", "humidity", "wind_speed", "pressure", "precipitation"]
    stats = {}
    for col in numeric_cols:
        arr = df[col].dropna().values
        stats[col] = {
            "mean":   round(float(np.mean(arr)), 2),
            "median": round(float(np.median(arr)), 2),
            "std":    round(float(np.std(arr)), 2),
            "min":    round(float(np.min(arr)), 2),
            "max":    round(float(np.max(arr)), 2),
            "q25":    round(float(np.percentile(arr, 25)), 2),
            "q75":    round(float(np.percentile(arr, 75)), 2),
        }
    return stats


def monthly_averages(df):
    df = df.copy()
    df["month"] = df["date"].dt.strftime("%Y-%m")
    grouped = df.groupby("month")[["temperature", "humidity", "wind_speed", "precipitation"]].mean().round(2)
    return grouped.reset_index().to_dict(orient="records")


# ─── Sahifalar ───────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ─── API Endpointlar ──────────────────────────────────────────────────────────

@app.route("/api/statistics")
def api_statistics():
    df = load_csv_data()
    return jsonify({
        "statistics": compute_statistics(df),
        "total_records": len(df),
        "date_range": {
            "start": df["date"].min().strftime("%Y-%m-%d"),
            "end":   df["date"].max().strftime("%Y-%m-%d"),
        }
    })


@app.route("/api/anomalies")
def api_anomalies():
    df = load_csv_data()
    columns = ["temperature", "humidity", "wind_speed", "pressure", "precipitation"]
    all_anomalies = []
    for col in columns:
        anom = detect_anomalies(df, col)
        for _, row in anom.iterrows():
            all_anomalies.append({
                "date":    row["date"].strftime("%Y-%m-%d"),
                "column":  col,
                "value":   round(row[col], 2),
                "z_score": round(row["z_score"], 2),
            })
    all_anomalies.sort(key=lambda x: x["z_score"], reverse=True)
    return jsonify({"anomalies": all_anomalies, "count": len(all_anomalies)})


@app.route("/api/timeseries")
def api_timeseries():
    df = load_csv_data()
    column = request.args.get("column", "temperature")
    records = df[["date", column]].copy()
    records["date"] = records["date"].dt.strftime("%Y-%m-%d")
    return jsonify({"data": records.to_dict(orient="records"), "column": column})


@app.route("/api/monthly")
def api_monthly():
    df = load_csv_data()
    return jsonify({"monthly": monthly_averages(df)})


@app.route("/api/upload", methods=["POST"])
def api_upload():
    """Foydalanuvchi CSV faylini yuklashi."""
    if "file" not in request.files:
        return jsonify({"error": "Fayl topilmadi"}), 400
    file = request.files["file"]
    if not file.filename.endswith(".csv"):
        return jsonify({"error": "Faqat CSV fayl qabul qilinadi"}), 400
    df = pd.read_csv(file, parse_dates=["date"])
    df.to_csv(CSV_PATH, index=False)
    return jsonify({"message": "Fayl muvaffaqiyatli yuklandi", "records": len(df)})


@app.route("/api/live-weather")
def api_live_weather():
    """OpenWeatherMap dan joriy ob-havo."""
    city = request.args.get("city", "Tashkent")
    if not OWM_API_KEY:
        return jsonify({"error": "OWM_API_KEY muhit o'zgaruvchisi o'rnatilmagan"}), 503
    try:
        resp = requests.get(
            f"{OWM_BASE_URL}/weather",
            params={"q": city, "appid": OWM_API_KEY, "units": "metric", "lang": "uz"},
            timeout=5,
        )
        resp.raise_for_status()
        d = resp.json()
        return jsonify({
            "city":        d["name"],
            "temperature": d["main"]["temp"],
            "feels_like":  d["main"]["feels_like"],
            "humidity":    d["main"]["humidity"],
            "pressure":    d["main"]["pressure"],
            "wind_speed":  d["wind"]["speed"],
            "description": d["weather"][0]["description"],
            "icon":        d["weather"][0]["icon"],
        })
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 502


@app.route("/api/forecast")
def api_forecast():
    """OpenWeatherMap 5-kunlik prognoz."""
    city = request.args.get("city", "Tashkent")
    if not OWM_API_KEY:
        return jsonify({"error": "OWM_API_KEY muhit o'zgaruvchisi o'rnatilmagan"}), 503
    try:
        resp = requests.get(
            f"{OWM_BASE_URL}/forecast",
            params={"q": city, "appid": OWM_API_KEY, "units": "metric", "lang": "uz", "cnt": 40},
            timeout=5,
        )
        resp.raise_for_status()
        d = resp.json()
        items = []
        for item in d["list"]:
            items.append({
                "datetime":    item["dt_txt"],
                "temperature": item["main"]["temp"],
                "humidity":    item["main"]["humidity"],
                "wind_speed":  item["wind"]["speed"],
                "description": item["weather"][0]["description"],
            })
        return jsonify({"city": d["city"]["name"], "forecast": items})
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 502


if __name__ == "__main__":
    app.run(debug=True, port=5000)
