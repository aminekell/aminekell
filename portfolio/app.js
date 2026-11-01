import { networkTrace, pipelineTrace, architectureTrace, philosophersState, castRay, generateAutomaton } from './simulations.js';
import { Instrument } from './world.js';

const $ = id => document.getElementById(id);
const realities = {
  computation:{number:'01',subtitle:'REALITY I / THE BIRTH OF COMPUTATION',title:'One bit.\nA world of consequence.',description:'Every cell follows the same small rule. The emerging structure has no blueprint. Change the rule and discover a different computational world.',provenance:'Concept model · connected to C foundations'},
  network:{number:'02',subtitle:'REALITY II / THE NETWORKED COSMOS',title:'A destination is not\na path.',description:'Two networks. One router. Trace an IPv4 packet, change the source mask, or remove the route. Every failure has a precise cause. Switch lenses to follow a channel message.',provenance:'NetPractice / ft_irc · educational concept models'},
  process:{number:'03',subtitle:'REALITY III / THE PROCESS DIMENSION',title:'Small processes.\nShared consequences.',description:'A command becomes a stream. A pipe connects output to input. Follow each intermediate value, or switch to shared resources and deliberately construct a deadlock.',provenance:'minishell / Philosophers · educational concept models'},
  architecture:{number:'04',subtitle:'REALITY IV / ARCHITECTURE AS A CIVILIZATION',title:'Follow the request.\nFind the boundary.',description:'Trace the verified Inception topology or an authenticated profile request through ft_transcendence. Stop time at a service boundary. Introduce a failure and observe where progress ends.',provenance:'Verified configuration · simulated requests, synthetic data'},
  geometry:{number:'05',subtitle:'REALITY V / THE WORLD BEHIND THE PIXELS',title:'The world is flat.\nThe distance is real.',description:'A grid, a position, and a set of rays. Tear open the view to reveal the 2D intersections behind each wall column. Turn, move, and change the camera’s field of view.',provenance:'cub3d concept · grid DDA, perspective, collision checks'},
  interface:{number:'06',subtitle:'REALITY VI / THE SELF-REVEALING INTERFACE',title:'The instrument\nis the experiment.',description:'The same causal pattern runs through everything you have explored. An input changes state; a model interprets it; a renderer makes the result visible. Inspect the implementation live.',provenance:'Project Ø · actual browser architecture'}
};
const state = {
  reality:'computation',time:50,playing:false,rule:90,variant:'network',networkVariant:'network',processVariant:'pipeline',
  destination:'10.20.0.42',prefix:24,route:true,command:'echo hello | tr a-z A-Z | wc -c',safe:true,
  project:'inception',offline:false,authenticated:true,angle:0,fov:60,split:true,
  player:{x:3.5,y:3.5},folded:false,xray:false,still:matchMedia('(prefers-reduced-motion: reduce)').matches
};
const visited=new Set(['computation']);
const map=[
 [1,1,1,1,1,1,1,1,1,1],
 [1,0,0,0,0,0,0,0,0,1],
 [1,0,1,1,0,0,1,0,0,1],
 [1,0,0,0,0,0,1,0,0,1],
 [1,0,0,0,0,0,0,0,0,1],
 [1,0,1,0,0,1,0,1,0,1],
 [1,0,0,0,0,0,0,0,0,1],
 [1,1,1,1,1,1,1,1,1,1]
];
let instrument=null,worldStats={},drawLab=null,labContext=null,labModel=null;
let playFrame=0,lastTick=0,labVisible=true,rendererPromise=null;
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');

