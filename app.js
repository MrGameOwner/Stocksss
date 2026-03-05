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
const ctx = canvas.getContext("2d");

const rangeButtons = Array.from(document.querySelectorAll(".range-btn"));

const state = {
  range: "1H",
  symbol: "IBM",
  rawIntraday: [],
  rawDaily: [],
};

function setStatus(text) {
  statusText.textContent = text;
}

function fmt(n) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseSeriesObject(seriesObj) {
  return Object.entries(seriesObj)
    .map(([time, values]) => ({
      time: new Date(time),
      open: Number(values["1. open"]),
      high: Number(values["2. high"]),
      low: Number(values["3. low"]),
      close: Number(values["4. close"]),
      volume: Number(values["5. volume"] || 0),
    }))
    .sort((a, b) => a.time - b.time);
}

function filterByRange(range, intraday, daily) {
  const now = new Date();
  let src = [];

  switch (range) {
    case "1H": {
      src = intraday.filter((p) => now - p.time <= 60 * 60 * 1000);
      if (src.length < 2) src = intraday.slice(-12);
      break;
    }
    case "1D": {
      src = intraday.filter((p) => now - p.time <= 24 * 60 * 60 * 1000);
      if (src.length < 2) src = intraday.slice(-80);
      break;
    }
    case "1W": {
      src = daily.filter((p) => now - p.time <= 7 * 24 * 60 * 60 * 1000);
      if (src.length < 2) src = daily.slice(-7);
      break;
    }
    case "1M": {
      src = daily.filter((p) => now - p.time <= 31 * 24 * 60 * 60 * 1000);
      if (src.length < 2) src = daily.slice(-31);
      break;
    }
    case "1Y": {
      src = daily.filter((p) => now - p.time <= 366 * 24 * 60 * 60 * 1000);
      if (src.length < 2) src = daily.slice(-260);
      break;
    }
    case "ALL":
    default: {
      src = daily;
      break;
    }
  }

  return src;
}

function drawChart(points) {
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
    minLabel.textContent = "MIN: --";
    maxLabel.textContent = "MAX: --";
    pointsLabel.textContent = "POINTS: 0";
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

  minLabel.textContent = `MIN: ${fmt(min)}`;
  maxLabel.textContent = `MAX: ${fmt(max)}`;
  pointsLabel.textContent = `POINTS: ${points.length}`;
}

function updateQuoteFromGlobalQuote(globalQuote) {
  if (!globalQuote) return;

  const p = globalQuote["05. price"];
  const c = globalQuote["09. change"];
  const cp = globalQuote["10. change percent"];
  const d = globalQuote["07. latest trading day"];

  priceValue.textContent = p ? `$ ${fmt(p)}` : "--";
  changeValue.textContent = c && cp ? `${fmt(c)} | ${cp}` : "--";
  updatedValue.textContent = d || "--";
}

async function fetchData() {
  const symbol = symbolInput.value.trim().toUpperCase();
  const key = apiKeyInput.value.trim();

  if (!symbol || !key) {
    setStatus("ERROR: ENTER SYMBOL + API KEY");
    return;
  }

  state.symbol = symbol;
  setStatus("LOADING...");

  try {
    const quoteUrl =
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;

    const intraUrl =
      `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(symbol)}&interval=5min&outputsize=full&apikey=${encodeURIComponent(key)}`;

    const dailyUrl =
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${encodeURIComponent(key)}`;

    const [quoteRes, intraRes, dailyRes] = await Promise.all([
      fetch(quoteUrl),
      fetch(intraUrl),
      fetch(dailyUrl),
    ]);

    const [quoteJson, intraJson, dailyJson] = await Promise.all([
      quoteRes.json(),
      intraRes.json(),
      dailyRes.json(),
    ]);

    if (quoteJson["Note"] || intraJson["Note"] || dailyJson["Note"]) {
      setStatus("RATE LIMITED: WAIT + RETRY");
      return;
    }

    if (quoteJson["Error Message"] || intraJson["Error Message"] || dailyJson["Error Message"]) {
      setStatus("ERROR: INVALID SYMBOL OR KEY");
      return;
    }

    const quote = quoteJson["Global Quote"];
    const intraSeries = intraJson["Time Series (5min)"] || {};
    const dailySeries = dailyJson["Time Series (Daily)"] || {};

    state.rawIntraday = parseSeriesObject(intraSeries);
    state.rawDaily = parseSeriesObject(dailySeries);

    updateQuoteFromGlobalQuote(quote);

    const points = filterByRange(state.range, state.rawIntraday, state.rawDaily);
    drawChart(points);

    setStatus(`OK: ${symbol} /// ${state.range}`);
  } catch (err) {
    console.error(err);
    setStatus("ERROR: NETWORK OR API FAILURE");
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

loadBtn.addEventListener("click", fetchData);

window.addEventListener("resize", () => {
  const points = filterByRange(state.range, state.rawIntraday, state.rawDaily);
  drawChart(points);
});