const defaultUsername = (() => {
  const now = new Date();
  const pad = n => n.toString().padStart(2,'0');
  return 'unidentified' +
    pad(now.getDate()) +
    pad(now.getMonth()+1) +
    now.getFullYear() +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
})();

export function initGame(container){
  container.innerHTML = `
  <h1>Color Picking Guessing Game</h1>
  <div>
    <label>Username:</label>
    <input type="text" id="username" value="${defaultUsername}" />
  </div>
  <div id="options-row">
    <div>
      <label>Select Mode:</label>
      <select id="mode">
        <option value="focus">Focus</option>
        <option value="guesser">Guesser</option>
        <option value="intuition">Intuition</option>
        <option value="blackwhite">BlackWhite</option>
      </select>
    </div>
    <div>
      <label>RNG:</label>
      <select id="rng">
        <option value="camera" selected>Camera</option>
        <option value="event">Software</option>
      </select>
    </div>
    <div id="single-choice-container">
      <label>Select a Color:</label>
      <input type="hidden" id="single-choice" value="Red" />
      <div class="color-slider" data-input="single-choice"></div>
    </div>
  </div>
  <div id="intuition-inputs" style="display:none;">
    <label>Select 5 Colors:</label><br>
    <input type="hidden" class="intuition-choice" id="user-choice-1" value="Red" />
    <div class="color-slider intuition-slider" data-input="user-choice-1"></div>
    <input type="hidden" class="intuition-choice" id="user-choice-2" value="Red" />
    <div class="color-slider intuition-slider" data-input="user-choice-2"></div>
    <input type="hidden" class="intuition-choice" id="user-choice-3" value="Red" />
    <div class="color-slider intuition-slider" data-input="user-choice-3"></div>
    <input type="hidden" class="intuition-choice" id="user-choice-4" value="Red" />
    <div class="color-slider intuition-slider" data-input="user-choice-4"></div>
    <input type="hidden" class="intuition-choice" id="user-choice-5" value="Red" />
    <div class="color-slider intuition-slider" data-input="user-choice-5"></div>
  </div>
  <button id="intuition-submit" onclick="submitIntuitionChoice()" style="display:none;">Submit Choice</button>
  <button onclick="runTrial()" id="trial-button">Start Trial</button>
  <button onclick="exportCSV()">Export CSV</button>
  <button onclick="resetPage()">Reset</button>
  <button id="about-button">About</button>
  <button id="relax-button">Relax</button>
  <div id="result"></div>
  <div id="live-container">
    <div id="dashboard-stats"></div>
    <canvas id="chart" width="320" height="240"></canvas>
    <video id="video" width="320" height="240" autoplay muted></video>
  </div>
  <canvas id="canvas" width="320" height="240" style="display:none;"></canvas>
  <div id="analysis-container">
    <h3>Historical Analysis</h3>
    <div id="analysis-options">
      <input type="date" id="filter-start" />
      <span>to</span>
      <input type="date" id="filter-end" />
      <select id="filter-mode">
        <option value="">All Modes</option>
        <option value="focus">Focus</option>
        <option value="guesser">Guesser</option>
        <option value="intuition">Intuition</option>
        <option value="blackwhite">BlackWhite</option>
      </select>
      <select id="filter-rng">
        <option value="">All RNG</option>
        <option value="Camera">Camera</option>
        <option value="Software">Software</option>
      </select>
      <input list="user-directory" type="text" id="filter-user" placeholder="User" value="All" />
      <datalist id="user-directory"></datalist>
      <button id="analysis-refresh">Refresh</button>
    </div>
    <div id="analysis-stats"></div>
    <canvas id="analysis-chart" width="320" height="240"></canvas>
  </div>
  <div id="about-modal">
    <h2>Welcome to Color Picking Guessing Game</h2>
  <p>This is a fun game to test your skills at picking random colors. This application picks random colors using two different modes: a "quantum" random number generator (QRNG) that converts the pixels from your <strong>camera</strong> into bits used to pick colors, and a software based RNG which generates colors from random.event() code. For the QRNG - no information from your camera is being stored, access is only used to create temporary B&W high contrast data for random bit selection, and outside of software based bit selection there's no monitoring or access.</p>
    <p>There are four different game modes available:</p>
    <p><strong>Focus mode</strong> continuously picks colors. Select a RNG then pick a color you think is going to be the highest match at that give time. After clicking 'Start Trial' the Q/RNG will run - change your selection as it goes to try your luck. When you're done 'Stop Trial' to see how you did, and if you'd like even export your results as a CSV.</p>
    <p><strong>Guesser mode</strong> is as it sounds, the Q/RNG has picked a color - can you guess which one? Select a color and click 'Start Trial' to guess. How's your guessing game?</p>
    <p><strong>Intuition mode</strong> has you select 5 different color picks before the Q/RNG picks its colors. It's like guesser mode but in reverse. How good are you at guessing which colors will be selected?</p>
    <p><strong>Black white mode</strong> is a two color guessing game where you pick which color, black or white, will be chosen next. Like a single trial intuition with 50/50 odds, how well can you do?</p>
    <button id="close-about">Close</button>
  </div>
  <div id="relax-modal">
    <div id="relax-cycle">0/10</div>
    <div id="relax-circle"></div>
    <div id="relax-countdown">60</div>
    <button id="relax-music">Music</button>
    <button id="next-cycle" disabled>Next</button>
    <button id="close-relax">Close</button>
    <audio id="relax-audio" src="relax.mp3" loop></audio>
  </div>`;

  runGameLogic();
}

