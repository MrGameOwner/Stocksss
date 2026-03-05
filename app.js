const base = "https://api.polygon.io";

const intraFrom = isoDate(3);
const intraTo = isoDate(0);
const intraUrl = `${base}/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/5/minute/${intraFrom}/${intraTo}?adjusted=true&sort=asc&limit=50000&apiKey=${encodeURIComponent(key)}`;

const dailyFrom = isoDate(730);
const dailyTo = isoDate(0);
const dailyUrl = `${base}/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${dailyFrom}/${dailyTo}?adjusted=true&sort=asc&limit=50000&apiKey=${encodeURIComponent(key)}`;

const [intraJson, dailyJson] = await Promise.all([
  fetchJson(intraUrl),
  fetchJson(dailyUrl),
]);

const intraResults = intraJson?.results || [];
const dailyResults = dailyJson?.results || [];

state.rawIntraday = parseAggResults(intraResults);
state.rawDaily = parseAggResults(dailyResults);

// Set quote from most recent available bar
const latestPoint =
  state.rawIntraday[state.rawIntraday.length - 1] ||
  state.rawDaily[state.rawDaily.length - 1] ||
  null;

if (latestPoint) {
  priceValue.textContent = `$ ${fmt(latestPoint.close)}`;
  updatedValue.textContent = latestPoint.time.toLocaleString();
} else {
  priceValue.textContent = "--";
  updatedValue.textContent = "--";
}

updateChangeFromDailyBars(state.rawDaily);
