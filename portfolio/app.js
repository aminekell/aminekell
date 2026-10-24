(() => {
  "use strict";
  const projects = {
    inception: { number: "01 / SYSTEM", kind: "CONTAINER ARCHITECTURE", title: "Inception", description: "A small service city: NGINX receives HTTPS traffic, WordPress runs through PHP-FPM, and MariaDB stores site data. Compose connects the services and volumes preserve state.", flow: ["CLIENT","NGINX","WORDPRESS","DATABASE"], tech: "Docker Compose · NGINX · PHP-FPM · MariaDB", link: "https://github.com/aminekell/Inception", node: 0 },
    minishell: { number: "02 / SYSTEM", kind: "PROCESS PIPELINE", title: "minishell", description: "A command line becomes a sequence of steps: parse input, resolve commands, create processes, connect pipes, and route input or output through redirections.", flow: ["INPUT","PARSER","PIPE","PROCESS"], tech: "C · Processes · Pipes · Redirections", link: "", node: 1 },
    irc: { number: "03 / SYSTEM", kind: "NETWORK SERVICE", title: "ft_irc", description: "A TCP server keeps track of connected clients, channels, and message destinations, then relays each message to the right participants.", flow: ["CLIENTS","TCP","SERVER","CHANNELS"], tech: "C++ · TCP · Sockets · IRC protocol", link: "", node: 2 },
    cub3d: { number: "04 / SYSTEM", kind: "REAL-TIME GRAPHICS", title: "cub3d", description: "A 2D grid becomes a first-person scene. Rays leave the player, find walls in the map, and use distance to draw a 3D-looking corridor.", flow: ["2D MAP","RAYS","DISTANCE","3D VIEW"], tech: "C · Ray casting · Textures · MiniLibX", link: "", node: 3 },
    netpractice: { number: "05 / SYSTEM", kind: "NETWORK TOPOLOGY", title: "NetPractice", description: "A network is a set of addresses, subnet boundaries, and routes. Correct configuration determines whether packets can travel from one host to another.", flow: ["HOST","SUBNET","ROUTE","HOST"], tech: "IP addressing · Subnets · Routing", link: "", node: 4 },
    philosophers: { number: "06 / SYSTEM", kind: "CONCURRENCY", title: "Philosophers", description: "Independent threads share limited resources. Timing and synchronization decide whether they make progress without conflicting or waiting forever.", flow: ["THREADS","LOCKS","SHARED STATE","TIMING"], tech: "C · Threads · Mutexes · Synchronization", link: "", node: 5 }
  };
  const canvas = document.getElementById("world");
  const fallback = document.getElementById("scene-fallback");


  const staticMap = document.getElementById("scene-static-map"); const sceneShell = document.querySelector(".scene-shell"); const buttons = Array.from(document.querySelectorAll(".system-card"));
  let currentProject = "inception";
  let gl = null;
  let program = null;
  let buffer = null;
  let vertexCount = 0;
  let lineVertexCount = 0;
  let pointVertexCount = 0;
  let animationFrame = 0;
  let yaw = -.44;
  let pitch = -.3;
  let targetYaw = yaw;
  let targetPitch = pitch;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let pointerMoved = false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const positions = [
    [-2.22,.72,0],[-1.38,-.04,.22],[-.48,.56,-.05],[.48,-.02,.17],[1.36,.66,-.12],[2.1,-.1,.1]
  ];
  const colors = [
    [0.29,1,.55],[.29,.83,1],[.64,.53,1],[.29,1,.55],[.36,.79,1],[.68,.53,1]
  ];
  function shader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "Shader compile error");
    return s;
  }
  function createWebGL() {
    gl = canvas.getContext("webgl", { alpha: true, antialias: true, powerPreference: "low-power" });
    if (!gl) throw new Error("WebGL unavailable");
    const vs = "attribute vec3 aPosition; attribute vec4 aColor; attribute float aSize; uniform float uYaw; uniform float uPitch; uniform float uAspect; uniform float uTime; uniform float uPulse; varying vec4 vColor; varying float vPoint; void main(){ vec3 p=aPosition; float cy=cos(uYaw); float sy=sin(uYaw); float cp=cos(uPitch); float sp=sin(uPitch); float x=p.x*cy-p.z*sy; float z=p.x*sy+p.z*cy; float y=p.y*cp-z*sp; z=p.y*sp+z*cp; float depth=max(2.1,6.7+z); float perspective=4.2/depth; vec2 pos=vec2(x*perspective/uAspect,y*perspective); gl_Position=vec4(pos,clamp(z/12.0,-.7,.7),1.0); gl_PointSize=aSize*(1.0+uPulse*.08)*perspective*1.7; vColor=aColor; vPoint=step(1.5,aSize); }";
    const fs = "precision mediump float; varying vec4 vColor; varying float vPoint; void main(){ if(vPoint>.5){ float d=length(gl_PointCoord-vec2(.5)); float halo=1.0-smoothstep(.16,.5,d); float core=1.0-smoothstep(.0,.17,d); gl_FragColor=vec4(vColor.rgb,vColor.a*(halo*.34+core*.8)); } else { gl_FragColor=vColor; } }";
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Program link error");
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
  }
  const vertices = [];
  const points = [];
  function vertex(x,y,z,c,a,size) { vertices.push(x,y,z,c[0],c[1],c[2],a,size); }
  function pointVertex(x,y,z,c,a,size) { points.push(x,y,z,c[0],c[1],c[2],a,size); }
  function line(a,b,c,alpha) { vertex(a[0],a[1],a[2],c,alpha,1); vertex(b[0],b[1],b[2],c,alpha,1); }
  function cube(cx,cy,cz,w,h,d,c,alpha) {
    const x=w/2,y=h/2,z=d/2;
    const v=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]].map(p=>[p[0]+cx,p[1]+cy,p[2]+cz]);
    const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    edges.forEach(e=>line(v[e[0]],v[e[1]],c,alpha));
    return v;
  }
  function buildScene() {
    vertices.length=0;
    points.length=0;
    const grid=[.14,.47,.35];
    for(let i=-5;i<=5;i++){ line([i*.58,-1.28,-2.2],[i*.58,-1.28,2.2],grid,.27); line([-2.9,-1.28,i*.44],[2.9,-1.28,i*.44],grid,.24); }
    const base=[.12,.39,.3];
    line([-2.7,-1.27,0],[2.7,-1.27,0],base,.46);
    positions.forEach((p,i)=>{
      const c=colors[i];
      const lift=[.42,.52,.63,.48,.56,.43][i];
      const size=[.64,.55,.65,.55,.63,.55][i];
      line([p[0],-1.24,p[2]],[p[0],p[1]-.2,p[2]],c,.38);
      cube(p[0],p[1],p[2],size,lift,size*.72,c,currentProject===Object.keys(projects)[i] ? .8 : .36);
      const topY=p[1]+lift/2;
      const corner=size/2;
      line([p[0]-corner,topY,p[2]-corner],[p[0]+corner,topY,p[2]+corner],[.42,.95,.72],.2);
      for(let k=0;k<4;k++) pointVertex(p[0]+(k%2?corner:-corner),topY,p[2]+(k>1?corner:-corner),c,.8,7);
    });
    const anchors=positions.map(p=>[p[0],p[1],p[2]]);
    for(let i=0;i<anchors.length-1;i++){
      const a=anchors[i],b=anchors[i+1];
      const mid=[(a[0]+b[0])/2,-.45,(a[2]+b[2])/2];
      line(a,mid,[.1,.55,.39],.32);line(mid,b,[.1,.55,.39],.32);
    }
    for(let i=0;i<56;i++){
      const x=((i*37)%113)/113*5.8-2.9;
      const z=((i*71)%109)/109*4-2;
      const y=-1.17+((i%5)*.09);
      pointVertex(x,y,z,i%3===0?[.32,.87,1]:[.27,.95,.56],.25+(i%4)*.09,i%7===0?4:2);
    }
    lineVertexCount=vertices.length/8;
    pointVertexCount=points.length/8;
    vertices.push(...points);
    vertexCount=vertices.length/8;
  }
  function render(t) {
    if(!gl) return;
    const rect=canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,1.7);
    const w=Math.max(1,Math.floor(rect.width*dpr));
    const h=Math.max(1,Math.floor(rect.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
    yaw += (targetYaw-yaw)*.055;
    pitch += (targetPitch-pitch)*.055;
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    const time=(reducedMotion?0:t*.001);
    const pulse=Math.sin(time*1.4)*.5+.5;
    const moving=vertices.slice();
    for(let i=0;i<vertexCount;i++){
      const offset=i*8;
      if(i>=lineVertexCount && moving[offset+7]>2.5){
        const phase=time*1.4+i*.9;
        moving[offset+1]+=(Math.sin(phase)*.035);
        moving[offset+3]*=.72+Math.sin(phase)*.16;
      }
    }
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(moving),gl.DYNAMIC_DRAW);
    const stride=8*4;
    const pos=gl.getAttribLocation(program,"aPosition");
    const col=gl.getAttribLocation(program,"aColor");
    const size=gl.getAttribLocation(program,"aSize");
    gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos,3,gl.FLOAT,false,stride,0);
    gl.enableVertexAttribArray(col); gl.vertexAttribPointer(col,4,gl.FLOAT,false,stride,3*4);
    gl.enableVertexAttribArray(size); gl.vertexAttribPointer(size,1,gl.FLOAT,false,stride,7*4);
    gl.uniform1f(gl.getUniformLocation(program,"uYaw"),yaw);
    gl.uniform1f(gl.getUniformLocation(program,"uPitch"),pitch);
    gl.uniform1f(gl.getUniformLocation(program,"uAspect"),w/h);
    gl.uniform1f(gl.getUniformLocation(program,"uTime"),time);
    gl.uniform1f(gl.getUniformLocation(program,"uPulse"),pulse);
    gl.drawArrays(gl.LINES,0,lineVertexCount);
    gl.drawArrays(gl.POINTS,lineVertexCount,pointVertexCount);
    if(!reducedMotion) animationFrame=window.requestAnimationFrame(render);
  }
  function initScene() {
    try {
      createWebGL();
      buildScene();
      animationFrame=window.requestAnimationFrame(render);
      if(reducedMotion){ window.cancelAnimationFrame(animationFrame); render(0); }
    } catch (error) {
      console.warn("Interactive scene unavailable; showing the static map.", error); fallback.hidden=false; staticMap.hidden=false; canvas.hidden=true; document.querySelector(".scene-hint").hidden=true; document.getElementById("scene-status-label").textContent="STATIC MAP"; sceneShell.classList.add("is-static");

    }
  }
  function selectProject(id, focusButton) {
    const project=projects[id];
    if(!project) return;
    currentProject=id;
    buttons.forEach(button=>{
      const active=button.dataset.project===id;
      button.classList.toggle("is-active",active);
      button.setAttribute("aria-pressed",String(active));
      if(active&&focusButton) button.focus();
    });
    document.getElementById("project-number").textContent=project.number;
    document.getElementById("project-kind").textContent=project.kind;
    document.getElementById("project-title").textContent=project.title;
    document.getElementById("project-description").textContent=project.description;
    document.getElementById("project-tech").textContent=project.tech;
    const flow=document.getElementById("project-flow");
    flow.replaceChildren();
    project.flow.forEach((item,index)=>{
      const node=document.createElement("span");node.textContent=item;flow.appendChild(node);
      if(index<project.flow.length-1){const arrow=document.createElement("i");arrow.textContent="→";arrow.setAttribute("aria-hidden","true");flow.appendChild(arrow);}
    });
    const link=document.getElementById("project-link");
    if(project.link){link.href=project.link;link.hidden=false;}
    else {link.removeAttribute("href");link.hidden=true;}
    buildScene();
  }
  buttons.forEach(button=>button.addEventListener("click",()=>selectProject(button.dataset.project,false)));
  canvas.addEventListener("pointerdown",event=>{dragging=true;pointerMoved=false;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener("pointermove",event=>{
    if(!dragging)return;
    const dx=event.clientX-lastX;const dy=event.clientY-lastY;
    if(Math.abs(dx)+Math.abs(dy)>2)pointerMoved=true;
    targetYaw+=dx*.008;targetPitch=Math.max(-.95,Math.min(.45,targetPitch+dy*.006));
    lastX=event.clientX;lastY=event.clientY;
  });
  const endDrag=()=>{dragging=false;};
  canvas.addEventListener("pointerup",endDrag);canvas.addEventListener("pointercancel",endDrag);
  canvas.addEventListener("click",event=>{
    if(pointerMoved)return;
    const rect=canvas.getBoundingClientRect();
    const x=(event.clientX-rect.left)/rect.width;
    const order=["minishell","irc","cub3d","netpractice","philosophers","inception"];
    const selected=order[Math.max(0,Math.min(order.length-1,Math.floor(x*order.length)))];
    selectProject(selected,false);
    const button=document.querySelector('[data-project="'+selected+'"]');
    if(button)button.scrollIntoView({behavior:reducedMotion?"auto":"smooth",block:"nearest"});
  });
  document.querySelectorAll("[data-command]").forEach(button=>button.addEventListener("click",()=>runCommand(button.dataset.command)));
  const form=document.getElementById("terminal-form");
  const input=document.getElementById("terminal-input");
  const output=document.getElementById("terminal-output");
  function appendLine(className,text) {
    const p=document.createElement("p");p.className=className;p.textContent=text;output.appendChild(p);
    output.scrollTop=output.scrollHeight;
  }
  function runCommand(raw) {
    const command=String(raw||"").trim().toLowerCase();
    if(!command)return;
    appendLine("command-line","amine@atlas:~/systems $ "+command);
    if(command==="help"){
      appendLine("response","Commands: help · list · trace <project> · clear");
      appendLine("response","Projects: inception, minishell, irc, cub3d, netpractice, philosophers");
    }else if(command==="list"){
      appendLine("response","inception  minishell  irc  cub3d  netpractice  philosophers");
    }else if(command==="clear"){
      output.replaceChildren();
    }else if(command.startsWith("trace ")){
      const term=command.slice(6).replaceAll("_","").replaceAll("-","");
      const key=term==="ftirc" ? "irc" : Object.keys(projects).find(k=>k.replaceAll("_","").replaceAll("-","")===term||projects[k].title.toLowerCase().replaceAll("_","").replaceAll("-","")===term);
      if(key){selectProject(key,false);appendLine("response","Selected "+projects[key].title+". Read the system card above for its flow.");}
      else appendLine("response","No match. Try: trace inception, trace minishell, or trace cub3d.");
    }else{
      appendLine("response","Command not found. Type help to see available commands.");
    }
  }
  form.addEventListener("submit",event=>{event.preventDefault();runCommand(input.value);input.value="";});
  input.addEventListener("keydown",event=>{
    if(event.key==="ArrowUp"){event.preventDefault();input.value="help";input.select();}
  });
  if("IntersectionObserver" in window){
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){
        initScene();observer.disconnect();
      }
    },{rootMargin:"140px"});
    observer.observe(canvas);
  }else initScene();
  window.addEventListener("pagehide",()=>window.cancelAnimationFrame(animationFrame),{once:true});
})();
