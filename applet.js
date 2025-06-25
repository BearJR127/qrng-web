export function initGame(container){
  container.innerHTML = `
  <h1>Color Picking Guessing Game</h1>
  <div>
    <label>Username:</label>
    <input type="text" id="username" value="unidentified" />
  </div>
  <div id="options-row">
    <div>
      <label>Select Mode:</label>
      <select id="mode">
        <option value="focus">Focus</option>
        <option value="guesser">Guesser</option>
        <option value="intuition">Intuition</option>
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
      <div class="color-wheel" data-input="single-choice"></div>
    </div>
  </div>
  <div id="intuition-inputs" style="display:none;">
    <label>Select 5 Colors:</label><br>
    <input type="hidden" class="intuition-choice" id="user-choice-1" value="Red" />
    <div class="color-wheel intuition-wheel" data-input="user-choice-1"></div>
    <input type="hidden" class="intuition-choice" id="user-choice-2" value="Red" />
    <div class="color-wheel intuition-wheel" data-input="user-choice-2"></div>
    <input type="hidden" class="intuition-choice" id="user-choice-3" value="Red" />
    <div class="color-wheel intuition-wheel" data-input="user-choice-3"></div>
    <input type="hidden" class="intuition-choice" id="user-choice-4" value="Red" />
    <div class="color-wheel intuition-wheel" data-input="user-choice-4"></div>
    <input type="hidden" class="intuition-choice" id="user-choice-5" value="Red" />
    <div class="color-wheel intuition-wheel" data-input="user-choice-5"></div>
  </div>
  <button id="intuition-submit" onclick="submitIntuitionChoice()" style="display:none;">Submit Choice</button>
  <button onclick="runTrial()" id="trial-button">Start Trial</button>
  <button onclick="exportCSV()">Export CSV</button>
  <button onclick="resetPage()">Reset</button>
  <button id="about-button">About</button>
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
      </select>
      <select id="filter-rng">
        <option value="">All RNG</option>
        <option value="Camera">Camera</option>
        <option value="Software">Software</option>
      </select>
      <input type="text" id="filter-user" placeholder="User" />
      <button id="analysis-refresh">Refresh</button>
    </div>
    <div id="analysis-stats"></div>
    <canvas id="analysis-chart" width="320" height="240"></canvas>
  </div>
  <div id="about-modal">
    <h2>Welcome to Color Picking Guessing Game</h2>
    <p>This is a fun game to test your skills at picking random colors. This application picks random colors using two different modes: a "quantum" random number generator (QRNG) that converts the pixels from your <strong>camera</strong> into bits used to pick colors, and a software based RNG which generates colors from random.event() code. For the QRNG - no information from your camera is being stored, access is only used to create B&W contrast data for random bit selection, and outside of software based bit selection there's no other monitoring or access.</p>
    <p>There are three different game modes available:</p>
    <p><strong>Focus mode</strong> continuously picks colors. Select a RNG then pick a color you think is going to be the highest match at that give time. After clicking 'Start Trial' the Q/RNG will run - change your selection as it goes to try your luck. When you're done 'Stop Trial' to see how you did, and if you'd like even export your results as a CSV.</p>
    <p><strong>Guesser mode</strong> is as it sounds, the Q/RNG has picked a color - can you guess which one? Select a color and click 'Start Trial' to guess. How's your guessing game?</p>
    <p><strong>Intuition mode</strong> has you select 5 different color picks before the Q/RNG picks its colors. It's like guesser mode but in reverse. How good are you at guessing which colors will be selected?</p>
    <button id="close-about">Close</button>
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

  const SYMBOLS = ['Red','Blue','Green','Yellow'];
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let intuitionStats = {round:0,totalMatches:0,totalTrials:0};
  let intuitionGuesses = [];
  let currentIntuitionIndex = 1;
  let chartInstance = null;
  let focusRunning = false;
  let nextActual = null;
  let nextRngTimestamp = null;
  let analysisChart = null;
  let allTrials = [];
  const wheelTemplate=`
    <div class="color-wheel-container">
      <div class="wheel-arrow"></div>
      <svg viewBox="0 0 100 100" class="color-wheel-svg rotatable">
        <path d="M50,50 L50,0 A50,50 0 0,1 100,50 z" fill="red" data-color="Red"></path>
        <path d="M50,50 L100,50 A50,50 0 0,1 50,100 z" fill="blue" data-color="Blue"></path>
        <path d="M50,50 L50,100 A50,50 0 0,1 0,50 z" fill="green" data-color="Green"></path>
        <path d="M50,50 L0,50 A50,50 0 0,1 50,0 z" fill="yellow" data-color="Yellow"></path>
        <text x="75" y="25" class="wheel-label" text-anchor="middle" dominant-baseline="middle">R</text>
        <text x="75" y="75" class="wheel-label" text-anchor="middle" dominant-baseline="middle">B</text>
        <text x="25" y="75" class="wheel-label" text-anchor="middle" dominant-baseline="middle">G</text>
        <text x="25" y="25" class="wheel-label" text-anchor="middle" dominant-baseline="middle">Y</text>
      </svg>
    </div>`;
  const wheelHandlers={};

  function setupWheel(inputId){
    const input=document.getElementById(inputId);
    const wheel=document.querySelector(`.color-wheel[data-input="${inputId}"]`);
    if(!wheel) return;
    wheel.innerHTML=wheelTemplate;
    const svg=wheel.querySelector('svg');
    const paths=wheel.querySelectorAll('path');
    let rotation=-45;
    const base=0;
    function update(){
      const rawIdx=Math.round((-rotation-45)/90);
      const idx=((rawIdx%4)+4)%4;
      const color=SYMBOLS[idx];
      input.value=color;
      paths.forEach(p=>p.classList.toggle('selected',p.dataset.color===color));
      svg.style.transform=`rotate(${base+rotation}deg)`;
    }
    update();
    let startAngle=0;
    let dragging=false;
    function angleFromEvent(e){
      const rect=svg.getBoundingClientRect();
      const cx=rect.left+rect.width/2;
      const cy=rect.top+rect.height/2;
      return Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI;
    }
    svg.addEventListener('pointerdown',e=>{
      e.preventDefault();
      dragging=true;
      startAngle=angleFromEvent(e)-rotation;
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove',e=>{
      if(!dragging) return;
      e.preventDefault();
      rotation=angleFromEvent(e)-startAngle;
      svg.style.transform=`rotate(${base+rotation}deg)`;
    });
    function endDrag(e){
      if(!dragging) return;
      svg.releasePointerCapture(e.pointerId);
      dragging=false;
      const rawIdx=Math.round((-rotation-45)/90);
      rotation=-45-rawIdx*90;
      update();
    }
    svg.addEventListener('pointerup',endDrag);
    svg.addEventListener('pointercancel',endDrag);
    svg.addEventListener('pointerleave',endDrag);
    wheelHandlers[inputId]=color=>{ rotation=-45-SYMBOLS.indexOf(color)*90; update(); };
  }

  function setWheelDisabled(inputId,disabled){
    const wheel=document.querySelector(`.color-wheel[data-input="${inputId}"]`);
    if(!wheel) return;
    wheel.classList.toggle('disabled',disabled);
  }

  function updateChart(snapshot) {
    const data = {Red:0,Blue:0,Green:0,Yellow:0},
          total = {Red:0,Blue:0,Green:0,Yellow:0};
    snapshot.forEach(d => {
      const e = d.data();
      if(e.userSymbol in total){
        total[e.userSymbol]++;
        if(e.match) data[e.userSymbol]++;
      }
    });
    const labels = SYMBOLS.slice(),
          matches = labels.map(s=>data[s]),
          attempts = labels.map(s=>total[s]);
    const allMatches = matches.reduce((a,b)=>a+b,0);
    const allAttempts = attempts.reduce((a,b)=>a+b,0);
    labels.push('All');
    const datasetData = SYMBOLS.map((_,i)=>attempts[i]?((matches[i]/attempts[i])*100):0);
    datasetData.push(allAttempts?((allMatches/allAttempts)*100):0);
    if(chartInstance) chartInstance.destroy();
    const ctxc = document.getElementById('chart').getContext('2d');
    chartInstance = new Chart(ctxc, {
      type:'bar',
      data:{ labels, datasets:[{ label:'Match %', data:datasetData, backgroundColor:['red','blue','green','yellow','gray'] }]},
      options:{ scales:{ y:{ beginAtZero:true, max:100 } } }
    });
    document.getElementById('dashboard-stats').innerText = `Matched: ${allMatches}\nTrials: ${allAttempts}`;
  }

  function initLiveDashboard(){
    onSnapshot(collection(db, 'qrng_trials'), snap => updateChart(snap));
  }

  function parseDateField(f){
    return f ? (f.toDate ? f.toDate() : new Date(f)) : null;
  }

  function computeStats(matches, attempts){
    const p0=1/4, z=jStat.normal.inv(0.975,0,1);
    const stats=SYMBOLS.map((s,i)=>{
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
    const startDate=start?new Date(start):null;
    const endDate=end?new Date(end+'T23:59:59'):null;
    const filtered=allTrials.filter(e=>{
      const d=parseDateField(e.rngTimestamp||e.timestamp);
      if(startDate && (!d || d<startDate)) return false;
      if(endDate && (!d || d>endDate)) return false;
      if(mode && e.mode!==mode) return false;
      if(rng && e.rng!==rng) return false;
      if(user && (e.username||'')!==user) return false;
      return true;
    });
    const data={Red:0,Blue:0,Green:0,Yellow:0}, total={Red:0,Blue:0,Green:0,Yellow:0};
    filtered.forEach(e=>{
      if(e.userSymbol in total){
        total[e.userSymbol]++;
        if(e.match) data[e.userSymbol]++;
      }
    });
    const labels=SYMBOLS.slice(), matches=labels.map(s=>data[s]), attempts=labels.map(s=>total[s]);
    const allMatches=matches.reduce((a,b)=>a+b,0), allAttempts=attempts.reduce((a,b)=>a+b,0);
    labels.push('All');
    const datasetData=SYMBOLS.map((_,i)=>attempts[i]?((matches[i]/attempts[i])*100):0);
    datasetData.push(allAttempts?((allMatches/allAttempts)*100):0);
    if(analysisChart) analysisChart.destroy();
    const ctxa=document.getElementById('analysis-chart').getContext('2d');
    analysisChart=new Chart(ctxa,{type:'bar',data:{labels,datasets:[{label:'Match %',data:datasetData,backgroundColor:['red','blue','green','yellow','gray']}]},options:{scales:{y:{beginAtZero:true,max:100}}}});
    const stats=computeStats(matches,attempts);
    document.getElementById('analysis-stats').innerHTML=stats.map(s=>`${s.s}: ${s.k}/${s.n} (${s.rate}% ${s.ci}, p=${s.pval}, power=${s.power})`).join('<br>') || 'No data';
  }

  async function loadAllTrials(){
    const snap=await getDocs(collection(db,'qrng_trials'));
    allTrials=snap.docs.map(d=>d.data());
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
    if(m==='intuition') resetIntuitionChoices();
    if(m==='guesser') prepareNextRng();
  }

  document.getElementById('mode').addEventListener('change', updateUIForMode);
  updateUIForMode();
  initLiveDashboard();
  setupWheel('single-choice');
  for(let i=1;i<=5;i++) setupWheel(`user-choice-${i}`);
  initAnalysisDashboard();

  function resetIntuitionChoices(){
    intuitionGuesses=[];
    currentIntuitionIndex=1;
    for(let i=1;i<=5;i++){
      const input=document.getElementById(`user-choice-${i}`);
      input.disabled=(i!==1);
      setWheelDisabled(input.id,input.disabled);
      if(wheelHandlers[input.id]) wheelHandlers[input.id]('Red');
    }
    document.getElementById('intuition-submit').disabled=false;
  }

  async function submitIntuitionChoice(){
    const input=document.getElementById(`user-choice-${currentIntuitionIndex}`);
    const guess=input.value;
    const timestamp=new Date();
    const username=document.getElementById('username').value.trim() || 'unidentified';
    const submitHash=await computeHash({timestamp: timestamp.toISOString(), mode:'intuition', userSymbol: guess, username});
    intuitionGuesses.push({guess,timestamp,submitHash});
    input.disabled=true;
    setWheelDisabled(input.id,true);
    currentIntuitionIndex++;
    if(currentIntuitionIndex<=5){
      const nextInput=document.getElementById(`user-choice-${currentIntuitionIndex}`);
      nextInput.disabled=false;
      setWheelDisabled(nextInput.id,false);
    }else{
      document.getElementById('intuition-submit').disabled=true;
    }
  }
  window.submitIntuitionChoice = submitIntuitionChoice;

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => { video.srcObject = stream; })
    .catch(err => { document.getElementById('result').innerText = 'Webcam access denied.'; });

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
    if(vn.length<2) return null;
    return SYMBOLS[parseInt(vn.slice(0,2).join(''),2)];
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
    addDoc(collection(db,'qrng_trials'),record).catch(e=>console.error(e));
  }

  function startFocusLoop(username){
    focusRunning=true;
    document.getElementById('trial-button').innerText='Stop Trial';
    const loop=async()=>{
      if(!focusRunning) return;
      await singleFocusTrial(username);
      setTimeout(loop,200);
    };
    loop();
  }

  function stopFocusLoop(){
    focusRunning=false;
    document.getElementById('trial-button').innerText='Start Trial';
  }

  async function runTrial(){
    const submitTimestamp=new Date();
    const mode=document.getElementById('mode').value;
    const username=document.getElementById('username').value.trim() || 'unidentified';
    if(mode==='focus'){
      if(focusRunning){
        stopFocusLoop();
      }else{
        startFocusLoop(username);
      }
      return;
    }
    if(mode==='intuition'){
      if(intuitionGuesses.length<5){
        document.getElementById('result').innerText='Please submit all 5 choices first.';
        return;
      }
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
        addDoc(collection(db,'qrng_trials'),record).catch(e=>console.error(e));
      }
      let summary='';
      let matchCount=0;
      results.forEach((r,i)=>{
        if(r.match) matchCount++;
        summary+=`Guess ${i+1}: <b>${r.guess}</b> | Actual: <b>${r.actual}</b> - <span class='${r.match?'match':'no-match'}'>${r.match?'✔':'✘'}</span><br>`;
      });
      intuitionStats.round++;
      intuitionStats.totalMatches+=matchCount;
      intuitionStats.totalTrials+=5;
      summary+=`<b>Round ${intuitionStats.round}: ${matchCount}/5 correct</b><br>`;
      document.getElementById('result').innerHTML=summary;
      resetIntuitionChoices();
      return;
    }

    let guess, actual, rngTimestamp;
    if(mode==='guesser'){
      guess=document.getElementById('single-choice').value;
      actual=nextActual;
      rngTimestamp=nextRngTimestamp;
      if(!actual){
        document.getElementById('result').innerText='Not prepared yet — please wait and try again.';
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
    document.getElementById('result').innerHTML=
      `Your guess: <b>${guess}</b><br>`+
      `Actual: <b>${actual}</b><br>`+
      `<span class='${match?'match':'no-match'}'>${match?'✔ Match!':'✘ No match'}</span>`;
    const record={timestamp:submitTimestamp,rngTimestamp,mode,rng,userSymbol:guess,actualSymbol:actual,match,username};
    const rngHash=await computeHash({timestamp:rngTimestamp.toISOString(),mode,rng,actualSymbol:actual});
    record.rngHash=rngHash;
    const hash=await computeHash({...record,timestamp:record.timestamp.toISOString(),rngTimestamp:record.rngTimestamp.toISOString()});
    record.hash=hash;
    addDoc(collection(db,'qrng_trials'),record).catch(e=>console.error(e));
    if(mode==='guesser') prepareNextRng();
  }
  window.runTrial=runTrial;

  async function exportCSV(){
    const promptResult=prompt('Filter (focus, guesser, intuition) or leave blank:');
    const modeFilter=(promptResult===null?'':promptResult).toLowerCase();
    const snap=await getDocs(collection(db,'qrng_trials'));
    const data={Red:0,Blue:0,Green:0,Yellow:0}, total={Red:0,Blue:0,Green:0,Yellow:0}, rows=[];
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
    const labels=SYMBOLS;
    const matches=labels.map(s=>data[s]);
    const attempts=labels.map(s=>total[s]);
    const p0=1/4, z=jStat.normal.inv(0.975,0,1);
    const stats=labels.map((s,i)=>{
      const n=attempts[i], k=matches[i];
      const rate=n?((k/n)*100).toFixed(1):0;
      const se0=Math.sqrt(p0*(1-p0)/n), delta=(k/n)-p0, mu=delta/se0;
      const power=n?((jStat.normal.cdf(-z-mu)+1-jStat.normal.cdf(z-mu)).toFixed(3)):0;
      const chi=((k-n*p0)**2/(n*p0) + ((n-k)-n*(1-p0))**2/(n*(1-p0)));
      const pval=n?(1-jStat.chisquare.cdf(chi,1)).toFixed(5):0;
      const ci=n?`±${(z*Math.sqrt((k/n)*(1-k/n)/n)*100).toFixed(1)}`:'±0';
      return {s,n,k,rate,pval,power,ci};
    });
    const allN=attempts.reduce((a,b)=>a+b,0);
    const allK=matches.reduce((a,b)=>a+b,0);
    const allRate=allN?((allK/allN)*100).toFixed(1):0;
    const seAll=Math.sqrt(p0*(1-p0)/allN), deltaAll=(allK/allN)-p0, muAll=deltaAll/seAll;
    const powerAll=allN?((jStat.normal.cdf(-z-muAll)+1-jStat.normal.cdf(z-muAll)).toFixed(3)):0;
    const chiAll=allN?((allK-allN*p0)**2/(allN*p0) + ((allN-allK)-allN*(1-p0))**2/(allN*(1-p0))):0;
    const pvalAll=allN?(1-jStat.chisquare.cdf(chiAll,1)).toFixed(5):0;
    const ciAll=allN?`±${(z*Math.sqrt((allK/allN)*(1-allK/allN)/allN)*100).toFixed(1)}`:'±0';
    stats.push({s:'All',n:allN,k:allK,rate:allRate,pval:pvalAll,power:powerAll,ci:ciAll});
    const exportUser=document.getElementById('username').value.trim() || 'unidentified';
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
}
