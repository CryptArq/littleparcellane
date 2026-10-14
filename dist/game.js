const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const arrows=['↑','↓','←','→'],keymap={ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',w:'↑',s:'↓',a:'←',d:'→'};
let state='intro',level=1,score=0,coins=0,delivered=0,stops=0,quota=3,time=60,address=12,needed=2,boxes=[],typed=[],selected=-1,step=0,parcelTime=0,parcelMax=1,streak=0,up={clock:0,sort:0,tip:0,orient:0,scan:1},paused=false,sound=false,audio,offset=0,targetOffset=0,flight=null,particles=[],last=performance.now(),worldTime=0,toastUntil=0;
let placement=null,deliveryNote=0,reaction=null;
const deliverySpots=['Front doorstep','By the side gate','Behind the planter'];
let routeChoice={id:'standard',name:'Maple Lane',quota:0,time:0,reward:1},routeHistory=[{level:1,id:'standard'}],routeSelection=0;
function districtInfo(l=level){const region=Math.min(2,Math.floor((l-1)/5));return {region,stage:(l-1)%5+1,name:['Neighborhood','Suburb','City'][region],street:['Maple Lane','Cedar Drive','Market Street'][region]}}
function baseQuota(l=level){return 3+Math.floor((l-1)/5)*2+(l-1)%5}
let challenge=null,challengeOffers=[],rerolls=0,roundDuration=60,stopErrors=0;
let stageStats={maxStreak:0,large:0,cleanStops:0,mistakes:0};
let best=0;try{best=+localStorage.getItem('parcelBest')||0}catch(e){}$('best').textContent='BEST '+best;
function beep(event='on',degree=0){
 if(!sound)return;
 audio??=new(window.AudioContext||window.webkitAudioContext)();
 if(audio.state==='suspended')audio.resume();
 const major=[0,2,4,5,7,9,11,12];
 const notes=event==='step'?[72+major[Math.min(degree,7)]]:
   event==='error'?[59,62,66]:event==='scan'?[76,79,84]:
   event==='delivery'?[72,76,79,84]:event==='quota'?[72,76,79,84,81,79,76,79,84]:
   event==='upgrade'?[67,72,76]:[72,76,79];
 const error=event==='error',victory=event==='quota',volume=error?.026:.034;const melodyTimes=[0,.14,.28,.48,.76,.9,1.04,1.22,1.44];
 notes.forEach((midi,i)=>{
   const at=audio.currentTime+(victory?melodyTimes[i]:error?i*.018:i*.055),duration=victory?(i===notes.length-1?.65:.24):error?.26:.2;
   const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';
   o.frequency.setValueAtTime(440*Math.pow(2,(midi-69)/12),at);
   o.connect(g);g.connect(audio.destination);g.gain.setValueAtTime(.0001,at);
   g.gain.exponentialRampToValueAtTime(volume,at+.008);
   g.gain.exponentialRampToValueAtTime(.0001,at+duration);
   o.start(at);o.stop(at+duration+.02);
 });
}

function toast(s){$('toast').textContent=s;$('toast').classList.add('show');toastUntil=performance.now()+1800}
function modal(html){$('modal').className=html.includes('garage-shell')?'shop-modal':html.includes('route-screen')?'route-modal':'';$('modal').innerHTML=html;$('overlay').hidden=false}function hide(){$('overlay').hidden=true}
function intro(){modal('<span class="eyebrow">WELCOME TO THE NEIGHBORHOOD</span><h1>Little parcels.<br>Big delivery energy.</h1><p>A cozy little delivery game. Scan all four boxes, type the arrows on parcels for this house, and keep Maple Lane smiling.</p><div class="step"><b>01</b> Find the address and type its parcel sequence.</div><div class="step"><b>02</b> Rotate the box with WASD to find its label.</div><div class="step"><b>03</b> Scan with Space, then follow the delivery note.</div><button class="primary" id="start">Let’s hit the road →</button>');$('start').onclick=()=>{hide();startRound()}}
function startRound(){closeInspection();closePlacement();reaction=null;deliveryNote=Math.floor(Math.random()*3);state='playing';paused=false;delivered=0;stops=0;quota=Math.max(2,baseQuota()+routeChoice.quota);time=60+up.clock*8+routeChoice.time;roundDuration=time;stopErrors=0;stageStats={maxStreak:0,large:0,cleanStops:0,mistakes:0};needed=1+Math.floor(Math.random()*3);selected=-1;step=0;streak=0;makeBoxes();update();if(level===5)toast('Level 5 · longer sequences & old shipping labels')}
function makeBoxes(){
  const shared=Array.from({length:2},()=>arrows[Math.floor(Math.random()*4)]);
  const branches=[...arrows].sort(()=>Math.random()-.5);
  const slots=[0,1,2,3].sort(()=>Math.random()-.5);
  boxes=Array.from({length:4},(_,i)=>{
    const size=Math.floor(Math.random()*3);
    return {address:slots.indexOf(i)<needed?address:address+2+2*Math.floor(Math.random()*5),size,delivered:false,
      seq:[...shared,branches[i],...Array.from({length:size+(level>=5?1:0)},()=>arrows[Math.floor(Math.random()*4)])]};
  });
  resetAttempt();renderBoxes();
}
function resetAttempt(){typed=[];selected=-1;step=0;parcelTime=0}
function matches(b,prefix=typed){return !b.delivered&&prefix.every((k,j)=>b.seq[j]===k)}
function retry(message){recordMistake();resetAttempt();beep('error');toast(message);renderBoxes()}
function penalize(message){recordMistake();score-=25;streak=0;resetAttempt();beep('error');toast(message+' −25 points');renderBoxes();update()}
function renderBoxes(){
  $('boxes').innerHTML=boxes.map(b=>{
    const active=typed.length>0&&matches(b);
    return '<div class="box '+(b.delivered?'delivered':active?'selected':'')+'"><span class="slot">'+(b.delivered?'✓ DELIVERED':'ADDRESS LABEL')+'</span><span class="parcel-icon" style="scale:'+(.8+b.size*.12)+'"></span><strong>No. '+b.address+'</strong><small>'+['SMALL PARCEL','MEDIUM PARCEL','LARGE PARCEL'][b.size]+'</small><div class="keys">'+b.seq.map((k,j)=>'<span class="key '+(active?(j<typed.length?'done':j===typed.length?'next':''):'')+'">'+k+'</span>').join('')+'</div><div class="bar"><i style="width:'+(active?parcelTime/parcelMax*100:b.delivered?0:100)+'%"></i></div></div>';
  }).join('');
  $('instruction').textContent=placement?'Choose the delivery spot · ↑ doorstep · → gate · ← planter':inspection?'Find the label · WASD to rotate · Space to scan':flight?'On its way to the doorstep!':typed.length?'Keep sorting · '+typed.join(' '):'Find house '+address+' · type a parcel’s arrows';
}
function input(k){
  if(state!=='playing'||paused||flight||inspection||placement)return;
  const next=[...typed,k],candidates=boxes.filter(b=>matches(b,next));
  if(!candidates.length){retry('Try that sequence again');return}
  if(!typed.length){
    parcelMax=Math.max(...candidates.map(b=>Math.max(2.5,4.5+b.size*1.5-level*.18)+up.sort*1.2));
    parcelTime=parcelMax;
  }
  typed=next;step=typed.length;selected=boxes.indexOf(candidates[0]);beep('step',step-1);
  const complete=candidates.find(b=>b.seq.length===typed.length);
  if(complete){if(complete.address!==address){penalize('Wrong address!');return}selected=boxes.indexOf(complete);beginInspection();return}
  renderBoxes();
}
function send(){let b=boxes[selected];b.delivered=true;let pts=(100+b.size*35+Math.min(streak,8)*10)*(stops>=quota?2:1);pts=Math.round(pts*(1+up.tip*.2)*routeChoice.reward);score+=pts;coins+=Math.round((stops>=quota?3:2)*routeChoice.reward);streak++;stageStats.maxStreak=Math.max(stageStats.maxStreak,streak);if(b.size===2)stageStats.large++;delivered++;needed--;if(needed===0){stops++;if(stopErrors===0)stageStats.cleanStops++}flight={t:0,pts,target:deliveryNote,house:address};resetAttempt();renderBoxes();beep(stops===quota&&needed===0?'quota':'delivery');toast('Delivered! +'+pts+(streak>2?' · '+streak+' streak':''));if(stops===quota&&needed===0){toast('Quota complete! Double-point bonus time');}checkChallenge();update()}
function afterFlight(){
  flight=null;resetAttempt();
  if(needed<=0){stopErrors=0;reaction={address,until:worldTime+2.8};deliveryNote=Math.floor(Math.random()*3);address+=2;needed=1+Math.floor(Math.random()*3);targetOffset+=340;makeBoxes()}
  else renderBoxes();
  update();
}
function update(){ $('round').innerHTML=districtInfo().stage+' <small>/ 5 · '+districtInfo().name+'</small>';$('quota').innerHTML=stops+' <small>/ '+quota+' stops</small>';$('clock').innerHTML=Math.ceil(time)+'<span>s</span>';$('clock').style.color=time<10?'#bc613f':'';$('score').textContent=score<0?'−'+String(-score).padStart(4,'0'):String(score).padStart(4,'0');$('progress').style.width=Math.min(100,stops/quota*100)+'%';$('phase').textContent=stops>=quota?'BONUS TIME · DOUBLE POINTS':'MAKE YOUR QUOTA';$('status').textContent=stops>=quota?'Every extra parcel is a little extra payday.':Math.max(0,quota-stops)+' more stops to unlock bonus time.';$('address').textContent=address+' '+districtInfo().street;$('delivery-note').textContent=deliverySpots[deliveryNote];$('street-caption').textContent=districtInfo().street.toUpperCase();updateChallengeHUD();$('remaining').textContent=needed+' parcel'+(needed===1?'':'s')+' requested';$('finish').hidden=!(state==='playing'&&stops>=quota);}
function saveBest(){if(score>best){best=score;try{localStorage.setItem('parcelBest',best)}catch(e){}$('best').textContent='BEST '+best}}
function endRound(){if(state!=='playing')return;checkChallenge();if(challenge&&challenge.state==='active')challenge.state='missed';saveBest();flight=null;closeInspection();closePlacement();if(stops>=quota){state='garage';garage()}else{state='over';modal('<span class="eyebrow">THE SHIFT IS OVER</span><h1>A good day<br>on the lane.</h1><p>You completed '+stops+' of '+quota+' stops ('+delivered+' parcels) on route '+level+'. Final score: <b>'+score+'</b>. Your best: '+best+'.</p><p>Tip: watch the address labels. Similar sequences can belong to different houses. Large boxes give you more time.</p><button class="primary" id="restart">Start a fresh shift →</button>');$('restart').onclick=()=>{level=1;score=0;coins=0;up={clock:0,sort:0,tip:0,orient:0,scan:1};address=12;targetOffset=offset=0;routeChoice={id:'standard',name:'Maple Lane',quota:0,time:0,reward:1};routeHistory=[{level:1,id:'standard'}];challenge=null;hide();startRound()}}update()}
const shopUpgrades=[
 {id:'clock',name:'Extended shift',icon:'◷',type:'SHIFT',cap:6,description:'A bigger window to finish every stop.',effect:l=>(60+l*8)+'s base shift',next:l=>'+'+8+' seconds every stage'},
 {id:'tip',name:'Local favorite',icon:'★',type:'SHIFT',cap:5,description:'Make every careful delivery count.',effect:l=>'+'+(l*20)+'% delivery points',next:l=>'+'+((l+1)*20)+'% total points'},
 {id:'sort',name:'Cargo shelving',icon:'▤',type:'HANDLING',cap:5,description:'Keep the rummaging sequence alive longer.',effect:l=>'+'+(l*1.2).toFixed(1)+'s sorting window',next:l=>'+'+((l+1)*1.2).toFixed(1)+'s sorting window'},
 {id:'orient',name:'Labels facing out',icon:'▧',type:'HANDLING',cap:4,description:'Your next parcel may arrive ready to scan.',effect:l=>(l*20)+'% label-first chance',next:l=>((l+1)*20)+'% label-first chance'},
 {id:'scan',name:'Parcel scanner',icon:'⌖',type:'HANDLING',cap:3,description:'Start by reading labels yourself. Upgrade to identify, then auto-scan.',effect:l=>['','Level 1 · all readable labels marked red','Level 2 · correct label marked green','Level 3 · correct label scans automatically'][l],next:l=>['','Level 2 · identify correct label','Level 3 · automatic correct scan',''][l]}

];
function upgradeCost(id,l=up[id]){return id==='scan'?([0,12,24,0][l]):6+l*4}
function buyUpgrade(id){const u=shopUpgrades.find(u=>u.id===id);if(!u)return;const cost=upgradeCost(id);if(up[id]>=u.cap||coins<cost)return;coins-=cost;up[id]++;beep('upgrade');garage()}
function garage(){
 const d=districtInfo();
 const cards=shopUpgrades.map(u=>{const l=up[u.id],cost=upgradeCost(u.id,l),max=l>=u.cap;return '<button class="shop-card" data-up="'+u.id+'" '+(max||coins<cost?'disabled':'')+'><span class="shop-icon">'+u.icon+'</span><span class="shop-type">'+u.type+'</span><h3>'+u.name+'</h3><p>'+u.description+'</p><div class="upgrade-pips">'+Array.from({length:u.cap},(_,i)=>'<i class="'+(i<l?'filled':'')+'"></i>').join('')+'</div><div class="upgrade-effect"><span>'+u.effect(l)+'</span><b>'+ (max?'Fully fitted':'→ '+u.next(l))+'</b></div><span class="buy-line">'+(max?'MAX LEVEL':coins<cost?'Need '+(cost-coins)+' more tips':'Fit upgrade')+'<strong>'+(max?'✓':cost+' ◈')+'</strong></span></button>'}).join('');
 modal('<div class="garage-shell">'+depotScene()+'<div class="shop-header"><div><span class="eyebrow">LANE POST · SERVICE BAY 01</span><h1>The little garage.</h1><p>'+d.name+' · stage '+d.stage+' cleared. Put your hard-earned tips to work.</p></div><div class="wallet"><small>YOUR TIPS</small><strong>◈ '+coins+'</strong><span>Upgrades last this shift</span></div></div><div class="garage-banner"><div class="garage-truck"><div class="gt-box">LANE<br>POST</div><div class="gt-cab"></div><i></i><i></i></div><div><b>Parked. Polished. Ready for more.</b><span>'+stops+' stops completed · '+delivered+' parcels · '+score+' points</span></div><span class="bay-stamp">SERVICE<br>COMPLETE ✓</span></div><div class="shop-grid">'+cards+'</div><div class="shop-footer"><span>Build a truck that suits the way you play.</span><button class="primary" id="next">Dispatch bonus board →</button></div></div>');
 document.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>buyUpgrade(b.dataset.up));$('next').onclick=showRoutes;
}
function depotScene(){return '<div class="depot-scene"><svg viewBox="0 0 900 220" role="img" aria-label="Miniature brown parcel depot with loading bays, delivery vans, and stacked packages"><defs><g id="depot-van"><rect x="0" y="0" width="89" height="48" rx="3" fill="#553a29"/><path d="M89 2H111L132 27V48H89Z" fill="#63452f"/><path d="M96 8H108L121 27H96Z" fill="#91aaa1"/><path d="M4 34H89" stroke="#c7a45c" stroke-width="3"/><text x="25" y="22" fill="#d6b56e" font-size="10" font-family="sans-serif" font-weight="bold">LANE POST</text><circle cx="23" cy="48" r="11" fill="#323a33"/><circle cx="23" cy="48" r="5" fill="#a8aa99"/><circle cx="108" cy="48" r="11" fill="#323a33"/><circle cx="108" cy="48" r="5" fill="#a8aa99"/></g></defs><rect width="900" height="220" fill="#c2cfad"/><path d="M0 130H900V220H0Z" fill="#b6bca9"/><path d="M165 160L760 148L835 182L215 199Z" fill="#899782" opacity=".4"/><path d="M155 56L665 40L756 77L246 94Z" fill="#6a614e"/><path d="M155 56L246 94V161L155 126Z" fill="#a09172"/><path d="M246 94L756 77V148L246 165Z" fill="#c9ba91"/><path d="M145 54L664 37L769 76L246 98Z" fill="#766e58"/><path d="M246 98L769 76V83L246 105Z" fill="#514d40"/><path d="M282 103L379 100V153L282 157Z M417 99L514 96V149L417 152Z M553 94L650 91V145L553 148Z" fill="#6c7262"/><path d="M289 116L371 113M289 128L371 125M289 140L371 137M424 112L506 109M424 124L506 121M424 136L506 133M560 107L642 104M560 119L642 116M560 131L642 128" stroke="#919680" stroke-width="3"/><rect x="449" y="57" width="183" height="23" rx="2" fill="#553a29"/><text x="465" y="73" font-size="13" font-family="sans-serif" font-weight="bold" letter-spacing="2" fill="#d5b56c">LANE POST DEPOT</text><path d="M272 151V171M386 147V167M541 142V162M659 139V159" stroke="#d8af59" stroke-width="6"/><path d="M272 157V161M386 153V157M541 148V152M659 145V149" stroke="#665c41" stroke-width="6"/><g fill="#bd8c54" stroke="#a67847"><rect x="687" y="133" width="27" height="24"/><rect x="715" y="138" width="32" height="23"/><rect x="701" y="112" width="25" height="23"/></g><path d="M700 134V155M731 139V159M713 113V133" stroke="#e3c18a" stroke-width="6"/><use href="#depot-van" transform="translate(304 144) scale(.9)"/><use href="#depot-van" transform="translate(503 151) scale(.78)"/><path d="M50 201L197 196M714 195L864 190" stroke="#e5dbc0" stroke-width="3" stroke-dasharray="22 14"/><text x="26" y="29" font-family="sans-serif" font-size="10" font-weight="bold" letter-spacing="2" fill="#567047">BACK AT THE DEPOT</text></svg><span>LOAD UP. TUNE UP. HEAD OUT.</span></div>'}
function generateChallenges(){
 const next=level+1,target=Math.min(50,40+up.clock*4);
 const pool=[{id:'streak3',type:'streak',title:'In the groove',description:'Deliver 3 packages in a row without a mistake.',target:3,reward:6,icon:'✦'},
 {id:'streak5',type:'streak',title:'Perfect rhythm',description:'Build a 5-package streak without a mistake.',target:5,reward:10,icon:'♫'},
 {id:'speed',type:'speed',title:'Beat the clock',description:'Complete all required stops in under '+target+' seconds.',target,reward:12,icon:'◷'},
 {id:'careful',type:'clean',title:'Handle with care',description:'Finish 2 houses without any mistakes at either stop.',target:2,reward:8,icon:'⌂'},
 {id:'large',type:'large',title:'Heavy lifting',description:'Deliver 3 large parcels during the next stage.',target:3,reward:8,icon:'▣'},
 {id:'overtime',type:'bonus',title:'One more doorstep',description:'Complete 1 extra stop after the required quota.',target:1,reward:12,icon:'+'},
 {id:'volume',type:'parcels',title:'Full hands',description:'Deliver 8 parcels during the next stage.',target:8,reward:8,icon:'▤'}];
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
 return pool.slice(0,3);
}
function showRoutes(){state='route';routeSelection=-1;rerolls=0;challengeOffers=generateChallenges();renderRoutes()}
function rerollChallenges(){if(state!=='route')return;const cost=3+rerolls*2;if(coins<cost)return;coins-=cost;rerolls++;routeSelection=-1;challengeOffers=generateChallenges();beep('upgrade');renderRoutes()}
function renderRoutes(){
 const next=level+1,d=districtInfo(next),current=districtInfo(),cost=3+rerolls*2;
 const map=Array.from({length:5},(_,i)=>{const n=Math.floor((next-1)/5)*5+i+1,visited=routeHistory.find(h=>h.level===n);return '<div class="map-stop '+(n===next?'current':visited?'visited':'')+'"><span>'+(visited?'✓':i+1)+'</span><small>'+(n===next?'NEXT':'STAGE '+(i+1))+'</small></div>'}).join('');
 const cards=challengeOffers.map((c,i)=>'<button class="challenge-card '+(i===routeSelection?'chosen':'')+'" data-challenge="'+i+'"><span class="challenge-select">'+['←','↑','→'][i]+'</span><span class="challenge-icon">'+c.icon+'</span><span class="eyebrow">OPTIONAL BONUS</span><h2>'+c.title+'</h2><p>'+c.description+'</p><div class="challenge-reward"><span>ON COMPLETION</span><b>+'+c.reward+' ◈ tips</b></div></button>').join('');
 modal('<div class="route-screen bonus-board"><span class="eyebrow">DEPOT DISPATCH · BONUS BOARD</span><h1>'+(current.region!==d.region?'Next up: the '+d.name.toLowerCase()+'.':'A little extra on the side?')+'</h1><p>Choose one challenge for '+d.name+' stage '+d.stage+', or skip. No penalty for leaving a bonus unfinished.</p><div class="district-strip"><span class="'+(d.region===0?'active':'')+'">01 Neighborhood</span><b>→</b><span class="'+(d.region===1?'active':'')+'">02 Suburb</span><b>→</b><span class="'+(d.region===2?'active':'')+'">03 City</span></div><div class="route-map">'+map+'</div><div class="challenge-choices">'+cards+'</div><div class="board-tools"><span>YOUR TIPS <b>◈ '+coins+'</b></span><button id="reroll" '+(coins<cost?'disabled':'')+'>↻ Reroll cards · '+cost+' tips</button></div><div class="shop-footer"><span>← ↑ → choose · ↓ skip · Space depart · R reroll</span><button id="skip-bonus">Skip bonus →</button><button class="primary" id="depart">'+(routeSelection<0?'Head out without a bonus':'Accept challenge & head out')+' →</button></div></div>');
 document.querySelectorAll('[data-challenge]').forEach(b=>b.onclick=()=>{routeSelection=+b.dataset.challenge;renderRoutes()});$('depart').onclick=departRoute;$('skip-bonus').onclick=()=>{routeSelection=-1;departRoute()};$('reroll').onclick=rerollChallenges;
}
function departRoute(){if(state!=='route')return;challenge=routeSelection<0?null:{...challengeOffers[routeSelection],state:'active',progress:0};routeChoice={id:'standard',name:districtInfo(level+1).street,quota:0,time:0,reward:1};level++;routeHistory.push({level,id:challenge?.id||'standard'});hide();startRound();toast(challenge?'Bonus: '+challenge.title:districtInfo().name+' · fresh route')}
function recordMistake(){stageStats.mistakes++;stopErrors++;streak=0}
function checkChallenge(){
 if(!challenge||challenge.state!=='active')return;
 const c=challenge,elapsed=roundDuration-time;
 c.progress=c.type==='streak'?stageStats.maxStreak:c.type==='large'?stageStats.large:c.type==='clean'?stageStats.cleanStops:c.type==='parcels'?delivered:c.type==='bonus'?Math.max(0,stops-quota):stops;
 const won=c.type==='speed'?stops>=quota&&elapsed<c.target:c.progress>=c.target;
 if(won){c.state='complete';coins+=c.reward;beep('upgrade');toast('Bonus complete! '+c.title+' · +'+c.reward+' tips')}
 else if(c.type==='speed'&&elapsed>=c.target)c.state='missed';
}
function updateChallengeHUD(){
 const hud=$('challenge-hud');hud.hidden=!challenge;
 if(!challenge)return;
 const c=challenge;hud.className='challenge-hud '+c.state;
 const progress=c.type==='speed'?Math.ceil(Math.max(0,c.target-(roundDuration-time)))+'s to finish quota':Math.min(c.target,c.progress||0)+' / '+c.target;
 hud.innerHTML='<span>OPTIONAL BONUS · '+(c.state==='complete'?'EARNED +'+c.reward+' TIPS':c.state==='missed'?'MISSED · NO PENALTY':'+'+c.reward+' TIPS')+'</span><b>'+c.title+'</b><small>'+(c.state==='active'?progress:c.state==='complete'?'Nice work. Reward added to your wallet.':'Another chance next stage.')+'</small>';
}