function inspectState() {
  if(!$('inspector').hidden) $('inspector-state').textContent=JSON.stringify({
    lens:state.reality,simulationTime:state.time,playing:state.playing,
    representation:state.folded?'causal diagram':'parametric surface',
    renderer:'CanvasRenderingContext2D',...worldStats,
    geometry:'r(u,v) → rotate → perspective',
    layers:['model','canvas','semantic HTML'],visited:visited.size
  },null,2);
}
try {
  instrument=new Instrument($('world'),$('landmarks'),id=>selectReality(id,true),stats=>{worldStats=stats;inspectState();});
  if(!instrument.ctx)throw new Error('Canvas 2D unavailable');
} catch {
  instrument?.destroy();instrument=null;
  $('world').hidden=true;$('world-fallback').hidden=false;
  $('renderer-status').textContent='READABLE MODE · CANVAS UNAVAILABLE';
  $('field-hint').textContent='USE THE SIX REALITY CONTROLS BELOW';
}
function compile() {
  instrument?.compile();
  $('compile-label').textContent='Follow the signal';
  $('field-hint').textContent=innerWidth<720?'SELECT A NUMBERED LANDMARK':'DRAG TO REORIENT · SELECT A LANDMARK';
  $('orbit-reset').hidden=false;
}
$('compile').addEventListener('click',()=>{
  const already=instrument?.compiled??true;compile();
  if(already) $('laboratory').scrollIntoView({behavior:state.still?'instant':'smooth'});
});
$('orbit-reset').addEventListener('click',()=>instrument?.reset());
window.addEventListener('resize',()=>{if(instrument?.compiled)$('field-hint').textContent=innerWidth<720?'SELECT A NUMBERED LANDMARK':'DRAG TO REORIENT · SELECT A LANDMARK';});
$('fold').addEventListener('click',()=>{
  state.folded=!state.folded;compile();instrument?.setFold(state.folded);
  $('fold').setAttribute('aria-pressed',String(state.folded));
  $('surface-label').textContent=state.folded?'STRUCTURE → CAUSAL DIAGRAM':'INFORMATION → STRUCTURE';
  inspectState();
});
function toggleXray(force) {
  state.xray=force??!state.xray;
  $('inspector').hidden=!state.xray;
  $('xray').setAttribute('aria-pressed',String(state.xray));
  $('field').classList.toggle('is-inspecting',state.xray);
  instrument?.setInspecting(state.xray);
  inspectState();
}
$('xray').addEventListener('click',()=>toggleXray());
$('motion').setAttribute('aria-pressed',String(state.still));
$('motion').addEventListener('click',()=>{
  state.still=!state.still;instrument?.setPaused(state.still);
  $('motion').setAttribute('aria-pressed',String(state.still));
  if(state.still)setPlaying(false);
});
motionPreference.addEventListener('change',e=>{
 state.still=e.matches;instrument?.setPaused(e.matches);
 $('motion').setAttribute('aria-pressed',String(e.matches));if(e.matches)setPlaying(false);
});
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key.toLowerCase()==='x'){e.preventDefault();toggleXray();}
});
function setMode(engineer) {
  document.body.classList.toggle('engineer-mode',engineer);
  $('engineer-link').toggleAttribute('aria-current',engineer);
 $('explorer-link').toggleAttribute('aria-current',!engineer);
 if(engineer)$('engineer-link').setAttribute('aria-current','page');
 else $('explorer-link').setAttribute('aria-current','page');
  if(engineer){setPlaying(false);instrument?.stop();}
  else {instrument?.invalidate();requestAnimationFrame(drawSimulation);}
}
function navigateHash() {
 const id=location.hash.slice(1);
 setMode(id==='engineer');
 if(realities[id])selectReality(id,false,false);
}
window.addEventListener('hashchange',navigateHash);
window.addEventListener('popstate',navigateHash);
$('engineer-link').addEventListener('click',()=>{setMode(true);});
$('explorer-link').addEventListener('click',()=>{setMode(false);});
document.querySelectorAll('[href="#instrument"]').forEach(link=>link.addEventListener('click',()=>setMode(false)));
$('print-record').addEventListener('click',()=>window.print());

