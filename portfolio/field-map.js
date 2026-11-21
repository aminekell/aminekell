/** A parametric surface and its causal diagram are two views of one instrument.
 * No graphics library, textures, GPU context, or external assets are required. */
const TAU = Math.PI * 2;
const IDS = ['computation','network','process','architecture','geometry','interface'];
const LABELS = ['Information','Networks','Processes','Architecture','Geometry','Interface'];
const ORANGE = '#d74219';
const YAW = -.24, PITCH = .83;
const COS_YAW = Math.cos(YAW), SIN_YAW = Math.sin(YAW);
const COS_PITCH = Math.cos(PITCH), SIN_PITCH = Math.sin(PITCH);

function perspectivePoint([x, y, z]) {
  const rotatedX = x * COS_YAW - y * SIN_YAW;
  const rotatedY = x * SIN_YAW + y * COS_YAW;
  const height = rotatedY * COS_PITCH - z * SIN_PITCH;
  const depth = rotatedY * SIN_PITCH + z * COS_PITCH;
  const perspective = 7 / (7 + depth);
  return [rotatedX * perspective, height * perspective, depth];
}

export function surfacePoint(u, v) {
  const radius = 1.72 + .52 * Math.cos(3 * u) + v * .64 * Math.cos(1.5 * u);
  return [radius * Math.cos(u), radius * Math.sin(u), .7 * Math.sin(3 * u) + v * .82 * Math.sin(1.5 * u)];
}

export class Instrument {
  constructor(canvas, landmarks, onSelect, onStats) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha: true});
    this.onStats = onStats;
    this.active = 0;
    this.fold = 0;
    this.raf = 0;
    this.visible = true;
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
    // Project the fixed viewpoint once and measure it before fitting the canvas.
    this.bounds = {left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity};
    const bounds = this.bounds;
    for(let vIndex=0; vIndex<65; vIndex++) {
      const v = vIndex/64*2-1, points=[];
      for(let index=0;index<=180;index++) {
        const point = perspectivePoint(surfacePoint(index/180*TAU,v));
        bounds.left = Math.min(bounds.left, point[0]);
        bounds.right = Math.max(bounds.right, point[0]);
        bounds.top = Math.min(bounds.top, point[1]);
        bounds.bottom = Math.max(bounds.bottom, point[1]);
        points.push(point);
      }
      this.geometry.push({points,v});
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
    if(this.ctx)landmarks.hidden=false;
    this.invalidate();
  }
  select(id) {
    this.active=IDS.indexOf(id);
    this.markers.forEach((button,index)=>button.setAttribute('aria-pressed',String(index===this.active)));
    this.invalidate();
  }
  setFold(fold) {
    this.fold=fold?1:0;
    this.invalidate();
  }
  setInspecting(inspecting) {this.inspecting=inspecting;this.invalidate();}
  invalidate() { if(!this.raf && this.visible && !document.hidden && this.ctx)this.raf=requestAnimationFrame(()=>this.draw()); }
  stop() { cancelAnimationFrame(this.raf); this.raf=0; }
  fitDrawing() {
    this.compact = matchMedia('(max-width: 760px)').matches;
    const {left, right, top, bottom} = this.bounds;
    const start = this.compact ? this.width * .07 : this.width * .34;
    const end = this.width * .96;
    const availableHeight = this.height * .88;
    this.scale = Math.min((end - start) / (right - left), availableHeight / (bottom - top));
    this.centerX = (start + end) / 2 - (left + right) * this.scale / 2;
    this.centerY = this.height * .50 - (top + bottom) * this.scale / 2;
  }
  project(point, index=0, v=0) {
    const [x, y, depth] = point;
    if(!this.fold)return [this.centerX + x * this.scale, this.centerY + y * this.scale, depth];

    const u = index / 180;
    const start = this.compact ? .08 : .39;
    const span = this.compact ? .84 : .49;
    const diagramY = this.height * .51 + Math.sin(u * TAU) * Math.min(48, this.height * .2) + v * 11;
    return [this.width * (start + u * span), diagramY, depth];
  }
  draw() {
    this.raf=0;
    if(!this.ctx || !this.visible || document.hidden)return;
    const started=performance.now();
    const rect=this.canvas.getBoundingClientRect();
    this.width=rect.width;this.height=rect.height;
    const dpr=Math.min(devicePixelRatio||1,this.width<650?1.3:1.7);
    if(this.canvas.width!==Math.round(rect.width*dpr)||this.canvas.height!==Math.round(rect.height*dpr)) {
      this.canvas.width=Math.round(rect.width*dpr);this.canvas.height=Math.round(rect.height*dpr);
    }
    const ctx=this.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,this.width,this.height);
    this.fitDrawing();
    const detail=this.compact?2:1;
    ctx.lineWidth=.64;
    for(let j=0;j<this.geometry.length;j+=detail) {
      const curve=this.geometry[j];
      ctx.beginPath();
      let meanDepth=0;
      const end=180;
      for(let i=0;i<=end;i++) {
        const p=this.project(curve.points[i],i,curve.v);meanDepth+=p[2];
        if(i===0)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);
      }
      const alpha=.15+((meanDepth/end+2)/4)*.34;
      ctx.strokeStyle=`rgba(34,39,34,${alpha})`;ctx.stroke();
    }
    // Sparse cross sections expose the two-parameter surface.
    for(let i=0;i<180;i+=6) {
      ctx.beginPath();
      for(let j=0;j<65;j+=2) {
        const p=this.project(this.geometry[j].points[i],i,this.geometry[j].v);
        j===0?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]);
      }
      ctx.strokeStyle='rgba(34,39,34,.16)';ctx.lineWidth=.6;ctx.stroke();
    }
    // An orange cut across the surface is the active semantic lens.
    const cut=Math.round((this.active+.4)/6*180);
    ctx.beginPath();
    for(let j=0;j<65;j++) {
      const point=this.project(this.geometry[j].points[cut],cut,this.geometry[j].v);
      j===0?ctx.moveTo(point[0],point[1]):ctx.lineTo(point[0],point[1]);
    }
    ctx.strokeStyle=ORANGE;ctx.lineWidth=1.6;ctx.stroke();
    if(!this.compact)this.markers.forEach((marker,index)=>{
      const i=Math.round((index+.4)/6*180);
      const p=this.project(this.geometry[index%2?64:0].points[i],i,index%2?1:-1);
      marker.style.left=`${Math.min(this.width-90,Math.max(15,p[0]))}px`;
      marker.style.top=`${Math.min(this.height-65,Math.max(30,p[1]))}px`;
    });
    if(this.inspecting) {
      ctx.lineWidth=.7;ctx.strokeStyle='rgba(215,66,25,.35)';
      for(let j=0;j<65;j+=8)for(let i=0;i<180;i+=15){
        const p=this.project(this.geometry[j].points[i],i,this.geometry[j].v);
        ctx.strokeRect(p[0]-2,p[1]-2,4,4);
      }
      ctx.font='9px monospace';ctx.fillStyle=ORANGE;
      ctx.fillText('r(u,v) → R(yaw,pitch) → perspective → path',this.compact?8:this.width*.42,this.height-(this.compact?14:76));
    }
    this.onStats?.({paths:Math.ceil(65/detail)+30,samples:181,drawCpuMs:Number((performance.now()-started).toFixed(2)),dpr,fold:Number(this.fold.toFixed(3))});
  }
  destroy() {
    this.stop();this.resizeObserver.disconnect();this.intersection.disconnect();
    document.removeEventListener('visibilitychange',this.visibilityHandler);
  }
}
