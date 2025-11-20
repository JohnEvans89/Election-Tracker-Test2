// CONFIGURATION — your sheet ID is perfect
const SHEET_ID = "2PACX-1vTHgn0f9wd8_UVmd3arACKx1Ao6E05qYAt6rUAHb8Tx7ax1V82JFE35_9MzRin1RxSep4UN-euMbt4J";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv`;
const PROXIED_URL = `https://corsproxy.io/?${encodeURIComponent(SHEET_CSV_URL)}`;
const REFRESH_INTERVAL = 30000;

// State name → abbreviation map (uppercase)
const stateAbbrev = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
  "Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD",
  "Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO",
  "Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ",
  "New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH",
  "Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC",
  "South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT",
  "Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY",
  "District of Columbia":"DC"
};

let stateData = {};
let demVotes = 0, repVotes = 0, demPop = 0, repPop = 0;
let map;
let geoJsonLayer; // ← This is the fix: store the layer globally

// Initialize Leaflet map
function initMap() {
  map = L.map('map').setView([37.8, -96], 4);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // Load US states GeoJSON
  fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
    .then(r => r.json())
    .then(geojson => {
      geoJsonLayer = L.geoJSON(geojson, {
        style: { fillColor: '#6b7280', weight: 2, color: 'white', fillOpacity: 0.8 },
        onEachFeature: (feature, layer) => {
          const stateName = feature.properties.name;
          layer.bindTooltip(stateName, { permanent: false, direction: 'center' });
          layer.on('click', () => {
            const info = stateData[stateName] || {};
            alert(`${stateName}\nWinner: ${info.winner || 'TBD'}\nHarris: ${(info.dem||0).toLocaleString()} | Trump: ${(info.rep||0).toLocaleString()}`);
          });
        }
      }).addTo(map);

      console.log('GeoJSON layer added — map ready for coloring');
      updateMap(); // Color immediately if data is already loaded
    })
    .catch(err => console.error('GeoJSON failed:', err));
}

// Parse helpers
function parseNumber(str) { return parseInt(String(str).replace(/,/g,'').trim()) || 0; }
function cleanString(str) { return String(str||'').trim().replace(/^["']|["']$/g,''); }

// Full fetchData()
async function fetchData() {
  console.log('Fetching election data...');
  try {
    const response = await fetch(PROXIED_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();

    const rows = csvText.split('\n').filter(r => r.trim());
    demVotes = repVotes = demPop = repPop = 0;
    stateData = {};

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(',');
      if (cols.length < 5) continue;
      const state = cleanString(cols[0]);
      const dem = parseNumber(cols[1]);
      const rep = parseNumber(cols[2]);
      const ev = parseNumber(cols[3]);
      const winner = cleanString(cols[4]);
      if (!state || !ev) continue;

      stateData[state] = { dem, rep, ev, winner };
      demPop += dem;
      repPop += rep;
      if (winner === "Harris") demVotes += ev;
      if (winner === "Trump") repVotes += ev;
    }

    console.log(`Loaded ${Object.keys(stateData).length} states — Harris ${demVotes} EVs | Trump ${repVotes} EVs`);
    updateDashboard();
  } catch (err) {
    console.error('Fetch failed:', err);
    alert('Data load failed — check console');
  }
}

// Update numbers
function updateElectoralVotes() {
  document.getElementById("demVotes").textContent = demVotes;
  document.getElementById("repVotes").textContent = repVotes;
}
function updatePopularVote() {
  const total = demPop + repPop || 1;
  const demPct = ((demPop / total) * 100).toFixed(1);
  const repPct = ((repPop / total) * 100).toFixed(1);
  document.getElementById("demPercent").textContent = demPct + "%";
  document.getElementById("repPercent").textContent = repPct + "%";
  document.getElementById("demBar").style.width = demPct + "%";
  document.getElementById("repBar").style.width = repPct + "%";
}

// FIXED: Color the stored GeoJSON layer
function updateMap() {
  if (!geoJsonLayer) {
    console.log('Map not ready yet — waiting for GeoJSON');
    return;
  }

  geoJsonLayer.eachLayer(layer => {
    const stateName = layer.feature.properties.name;
    const info = stateData[stateName];
    const color = info?.winner === "Harris" ? "#2563eb" :
                  info?.winner === "Trump"  ? "#dc2626" : "#6b7280";
    layer.setStyle({ fillColor: color });
  });

  console.log('Map colored successfully!');
}

function updateDashboard() {
  updateElectoralVotes();
  updatePopularVote();
  updateMap();
  document.getElementById("lastUpdate").textContent = new Date().toLocaleTimeString();
}

// Start
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard starting...');
  initMap();
  fetchData();
  setInterval(fetchData, REFRESH_INTERVAL);
});