function selectReality(id,scroll=false,push=true,project=null) {
 if(!realities[id])return;
 setPlaying(false);state.reality=id;state.time=50;
 if(id==='architecture' && project)state.project=project;
 if(id==='process' && project)state.processVariant=project;
 if(project) {state.offline=false;state.authenticated=true;}
 state.variant=id==='process'?state.processVariant:id==='network'?state.networkVariant:'';
 visited.add(id);setMode(false);
 const data=realities[id];
 $('lab-subtitle').textContent=data.subtitle;
 $('lab-heading').replaceChildren(...data.title.split('\n').flatMap((text,i)=>i?[document.createElement('br'),document.createTextNode(text)]:[document.createTextNode(text)]));
 $('lab-description').textContent=data.description;
 $('lab-number').textContent=data.number;
 $('lab-provenance').textContent=data.provenance;
 document.querySelectorAll('[data-reality]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.reality===id)));
 if(instrument){instrument.select(id);compile();}
 $('discovery-count').textContent=`${String(visited.size).padStart(2,'0')} / 06 PERSPECTIVES VISITED`;
 if(visited.size===6){$('discovery-message').textContent='THE SYSTEMS CONNECT. THE INSTRUMENT IS ONE OF THEM.';$('convergence').hidden=false;}
 createControls();updateModel();
 if(push)history.pushState(null,'',`#${id}`);
 if(scroll){
  $('lab-heading').setAttribute('tabindex','-1');$('lab-heading').focus({preventScroll:true});
  $('laboratory').scrollIntoView({behavior:state.still?'instant':'smooth',block:'start'});
 }
}
document.querySelectorAll('.reality-nav [data-reality]').forEach(b=>b.addEventListener('click',()=>selectReality(b.dataset.reality)));
document.querySelectorAll('[data-open-reality]').forEach(b=>b.addEventListener('click',()=>selectReality(b.dataset.openReality,true,true,b.dataset.project)));
document.querySelector('.reality-nav').addEventListener('keydown',e=>{
 if(!['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
 e.preventDefault();const buttons=[...document.querySelectorAll('.reality-nav button')],i=buttons.indexOf(e.target);
 const next=e.key==='Home'?0:e.key==='End'?5:(i+(['ArrowDown','ArrowRight'].includes(e.key)?1:5))%6;
 buttons[next].focus();buttons[next].click();
});
$('converge').addEventListener('click',()=>{
 $('convergence').hidden=!$('convergence').hidden;
 if(!$('convergence').hidden)$('convergence').scrollIntoView({behavior:state.still?'instant':'smooth',block:'center'});
});

// Controls are real labels and inputs. No content is injected as HTML.
function group(label,control,className='') {
 const wrapper=document.createElement('label');wrapper.className=`control-group ${className}`;
 const text=document.createElement('span');text.textContent=label;wrapper.append(text,control);$('lab-controls').append(wrapper);return control;
}
function selectControl(label,values,value,onChange) {
 const select=document.createElement('select');
 for(const [val,text] of values){const o=document.createElement('option');o.value=val;o.textContent=text;select.append(o);}
 select.value=String(value);select.addEventListener('change',()=>onChange(select.value));return group(label,select);
}
function button(label,onClick,options={}) {
 const b=document.createElement('button');b.type='button';b.className=options.danger?'small-button danger-button':'action-button';b.textContent=label;
 if(options.pressed!==undefined)b.setAttribute('aria-pressed',String(options.pressed));
 b.addEventListener('click',onClick);$('lab-controls').append(b);return b;
}
function textControl(label,value,onChange,options={}) {
 const input=document.createElement('input');input.type='text';input.value=value;input.maxLength=options.maxLength||240;input.spellcheck=false;
 input.addEventListener('change',()=>onChange(input.value));
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();onChange(input.value);}});
 return group(label,input,options.className);
}
function rangeControl(label,min,max,value,onChange) {
 const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.value=value;
 input.addEventListener('input',()=>onChange(Number(input.value)));return group(label,input);
}
function restart() {state.time=0;updateModel();setPlaying(true);}
function createControls() {
 const previousControls=[...$('lab-controls').querySelectorAll('input,select,button')];
 const focusedIndex=previousControls.indexOf(document.activeElement);
 $('lab-controls').replaceChildren();const id=state.reality;
 if(id==='computation') {
   selectControl('Local rule',[[90,'90 / XOR'],[30,'30 / Asymmetry'],[110,'110 / Complexity'],[184,'184 / Traffic']],state.rule,v=>{state.rule=+v;updateModel();});
   button('Grow from one bit ↗',restart);
 }
 if(id==='network') {
   selectControl('Lens',[['network','IPv4 routing'],['irc','IRC channel']],state.networkVariant,v=>{state.variant=state.networkVariant=v;createControls();updateModel();});
   if(state.networkVariant==='network') {
    textControl('Destination IPv4',state.destination,v=>{state.destination=v;updateModel();},{maxLength:15});
    selectControl('Source mask',[[24,'/24 · 255.255.255.0'],[8,'/8 · 255.0.0.0'],[30,'/30 · 255.255.255.252']],state.prefix,v=>{state.prefix=+v;updateModel();});
    button(state.route?'Remove route':'Restore route',()=>{state.route=!state.route;createControls();updateModel();},{danger:true,pressed:!state.route});
   }
   button(state.networkVariant==='irc'?'Send channel message ↗':'Trace packet ↗',restart);
 }
 if(id==='process') {
   selectControl('Lens',[['pipeline','Process pipeline'],['philosophers','Resource contention']],state.processVariant,v=>{state.variant=state.processVariant=v;createControls();updateModel();});
   if(state.processVariant==='pipeline') {
    textControl('Bounded pipeline · echo → optional tr → optional wc',state.command,v=>{state.command=v;updateModel();},{className:'command-control'});
    button('Run ↵',restart);
   } else {
    selectControl('Resource policy',[['safe','Ordered acquisition'],['unsafe','All take left fork']],state.safe?'safe':'unsafe',v=>{state.safe=v==='safe';updateModel();});
    button('Replay scheduling ↗',restart);
   }
 }
 if(id==='architecture') {
   selectControl('Project',[['inception','Inception'],['transcendence','ft_transcendence']],state.project,v=>{state.project=v;state.offline=false;createControls();updateModel();});
   button(state.offline?'Restore service':state.project==='inception'?'Stop MariaDB':'Stop user service',()=>{state.offline=!state.offline;createControls();updateModel();},{danger:true,pressed:state.offline});
   if(state.project==='transcendence')button(state.authenticated?'Remove token':'Restore token',()=>{state.authenticated=!state.authenticated;createControls();updateModel();},{danger:true,pressed:!state.authenticated});
   button('Send request ↗',restart);
 }
 if(id==='geometry') {
   rangeControl('View direction',0,359,state.angle,v=>{state.angle=v;updateModel();});
   rangeControl('Field of view',35,95,state.fov,v=>{state.fov=v;updateModel();});
   button('Turn ↶',()=>{state.angle=(state.angle+345)%360;createControls();updateModel();});
   button('Move forward ↑',()=>movePlayer(.3));
   button(state.split?'Close the map':'Tear open the view',()=>{state.split=!state.split;createControls();updateModel();},{danger:true,pressed:state.split});
 }
 if(id==='interface') {
   button('Inspect the live renderer ↗',()=>{toggleXray(true);$('inspector').scrollIntoView({behavior:state.still?'instant':'smooth',block:'center'});});
   button(state.folded?'Return to surface':'Fold reality into a diagram',()=>$('fold').click());
 }
 if(focusedIndex>=0){const next=$('lab-controls').querySelectorAll('input,select,button')[focusedIndex];next?.focus({preventScroll:true});}
}
function movePlayer(distance) {
 const a=state.angle*Math.PI/180,nx=state.player.x+Math.cos(a)*distance,ny=state.player.y+Math.sin(a)*distance;
 const margin=.18;
 if([[-margin,-margin],[margin,-margin],[-margin,margin],[margin,margin]].every(([dx,dy])=>map[Math.floor(ny+dy)]?.[Math.floor(nx+dx)]===0)) {
  state.player={x:nx,y:ny};updateModel();
 } else {$('lab-result').textContent='Collision boundary: the player cannot enter a wall cell.';}
}
function ircTrace() {
 return {ok:true,stages:[{label:'ALICE',detail:'A registered client sends PRIVMSG #systems :hello over its TCP connection.'},{label:'SERVER',detail:'The server parses the command and checks channel membership in this bounded model.'},{label:'#SYSTEMS',detail:'Alice and Bob are members. Carol belongs to a different channel.'},{label:'BOB',detail:'The server forwards the message to Bob, excluding sender Alice.'},{label:'CAROL / ∅',detail:'Carol receives no channel message because she is not a member.'}],explanation:'A channel is a membership boundary. This small routing model illustrates IRC fan-out; it does not implement a full IRC server.'};
}
function geometryModel() {
 const angle=state.angle*Math.PI/180, fov=state.fov*Math.PI/180;
 const rays=Array.from({length:160},(_,i)=>{
  const rayAngle=angle+Math.atan((2*(i+.5)/160-1)*Math.tan(fov/2));
  return {angle:rayAngle,...castRay(map,state.player.x,state.player.y,rayAngle)};
 });
 const selected=rays[Math.min(159,Math.floor(state.time/100*159))];
 const perpendicular=selected.distance*Math.cos(selected.angle-angle);
 return {map,player:state.player,rays,angle,fov,ok:true,stages:[
  {label:'POSITION',detail:`(${state.player.x.toFixed(2)}, ${state.player.y.toFixed(2)}) in a ${map[0].length} × ${map.length} grid. Wall cells block movement.`},
  {label:'DDA',detail:'Step between grid boundaries. The first occupied cell determines the ray intersection.'},
  {label:'DISTANCE',detail:`Selected ray: ${selected.distance.toFixed(3)} units. Perpendicular distance: ${perpendicular.toFixed(3)}.`},
  {label:'PROJECTION',detail:`Column height scales as 1 / perpendicular distance. Camera FOV: ${state.fov}°. The cosine correction prevents fisheye distortion.`}
 ],explanation:`${state.split?'The illusion is open: view and map share the same 160 rays.':'The map is hidden; the same rays still generate every column.'} Time selects a ray. Move and rotate using the controls.`};
}
function updateModel() {
 switch(state.reality) {
  case 'computation': {
   labModel={cells:generateAutomaton(state.rule),ok:true,stages:[{label:'SEED',detail:'One active bit at the center. Neighbors outside the finite grid are fixed at zero.'},{label:'NEIGHBORHOOD',detail:'Read the left, center, and right bits of the previous row.'},{label:`RULE ${state.rule}`,detail:`An eight-bit lookup table chooses the next value. Binary: ${state.rule.toString(2).padStart(8,'0')}.`},{label:'EMERGENCE',detail:'Repeat the rule for 36 generations. Drag time to reveal a row; replay always produces the same structure.'}],explanation:`Rule ${state.rule}: one local rule, 61 cells, 36 generations. Time reveals the computation; it does not introduce randomness.`};
   break;
  }
  case 'network':labModel=state.networkVariant==='irc'?ircTrace():networkTrace(state);break;
  case 'process':
   if(state.processVariant==='philosophers') {
    const p=philosophersState(Math.round(state.time*.8),{safe:state.safe});
    labModel={...p,ok:!p.deadlocked,stages:p.agents.map(a=>({label:`AGENT ${a.id+1} / ${a.state.toUpperCase()}`,detail:a.forks.length?`Owns fork${a.forks.length>1?'s':''} ${a.forks.map(f=>f+1).join(', ')}.`:'Owns no fork.'}))};
   } else labModel=pipelineTrace(state.command);
   break;
  case 'architecture':labModel=architectureTrace(state);break;
  case 'geometry':labModel=geometryModel();break;
  case 'interface':labModel={ok:true,stages:[{label:'INPUT',detail:'DOM click, range input, keyboard, or URL fragment.'},{label:'STATE',detail:`Current reality: ${state.reality}. ${visited.size} of six lenses visited.`},{label:'MODEL',detail:'Pure deterministic functions produce an inspectable result.'},{label:'RENDER',detail:'Canvas 2D projects the geometry. Semantic HTML presents the same results.'},{label:'SUSPEND',detail:'Hidden or offscreen canvases stop requesting animation frames.'}],explanation:'The portfolio runs entirely in your browser. No command execution, sockets, production API requests, or analytics are involved.'};break;
 }
 const explanation=labModel.output!==undefined && labModel.ok?`stdout: ${JSON.stringify(labModel.output)}. ${labModel.explanation}`:labModel.explanation;
 if($('lab-result').textContent!==explanation)$('lab-result').textContent=explanation;
 $('lab-result').classList.toggle('is-error',!labModel.ok);
 $('simulation-badge').textContent=state.reality==='process'&&state.processVariant==='philosophers'?(labModel.deadlocked?'CIRCULAR WAIT / NO PROGRESS':'TOTAL RESOURCE ORDER / FAIR SCHEDULER'):labModel.ok?'BOUNDED EDUCATIONAL MODEL':'SIMULATED FAILURE / INSPECT THE TRACE';
 $('trace-list').replaceChildren();
 for(const stage of labModel.stages||[]) {
  const li=document.createElement('li'),b=document.createElement('b');b.textContent=stage.label;li.append(b,document.createTextNode(stage.detail));$('trace-list').append(li);
 }
 const hasSource=state.reality==='architecture'&&state.project==='inception'||state.reality==='interface';
 $('lab-source').hidden=!hasSource;
 $('lab-source').href=state.reality==='architecture'?'https://github.com/aminekell/Inception/blob/main/srcs/docker-compose.yml':'https://github.com/aminekell/aminekell/tree/main/portfolio';
 renderTime();ensureLabRenderer();inspectState();
}
function renderTime() {
 $('timeline').value=state.time;$('time-value').value=String(state.time).padStart(3,'0');
 const items=[...$('trace-list').children],active=Math.min(items.length-1,Math.floor(state.time/101*items.length));
 items.forEach((li,i)=>li.classList.toggle('is-current',i===active));
 drawSimulation();
 inspectState();
}
function ensureLabRenderer() {
 if(rendererPromise)return;
 rendererPromise=import('./lab-renderer.js').then(module=>{
  drawLab=module.drawLab;
  try{labContext=$('simulation').getContext('2d');}catch{}
  if(!labContext){$('simulation').hidden=true;$('simulation-fallback').hidden=false;}
  drawSimulation();
 }).catch(()=>{$('simulation').hidden=true;$('simulation-fallback').hidden=false;});
}
function drawSimulation() {
 if(!drawLab||!labContext||!labModel||!labVisible||document.body.classList.contains('engineer-mode'))return;
 const canvas=$('simulation'),rect=canvas.getBoundingClientRect();if(!rect.width)return;
 const dpr=Math.min(devicePixelRatio||1,1.6);
 if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}
 labContext.setTransform(dpr,0,0,dpr,0,0);
 drawLab(labContext,rect.width,rect.height,state,labModel);
}
function setPlaying(value) {
 state.playing=value;cancelAnimationFrame(playFrame);playFrame=0;
 $('time-play').textContent=value?'Pause Ⅱ':'Play ▷';$('time-play').setAttribute('aria-label',value?'Pause simulation':'Play simulation');
 if(value){if(state.time>=100)state.time=0;lastTick=0;playFrame=requestAnimationFrame(tick);}
 inspectState();
}
function tick(now) {
 if(!state.playing||document.hidden||!labVisible)return;
 if(now-lastTick>=90){lastTick=now;state.time=Math.min(100,state.time+1);if(state.reality==='process'&&state.processVariant==='philosophers'||state.reality==='geometry')updateModel();else renderTime();if(state.time===100){setPlaying(false);return;}}
 playFrame=requestAnimationFrame(tick);
}
$('time-play').addEventListener('click',()=>setPlaying(!state.playing));
$('time-step').addEventListener('click',()=>{setPlaying(false);state.time=Math.min(100,state.time+1);updateModel();});
$('time-reset').addEventListener('click',()=>{setPlaying(false);state.time=0;updateModel();});
$('timeline').addEventListener('input',()=>{setPlaying(false);state.time=+$('timeline').value;updateModel();});
const labResize=new ResizeObserver(drawSimulation);labResize.observe($('simulation'));
const labIntersection=new IntersectionObserver(entries=>{labVisible=entries[0].isIntersecting;if(labVisible)drawSimulation();else setPlaying(false);});labIntersection.observe($('simulation'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
window.addEventListener('pagehide',()=>{instrument?.destroy();setPlaying(false);labResize.disconnect();labIntersection.disconnect();},{once:true});
// A browser back-forward cache restores the same document after pagehide.
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
createControls();updateModel();navigateHash();
