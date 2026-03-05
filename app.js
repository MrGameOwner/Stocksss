const statusText = document.getElementById("statusText");
const symbolInput = document.getElementById("symbolInput");
const apiKeyInput = document.getElementById("apiKeyInput");
const loadBtn = document.getElementById("loadBtn");

const priceValue = document.getElementById("priceValue");
const changeValue = document.getElementById("changeValue");
const updatedValue = document.getElementById("updatedValue");

const minLabel = document.getElementById("minLabel");
const maxLabel = document.getElementById("maxLabel");
const pointsLabel = document.getElementById("pointsLabel");

const canvas = document.getElementById("chartCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

const rangeButtons = Array.from(document.querySelectorAll(".range-btn"));

const state = {
  range: "1H",
  symbol: "IBM",
  rawIntraday: [],
  rawDaily: [],
};

function setStatus(text) {
  if (statusText) statusText.textContent = text;
}

function fmt(n) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseAggResults(results = []) {
  return results
    .map((r) => ({
      time: new Date(r.t),
      open: Number(r.o),
      high: Number(r.h),
      low: Number(r.l),
      close: Number(r.c),
      volume: Number(r.v || 0),
    }))
    .sort((a, b) => a.time - b.time);
}

function filterByRange(range, intraday, daily) {
  const now = new Date();
  let src = [];

  switch (range) {
    case "1H":
      src = intraday.filter((p) => now - p.time <= 60 * 60 * 1000);
      if (src.length < 2) src = intraday.slice(-12);
      break;
    case "1D":
      src = intraday.filter((p) => now - p.time <= 24 * 60 * 60 * 1000);
      if (src.length < 2) src = intraday.slice(-80);
      break;
    case "1W":
      src = daily.filter((p) => now - p.time <= 7 * 24 * 60 * 60 * 1000);
      if (src.length < 2) src = daily.slice(-7);
      break;
    case "1M":
      src = daily.filter((p) => now - p.time <= 31 * 24 * 60 * 60 * 1000);
      if (src.length < 2) src = daily.slice(-31);
      break;
    case "1Y":
      src = daily.filter((p) => now - p.time <= 366 * 24 * 60 * 60 * 1000);
      if (src.length < 2) src = daily.slice(-260);
      break;
    case "ALL":
    default:
      src = daily;
      break;
  }

  return src;
}

function drawChart(points) {
  if (!canvas || !ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {
    const y = (h / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  if (!points || points.length < 2) {
    ctx.fillStyle = "#fff";
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText("NO DATA", 20, 30);
    if (minLabel) minLabel.textContent = "MIN: --";
    if (maxLabel) maxLabel.textContent = "MAX: --";
    if (pointsLabel) pointsLabel.textContent = "POINTS: 0";
    return;
  }

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const pad = (max - min) * 0.1 || 1;
  const lo = min - pad;
  const hi = max + pad;

  const xAt = (i) => (i / (points.length - 1)) * (w - 40) + 20;
  const yAt = (v) => h - ((v - lo) / (hi - lo)) * (h - 40) - 20;

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = xAt(i);
    const y = yAt(p.close);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const last = points[points.length - 1];
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(xAt(points.length - 1), yAt(last.close), 3, 0, Math.PI * 2);
  ctx.fill();

  if (minLabel) minLabel.textContent = `MIN: ${fmt(min)}`;
  if (maxLabel) maxLabel.textContent = `MAX: ${fmt(max)}`;
  if (pointsLabel) pointsLabel.textContent = `POINTS: ${points.length}`;
}

function updateQuoteFromLastTrade(lastTrade) {
  if (!lastTrade) return;
  const p = lastTrade.p;
  const ts = lastTrade.t ? new Date(lastTrade.t) : null;

  if (priceValue) priceValue.textContent = Number.isFinite(p) ? `$ ${fmt(p)}` : "--";
  if (updatedValue) updatedValue.textContent = ts ? ts.toLocaleString() : "--";
}

function updateChangeFromDailyBars(dailyBars) {
  if (!changeValue) return;

  if (!dailyBars || dailyBars.length < 2) {
    changeValue.textContent = "--";
    return;
  }

  const prev = dailyBars[dailyBars.length - 2].close;
  const curr = dailyBars[dailyBars.length - 1].close;
  const delta = curr - prev;
  const pct = prev ? (delta / prev) * 100 : 0;
  const sign = delta >= 0 ? "+" : "";

  changeValue.textContent = `${sign}${fmt(delta)} | ${sign}${pct.toFixed(2)}%`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
  }
  if (json?.status === "ERROR") {
    throw new Error(json?.error || "API ERROR");
  }
  return json;
}

function isoDate(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function fetchData() {
  const symbol = (symbolInput?.value || "").trim().toUpperCase();
  const key = (apiKeyInput?.value || "").trim();

  if (!symbol || !key) {
    setStatus("ERROR: ENTER SYMBOL + API KEY");
    return;
  }

  state.symbol = symbol;
  setStatus("LOADING...");

  try {
    const base = "https://api.polygon.io";

    const quoteUrl = `${base}/v2/last/trade/${encodeURIComponent(
      symbol
    )}?apiKey=${encodeURIComponent(key)}`;

    const intraFrom = isoDate(3);
    const intraTo = isoDate(0);
    const intraUrl = `${base}/v2/aggs/ticker/${encodeURIComponent(
      symbol
    )}/range/5/minute/${intraFrom}/${intraTo}?adjusted=true&sort=asc&limit=50000&apiKey=${encodeURIComponent(
      key
    )}`;

    const dailyFrom = isoDate(730);
    const dailyTo = isoDate(0);
    const dailyUrl = `${base}/v2/aggs/ticker/${encodeURIComponent(
      symbol
    )}/range/1/day/${dailyFrom}/${dailyTo}?adjusted=true&sort=asc&limit=50000&apiKey=${encodeURIComponent(
      key
    )}`;

    const [quoteJson, intraJson, dailyJson] = await Promise.all([
      fetchJson(quoteUrl),
      fetchJson(intraUrl),
      fetchJson(dailyUrl),
    ]);

    const lastTrade = quoteJson?.results || null;
    const intraResults = intraJson?.results || [];
    const dailyResults = dailyJson?.results || [];

    state.rawIntraday = parseAggResults(intraResults);
    state.rawDaily = parseAggResults(dailyResults);

    updateQuoteFromLastTrade(lastTrade);
    updateChangeFromDailyBars(state.rawDaily);

    const points = filterByRange(state.range, state.rawIntraday, state.rawDaily);
    drawChart(points);

    setStatus(`OK: ${symbol} /// ${state.range}`);
  } catch (err) {
    console.error(err);
    const msg = String(err?.message || "").toLowerCase();
    if (msg.includes("api key") || msg.includes("auth") || msg.includes("not authorized")) {
      setStatus("ERROR: INVALID API KEY");
    } else if (msg.includes("429") || msg.includes("rate")) {
      setStatus("RATE LIMITED: WAIT + RETRY");
    } else {
      setStatus("ERROR: NETWORK OR API FAILURE");
    }
  }
}

rangeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    rangeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    state.range = btn.dataset.range;

    const points = filterByRange(state.range, state.rawIntraday, state.rawDaily);
    drawChart(points);
    setStatus(`OK: ${state.symbol} /// ${state.range}`);
  });
});

if (loadBtn) {
  loadBtn.addEventListener("click", fetchData);
}

window.addEventListener("resize", () => {
  const points = filterByRange(state.range, state.rawIntraday, state.rawDaily);
  drawChart(points);
});