async function runGameLogic(){
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
  const { getAnalytics } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js');
  const { getFirestore, collection, addDoc, getDocs, onSnapshot } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
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
  const analytics = getAnalytics(app);
  const db = getFirestore(app);

  const DEFAULT_SYMBOLS = ['Red','Blue','Green','Yellow'];
  const BW_SYMBOLS = ['Black','White'];
  const ALL_SYMBOLS = [...DEFAULT_SYMBOLS, ...BW_SYMBOLS];
  let SYMBOLS = DEFAULT_SYMBOLS;
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let intuitionStats = {round:0,totalMatches:0,totalTrials:0};
  let intuitionGuesses = [];
  let currentIntuitionIndex = 1;
  let chartInstance = null;
  let focusRunning = false;
  let focusTrialCount = 0;
  const MAX_FOCUS_TRIALS = 500;
  let nextActual = null;
  let nextRngTimestamp = null;
  let prepareInterval = null;
  let analysisChart = null;
  let allTrials = [];
  let audioCtx = null;

  function playTone(duration = 200, frequency = 440, volume = 0.5){
    try{
      if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = frequency;
      osc.type = 'sine';
      gain.gain.value = volume;
      osc.start();
      osc.stop(audioCtx.currentTime + duration/1000);
    }catch(e){
      console.error('Failed to play tone', e);
    }
  }

  function setSymbolsForMode(mode){
    SYMBOLS = (mode==='blackwhite') ? BW_SYMBOLS : DEFAULT_SYMBOLS;
  }

  function loadLocalTrials(){
    try{
      const data=JSON.parse(localStorage.getItem('qrng_trials')||'[]');
      return Array.isArray(data)?data:[];
    }catch(e){
      console.error('Failed loading local trials',e);
      return [];
    }
  }

  function saveTrialLocal(record){
    try{
      const data=loadLocalTrials();
      if(!data.some(t=>t.hash===record.hash)){
        data.push(record);
        localStorage.setItem('qrng_trials',JSON.stringify(data));
      }
    }catch(e){
      console.error('Failed saving trial locally',e);
    }
  }
  function getSliderTemplate(symbols){
    const classes={Red:'red',Blue:'blue',Green:'green',Yellow:'yellow',White:'white',Black:'black'};
    const segs=symbols.map(s=>`<div class="${classes[s]}" data-color="${s}">${s[0]}</div>`).join('');
    return `<div class="color-slider-container"><div class="color-slider-bar">${segs}</div><div class="slider-marker"></div></div>`;
  }
  const sliderHandlers={};

  function setupSlider(inputId){
    const input=document.getElementById(inputId);
    const slider=document.querySelector(`.color-slider[data-input="${inputId}"]`);
    if(!slider) return;
    slider.innerHTML=getSliderTemplate(SYMBOLS);
    const container=slider.querySelector('.color-slider-container');
    const marker=slider.querySelector('.slider-marker');
    function setIndex(idx){
      const len=SYMBOLS.length;
      idx=((idx%len)+len)%len;
      const color=SYMBOLS[idx];
      input.value=color;
      marker.style.left=`${(idx+0.5)*(100/len)}%`;
    }
    function indexFromEvent(e){
      const rect=container.getBoundingClientRect();
      let x=e.clientX-rect.left;
      x=Math.max(0,Math.min(rect.width,x));
      return Math.floor(x/(rect.width/SYMBOLS.length));
    }
    let dragging=false;
    container.addEventListener('pointerdown',e=>{
      e.preventDefault();
      dragging=true;
      container.setPointerCapture(e.pointerId);
      setIndex(indexFromEvent(e));
    });
    container.addEventListener('pointermove',e=>{
      if(!dragging) return;
      e.preventDefault();
      setIndex(indexFromEvent(e));
    });
    function endDrag(e){
      if(!dragging) return;
      container.releasePointerCapture(e.pointerId);
      dragging=false;
      setIndex(indexFromEvent(e));
    }
    container.addEventListener('pointerup',endDrag);
    container.addEventListener('pointercancel',endDrag);
    container.addEventListener('pointerleave',endDrag);
    sliderHandlers[inputId]=color=>{ const i=SYMBOLS.indexOf(color); if(i>=0) setIndex(i); };
    setIndex(SYMBOLS.indexOf(input.value)||0);
  }

  function setSliderDisabled(inputId,disabled){
    const slider=document.querySelector(`.color-slider[data-input="${inputId}"]`);
    if(!slider) return;
    slider.classList.toggle('disabled',disabled);
  }

  function updateChart(snapshot) {
    const data={}, total={};
    ALL_SYMBOLS.forEach(s=>{data[s]=0; total[s]=0;});
    snapshot.forEach(d => {
      const e = d.data();
      if(e.userSymbol in total){
        total[e.userSymbol]++;
        if(e.match) data[e.userSymbol]++;
      }
    });
    const labels = ALL_SYMBOLS.slice(),
          matches = labels.map(s=>data[s]),
          attempts = labels.map(s=>total[s]);
    const rbgyMatches = matches.slice(0,4).reduce((a,b)=>a+b,0);
    const rbgyAttempts = attempts.slice(0,4).reduce((a,b)=>a+b,0);
    const bwMatches = matches.slice(4).reduce((a,b)=>a+b,0);
    const bwAttempts = attempts.slice(4).reduce((a,b)=>a+b,0);
    const allMatches = matches.reduce((a,b)=>a+b,0);
    const allAttempts = attempts.reduce((a,b)=>a+b,0);
    labels.push('All RBGY','All BW');
    const datasetData = matches.map((m,i)=>attempts[i]?((m/attempts[i])*100):0);
    datasetData.push(rbgyAttempts?((rbgyMatches/rbgyAttempts)*100):0);
    datasetData.push(bwAttempts?((bwMatches/bwAttempts)*100):0);
    if(chartInstance) chartInstance.destroy();
    const ctxc = document.getElementById('chart').getContext('2d');
    chartInstance = new Chart(ctxc, {
      type:'bar',
      data:{ labels, datasets:[{ label:'Match %', data:datasetData, backgroundColor:['red','blue','green','yellow','#ccc','black','#888','#444'] }]},
      options:{ scales:{ y:{ beginAtZero:true, max:100 } } }
    });
    document.getElementById('dashboard-stats').innerText = `Matched: ${allMatches}\nTrials: ${allAttempts}`;
  }

  function initLiveDashboard(){
    onSnapshot(collection(db, 'qrng_trials'), snap => updateChart(snap));
  }

  function parseDateField(f){
    if(!f) return null;
    if(f.toDate) return f.toDate();
    if(typeof f==='object' && typeof f.seconds==='number'){
      return new Date(f.seconds*1000);
    }
    return new Date(f);
  }

  function computeStats(matches, attempts, symbols){
    const syms=symbols||SYMBOLS;
    const p0=1/syms.length, z=jStat.normal.inv(0.975,0,1);
    const stats=syms.map((s,i)=>{
      const n=attempts[i], k=matches[i];
      const rate=n?((k/n)*100).toFixed(1):0;
      const se0=Math.sqrt(p0*(1-p0)/n), delta=(k/n)-p0, mu=delta/se0;
      const power=n?((jStat.normal.cdf(-z-mu)+1-jStat.normal.cdf(z-mu)).toFixed(3)):0;
      const chi=n?((k-n*p0)**2/(n*p0)+((n-k)-n*(1-p0))**2/(n*(1-p0))):0;
      const pval=n?(1-jStat.chisquare.cdf(chi,1)).toFixed(5):0;
      const ci=n?`±${(z*Math.sqrt((k/n)*(1-k/n)/n)*100).toFixed(1)}`:'±0';
      return {s,n,k,rate,pval,power,ci};
    });
    const allN=attempts.reduce((a,b)=>a+b,0);
    const allK=matches.reduce((a,b)=>a+b,0);
    const allRate=allN?((allK/allN)*100).toFixed(1):0;
    const seAll=Math.sqrt(p0*(1-p0)/allN), deltaAll=(allK/allN)-p0, muAll=deltaAll/seAll;
    const powerAll=allN?((jStat.normal.cdf(-z-muAll)+1-jStat.normal.cdf(z-muAll)).toFixed(3)):0;
    const chiAll=allN?((allK-allN*p0)**2/(allN*p0)+((allN-allK)-allN*(1-p0))**2/(allN*(1-p0))):0;
    const pvalAll=allN?(1-jStat.chisquare.cdf(chiAll,1)).toFixed(5):0;
    const ciAll=allN?`±${(z*Math.sqrt((allK/allN)*(1-allK/allN)/allN)*100).toFixed(1)}`:'±0';
    stats.push({s:'All',n:allN,k:allK,rate:allRate,pval:pvalAll,power:powerAll,ci:ciAll});
    return stats;
  }

  function updateAnalysis(){
    const start=document.getElementById('filter-start').value;
    const end=document.getElementById('filter-end').value;
    const mode=document.getElementById('filter-mode').value;
    const rng=document.getElementById('filter-rng').value;
    const user=document.getElementById('filter-user').value.trim();
    const normalizedUser=user.toLowerCase();
    const startDate=start?new Date(start):null;
    const endDate=end?new Date(end+'T23:59:59'):null;
    const filtered=allTrials.filter(e=>{
      const d=parseDateField(e.rngTimestamp||e.timestamp);
      if(startDate && (!d || d<startDate)) return false;
      if(endDate && (!d || d>endDate)) return false;
      if(mode && e.mode!==mode) return false;
      if(rng && e.rng!==rng) return false;
      if(user && normalizedUser!=='all' && (e.username||'')!==user) return false;
      return true;
    });
    const data={}, total={};
    ALL_SYMBOLS.forEach(s=>{data[s]=0; total[s]=0;});
    filtered.forEach(e=>{
      if(e.userSymbol in total){
        total[e.userSymbol]++;
        if(e.match) data[e.userSymbol]++;
      }
    });
    const labels=ALL_SYMBOLS.slice(), matches=labels.map(s=>data[s]), attempts=labels.map(s=>total[s]);
    const rbgyMatches=matches.slice(0,4).reduce((a,b)=>a+b,0);
    const rbgyAttempts=attempts.slice(0,4).reduce((a,b)=>a+b,0);
    const bwMatches=matches.slice(4).reduce((a,b)=>a+b,0);
    const bwAttempts=attempts.slice(4).reduce((a,b)=>a+b,0);
    labels.push('All RBGY','All BW');
    const datasetData=matches.map((m,i)=>attempts[i]?((m/attempts[i])*100):0);
    datasetData.push(rbgyAttempts?((rbgyMatches/rbgyAttempts)*100):0);
    datasetData.push(bwAttempts?((bwMatches/bwAttempts)*100):0);
    if(analysisChart) analysisChart.destroy();
    const ctxa=document.getElementById('analysis-chart').getContext('2d');
    analysisChart=new Chart(ctxa,{type:'bar',data:{labels,datasets:[{label:'Match %',data:datasetData,backgroundColor:['red','blue','green','yellow','#ccc','black','#888','#444']}]},options:{scales:{y:{beginAtZero:true,max:100}}}});
    const baseStats=computeStats(matches,attempts,ALL_SYMBOLS).slice(0,ALL_SYMBOLS.length);
    const rbgyStats=computeStats(matches.slice(0,4),attempts.slice(0,4),DEFAULT_SYMBOLS).pop();
    const bwStats=computeStats(matches.slice(4),attempts.slice(4),BW_SYMBOLS).pop();
    baseStats.push({...rbgyStats,s:'All RBGY'});
    baseStats.push({...bwStats,s:'All BW'});
    document.getElementById('analysis-stats').innerHTML=baseStats.map(s=>`${s.s}: ${s.k}/${s.n} (${s.rate}% ${s.ci}, p=${s.pval}, power=${s.power})`).join('<br>') || 'No data';
  }

  async function loadAllTrials(){
    let local=loadLocalTrials();
    allTrials=local;
    try{
      const snap=await getDocs(collection(db,'qrng_trials'));
      const remote=snap.docs.map(d=>d.data());
      for(const r of remote){
        const rec={...r};
        const ts=parseDateField(rec.timestamp);
        const rngTs=parseDateField(rec.rngTimestamp);
        if(ts) rec.timestamp=ts.toISOString();
        if(rngTs) rec.rngTimestamp=rngTs.toISOString();
        if(!allTrials.some(t=>t.hash===rec.hash)) allTrials.push(rec);
      }
      localStorage.setItem('qrng_trials',JSON.stringify(allTrials));
    }catch(e){
      console.error('Failed loading remote trials',e);
    }
    const users=new Set(allTrials.map(e=>(e.username||'').trim()).filter(Boolean));
    const list=document.getElementById('user-directory');
    if(list){
      const options=Array.from(users).sort().map(u=>`<option value="${u}">`).join('');
      list.innerHTML=`<option value="All">All</option>`+options;
    }
    updateAnalysis();
  }

  function initAnalysisDashboard(){
    document.getElementById('analysis-refresh').addEventListener('click',loadAllTrials);
    loadAllTrials();
  }

  function updateUIForMode(){
    const m=document.getElementById('mode').value;
    document.getElementById('single-choice-container').style.display = m==='intuition'?'none':'block';
    document.getElementById('intuition-inputs').style.display = m==='intuition'?'block':'none';
    document.getElementById('intuition-submit').style.display = m==='intuition'?'inline-block':'none';
    setSymbolsForMode(m);
    setupSlider('single-choice');
    if(m==='intuition') resetIntuitionChoices();
    if(m==='guesser') ensureNextRng();
  }

  document.getElementById('mode').addEventListener('change', updateUIForMode);
  updateUIForMode();
  initLiveDashboard();
  for(let i=1;i<=5;i++) setupSlider(`user-choice-${i}`);
  initAnalysisDashboard();

  function resetIntuitionChoices(){
    intuitionGuesses=[];
    currentIntuitionIndex=1;
    for(let i=1;i<=5;i++){
      const input=document.getElementById(`user-choice-${i}`);
      input.disabled=(i!==1);
      setSliderDisabled(input.id,input.disabled);
      if(sliderHandlers[input.id]) sliderHandlers[input.id]('Red');
    }
    document.getElementById('intuition-submit').disabled=false;
  }

  async function submitIntuitionChoice(){
    const input=document.getElementById(`user-choice-${currentIntuitionIndex}`);
    const guess=input.value;
    const timestamp=new Date();
    const username=document.getElementById('username').value.trim() || defaultUsername;
    const submitHash=await computeHash({timestamp: timestamp.toISOString(), mode:'intuition', userSymbol: guess, username});
    intuitionGuesses.push({guess,timestamp,submitHash});
    input.disabled=true;
    setSliderDisabled(input.id,true);
    currentIntuitionIndex++;
    if(currentIntuitionIndex<=5){
      const nextInput=document.getElementById(`user-choice-${currentIntuitionIndex}`);
      nextInput.disabled=false;
      setSliderDisabled(nextInput.id,false);
    }else{
      document.getElementById('intuition-submit').disabled=true;
    }
  }
  window.submitIntuitionChoice = submitIntuitionChoice;

  let cameraStream = null;
  async function startCamera(){
    if(cameraStream || !navigator.mediaDevices?.getUserMedia) return cameraStream;
    try{
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = cameraStream;
      await new Promise(res => video.addEventListener('playing', res, { once: true }));
      if(document.getElementById('mode').value==='guesser' && !nextActual){
        ensureNextRng();
      }
    }catch(err){
      document.getElementById('result').innerText = 'Webcam access denied.';
      cameraStream = null;
    }
    return cameraStream;
  }

  function stopCamera(){
    if(cameraStream){
      cameraStream.getTracks().forEach(t=>t.stop());
      cameraStream = null;
      video.srcObject = null;
    }
  }

  function extractRawBits(data,w,h){
    const bits=[];
    for(let i=0;i<64;i++){
      const x1=Math.floor(Math.random()*w), y1=Math.floor(Math.random()*h);
      const x2=Math.floor(Math.random()*w), y2=Math.floor(Math.random()*h);
      const idx1=(y1*w+x1)*4, idx2=(y2*w+x2)*4;
      const gray1=0.299*data[idx1]+0.587*data[idx1+1]+0.114*data[idx1+2];
      const gray2=0.299*data[idx2]+0.587*data[idx2+1]+0.114*data[idx2+2];
      bits.push((gray1^gray2)&1);
    }
    return bits;
  }
  function vonNeumann(bits){
    const out=[];
    for(let i=0;i<bits.length-1;i+=2){
      const [b1,b2]=[bits[i],bits[i+1]];
      if(b1===0 && b2===1) out.push(0);
      else if(b1===1 && b2===0) out.push(1);
    }
    return out;
  }

  function getSymbolFromWebcam(){
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const raw=extractRawBits(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
    const vn=vonNeumann(raw);
    const bitsNeeded=SYMBOLS.length===2?1:2;
    if(vn.length<bitsNeeded) return null;
    return SYMBOLS[parseInt(vn.slice(0,bitsNeeded).join(''),2)%SYMBOLS.length];
  }

  function getSymbolFromEvent(){
    const arr=new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return SYMBOLS[arr[0]%SYMBOLS.length];
  }

  function getSymbol(){
    const rngMode=document.getElementById('rng').value;
    if(rngMode==='event') return getSymbolFromEvent();
    return getSymbolFromWebcam();
  }

  function prepareNextRng(){
    nextActual=getSymbol();
    nextRngTimestamp=new Date();
  }

  function ensureNextRng(){
    if(prepareInterval) clearInterval(prepareInterval);
    prepareNextRng();
    if(!nextActual){
      prepareInterval=setInterval(()=>{
        prepareNextRng();
        if(nextActual){
          clearInterval(prepareInterval);
          prepareInterval=null;
        }
      },500);
    }
  }

  async function computeHash(obj){
    const encoder=new TextEncoder();
    const data=encoder.encode(JSON.stringify(obj));
    const hashBuffer=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(hashBuffer)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function singleFocusTrial(username){
    const guess=document.getElementById('single-choice').value;
    const actual=getSymbol();
    if(!actual){
      document.getElementById('result').innerText='Insufficient random bits — try again.';
      return;
    }
    const match=(actual===guess);
    document.getElementById('result').innerHTML=
      `Your focus: <b>${guess}</b><br>`+
      `Actual: <b>${actual}</b><br>`+
      `<span class='${match?'match':'no-match'}'>${match?'✔ Match!':'✘ No match'}</span>`;
    const rng=document.getElementById('rng').value==='event'?'Software':'Camera';
    const record={timestamp:new Date(),mode:'focus',rng,userSymbol:guess,actualSymbol:actual,match,username};
    const hash=await computeHash({...record,timestamp:record.timestamp.toISOString()});
    record.hash=hash;
    saveTrialLocal(record);
    addDoc(collection(db,'qrng_trials'),record).catch(e=>console.error(e));
  }

  async function startFocusLoop(username){
    if(document.getElementById('rng').value==='camera'){
      await startCamera();
    }
    focusRunning=true;
    focusTrialCount=0;
    document.getElementById('trial-button').innerText='Stop Trial';
    const loop=async()=>{
      if(!focusRunning) return;
      await singleFocusTrial(username);
      focusTrialCount++;
      if(focusTrialCount>=MAX_FOCUS_TRIALS){
        stopFocusLoop();
        document.getElementById('result').innerText=`Focus mode automatically stopped after ${MAX_FOCUS_TRIALS} trials.`;
        return;
      }
      setTimeout(loop,200);
    };
    loop();
  }

  function stopFocusLoop(){
    focusRunning=false;
    document.getElementById('trial-button').innerText='Start Trial';
    stopCamera();
  }

  async function runTrial(){
    const submitTimestamp=new Date();
    const mode=document.getElementById('mode').value;
    const username=document.getElementById('username').value.trim() || defaultUsername;
    const rngMode=document.getElementById('rng').value;
    if(mode==='focus'){
      if(focusRunning){
        stopFocusLoop();
      }else{
        await startFocusLoop(username);
      }
      return;
    }
    if(mode==='intuition'){
      if(intuitionGuesses.length<5){
        document.getElementById('result').innerText='Please submit all 5 choices first.';
        return;
      }
    }
    if(rngMode==='camera'){
      await startCamera();
    }
    if(mode==='intuition'){
      const results=[];
      for(const g of intuitionGuesses){
        const actual=getSymbol();
        const rngTimestamp=new Date();
        if(!actual){
          document.getElementById('result').innerText='Insufficient random bits — try again.';
          return;
        }
        const rng=document.getElementById('rng').value==='event'?'Software':'Camera';
        const match=(actual===g.guess);
        results.push({guess:g.guess,actual,match});
        const record={timestamp:g.timestamp,rngTimestamp,mode,rng,userSymbol:g.guess,actualSymbol:actual,match,username,submitHash:g.submitHash};
        const rngHash=await computeHash({timestamp:rngTimestamp.toISOString(),mode,rng,actualSymbol:actual});
        record.rngHash=rngHash;
        const hash=await computeHash({...record,timestamp:record.timestamp.toISOString(),rngTimestamp:record.rngTimestamp.toISOString()});
        record.hash=hash;
        saveTrialLocal(record);
        addDoc(collection(db,'qrng_trials'),record).catch(e=>console.error(e));
      }
      let summary='';
      let matchCount=0;
      results.forEach((r,i)=>{
        if(r.match) matchCount++;
        summary+=`Guess ${i+1}: <b>${r.guess}</b> | Actual: <b>${r.actual}</b> - <span class='${r.match?'match':'no-match'}'>${r.match?'✔ Match!':'✘ No match'}</span><br>`;
      });
      intuitionStats.round++;
      intuitionStats.totalMatches+=matchCount;
      intuitionStats.totalTrials+=5;
      summary+=`<b>Round ${intuitionStats.round}: ${matchCount}/5 correct</b><br>`;
      document.getElementById('result').innerHTML=summary;
      if(matchCount>0){
        const spans=document.querySelectorAll('#result .match');
        spans.forEach(span=>{
          span.classList.add('shake');
          setTimeout(()=>span.classList.remove('shake'),3000);
        });
        if(navigator.vibrate) navigator.vibrate(3000);
      }
      resetIntuitionChoices();
      return;
    }

    let guess, actual, rngTimestamp;
    if(mode==='guesser'){
      guess=document.getElementById('single-choice').value;
      actual=nextActual;
      rngTimestamp=nextRngTimestamp;
      if(!actual){
        document.getElementById('result').innerText='Not prepared yet — preparing random value...';
        ensureNextRng();
        return;
      }
    }else{
      guess=document.getElementById('single-choice').value;
      actual=getSymbol();
      rngTimestamp=new Date();
      if(!actual){
        document.getElementById('result').innerText='Insufficient random bits — try again.';
        return;
      }
    }
    const rng=document.getElementById('rng').value==='event'?'Software':'Camera';
    const match=(actual===guess);
    if(match && (mode=="guesser" || mode=="blackwhite")) playTone();
    document.getElementById('result').innerHTML=
      `Your guess: <b>${guess}</b><br>`+
      `Actual: <b>${actual}</b><br>`+
      `<span class='${match?'match':'no-match'}'>${match?'✔ Match!':'✘ No match'}</span>`;
    if(match && (mode==='guesser' || mode==='blackwhite' || mode==='intuition') && navigator.vibrate){
      navigator.vibrate(3000);
    }
    if(match && (mode==='guesser' || mode==='blackwhite' || mode==='intuition')){
      const span=document.querySelector('#result .match');
      if(span){
        span.classList.add('shake');
        setTimeout(()=>span.classList.remove('shake'),3000);
      }
    }
    const record={timestamp:submitTimestamp,rngTimestamp,mode,rng,userSymbol:guess,actualSymbol:actual,match,username};
    const rngHash=await computeHash({timestamp:rngTimestamp.toISOString(),mode,rng,actualSymbol:actual});
    record.rngHash=rngHash;
    const hash=await computeHash({...record,timestamp:record.timestamp.toISOString(),rngTimestamp:record.rngTimestamp.toISOString()});
    record.hash=hash;
    saveTrialLocal(record);
    addDoc(collection(db,'qrng_trials'),record).catch(e=>console.error(e));
    if(mode==='guesser') prepareNextRng();
    if(rngMode==='camera') stopCamera();
  }
  window.runTrial=runTrial;

  async function exportCSV(){
    const promptResult=prompt('Filter (focus, guesser, intuition, blackwhite) or leave blank:');
    const modeFilter=(promptResult===null?'':promptResult).toLowerCase();
    const snap=await getDocs(collection(db,'qrng_trials'));
    const symbols=ALL_SYMBOLS;
    const data={}, total={}, rows=[];
    symbols.forEach(s=>{data[s]=0; total[s]=0;});
    for(const d of snap.docs){
      const e=d.data();
      if(modeFilter && e.mode!==modeFilter) continue;
      if(e.userSymbol in total){
        total[e.userSymbol]++;
        if(e.match) data[e.userSymbol]++;
        let ts='', rngTs='', tsHash='', rngTsHash='', rngDate=new Date(0);
        if(e.timestamp){
          const dt=e.timestamp.toDate?e.timestamp.toDate():new Date(e.timestamp);
          ts=dt.toISOString().replace('T',' ').split('.')[0];
          tsHash=await computeHash(ts);
        }
        if(e.rngTimestamp){
          const rdt=e.rngTimestamp.toDate?e.rngTimestamp.toDate():new Date(e.rngTimestamp);
          rngTs=rdt.toISOString().replace('T',' ').split('.')[0];
          rngTsHash=await computeHash(rngTs);
          rngDate=rdt;
        }
        rows.push({rngDate,row:[rngTs,e.username||'',e.mode,e.rng||'',e.userSymbol,ts,tsHash,e.actualSymbol,rngTs,rngTsHash,e.match,e.submitHash||'',e.rngHash||'']});
      }
    }
    rows.sort((a,b)=>a.rngDate-b.rngDate);
    const labels=symbols.slice();
    const matches=labels.map(s=>data[s]);
    const attempts=labels.map(s=>total[s]);
    const rbgyStats=computeStats(matches.slice(0,4),attempts.slice(0,4),DEFAULT_SYMBOLS).pop();
    const bwStats=computeStats(matches.slice(4),attempts.slice(4),BW_SYMBOLS).pop();
    const overall=computeStats(matches,attempts,labels).pop();
    let stats=computeStats(matches,attempts,labels).slice(0,labels.length);
    stats.push({...rbgyStats,s:'All RBGY'});
    stats.push({...bwStats,s:'All BW'});
    stats.push(overall);
    const exportUser=document.getElementById('username').value.trim() || defaultUsername;
    let csv='username,'+exportUser+'\n'+
            'trialNumber,rngTimestamp,username,mode,RNG,userSymbol,userTimestamp,userTimestampHash,actualSymbol,actualTimestamp,actualTimestampHash,match,submitHash,rngHash\n'+
            rows.map((r,i)=>[i+1,...r.row].join(',')).join('\n')+
            '\n\nSymbol,N,Matches,Rate%,CI,p-value,Power\n'+
            stats.map(x=>`${x.s},${x.n},${x.k},${x.rate},${x.ci},${x.pval},${x.power}`).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}), url=URL.createObjectURL(blob), a=document.createElement('a');
    const now=new Date();
    const pad=n=>n.toString().padStart(2,'0');
    const ts=`${pad(now.getMonth()+1)}${pad(now.getDate())}${now.getFullYear()}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    a.href=url; a.download=`qrng_${ts}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  window.exportCSV=exportCSV;

  function resetPage(){
    if(confirm('Are you sure you want to refresh and reset all data?')){
      location.reload();
    }
  }
  window.resetPage=resetPage;

  document.getElementById('about-button').addEventListener('click',()=>{
    document.getElementById('about-modal').style.display='block';
  });
  document.getElementById('close-about').addEventListener('click',()=>{
    document.getElementById('about-modal').style.display='none';
  });

  const pastelColors=['#ffd1dc','#e6e6fa','#d0f0c0','#fdfd96','#ffe5b4','#c1e1c1'];
  let colorIndex=0,colorInterval,countdownInterval,cycleCount=0;

  function startRelax(){
    cycleCount=1;
    document.getElementById('relax-cycle').textContent=`${cycleCount}/10`;
    const audio=document.getElementById('relax-audio');
    audio.loop=true;
    audio.play();
    startRelaxCycle();
  }

  function startRelaxCycle(){
    const audio=document.getElementById('relax-audio');
    audio.loop=true;
    if(audio.paused){
      audio.play();
    }
    const nextBtn=document.getElementById('next-cycle');
    nextBtn.disabled=true;
    nextBtn.classList.remove('highlight');
    const circle=document.getElementById('relax-circle');
    circle.style.animation='none';
    void circle.offsetWidth;
    circle.style.animation='grow-shrink 12s linear 5 forwards';
    circle.style.backgroundColor=pastelColors[0];
    colorIndex=0;
    colorInterval=setInterval(()=>{
      colorIndex++;
      circle.style.backgroundColor=pastelColors[colorIndex%pastelColors.length];
    },2000);
    let remaining=60;
    document.getElementById('relax-countdown').textContent=remaining;
    countdownInterval=setInterval(()=>{
      remaining--;
      document.getElementById('relax-countdown').textContent=remaining;
      if(remaining<=0) finishRelaxCycle();
    },1000);
  }

  function finishRelaxCycle(){
    clearInterval(colorInterval);
    clearInterval(countdownInterval);
    const nextBtn=document.getElementById('next-cycle');
    if(cycleCount<10){
      nextBtn.disabled=false;
      nextBtn.classList.add('highlight');
    }else{
      nextBtn.disabled=true;
    }
  }

  function nextCycle(){
    if(cycleCount>=10) return;
    cycleCount++;
    document.getElementById('relax-cycle').textContent=`${cycleCount}/10`;
    startRelaxCycle();
  }

  function closeRelax(){
    document.getElementById('relax-modal').style.display='none';
    clearInterval(colorInterval);
    clearInterval(countdownInterval);
    document.getElementById('next-cycle').disabled=true;
    document.getElementById('next-cycle').classList.remove('highlight');
    const audio=document.getElementById('relax-audio');
    audio.pause();
    audio.currentTime=0;
  }

  document.getElementById('relax-button').addEventListener('click',()=>{
    document.getElementById('relax-modal').style.display='block';
    startRelax();
  });
  document.getElementById('close-relax').addEventListener('click',closeRelax);
  document.getElementById('next-cycle').addEventListener('click',nextCycle);
  document.getElementById('relax-music').addEventListener('click',()=>{
    const audio=document.getElementById('relax-audio');
    if(audio.paused){audio.play();}else{audio.pause();}
  });
}
