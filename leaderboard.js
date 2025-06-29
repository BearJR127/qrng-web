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
    if(!u) return;
    if(!stats[u]) stats[u] = {matches:0,trials:0};
    if(e.match) stats[u].matches++;
    stats[u].trials++;
  });
  const entries = Object.entries(stats).map(([user,s]) => ({user, rate:s.trials ? s.matches/s.trials : 0, trials:s.trials}));
  entries.sort((a,b)=> b.rate - a.rate || b.trials - a.trials);
  const top = entries.slice(0,50);
  root.innerHTML = '<h1>User Leaderboard</h1>';
  if(top.length){
    root.innerHTML += '<ol>' + top.map(e=>`<li>${e.user} - ${(e.rate*100).toFixed(1)}% (${e.trials})</li>`).join('') + '</ol>';
  }else{
    root.innerHTML += `<p>${loadError || 'No leaderboard data available.'}</p>`;
  }
}

const container = document.getElementById('leaderboard-root');
if(container) initLeaderboard(container);
