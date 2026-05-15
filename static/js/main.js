/* ═══════════════════════════════════════════════════════════════
   Ob-havo Tahlil Tizimi — Frontend Logic
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ── Chart instances ────────────────────────────────────────────
let tsChart = null, monthlyChart = null, anomalyChart = null, histChart = null;

const COLORS = {
  accent:  '#00e5ff',
  accent2: '#ff5252',
  accent3: '#69ff47',
  amber:   '#ffc107',
  dim:     '#8891aa',
};

Chart.defaults.color = COLORS.dim;
Chart.defaults.borderColor = '#252c3f';
Chart.defaults.font.family = "'Space Mono', monospace";
Chart.defaults.font.size   = 11;

// ── Navigation ─────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('section-' + btn.dataset.section).classList.add('active');
  });
});

// ── Helpers ────────────────────────────────────────────────────
function loading(html = '<div class="spinner"></div>Yuklanmoqda…') {
  return `<div class="loading">${html}</div>`;
}

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function makeLine(ctx, labels, data, label, color) {
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data,
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1f2e', titleColor: '#00e5ff' } },
      scales: {
        x: { grid: { color: '#252c3f' }, ticks: { maxTicksLimit: 8 } },
        y: { grid: { color: '#252c3f' } }
      }
    }
  });
}

// ── Column labels ──────────────────────────────────────────────
const COL_LABEL = {
  temperature:   'Harorat (°C)',
  humidity:      'Namlik (%)',
  wind_speed:    'Shamol (km/s)',
  pressure:      'Bosim (hPa)',
  precipitation: 'Yog\'in (mm)',
};
const COL_COLOR = {
  temperature:   COLORS.accent2,
  humidity:      COLORS.accent,
  wind_speed:    COLORS.accent3,
  pressure:      COLORS.amber,
  precipitation: '#7c6af7',
};

// ─────────────────────────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [stats, ts, monthly] = await Promise.all([
      apiFetch('/api/statistics'),
      apiFetch('/api/timeseries?column=temperature'),
      apiFetch('/api/monthly'),
    ]);

    // KPI cards
    document.getElementById('kpi-temp').textContent  = stats.statistics.temperature.mean;
    document.getElementById('kpi-hum').textContent   = stats.statistics.humidity.mean;
    document.getElementById('kpi-wind').textContent  = stats.statistics.wind_speed.mean;
    document.getElementById('kpi-pres').textContent  = stats.statistics.pressure.mean;

    // Timeseries chart
    const ctx = document.getElementById('timeseriesChart');
    drawTimeseries(ctx, ts.data, ts.column);

    // Monthly chart
    const mCtx = document.getElementById('monthlyChart');
    const mLabels = monthly.monthly.map(r => r.month);
    const mData   = monthly.monthly.map(r => r.temperature);
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(mCtx, {
      type: 'bar',
      data: {
        labels: mLabels,
        datasets: [{
          label: 'O\'rtacha Harorat (°C)',
          data: mData,
          backgroundColor: mData.map(v => v < 0 ? COLORS.accent + 'aa' : COLORS.accent2 + 'aa'),
          borderColor:     mData.map(v => v < 0 ? COLORS.accent : COLORS.accent2),
          borderWidth: 1,
          borderRadius: 2,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1f2e' } },
        scales: {
          x: { grid: { color: '#252c3f' } },
          y: { grid: { color: '#252c3f' } }
        }
      }
    });

    // Ticker
    const t = stats.statistics.temperature;
    const ticker = `🌡 Harorat: min ${t.min}°C · maks ${t.max}°C · o'rtacha ${t.mean}°C   💧 Namlik o'rtacha: ${stats.statistics.humidity.mean}%   🌬 Shamol maks: ${stats.statistics.wind_speed.max} km/s   📅 ${stats.date_range.start} → ${stats.date_range.end}   `;
    const el = document.getElementById('ticker');
    el.textContent = ticker + ticker; // duplicate for seamless loop

  } catch (e) {
    console.error(e);
  }
}

function drawTimeseries(ctx, data, column) {
  if (tsChart) tsChart.destroy();
  const labels = data.map(r => r.date);
  const values = data.map(r => r[column]);
  tsChart = makeLine(ctx, labels, values, COL_LABEL[column] || column, COL_COLOR[column] || COLORS.accent);
}

// Ctrl buttons → change timeseries
document.querySelectorAll('.ctrl-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('.ctrl-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const col = btn.dataset.col;
    const data = await apiFetch(`/api/timeseries?column=${col}`);
    const ctx  = document.getElementById('timeseriesChart');
    drawTimeseries(ctx, data.data, col);
  });
});

// ─────────────────────────────────────────────────────────────────
//  ANOMALIES
// ─────────────────────────────────────────────────────────────────
async function loadAnomalies() {
  try {
    const data = await apiFetch('/api/anomalies');
    const anoms = data.anomalies;

    // Summary
    document.getElementById('anom-count').textContent = anoms.length;
    const maxZ = anoms.length ? Math.max(...anoms.map(a => a.z_score)).toFixed(2) : '—';
    document.getElementById('anom-max-z').textContent = maxZ;
    const colCounts = {};
    anoms.forEach(a => { colCounts[a.column] = (colCounts[a.column] || 0) + 1; });
    const topCol = Object.entries(colCounts).sort((a,b) => b[1]-a[1])[0];
    document.getElementById('anom-top-col').textContent = topCol ? COL_LABEL[topCol[0]] || topCol[0] : '—';

    // Chart — scatter by column
    const datasets = Object.keys(colCounts).map(col => ({
      label: COL_LABEL[col] || col,
      data: anoms.filter(a => a.column === col).map(a => ({ x: a.date, y: a.z_score })),
      backgroundColor: COL_COLOR[col] + 'cc',
      borderColor: COL_COLOR[col],
      pointRadius: 6,
    }));
    const aCtx = document.getElementById('anomalyChart');
    if (anomalyChart) anomalyChart.destroy();
    anomalyChart = new Chart(aCtx, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: { backgroundColor: '#1a1f2e', callbacks: {
            label: ctx => `${ctx.dataset.label}: z=${ctx.raw.y.toFixed(2)} (${ctx.raw.x})`
          }}
        },
        scales: {
          x: { type: 'category', grid: { color: '#252c3f' }, title: { display: true, text: 'Sana' } },
          y: { grid: { color: '#252c3f' }, title: { display: true, text: 'Z-score' } }
        }
      }
    });

    // Table
    const tbody = document.getElementById('anomaly-tbody');
    tbody.innerHTML = anoms.slice(0, 50).map(a => {
      const z = a.z_score;
      const level = z > 4 ? ['Yuqori','high'] : z > 3 ? ['O\'rta','medium'] : ['Past','low'];
      return `<tr>
        <td>${a.date}</td>
        <td>${COL_LABEL[a.column] || a.column}</td>
        <td>${a.value}</td>
        <td>${z.toFixed(2)}</td>
        <td><span class="badge badge-${level[1]}">${level[0]}</span></td>
      </tr>`;
    }).join('');

  } catch (e) { console.error(e); }
}

// ─────────────────────────────────────────────────────────────────
//  STATISTICS
// ─────────────────────────────────────────────────────────────────
async function loadStatistics() {
  try {
    const data = await apiFetch('/api/statistics');
    const grid = document.getElementById('stats-grid');
    const UZ_LABELS = {
      mean: 'O\'rtacha', median: 'Mediana', std: 'Standart og\'ish',
      min: 'Minimum', max: 'Maksimum', q25: '25-persentil', q75: '75-persentil'
    };
    grid.innerHTML = Object.entries(data.statistics).map(([col, s]) => `
      <div class="stats-card">
        <h3>${COL_LABEL[col] || col}</h3>
        ${Object.entries(s).map(([k,v]) => `
          <div class="stats-row">
            <span class="s-key">${UZ_LABELS[k] || k}</span>
            <span class="s-val">${v}</span>
          </div>
        `).join('')}
      </div>
    `).join('');

    // Histogram for temperature
    const ts = await apiFetch('/api/timeseries?column=temperature');
    const temps = ts.data.map(r => r.temperature);
    const min = Math.min(...temps), max = Math.max(...temps);
    const bins = 20;
    const step = (max - min) / bins;
    const counts = Array(bins).fill(0);
    temps.forEach(v => {
      const i = Math.min(Math.floor((v - min) / step), bins - 1);
      counts[i]++;
    });
    const labels = Array.from({length: bins}, (_, i) => (min + i * step).toFixed(1));
    const hCtx = document.getElementById('histogramChart');
    if (histChart) histChart.destroy();
    histChart = new Chart(hCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Chastota',
          data: counts,
          backgroundColor: COLORS.accent2 + 'aa',
          borderColor: COLORS.accent2,
          borderWidth: 1,
          borderRadius: 2,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#252c3f' }, title: { display: true, text: 'Harorat (°C)' } },
          y: { grid: { color: '#252c3f' }, title: { display: true, text: 'Soni' } }
        }
      }
    });
  } catch (e) { console.error(e); }
}

// ─────────────────────────────────────────────────────────────────
//  LIVE WEATHER
// ─────────────────────────────────────────────────────────────────
async function loadLiveWeather(city = 'Tashkent') {
  const cardsEl = document.getElementById('live-cards');
  const forecastEl = document.getElementById('forecast-wrapper');
  const noticeEl = document.getElementById('api-key-notice');
  cardsEl.innerHTML = loading();
  forecastEl.innerHTML = '';

  try {
    const data = await apiFetch(`/api/live-weather?city=${encodeURIComponent(city)}`);
    if (data.error) {
      noticeEl.style.display = 'block';
      cardsEl.innerHTML = '';
      return;
    }
    noticeEl.style.display = 'none';
    const items = [
      { icon: '🌡️', label: 'Harorat', val: data.temperature, unit: '°C' },
      { icon: '🌡️', label: 'His qilish', val: data.feels_like, unit: '°C' },
      { icon: '💧', label: 'Namlik',    val: data.humidity,    unit: '%' },
      { icon: '🔵', label: 'Bosim',     val: data.pressure,    unit: 'hPa' },
      { icon: '🌬️', label: 'Shamol',    val: data.wind_speed,  unit: 'm/s' },
    ];
    cardsEl.innerHTML = items.map(i => `
      <div class="live-card">
        <div class="l-icon">${i.icon}</div>
        <div class="l-label">${i.label}</div>
        <div class="l-val">${i.val}</div>
        <div class="l-unit">${i.unit}</div>
      </div>
    `).join('') + `<div class="live-card"><div class="l-icon">☁️</div><div class="l-label">Holat</div><div class="l-val" style="font-size:1rem">${data.description}</div><div class="l-unit">${data.city}</div></div>`;

    // Forecast
    const forecast = await apiFetch(`/api/forecast?city=${encodeURIComponent(city)}`);
    if (!forecast.error) {
      // Show every 8th (daily)
      const daily = forecast.forecast.filter((_, i) => i % 8 === 0).slice(0, 5);
      forecastEl.innerHTML = daily.map(f => `
        <div class="forecast-item">
          <div class="f-date">${f.datetime.split(' ')[0]}</div>
          <div class="f-temp">${f.temperature}°C</div>
          <div class="f-desc">${f.description}</div>
        </div>
      `).join('');
    }
  } catch (e) {
    noticeEl.style.display = 'block';
    cardsEl.innerHTML = '';
  }
}

document.getElementById('search-btn').addEventListener('click', () => {
  const city = document.getElementById('city-input').value.trim();
  if (city) loadLiveWeather(city);
});
document.getElementById('city-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('search-btn').click();
});

// ── Load anomalies/statistics on tab click (lazy) ──────────────
let anomalyLoaded = false, statsLoaded = false, liveLoaded = false;
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const s = btn.dataset.section;
    if (s === 'anomalies' && !anomalyLoaded) { loadAnomalies(); anomalyLoaded = true; }
    if (s === 'statistics' && !statsLoaded)  { loadStatistics(); statsLoaded = true; }
    if (s === 'live' && !liveLoaded)         { loadLiveWeather(); liveLoaded = true; }
  });
});

// ── Init ───────────────────────────────────────────────────────
loadDashboard();
