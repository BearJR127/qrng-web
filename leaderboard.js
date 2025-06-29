export async function initLeaderboard(root){
  let records = [];
  let loadError = '';
  try{
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
    const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
    const firebaseConfig = {
      apiKey: "AIzaSyBQgVavR044F95yG6ETansdwJzer097nqo",
      authDomain: "colorguesser-50a43.firebaseapp.com",
      projectId: "colorguesser-50a43",
      storageBucket: "colorguesser-50a43.firebasestorage.app",
      messagingSenderId: "154711693442",
      appId: "1:154711693442:web:064528ee7d86b7e64dbc9b",
      measurementId: "G-VC3V8WYD0K",
      databaseURL: "https://colorguesser-50a43-default-rtdb.firebaseio.com/"
    };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const snap = await getDocs(collection(db,'qrng_trials'));
    records = snap.docs.map(d=>d.data());
    if(!records.length){
      const local = JSON.parse(localStorage.getItem('qrng_trials') || '[]');
      if(local.length){
        records = local;
        loadError = 'Remote database had no data, using local results.';
      }
    }
  }catch(e){
    loadError = 'Unable to load online leaderboard data.';
    console.error('Failed loading Firestore data, falling back to localStorage', e);
    try{
      records = JSON.parse(localStorage.getItem('qrng_trials') || '[]');
      if(!records.length) loadError += ' No local data found.';
    }catch(err){
      console.error('Failed loading local data for leaderboard', err);
      records = [];
      loadError += ' Failed to load local data.';
    }
  }
  const stats = {};
  records.forEach(e => {
    const u = (e.username || '').trim();
    const m = (e.mode || '').trim();
    if(!u || !m) return;
    const key = `${u}|${m}`;
    if(!stats[key]) stats[key] = {user:u, mode:m, matches:0, trials:0};
    if(e.match) stats[key].matches++;
    stats[key].trials++;
  });
  const entries = Object.values(stats).map(s => ({
    user:s.user,
    mode:s.mode,
    rate:s.trials ? s.matches/s.trials : 0,
    trials:s.trials
  }));
  let sortKey = 'rate';
  let sortDir = 'desc';
  const modeFilter = document.getElementById('mode-filter');
  const tableBody = document.querySelector('#leaderboard-table tbody');
  const headers = document.querySelectorAll('#leaderboard-table th');

  function render(){
    let data = entries.slice();
    const filter = modeFilter.value;
    if(filter) data = data.filter(e=>e.mode===filter);
    data.sort((a,b)=>{
      if(sortKey==='user') return sortDir==='asc'? a.user.localeCompare(b.user) : b.user.localeCompare(a.user);
      if(sortKey==='mode') return sortDir==='asc'? a.mode.localeCompare(b.mode) : b.mode.localeCompare(a.mode);
      if(sortKey==='trials') return sortDir==='asc'? a.trials - b.trials : b.trials - a.trials;
      return sortDir==='asc'? a.rate - b.rate : b.rate - a.rate;
    });
    tableBody.innerHTML = data.map(e=>`<tr><td>${e.user}</td><td>${e.mode}</td><td>${(e.rate*100).toFixed(1)}</td><td>${e.trials}</td></tr>`).join('');
    if(!data.length){
      tableBody.innerHTML = `<tr><td colspan="4">${loadError || 'No leaderboard data available.'}</td></tr>`;
    }
  }

  headers.forEach(h=>h.addEventListener('click',()=>{
    const key = h.dataset.sort;
    if(sortKey===key){
      sortDir = sortDir==='asc' ? 'desc' : 'asc';
    }else{
      sortKey = key;
      sortDir = key==='user' || key==='mode' ? 'asc' : 'desc';
    }
    render();
  }));
  modeFilter.addEventListener('change',render);
  render();
}

const container = document.getElementById('leaderboard-root');
if(container) initLeaderboard(container);
