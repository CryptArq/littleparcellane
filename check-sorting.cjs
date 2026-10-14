const fs=require('fs'),vm=require('vm');const nodes={};const el=()=>({style:{setProperty(){}},classList:{add(){},remove(){}},getContext(){return new Proxy({}, {get(o,k){return o[k]??(()=>{})}})},getBoundingClientRect(){return {width:1100,height:440}}});const env={document:{getElementById(id){return nodes[id]??=el()},querySelectorAll(){return []},addEventListener(){}},localStorage:{getItem(){return 0}},performance:{now(){return 0}},requestAnimationFrame(){},Math};vm.createContext(env);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),env);
vm.runInContext(`
sound=false;startRound();needed=3;makeBoxes();
if(boxes.length!==4||boxes.filter(b=>b.address===address).length!==3)throw Error('Cargo quota mismatch');
const original=boxes;const correct=boxes.filter(b=>b.address===address);
const before=time;const wrong=boxes.find(b=>b.address!==address);
 wrong.seq.forEach(input);
if(score!==-25||time!==before||typed.length!==0||delivered)throw Error('Wrong sequence penalty');
const prior=score;input(arrows.find(k=>k!==boxes[0].seq[0]));if(score!==prior||typed.length)throw Error('Typo deducted points');
for(let i=0;i<correct.length;i++){
 const oldAddress=address;correct[i].seq.forEach(input);if(!inspection||correct[i].delivered)throw Error('Premature delivery');inspection.pitch=-faceAngles[inspection.face][0];inspection.yaw=-faceAngles[inspection.face][1];inspection.readyAt=0;scanBarcode();if(placement)chooseSpot(deliveryNote);
 if(stops!==(i===2?1:0))throw Error('Stop counted before full house delivery');if(!correct[i].delivered||!flight||delivered!==i+1)throw Error('Direct sequence delivery');
 afterFlight();
 if(i<2&&(boxes!==original||address!==oldAddress))throw Error('Cargo changed before house complete');
}
if(address!==14||needed<1||boxes===original)throw Error('Next house not loaded');
startRound();needed=1;makeBoxes();boxes.find(b=>b.address===address).seq.forEach(input);
inspection.pitch=-faceAngles[inspection.face][0];inspection.yaw=-faceAngles[inspection.face][1];inspection.readyAt=0;scanBarcode();
if(!placement||delivered||stops)throw Error('Scan bypassed placement');
const placementScore=score;chooseSpot((deliveryNote+1)%3);
if(!placement||delivered||stops||score!==placementScore-15)throw Error('Wrong placement handling');
chooseSpot(deliveryNote);
if(placement||delivered!==1||stops!==1||flight.target!==deliveryNote)throw Error('Correct placement handling');
afterFlight();if(!reaction||reaction.address!==address-2)throw Error('Neighborhood reaction missing');
for(const lv of [1,4,5,8,11]){
 level=lv;startRound();
 if(time!==60||quota!==baseQuota(lv))throw Error('Difficulty budget');
 if(boxes.some(b=>b.seq.length!==3+b.size+(lv>=5?1:0)))throw Error('Prompt milestone');
 const box=boxes.find(b=>b.address===address);box.seq.forEach(input);
 const expected=lv<5?0:Math.min(3,1+Math.floor((lv-5)/3));
 if(inspection.decoys.length!==expected||inspection.decoys.includes(inspection.face))throw Error('Decoy faces');
 if(expected){
  const wrong=inspection.decoys[0],beforeScore=score;
  inspection.pitch=-faceAngles[wrong][0];inspection.yaw=-faceAngles[wrong][1];inspection.readyAt=0;
  scanBarcode();if(placement)chooseSpot(deliveryNote);
  if(score!==beforeScore-25||!inspection||box.delivered)throw Error('Decoy scan');
 }
 inspection.pitch=-faceAngles[inspection.face][0];inspection.yaw=-faceAngles[inspection.face][1];inspection.readyAt=0;
 scanBarcode();if(placement)chooseSpot(deliveryNote);chooseSpot(deliveryNote);if(!box.delivered||inspection)throw Error('Correct scan');
 flight=null;
}
level=1;startRound();
level=5;state='garage';coins=100;const savedCoins=coins;buyUpgrade('clock');
if(up.clock!==1||coins!==savedCoins-6)throw Error('Shop purchase');
const balance=coins;coins=0;buyUpgrade('tip');if(up.tip!==0||coins!==0)throw Error('Unaffordable purchase');coins=balance;
showRoutes();if(state!=='route'||level!==5)throw Error('Route flow');routeSelection=0;departRoute();
if(level!==6||districtInfo().name!=='Suburb'||districtInfo().stage!==1||quota!==baseQuota()||time!==68||!challenge)throw Error('Scenic branch or suburb transition');
level=10;showRoutes();routeSelection=-1;departRoute();if(challenge)throw Error('Skip challenge');
if(level!==11||districtInfo().name!=='City'||routeChoice.reward!==1||quota!==baseQuota()||time!==68)throw Error('Priority branch or city transition');
up.clock=0;routeChoice={id:'standard',quota:0,time:0,reward:1};level=1;startRound();
showRoutes();if(challengeOffers.length!==3||new Set(challengeOffers.map(c=>c.id)).size!==3)throw Error('Challenge variety');
coins=10;rerollChallenges();if(coins!==7||rerolls!==1||routeSelection!==-1)throw Error('Paid reroll');rerollChallenges();if(coins!==2||rerolls!==2)throw Error('Reroll escalation');rerollChallenges();if(coins!==2||rerolls!==2)throw Error('Unaffordable reroll');
routeSelection=0;const offered=challengeOffers[0].id;departRoute();if(challenge.id!==offered||challenge.state!=='active')throw Error('Accepted challenge');
challenge={type:'streak',title:'Test streak',target:3,reward:6,state:'active'};stageStats.maxStreak=2;coins=0;checkChallenge();if(coins)throw Error('Early reward');stageStats.maxStreak=3;checkChallenge();checkChallenge();if(coins!==6||challenge.state!=='complete')throw Error('Duplicate reward');
challenge={type:'speed',title:'Quick route',target:40,reward:12,state:'active'};roundDuration=60;time=20;stops=quota;checkChallenge();if(challenge.state!=='missed'||coins!==6)throw Error('Speed deadline');
challenge={type:'speed',title:'Quick route',target:40,reward:12,state:'active'};time=21;checkChallenge();if(challenge.state!=='complete'||coins!==18)throw Error('Speed reward');
challenge={type:'clean',title:'Careful',target:2,reward:8,state:'active'};stageStats.cleanStops=2;checkChallenge();if(challenge.state!=='complete')throw Error('Clean stops');
challenge={type:'large',title:'Heavy',target:3,reward:8,state:'active'};stageStats.large=3;checkChallenge();if(challenge.state!=='complete')throw Error('Large parcels');
challenge={type:'bonus',title:'Extra',target:1,reward:12,state:'active'};stops=quota+1;checkChallenge();if(challenge.state!=='complete')throw Error('Extra stop');
challenge=null;level=1;startRound();
for(let face=0;face<6;face++){
 inspection={face,pitch:-faceAngles[face][0],yaw:-faceAngles[face][1],index:0,readyAt:0};
 if(!labelFacing())throw Error('Face cannot be scanned: '+face);
 inspection.pitch+=180;
 if(labelFacing())throw Error('Hidden face scannable: '+face);
}
inspection=null;
startRound();up.scan=1;
const labelFlags=[{},{}];const fakeLabels=[0,2].map((face,i)=>({dataset:{scanFace:String(face)},classList:{toggle(k,v){labelFlags[i][k]=v}}}));
const savedQuery=document.querySelectorAll;document.querySelectorAll=()=>fakeLabels;
inspection={face:0,pitch:0,yaw:-45,readyAt:0,decoys:[2]};updateScanReady(0);
if(!labelFlags.every(f=>f['scan-ready']&&!f['scan-correct']))throw Error('Manual scanner reveals correct label');
up.scan=2;updateScanReady(0);if(!labelFlags[0]['scan-correct']||labelFlags[1]['scan-correct'])throw Error('Identifier scanner');
inspection=null;document.querySelectorAll=savedQuery;coins=36;up.scan=1;buyUpgrade('scan');if(coins!==24||up.scan!==2)throw Error('Tier two cost');buyUpgrade('scan');if(coins!==0||up.scan!==3)throw Error('Tier three cost');
startRound();boxes.find(b=>b.address===address).seq.forEach(input);inspection.pitch=-faceAngles[inspection.face][0];inspection.yaw=-faceAngles[inspection.face][1];inspection.readyAt=0;updateScanReady(0);
if(!inspection?.scanned||placement)throw Error('Missing scan confirmation');const frozenTime=time;advanceScan(.5);if(!inspection||placement||time!==frozenTime)throw Error('Scan pause too short');advanceScan(.5);if(inspection||!placement||delivered)throw Error('Automatic scanner did not advance to placement');chooseSpot(deliveryNote);afterFlight();up.scan=1;
for(let i=0;i<100;i++){
 needed=1+i%3;makeBoxes();
 if(boxes.filter(b=>b.address===address).length!==needed)throw Error('Missing parcels');
 const seqs=boxes.map(b=>b.seq.join(''));
 if(new Set(seqs).size!==4)throw Error('Duplicate sequences');
 for(let a=0;a<4;a++)for(let b=0;b<4;b++)if(a!==b&&seqs[a].startsWith(seqs[b]))throw Error('Ambiguous completion');
}
`,env);console.log('PASS: direct input, similar distractors, point penalties, retained cargo, all parcels collected, next stop, 100 generated trays');














