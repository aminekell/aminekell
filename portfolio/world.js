/** A parametric surface and its causal diagram are two views of one instrument.
 * No graphics library, textures, GPU context, or external assets are required. */
const TAU = Math.PI * 2;
const IDS = ['computation','network','process','architecture','geometry','interface'];
const LABELS = ['Information','Networks','Processes','Architecture','Geometry','Interface'];
const INK = '#222722', ORANGE = '#d74219';

export function surfacePoint(u, v) {
  const radius = 1.72 + .52 * Math.cos(3 * u) + v * .64 * Math.cos(1.5 * u);
  return [radius * Math.cos(u), radius * Math.sin(u), .7 * Math.sin(3 * u) + v * .82 * Math.sin(1.5 * u)];
}

export class Instrument {
  constructor(canvas, landmarks, onSelect, onStats) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha: true});
    this.landmarks = landmarks;
    this.onStats = onStats;
    this.active = 0;
    this.compiled = false;
    this.reveal = .12;
    this.fold = 0;
    this.foldTarget = 0;
    this.yaw = -.24;
    this.pitch = .83;
    this.drag = null;
    this.raf = 0;
    this.lastFrame = 0;
    this.visible = true;
    this.paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.reduced = this.paused;
    this.phase = 0;
    this.width = 0;
    this.height = 0;
    this.geometry = [];
    this.markers = IDS.map((id,index) => {
      const b = document.createElement('button');
      b.className = 'landmark'; b.type = 'button'; b.dataset.reality = id;
      b.setAttribute('aria-label', `Explore ${LABELS[index]}`);
      b.setAttribute('aria-pressed', String(index === 0));
      const dot = document.createElement('span'); dot.className = 'landmark-dot'; dot.textContent = String(index+1).padStart(2,'0');
      const label = document.createElement('span'); label.className = 'landmark-label'; label.textContent = LABELS[index];
      b.append(dot,label); b.addEventListener('click',()=>onSelect(id));
      landmarks.append(b); return b;
    });
    // Build once. Rotations and projection use these immutable coordinates.
    for(let vIndex=0; vIndex<65; vIndex++) {
      const v = vIndex/64*2-1, points=[];
      for(let i=0;i<=180;i++) points.push(surfacePoint(i/180*TAU,v));
      this.geometry.push({points,v,index:vIndex});
    }
    this.resizeObserver = new ResizeObserver(()=>this.invalidate());
    this.resizeObserver.observe(canvas);
    this.intersection = new IntersectionObserver(entries=>{
      this.visible=entries[0].isIntersecting;
      if(this.visible) this.invalidate(); else this.stop();
    });
    this.intersection.observe(canvas);
    this.visibilityHandler=()=>document.hidden?this.stop():this.invalidate();
    document.addEventListener('visibilitychange',this.visibilityHandler);
    this.onPointerDown=e=>{
      if(!this.compiled || e.pointerType==='touch')return;
      this.drag={x:e.clientX,y:e.clientY};
      canvas.setPointerCapture(e.pointerId);
    };
    this.onPointerMove=e=>{
      const rect=canvas.getBoundingClientRect();
      document.getElementById('field-coordinate').textContent=`u ${((e.clientX-rect.left)/rect.width).toFixed(3)} / v ${((e.clientY-rect.top)/rect.height).toFixed(3)}`;
      if(!this.drag)return;
      this.yaw+=(e.clientX-this.drag.x)*.004;
      this.pitch=Math.max(.2,Math.min(1.4,this.pitch+(e.clientY-this.drag.y)*.003));
      this.drag={x:e.clientX,y:e.clientY};this.invalidate();
    };
    this.onPointerUp=()=>{this.drag=null;};
    canvas.addEventListener('pointerdown',this.onPointerDown);
    canvas.addEventListener('pointermove',this.onPointerMove);
    canvas.addEventListener('pointerup',this.onPointerUp);
    canvas.addEventListener('pointercancel',this.onPointerUp);
    this.invalidate();
  }
  compile() {
    this.compiled=true;
    if(this.reduced || this.paused)this.reveal=1;
    this.landmarks.hidden=false;
    this.invalidate();
  }
  select(id) {
    this.active=IDS.indexOf(id);
    this.markers.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===this.active)));
    this.compile();
  }
  setFold(fold) {
    this.foldTarget=fold?1:0;
    if(this.reduced || this.paused)this.fold=this.foldTarget;
    this.compile();
  }
  setPaused(paused) {
    this.paused=paused;
    if(paused) {this.reveal=this.compiled?1:.12;this.fold=this.foldTarget;}
    this.invalidate();
  }
  setInspecting(inspecting) {this.inspecting=inspecting;this.invalidate();}
  reset() { this.yaw=-.24;this.pitch=.83;this.invalidate(); }
  invalidate() { if(!this.raf && this.visible && !document.hidden && this.ctx)this.raf=requestAnimationFrame(t=>this.frame(t)); }
  stop() { cancelAnimationFrame(this.raf); this.raf=0; }
  project(p, index=0, v=0) {
    const mobile=this.width<650;
    const cx=this.width*(mobile?.50:.65), cy=this.height*(mobile?.71:.52);
    const scale=mobile?this.width*.17:Math.min(this.width*.14,this.height*.27);
    const x=p[0]*this.cosYaw-p[1]*this.sinYaw;
    const z=p[0]*this.sinYaw+p[1]*this.cosYaw;
    const y=z*this.cosPitch-p[2]*this.sinPitch;
    const depth=z*this.sinPitch+p[2]*this.cosPitch;
    const perspective=7/(7+depth);
    const px=cx+x*scale*perspective;
    const py=cy+y*scale*perspective;
    // The continuous u parameter becomes diagram position; v becomes lane width.
    const u=index/180;
    const diagramX=mobile?this.width*.17+(u%(.5))/.5*this.width*.66:this.width*.42+u*this.width*.47;
    const diagramY=mobile?this.height*.65+(u<.5?0:75)+v*9:this.height*.51+Math.sin(u*TAU)*48+v*11;
    return [px+(diagramX-px)*this.fold,py+(diagramY-py)*this.fold,depth];
  }
  frame(now) {
    this.raf=0;
    if(!this.ctx || !this.visible || document.hidden)return;
    if(now-this.lastFrame<32 && !this.paused){this.invalidate();return;}
    this.lastFrame=now;
    const started=performance.now();
    const rect=this.canvas.getBoundingClientRect();
    this.width=rect.width;this.height=rect.height;
    const dpr=Math.min(devicePixelRatio||1,this.width<650?1.3:1.7);
    if(this.canvas.width!==Math.round(rect.width*dpr)||this.canvas.height!==Math.round(rect.height*dpr)) {
      this.canvas.width=Math.round(rect.width*dpr);this.canvas.height=Math.round(rect.height*dpr);
    }
    const ctx=this.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,this.width,this.height);
    if(!this.paused)this.phase+=.032;
    const yaw=this.yaw + (this.paused?0:Math.sin(this.phase*.16)*.025);
    this.cosYaw=Math.cos(yaw);this.sinYaw=Math.sin(yaw);
    this.cosPitch=Math.cos(this.pitch);this.sinPitch=Math.sin(this.pitch);
    if(this.compiled)this.reveal+=(1-this.reveal)*.11;
    this.fold+=(this.foldTarget-this.fold)*.10;
    if(Math.abs(this.foldTarget-this.fold)<.001)this.fold=this.foldTarget;
    if(this.reveal>.999)this.reveal=1;
    const maxU=Math.max(.05,this.reveal);
    const detail=this.width<650?2:1;
    // Distant traces form a latent structure even before the visitor compiles it.
    ctx.lineWidth=.64;
    for(let j=0;j<this.geometry.length;j+=detail) {
      const curve=this.geometry[j];
      ctx.beginPath();
      let meanDepth=0;
      const end=Math.ceil(180*(this.compiled?maxU:1));
      for(let i=0;i<=end;i++) {
        const p=this.project(curve.points[i],i,curve.v);meanDepth+=p[2];
        if(i===0)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);
      }
      const alpha=this.compiled? .23+((meanDepth/end+2)/4)*.45:.06;
      ctx.strokeStyle=`rgba(34,39,34,${alpha})`;ctx.stroke();
    }
    if(this.compiled) {
      // Sparse cross sections expose the actual two-parameter surface.
      for(let i=0;i<180*maxU;i+=6) {
        ctx.beginPath();
        for(let j=0;j<65;j+=2) {
          const p=this.project(this.geometry[j].points[i],i,this.geometry[j].v);
          j===0?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]);
        }
        ctx.strokeStyle='rgba(34,39,34,.16)';ctx.lineWidth=.6;ctx.stroke();
      }
    }
    // An orange cut across the surface is the active semantic lens.
    const cut=Math.round((this.compiled?(this.active+.4)/6:.11)*180);
    ctx.beginPath();
    for(let j=0;j<65;j++) {
      const p=this.project(this.geometry[j].points[cut],cut,this.geometry[j].v);
      j===0?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]);
    }
    ctx.strokeStyle=ORANGE;ctx.lineWidth=this.compiled?1.6:2;ctx.stroke();
    // Small ticks orient the visitor without adding unrelated decorative objects.
    if(!this.compiled){
      const p=this.project(this.geometry[32].points[cut],cut,0);
      ctx.beginPath();ctx.arc(p[0],p[1],5,0,TAU);ctx.fillStyle=ORANGE;ctx.fill();
      ctx.font='8px monospace';ctx.fillStyle=INK;ctx.fillText('INPUT / Ø',p[0]+16,p[1]+3);
    }
    this.markers.forEach((marker,index)=>{
      const i=Math.round((index+.4)/6*180);
      const p=this.project(this.geometry[index%2?64:0].points[i],i,index%2?1:-1);
      marker.style.left=`${Math.min(this.width-90,Math.max(15,p[0]))}px`;
      marker.style.top=`${Math.min(this.height-65,Math.max(this.width<650?360:50,p[1]))}px`;
    });
    if(this.inspecting) {
      ctx.lineWidth=.7;ctx.strokeStyle='rgba(215,66,25,.35)';
      for(let j=0;j<65;j+=8)for(let i=0;i<180;i+=15){
        const p=this.project(this.geometry[j].points[i],i,this.geometry[j].v);
        ctx.strokeRect(p[0]-2,p[1]-2,4,4);
      }
      ctx.font='9px monospace';ctx.fillStyle=ORANGE;
      ctx.fillText('r(u,v) → R(yaw,pitch) → perspective → path',this.width<650?10:this.width*.42,this.height-76);
    }
    this.onStats?.({paths:Math.ceil(65/detail)+(this.compiled?30:1),samples:181,drawCpuMs:Number((performance.now()-started).toFixed(2)),dpr,fold:Number(this.fold.toFixed(3))});
    if((!this.paused && this.compiled)||this.reveal<.999&&this.compiled||this.fold!==this.foldTarget)this.invalidate();
  }
  destroy() {
    this.stop();this.resizeObserver.disconnect();this.intersection.disconnect();
    document.removeEventListener('visibilitychange',this.visibilityHandler);
    this.canvas.removeEventListener('pointerdown',this.onPointerDown);
    this.canvas.removeEventListener('pointermove',this.onPointerMove);
    this.canvas.removeEventListener('pointerup',this.onPointerUp);
    this.canvas.removeEventListener('pointercancel',this.onPointerUp);
  }
}
