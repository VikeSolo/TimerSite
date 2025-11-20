// script.js - shared by admin.html and user.html
// Assumes firebase (compat) is loaded and 'db' is available globally from firebase.database()

// Utility: format milliseconds to HH:MM:SS
function formatMS(ms){
  const totalSeconds = Math.floor(ms/1000);
  const h = Math.floor(totalSeconds/3600);
  const m = Math.floor((totalSeconds%3600)/60);
  const s = totalSeconds%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// Elements (may be absent on viewer page)
const timerDisplay = document.getElementById('timerDisplay');
const driverListEl = document.getElementById('driverList');
const dbStateEl = document.getElementById('dbState');
const statusEl = document.getElementById('status');

let localInterval = null;

// Listen for timer & drivers in DB
const timerRef = db.ref('timer');
const driversRef = db.ref('drivers');

timerRef.on('value', snapshot => {
  const data = snapshot.val() || { running:false, startTime:0, elapsed:0 };
  // Update status
  if(statusEl) statusEl.innerText = data.running ? 'Running' : 'Stopped';
  // If running, compute elapsed
  if(data.running){
    // Clear previous interval
    if(localInterval) clearInterval(localInterval);
    localInterval = setInterval(()=>{
      const now = Date.now();
      const diff = (data.elapsed || 0) + (now - (data.startTime || now));
      if(timerDisplay) timerDisplay.innerText = formatMS(diff);
    }, 250);
  } else {
    if(localInterval) { clearInterval(localInterval); localInterval = null; }
    if(timerDisplay) timerDisplay.innerText = formatMS(data.elapsed || 0);
  }
  // Show raw state if present
  if(dbStateEl) dbStateEl.innerText = JSON.stringify(data, null, 2);
}, err => {
  if(statusEl) statusEl.innerText = 'Error connecting';
  console.error('Timer listener error', err);
});

// Driver list listener
driversRef.on('value', snapshot => {
  const data = snapshot.val() || {};
  renderDriverList(data);
}, err => {
  console.error('Drivers listener error', err);
});

function renderDriverList(drivers){
  if(!driverListEl) return;
  driverListEl.innerHTML = '';
  const keys = Object.keys(drivers);
  if(keys.length === 0){
    driverListEl.innerHTML = '<div class="small">No drivers yet</div>';
    return;
  }
  keys.sort();
  keys.forEach(key=>{
    const d = drivers[key];
    const el = document.createElement('div');
    el.className = 'driver';
    el.innerHTML = `
      <div class="meta">
        <div>
          <div style="font-weight:700">${escapeHtml(d.name || 'Unnamed')}</div>
          <div class="small">${escapeHtml(d.team || '')} • ${escapeHtml(d.car || '')}</div>
        </div>
      </div>
      <div class="right">
        ${isAdminUI() ? `<button class="btn secondary" data-id="${key}" data-action="del">Delete</button>` : ''}
      </div>
    `;
    driverListEl.appendChild(el);
  });

  // wire delete buttons (only in admin)
  if(isAdminUI()){
    const dels = driverListEl.querySelectorAll('button[data-action="del"]');
    dels.forEach(b=>{
      b.addEventListener('click', e=>{
        const id = b.getAttribute('data-id');
        if(confirm('Delete this driver?')) driversRef.child(id).remove();
      });
    });
  }
}

function isAdminUI(){
  return !!document.getElementById('addDriverBtn');
}

// Admin-only UI bindings
if(isAdminUI()){
  // Controls
  document.getElementById('startBtn').addEventListener('click', ()=>{
    timerRef.once('value').then(snap=>{
      const data = snap.val() || { elapsed:0 };
      timerRef.set({
        running:true,
        startTime: Date.now(),
        elapsed: data.elapsed || 0
      });
    });
  });

  document.getElementById('stopBtn').addEventListener('click', ()=>{
    timerRef.once('value').then(snap=>{
      const data = snap.val();
      if(!data) return;
      const newElapsed = (data.elapsed || 0) + (Date.now() - (data.startTime || Date.now()));
      timerRef.set({
        running:false,
        startTime: 0,
        elapsed: newElapsed
      });
    });
  });

  document.getElementById('resetBtn').addEventListener('click', ()=>{
    if(!confirm('Reset timer to 00:00:00?')) return;
    timerRef.set({ running:false, startTime:0, elapsed:0 });
  });

  // Driver add
  document.getElementById('addDriverBtn').addEventListener('click', ()=>{
    const name = document.getElementById('driverName').value.trim();
    const car = document.getElementById('driverCar').value.trim();
    const team = document.getElementById('driverTeam').value.trim();
    if(!name){ alert('Enter driver name'); return; }
    const newRef = driversRef.push();
    newRef.set({ name, car, team, createdAt: Date.now() });
    // Clear fields
    document.getElementById('driverName').value = '';
    document.getElementById('driverCar').value = '';
    document.getElementById('driverTeam').value = '';
  });

  // Export & clear
  document.getElementById('exportBtn').addEventListener('click', ()=>{
    driversRef.once('value').then(snap=>{
      const data = snap.val() || {};
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'drivers.json'; a.click();
      URL.revokeObjectURL(url);
    });
  });

  document.getElementById('clearDriversBtn').addEventListener('click', ()=>{
    if(confirm('Remove ALL drivers?')) driversRef.set(null);
  });
}

// Small helper: escape HTML
function escapeHtml(s){
  return String(s || '').replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); });
}
