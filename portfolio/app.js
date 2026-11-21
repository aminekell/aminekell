import { pipelineTrace, castRay, architectureTrace } from './simulations.js';

// The document is the portfolio. These three small, on-demand models add a
// closer look; navigation and the complete engineering record need no script.
const byId = id => document.getElementById(id);
const form = byId('pipeline-form');
const input = byId('pipeline-input');
const stages = byId('pipeline-stages');
const result = byId('pipeline-result');

function showPipeline(command) {
  const trace = pipelineTrace(command);
  result.dataset.error = String(!trace.ok);
  input.setAttribute('aria-invalid', String(!trace.ok));
  if (!trace.ok) {
    result.textContent = trace.explanation;
    return;
  }
  const commands = trace.stages.filter(stage => ['ECHO', 'TR', 'WC'].includes(stage.label));
  const fragment = document.createDocumentFragment();
  for (const stage of commands) {
    const cell = document.createElement('div');
    const label = document.createElement('span');
    const value = document.createElement('strong');
    const note = document.createElement('small');
    label.textContent = stage.label === 'TR' ? 'tr a-z A-Z' : stage.label === 'WC' ? 'wc -c' : 'echo';
    // Read only the bounded model's data; never interpret user text as markup.
    value.textContent = stage.output.replace(/\n/g, '↵');
    note.textContent = stage.label === 'ECHO' ? 'write literal text' : stage.label === 'TR' ? 'change lowercase to uppercase' : 'count UTF-8 bytes';
    cell.append(label, value, note);
    fragment.append(cell);
  }
  stages.replaceChildren(fragment);
  stages.style.gridTemplateColumns = `repeat(${commands.length}, minmax(0, 1fr))`;
  const bytes = new TextEncoder().encode(trace.output).length;
  result.textContent = `Final output: ${JSON.stringify(trace.output)}. Each pipe carries the output of one process into the next.`;
  result.dataset.bytes = String(bytes);
}
form.hidden = false;
form.addEventListener('submit', event => { event.preventDefault(); showPipeline(input.value); });
showPipeline(input.value);

const map = [
  [1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,1],
  [1,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1]
];
const viewer = {x:2.5, y:4.5};
const mapCanvas = byId('room-map');
const viewCanvas = byId('room-view');
let mapContext = null, viewContext = null;
try { mapContext = mapCanvas.getContext('2d'); viewContext = viewCanvas.getContext('2d'); } catch { /* The readable description remains. */ }
const angle = byId('room-angle');
const angleOutput = byId('angle-output');

function drawRoom() {
  if (!mapContext || !viewContext) return;
  const direction = Number(angle.value) * Math.PI / 180;
  const m = mapContext, v = viewContext;
  const size = mapCanvas.width / map.length;
  m.clearRect(0,0,mapCanvas.width,mapCanvas.height);
  m.fillStyle = '#303bcf'; m.fillRect(0,0,480,480);
  for (let y=0;y<map.length;y++) for (let x=0;x<map[y].length;x++) {
    m.fillStyle = map[y][x] ? '#c7ccff' : '#3a47d8';
    m.fillRect(x*size+2,y*size+2,size-4,size-4);
  }
  const width = viewCanvas.width, height = viewCanvas.height;
  v.fillStyle='#d5d8ff'; v.fillRect(0,0,width,height/2);
  v.fillStyle='#242235'; v.fillRect(0,height/2,width,height/2);
  const fov = Math.PI/3;
  const columns = 160;
  for(let column=0;column<columns;column++) {
    const rayAngle=direction+(column/(columns-1)-.5)*fov;
    const hit=castRay(map,viewer.x,viewer.y,rayAngle);
    const distance=Math.max(.1,hit.distance*Math.cos(rayAngle-direction));
    const wallHeight=Math.min(height*2,height/distance);
    const brightness=Math.max(.24,Math.min(1,1/(1+distance*.11)));
    const base=hit.side===0?[243,237,179]:[173,180,238];
    v.fillStyle=`rgb(${base.map(channel=>Math.round(channel*brightness)).join(',')})`;
    v.fillRect(column*width/columns,(height-wallHeight)/2,Math.ceil(width/columns)+1,wallHeight);
    // A few map rays explain the view without turning the map into noise.
    if(column%16===0 || column===columns-1) {
      m.beginPath();m.moveTo(viewer.x*size,viewer.y*size);m.lineTo(hit.hitX*size,hit.hitY*size);
      m.strokeStyle='#f3edb3';m.globalAlpha=.45;m.lineWidth=1.5;m.stroke();m.globalAlpha=1;
    }
  }
  m.beginPath();m.arc(viewer.x*size,viewer.y*size,8,0,Math.PI*2);m.fillStyle='#f3edb3';m.fill();
  m.beginPath();m.moveTo(viewer.x*size,viewer.y*size);m.lineTo((viewer.x+Math.cos(direction)*.5)*size,(viewer.y+Math.sin(direction)*.5)*size);m.strokeStyle='#f3edb3';m.lineWidth=4;m.stroke();
  angleOutput.value = `${Number(angle.value)}°`;
  const center=castRay(map,viewer.x,viewer.y,direction);
  byId('room-result').textContent=`Facing ${Number(angle.value)}°. The central ray meets a wall ${center.distance.toFixed(2)} grid units away. Near walls appear taller.`;
}
if(mapContext && viewContext) {
  mapCanvas.closest('.room-stage').classList.add('is-drawn');
  byId('room-controls').hidden=false;
  angle.addEventListener('input',drawRoom);
  byId('room-reset').addEventListener('click',()=>{angle.value='-30';drawRoom();});
  drawRoom();
}

let offline=false;
const databaseToggle=byId('database-toggle');
byId('stack-controls').hidden=false;
databaseToggle.addEventListener('click',()=>{
  offline=!offline;
  const trace=architectureTrace({offline});
  databaseToggle.setAttribute('aria-pressed',String(offline));
  databaseToggle.textContent=offline?'Bring the database back':'Take the database offline';
  byId('stack-drawing').dataset.offline=String(offline);
  byId('db-label').textContent=offline?'database offline':'database available';
  byId('db-connection-label').textContent=offline?'the request cannot finish':'a query crosses the network';
  byId('stack-result').textContent=offline?'The page request cannot finish. The database files remain in the persistent volume.':'The database is available again. The request can reach it and return a page.';
  byId('stack-result').dataset.requestOk=String(trace.ok);
});


// A progressively enhanced index of the user's published repositories.
const archiveItems=[...document.querySelectorAll('.repository-columns li')];
const projectSearch=byId('project-search');
byId('archive-filter').hidden=false;
projectSearch.addEventListener('input',()=>{
  const query=projectSearch.value.trim().toLocaleLowerCase();
  let count=0;
  for(const item of archiveItems) {
    item.hidden=!item.textContent.toLocaleLowerCase().includes(query);
    if(!item.hidden)count++;
  }
  for(const section of document.querySelectorAll('.repository-columns section')) {
    section.hidden=![...section.querySelectorAll('li')].some(item=>!item.hidden);
  }
  byId('archive-count').value=`${count} ${count===1?'project':'projects'}${query?' found':''}`;
});
