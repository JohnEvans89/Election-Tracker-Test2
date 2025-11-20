// CONFIGURATION — your SHEET_ID is already correct
const SHEET_ID = "2PACX-1vTHgn0f9wd8_UVmd3arACKx1Ao6E05qYAt6rUAHb8Tx7ax1V82JFE35_9MzRin1RxSep4UN-euMbt4J";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv`;
const PROXIED_URL = `https://corsproxy.io/?${encodeURIComponent(SHEET_CSV_URL)}`;
const REFRESH_INTERVAL = 30000;

// State name → abbreviation map (unchanged)
const stateAbbrev = { /* ... same as before ... */ 
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA","Colorado":"CO","Connecticut":"CT","Delaware":"DE",
  "Florida":"FL","Georgia":"GA","Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA","Kansas":"KS","Kentucky":"KY",
  "Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO",
  "Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY",
  "North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI",
  "South Carolina":"SC","South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA",
  "Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY","District of Columbia":"DC"
};

let stateData = {};
let demVotes = 0, repVotes = 0, demPop = 0, repPop = 0;

// Initialize map
function initMap() {
  $('#map').usmap({
    stateStyles: { fill: '#6b7280' },
    // This callback fires when the map is fully ready
    mapRendered: function() {
      console.log('Map fully rendered – ready for coloring');
      updateMap(); // color immediately if data already loaded
    },
    click: function(event, data) {
      const info = stateData[data.name] || {};
      alert(`${data.name}: ${info.winner || 'TBD'}\nHarris: ${info.dem?.toLocaleString() || 0} | Trump: ${info.rep?.toLocaleString() || 0}`);
    }
  });
  console.log('US Map initialized');
}

// Parse helpers (unchanged)
function parseNumber(str) { return parseInt(String(str).replace(/,/g,'').trim()) || 0; }
function cleanString(str) { return String(str||'').trim().replace(/^["']|["']$/g,''); }

// fetchData() – unchanged, just kept the good version
async function fetchData() {
  console.log('Fetching data...');
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

    console.log(`Loaded ${Object.keys(stateData).length} states – Harris ${demVotes} | Trump ${repVotes}`);
    updateDashboard();
  } catch (err) {
    console.error(err);
    alert('Data load failed – check console (F12)');
  }
}

// Update electoral & popular vote (unchanged)
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

// FIXED: Only color the map when it’s truly ready
function updateMap() {
  if (!$('#map').data('usmap')) {
    console.log('Map not ready yet – will color when mapRendered fires');
    return;
  }

  const stateStyles = {};
  Object.keys(stateData).forEach(state => {
    const code = stateAbbrev[state];
    if (code) {
      stateStyles[code] = {
        fill: stateData[state].winner === "Harris" ? "#2563eb" :
              stateData[state].winner === "Trump" ? "#dc2626" : "#6b7280"
      };
    }
  });
  $('#map').usmap('setStateStyles', stateStyles);
  console.log('Map colored successfully');
}

function updateDashboard() {
  updateElectoralVotes();
  updatePopularVote();
  updateMap(); // safe now – it will wait if map isn’t ready
  document.getElementById("lastUpdate").textContent = new Date().toLocaleTimeString();
}

// Start
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  fetchData();
  setInterval(fetchData, REFRESH_INTERVAL);
});
