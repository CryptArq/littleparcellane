require('./check.cjs');
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes={},calls=[];
const ctx=new Proxy({}, {get(o,k){return o[k]??((...a)=>calls.push([k,...a]))}});
const el=()=>({style:{setProperty(){}},classList:{add(){},remove(){}},getContext(){return ctx},getBoundingClientRect(){return {width:1100,height:440}}});
const env={document:{getElementById(id){return nodes[id]??=el()},querySelectorAll(){return []},addEventListener(){}},localStorage:{getItem(){return 0}},performance:{now(){return 0}},requestAnimationFrame(){},Math,devicePixelRatio:1};
vm.createContext(env);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),env);
vm.runInContext(`
for(let stop=0;stop<20;stop++){
 address=12+stop*2;targetOffset=stop*340;
 for(const delta of [100,1,.01,0]){
  offset=targetOffset-delta;const h=housePosition(stop);
  if(h.number!==address||Math.abs(h.x-(-80+delta))>.001)throw Error('Address alignment');
 }
}
faceText('14',0,99,56,11);draw();
`,env);
assert(calls.some(c=>c[0]==='transform'&&c[1]>0&&c[2]>0&&c[3]===0&&c[4]>0),'Surface projection missing');
calls.length=0;vm.runInContext(`cube=(...a)=>record(a);person(0,0,0,0,1);person(0,0,0,0,-1);`,Object.assign(env,{record(a){calls.push(a)}}));
assert(calls[6][0]>=0&&calls[13][0]<0,'Pedestrians must face opposite travel directions');
console.log('PASS: stable house addresses at 20 stops, surface text transform, scene draw, pedestrian orientation');