function togglePause(){if(state!=='playing')return;paused=!paused;$('pause').textContent=paused?'Resume':'Pause';if(paused){modal('<span class="eyebrow">PARKED FOR A MOMENT</span><h1>Enjoy the view.</h1><p>Your route is waiting right where you left it.</p><button class="primary" id="resume">Back to deliveries →</button>');$('resume').onclick=togglePause}else hide()}
$('pause').onclick=togglePause;$('finish').onclick=endRound;$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'Sound on':'Sound off';beep()};document.addEventListener('keydown',e=>{if(state==='route'){if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();routeSelection={ArrowLeft:0,ArrowUp:1,ArrowRight:2,ArrowDown:-1}[e.key];renderRoutes();return}if(e.key.toLowerCase()==='r'){e.preventDefault();rerollChallenges();return}if(e.code==='Space'){e.preventDefault();departRoute();return}}if(placement&&['ArrowUp','ArrowRight','ArrowLeft','ArrowDown'].includes(e.key)){e.preventDefault();const spot={ArrowUp:0,ArrowRight:1,ArrowLeft:2}[e.key];if(spot!==undefined)chooseSpot(spot);return}if(inspection&&e.code==='Space'){e.preventDefault();scanBarcode();return}if(inspection&&'wasd'.includes(e.key.toLowerCase())&&e.key.length===1){e.preventDefault();rotatePackage(e.key.toLowerCase());return}if(keymap[e.key]){e.preventDefault();input(keymap[e.key])}else if(e.key.toLowerCase()==='p'||e.key==='Escape')togglePause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing'&&!paused)togglePause()});
// A true parallel projection: every object uses the same scale, regardless of depth.
let W=1000,H=440,scale=1;
function point(x,y,z=0){return {x:W*.49+(x-y)*.82*scale,y:H*.55+(x+y)*.38*scale-z*scale}}
function poly(points,color){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill()}
function shade(hex,n){let a=hex.replace('#','');return '#'+[0,2,4].map(i=>Math.max(0,Math.min(255,parseInt(a.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('')}
function cube(x,y,z,w,d,h,c){let a=point(x,y,z+h),b=point(x+w,y,z+h),cc=point(x+w,y+d,z+h),dd=point(x,y+d,z+h);poly([dd,cc,point(x+w,y+d,z),point(x,y+d,z)],shade(c,-18));poly([b,cc,point(x+w,y+d,z),point(x+w,y,z)],shade(c,-32));poly([a,b,cc,dd],shade(c,16));}
function ground(x,y,w,d,c){poly([point(x,y),point(x+w,y),point(x+w,y+d),point(x,y+d)],c)}
function shadow(x,y,w,d){ground(x+12,y+10,w,d,'#38543720')}
function tree(x,y,s=1){shadow(x,y,40*s,40*s);cube(x+15*s,y+15*s,0,10*s,10*s,37*s,'#91734c');cube(x,y,30*s,43*s,43*s,34*s,'#739056');cube(x+5*s,y+5*s,64*s,32*s,32*s,23*s,'#8ca362');}
function person(x,y,t,i,direction=1){
  const bob=0,stride=0;
  const shirt=['#cf8256','#d3af51','#668e91','#a97b79'][((i%4)+4)%4];
  // Rotate the figure across the sidewalk so its front follows its travel.
  function part(u,v,z,w,d,h,c){cube(x+(direction>0?-v-d:v),y+u,z,d,w,h,c)}
  part(0,stride,0,7,13,4,'#303b38');part(10,-stride,0,7,13,4,'#303b38');
  part(0,0,4,17,10,16,'#527892');part(-2,-1,20+bob,21,12,17,shirt);
  part(2,0,37+bob,13,11,12,'#d5ab7b');part(1,-1,48+bob,15,13,4,'#6b5845');
  part(6,-3,40+bob,5,3,4,'#d5ab7b');
}
function faceText(text,x,y,z,size,weight='600',color='#fff6da'){
  const p=point(x,y,z);ctx.save();
  ctx.transform(.82*scale,.38*scale,0,scale,p.x,p.y);
  ctx.fillStyle=color;ctx.font=weight+' '+size+'px sans-serif';ctx.textAlign='center';
  ctx.fillText(text,0,0);ctx.restore();
}
function housePosition(index){return {x:index*340-offset-80,number:12+index*2}}
function pitchedRoof(x,y,z,w,d,h,c){
  const a=point(x,y,z),b=point(x+w,y,z),f=point(x+w,y+d,z),g=point(x,y+d,z);
  const back=point(x+w/2,y,z+h),front=point(x+w/2,y+d,z+h);
  poly([a,back,front,g],shade(c,12));poly([back,b,f,front],shade(c,-18));
  poly([g,front,f],shade(c,-5));
}
function house(x,y,n,i){
  const variant=((i%5)+5)%5;
  const colors=['#d8b56a','#c87e64','#95aaa1','#ddd0ab','#83a1a8'];
  const c=colors[((Math.floor(i/5)+variant)%5+5)%5],roof=['#ad6951','#6b7b73','#b08054'][((i%3)+3)%3];
  const front=y+96;
  shadow(x,y,variant===2?177:132,106);
  ground(x-15,y-15,variant===2?205:165,135,'#acc28b');
  ground(x+45,front+2,28,71,'#ded4ba');if(districtInfo().region===1){ground(x+145,y+25,52,140,'#c9c7b0');for(let f=0;f<5;f++){cube(x+145+f*12,y+8,0,4,4,19,'#e9dfc1')}cube(x+145,y+10,9,52,2,3,'#e2d5b6')}
  function windowAt(wx,z,w=21,h=24){
    cube(wx-2,front, z-2,w+4,3,h+4,'#f1e4c6');
    cube(wx,front+3,z,w,1,h,reaction&&reaction.address===n&&worldTime<reaction.until?'#f3d48b':'#a9c7bc');
    cube(wx+w/2-1,front+4,z,2,1,h,'#fff0d0');
    cube(wx,front+4,z+h/2-1,w,1,2,'#fff0d0');
  }
  if(districtInfo().region===2){
    cube(x-4,y,0,130,96,151,c);cube(x-9,y-5,151,140,106,9,'#6c7770');
    for(const z of [28,73,116]){windowAt(x+10,z,23,24);windowAt(x+84,z,23,24)}
    cube(x+36,front,62,46,8,6,'#b47d56');
  }else if(variant===0){ // Compact gabled cottage.
    cube(x,y,0,118,96,70,c);pitchedRoof(x-7,y-6,70,132,108,38,roof);
    cube(x+91,y+15,80,14,17,30,'#ad9074');
    windowAt(x+12,29);windowAt(x+84,29);
  }else if(variant===1){ // Narrow two-storey house, with a little side annex.
    cube(x-13,y+25,0,25,71,48,shade(c,-9));
    // End the annex roof at the main wall, with overhang only on exposed edges.
    cube(x-17,y+22,48,29,74,7,roof);
    cube(x+12,y,0,93,96,122,c);
    pitchedRoof(x+5,y-6,122,107,108,30,roof);
    windowAt(x+22,32,16,23);windowAt(x+79,32,16,23);
    windowAt(x+23,86,22,26);windowAt(x+74,86,22,26);
    cube(x+49,front,91,20,5,4,'#e5d8b7');
  }else if(variant===2){ // Low bungalow with an attached garage.
    cube(x,y+12,0,111,84,66,c);
    cube(x+111,y+20,0,65,76,51,shade(c,8));
    cube(x+107,y+16,51,74,84,8,roof);
    cube(x+119,front,0,48,3,40,'#d9d3ba');
    for(let z=8;z<40;z+=8)cube(x+119,front+3,z,48,1,1,'#aaa992');
    pitchedRoof(x-5,y+6,66,121,96,23,roof);
    windowAt(x+12,27,22,23);windowAt(x+80,27,22,23);
    ground(x+116,front+4,58,65,'#bdbda9');
  }else if(variant===3){ // Farmhouse with a covered front porch.
    cube(x-8,y,0,137,96,82,c);
    pitchedRoof(x-15,y-6,82,151,108,40,roof);
    windowAt(x+10,35,23,26);windowAt(x+85,35,23,26);
  }else{ // Split-level with a taller wing and a flat canopy.
    cube(x-8,y+18,0,76,78,70,c);
    cube(x+68,y,0,63,96,102,shade(c,-8));
    cube(x-13,y+13,70,86,88,8,roof);
    pitchedRoof(x+62,y-6,102,75,108,27,roof);
    windowAt(x+6,30,27,24);windowAt(x+83,70,30,21);
    windowAt(x+84,26,28,23);
  }
  // The doorstep stays at the same world location for every structure.
  cube(x+46,front,0,24,4,43,'#547b73');
  cube(x+65,front+4,20,2,1,3,'#e3c779');
  cube(x+39,front+3,0,39,15,5,'#d7c7a9');
  if(variant===3){
    cube(x+1,front+4,0,116,27,5,'#dbccb0');
    for(const px of [x+6,x+108])cube(px,front+22,5,5,5,53,'#f2e1bd');
    cube(x-2,front,58,122,34,6,roof);
    cube(x+9,front+24,17,25,3,3,'#eee0c1');
    cube(x+81,front+24,17,25,3,3,'#eee0c1');
    // Hang the address on the porch edge, above the entrance.
    faceText(n,x+58,front+34,59,11);
  }else faceText(n,x+58,front+5,52,11);
  cube(x+122,y+145,0,4,4,25,'#a18c6b');
  cube(x+116,y+141,24,17,11,9,'#b16450');
  const beds=variant===3?[x-12,x+130]:[x-8,x+13,x+105];
  for(const bx of beds){cube(bx,front+12,0,15,15,10,'#809b62');cube(bx+5,front+17,10,5,5,3,variant%2?'#d59b74':'#d4b968')}
  // A small gate and a planter make delivery instructions visible in the scene.
  cube(x+179,front+12,0,4,4,29,'#eee0bc');cube(x+211,front+12,0,4,4,29,'#eee0bc');
  cube(x+183,front+13,12,28,3,3,'#d1c4a5');cube(x+183,front+13,23,28,3,3,'#d1c4a5');
  cube(x-9,front+20,0,20,17,11,'#b97b57');cube(x-7,front+22,11,16,13,8,'#809b62');
  if(reaction&&reaction.address===n&&worldTime<reaction.until){
    const p=point(x+58,front+8,75);ctx.save();ctx.font='600 '+(11*scale)+'px sans-serif';ctx.textAlign='center';
    ctx.fillStyle='#fff8e6';ctx.fillRect(p.x-42*scale,p.y-16*scale,84*scale,23*scale);
    ctx.fillStyle='#315c4d';ctx.fillText('Thank you!',p.x,p.y);ctx.restore();
  }
  if(variant!==2&&i%2===0)tree(x+150,y+25,.8);
}
function wheel(cx,y,cz,r=13,depth=12){
 const count=16,ring=yy=>Array.from({length:count},(_,i)=>{const a=i/count*Math.PI*2;return point(cx+Math.cos(a)*r,yy,cz+Math.sin(a)*r)});
 const back=ring(y),front=ring(y+depth);
 poly(back,'#242b28');
 for(let i=0;i<count;i++){const next=(i+1)%count;poly([back[i],back[next],front[next],front[i]],i<count/2?'#3c443d':'#252d28')}
 poly(front,'#303731');
 const disk=(radius,color)=>poly(Array.from({length:count},(_,i)=>{const a=i/count*Math.PI*2;return point(cx+Math.cos(a)*radius,y+depth+.3,cz+Math.sin(a)*radius)}),color);
 disk(6.5,'#aaa897');disk(3.5,'#767d71');disk(1.5,'#cac6af');
}
function truck(){
 const x=-50,y=100,brown='#553a29',gold='#c5a15b';
 shadow(x,y,142,68);
 for(const xx of [x+29,x+115]){wheel(xx,y-5,14);wheel(xx,y+54,14);}
 cube(x,y,17,91,60,66,brown);
 // Extrude a sloped cab profile, rather than stacking rectangular blocks.
 const profile=[[91,17],[136,17],[136,47],[122,80],[91,83]];
 const back=profile.map(([px,z])=>point(x+px,y+2,z)),front=profile.map(([px,z])=>point(x+px,y+58,z));
 poly(back,'#59402e');
 for(let i=0;i<profile.length;i++){const next=(i+1)%profile.length;poly([back[i],back[next],front[next],front[i]],i===3?'#75543b':i===2?'#6b4b34':'#493322')}
 poly(front,'#493322');
 cube(x-2,y-2,83,95,64,4,'#654735');
 poly([point(x+96,y+59,28),point(x+130,y+59,28),point(x+130,y+59,48),point(x+119,y+59,76),point(x+96,y+59,78)],'#392b23');
 poly([point(x+99,y+60,51),point(x+127,y+60,51),point(x+117,y+60,73),point(x+99,y+60,75)],'#8caaa3');
 // Windshield follows the inclined front face.
 poly([point(x+123,y+8,76),point(x+123,y+51,76),point(x+134,y+51,50),point(x+134,y+8,50)],'#8caaa3');
 poly([point(x+123,y+28,76),point(x+123,y+30,76),point(x+134,y+30,50),point(x+134,y+28,50)],'#514132');
 cube(x+94,y+60,22,39,7,5,'#999887');
 cube(x+94,y+60,28,2,1,46,gold);cube(x+126,y+60,40,4,1,2,'#cfba85');
 cube(x+136,y+5,18,5,52,8,'#9b9a87');
 cube(x+138,y+7,30,2,9,7,'#fff0bd');cube(x+138,y+48,30,2,9,7,'#fff0bd');
 cube(x+138,y+20,29,2,23,12,'#332d25');
 for(const z of [32,36,40])cube(x+140,y+21,z,1,21,1,'#9c9b88');
 cube(x+2,y+60,29,89,1,2,gold);
 poly([point(x+30,y+61,68),point(x+57,y+61,68),point(x+55,y+61,52),point(x+43,y+61,45),point(x+32,y+61,52)],gold);
 poly([point(x+33,y+61,65),point(x+54,y+61,65),point(x+52,y+61,54),point(x+43,y+61,49),point(x+35,y+61,54)],'#503624');
 faceText('LP',x+43,y+62,55,11,'bold',gold);faceText('LANE POST',x+43,y+61,36,8,'600',gold);
 cube(x+128,y-5,59,4,8,10,'#3c3027');
 // Bodywork is drawn after all four tires to cover their upper edges.

}

function draw(){let rect=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr)}W=rect.width;H=rect.height;scale=Math.max(.6,Math.min(1.1,W/1100));ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=['#bfd0a0','#b9c9a3','#c4c7b9'][districtInfo().region];ctx.fillRect(0,0,W,H);ground(-1500,30,3000,75,'#d8d0b8');ground(-1500,105,3000,155,'#8d9690');ground(-1500,260,3000,18,'#d7d1b9');for(let i=-9;i<10;i++)ground(i*100-offset%100,180,43,4,'#d9d5b9');for(let i=Math.floor(offset/340)-4;i<Math.floor(offset/340)+6;i++){let {x,number}=housePosition(i);house(x,-150,number,i);if(i%2)tree(x+235,-110,.95);person(x+180+(worldTime*12+i*60)%90,65,worldTime,i+8)}truck();for(let i=-4;i<5;i++){let x=i*270-offset%270;tree(x,325,1.1);ground(x+65,290,57,45,'#a8bd86');if(i%2===0)person(x+120-(worldTime*8)%90,290,worldTime,i+10,-1)}if(flight){let t=flight.t/.65,a=point(5,125,60),b=spotPoint(flight.target,flight.house);let x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t-Math.sin(t*Math.PI)*95*scale;ctx.save();ctx.translate(x,y);ctx.rotate(t*5);ctx.fillStyle='#bd8c50';ctx.fillRect(-10,-10,20,20);ctx.fillStyle='#ead1a0';ctx.fillRect(-3,-10,6,20);ctx.restore()} }
function tick(now){let dt=Math.min((now-last)/1000,.05);last=now;if(!paused){worldTime+=dt;offset+=(targetOffset-offset)*Math.min(1,dt*4);if(Math.abs(targetOffset-offset)<.1)offset=targetOffset;if(state==='playing'){time=Math.max(0,time-dt);if(typed.length&&!inspection){parcelTime-=dt;document.querySelectorAll('.box.selected .bar i').forEach(bar=>bar.style.width=Math.max(0,parcelTime/parcelMax*100)+'%');if(parcelTime<=0)retry('Parcel timer expired · try again')}if(flight){flight.t+=dt;if(flight.t>=.65)afterFlight()}checkChallenge();if(time<=0)endRound();update()}}if(now>toastUntil)$('toast').classList.remove('show');draw();positionTargets();updateScanReady(now);requestAnimationFrame(tick)}

let inspection=null;
const faceAngles=[[0,0],[0,180],[0,90],[0,-90],[90,0],[-90,0]];
function beginInspection(){
 const index=selected,b=boxes[index],face=Math.floor(Math.random()*6);
 const aligned=Math.random()<up.orient*.2;
 const pitch=aligned?-faceAngles[face][0]:[-35,0,35][Math.floor(Math.random()*3)];
 const yaw=aligned?-faceAngles[face][1]:Math.floor(Math.random()*8)*45;
 const otherFaces=[0,1,2,3,4,5].filter(f=>f!==face).sort(()=>Math.random()-.5);
 const decoys=level>=5?otherFaces.slice(0,Math.min(3,1+Math.floor((level-5)/3))):[];
 inspection={index,face,pitch,yaw,decoys,readyAt:performance.now()+200};resetAttempt();
 const left=8+Math.random()*40,top=8+Math.random()*18;
 function sticker(number,id,l,t,f){return '<div data-scan-face="'+f+'" class="shipping-label" style="left:'+l+'%;top:'+t+'%"><span>LANE POST · PRIORITY</span><strong class="label-address">'+number+'</strong><small>'+districtInfo().street.toUpperCase()+' · FRONT DOOR</small><button class="barcode" '+(id?'id="barcode"':'')+' aria-label="Shipping barcode" style="height:'+27+'px"></button><span class="tracking">LP '+String(number).padStart(4,'0')+' 0712</span></div>'}
 $('parcel3d').innerHTML=faceAngles.map((_,i)=>'<div class="parcel-face face-'+i+'"><span class="packing-tape"></span>'+(i===face?sticker(b.address,true,left,top,i):decoys.includes(i)?sticker(b.address+2*(1+i),false,8+Math.random()*40,8+Math.random()*18,i):'<span class="box-stamp">'+(i%2?'HANDLE WITH CARE':'LANE POST')+'</span>')+'</div>').join('');
 $('inspection').hidden=false;$('scan-size').textContent=['SMALL','MEDIUM','LARGE'][b.size]+' PARCEL';
 $('parcel3d').style.setProperty('--box-scale',[.83,1,1.12][b.size]);
 $('barcode').onclick=scanBarcode;applyRotation();renderBoxes();
}
function closeInspection(){inspection=null;if($('inspection'))$('inspection').hidden=true}
function rotatePackage(key){
 if(!inspection||paused||state!=='playing')return;
 if(key==='a')inspection.yaw-=45;if(key==='d')inspection.yaw+=45;
 if(key==='w')inspection.pitch+=45;if(key==='s')inspection.pitch-=45;
 inspection.readyAt=performance.now()+200;applyRotation();
}
function applyRotation(){if(inspection)$('parcel3d').style.transform='rotateX('+inspection.pitch+'deg) rotateY('+inspection.yaw+'deg) scale(var(--box-scale))'}
function labelFacing(threshold=.45,face=inspection?.face){
 if(!inspection)return false;
 const [fx,fy]=faceAngles[face].map(v=>v*Math.PI/180),p=inspection.pitch*Math.PI/180,y=inspection.yaw*Math.PI/180;
 const nx=Math.sin(fy)*Math.cos(fx),ny=-Math.sin(fx),nz=Math.cos(fy)*Math.cos(fx);
 return ny*Math.sin(p)+(-nx*Math.sin(y)+nz*Math.cos(y))*Math.cos(p)>threshold;
}
function updateScanReady(now=performance.now()){
 const enabled=!!inspection&&!paused&&state==='playing'&&now>=inspection.readyAt;
 let anyReady=false,correctReady=false;
 document.querySelectorAll('[data-scan-face]').forEach(label=>{
  const face=+label.dataset.scanFace,ready=enabled&&labelFacing(undefined,face),correct=!!inspection&&face===inspection.face;
  label.classList.toggle('scan-ready',ready);
  label.classList.toggle('scan-correct',ready&&correct&&up.scan>=2);
  anyReady ||= ready;correctReady ||= ready&&correct;
 });
 $('scan-action').textContent=up.scan>=3?'Auto scanner · find the correct label':correctReady&&up.scan>=2?'Space · Scan correct label':anyReady?'Space · Scan visible label':'Turn a label toward you';
 if(enabled&&up.scan>=3&&labelFacing())scanBarcode();
}
function scanBarcode(){
 if(!inspection||paused||state!=='playing')return;if(performance.now()<inspection.readyAt)return;if(!labelFacing()){
  if(inspection.decoys?.some(f=>labelFacing(undefined,f))){recordMistake();score-=25;streak=0;inspection.readyAt=performance.now()+650;beep('error');toast('Old label! Match house '+address+' · −25 points');update()}
  else toast('Turn the shipping label toward you');
  return;
 }
 const index=inspection.index;closeInspection();beep('scan');beginPlacement(index);
}


function spotPoint(spot,house=address){
 const x=housePosition((house-12)/2).x;
 return [point(x+58,-42,8),point(x+195,-35,8),point(x+1,-30,15)][spot];
}
function beginPlacement(index){placement={index};$('placement').hidden=false;renderBoxes();positionTargets();toast('Scanned! '+deliverySpots[deliveryNote])}
function closePlacement(){placement=null;$('placement').hidden=true}
function positionTargets(){
 if(!placement)return;
 for(let i=0;i<3;i++){const p=spotPoint(i);const b=$('spot-'+i);b.style.left=p.x+'px';b.style.top=p.y+'px'}
}
function chooseSpot(spot){
 if(!placement||paused||state!=='playing')return;
 if(spot!==deliveryNote){recordMistake();score-=15;streak=0;beep('error');toast('Check the delivery note · −15 points');update();return}
 const index=placement.index;closePlacement();selected=index;send();
}

makeBoxes();update();intro();requestAnimationFrame(tick);




document.querySelectorAll('[data-rotate]').forEach(b=>b.onclick=()=>rotatePackage(b.dataset.rotate));


$('scan-action').onclick=scanBarcode;



document.querySelectorAll('[data-spot]').forEach(b=>b.onclick=()=>chooseSpot(+b.dataset.spot));









