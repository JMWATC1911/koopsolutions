/* ============ Liquid-glass ribbon wave (WebGL, dependency-free) ============ */
(function(){
  var canvas=document.getElementById('wave-canvas');
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl=null;
  try{
    gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'low-power'})
      ||canvas.getContext('experimental-webgl',{alpha:true,antialias:true});
  }catch(e){}
  if(!gl){document.documentElement.classList.add('no-webgl');return;}

  var NOISE=
    'vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}\n'+
    'float snoise(vec2 v){\n'+
    '  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);\n'+
    '  vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);\n'+
    '  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);\n'+
    '  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);\n'+
    '  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));\n'+
    '  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);\n'+
    '  m=m*m;m=m*m;\n'+
    '  vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;\n'+
    '  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);\n'+
    '  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;\n'+
    '  return 130.0*dot(m,g);}\n';

  var VERT=NOISE+
    'attribute vec2 aPos;attribute vec2 aUv;\n'+
    'uniform mat4 uProj,uView;\n'+
    'uniform float uTime,uPhase,uAmp,uYOff,uZOff;\n'+
    'varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;varying float vH;\n'+
    'float surf(vec2 p,float t){\n'+
    '  float h=0.0;\n'+
    '  h+=sin(p.x*0.30+t*0.55+uPhase+p.y*0.22)*0.55;\n'+
    '  h+=sin(p.x*0.16-t*0.38+1.7+uPhase)*0.85;\n'+
    '  h+=sin(p.x*0.52+p.y*0.55+t*0.8+uPhase*2.0)*0.20;\n'+
    '  h+=snoise(vec2(p.x*0.10+t*0.06,p.y*0.28+uPhase))*0.55;\n'+
    '  h+=snoise(vec2(p.x*0.30-t*0.05,p.y*0.55))*0.18;\n'+
    '  return h;}\n'+
    'void main(){\n'+
    '  vUv=aUv;\n'+
    '  float t=uTime;\n'+
    '  float h=surf(aPos,t);\n'+
    '  float e=0.14;\n'+
    '  float hx=surf(aPos+vec2(e,0.0),t);\n'+
    '  float hz=surf(aPos+vec2(0.0,e),t);\n'+
    '  vH=h*uAmp;\n'+
    '  vec3 world=vec3(aPos.x,h*uAmp+uYOff,aPos.y+uZOff);\n'+
    '  vNormal=normalize(vec3(-(hx-h)/e*uAmp,1.0,-(hz-h)/e*uAmp));\n'+
    '  vWorld=world;\n'+
    '  gl_Position=uProj*uView*vec4(world,1.0);}\n';

  var FRAG=
    'precision highp float;\n'+NOISE+
    'uniform float uTime,uOpacity;\n'+
    'uniform vec3 uColorA,uColorB,uCam;\n'+
    'varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;varying float vH;\n'+
    'void main(){\n'+
    '  vec3 N=normalize(vNormal);\n'+
    '  vec3 V=normalize(uCam-vWorld);\n'+
    '  if(dot(N,V)<0.0)N=-N;\n'+
    '  float g=clamp(vUv.x*0.85+vH*0.28+0.08,0.0,1.0);\n'+
    '  vec3 base=mix(uColorA,uColorB,g);\n'+
    '  base*=(0.82+0.30*clamp(vH+0.4,0.0,1.0));\n'+
    '  float fres=pow(1.0-max(dot(N,V),0.0),2.6);\n'+
    '  vec3 L1=normalize(vec3(-0.45,0.85,0.55));\n'+
    '  vec3 L2=normalize(vec3(0.65,0.55,0.45));\n'+
    '  float s1=pow(max(dot(reflect(-L1,N),V),0.0),110.0);\n'+
    '  float s2=pow(max(dot(reflect(-L2,N),V),0.0),60.0);\n'+
    '  float ca=snoise(vec2(vUv.x*9.0+uTime*0.12,vUv.y*4.0-uTime*0.07));\n'+
    '  float caustic=smoothstep(0.55,0.95,ca)*0.10;\n'+
    '  vec3 col=base+fres*vec3(0.62,0.82,0.98)*0.55+s1*0.95+s2*0.45+caustic;\n'+
    '  float edge=smoothstep(0.0,0.16,vUv.y)*(1.0-smoothstep(0.84,1.0,vUv.y));\n'+
    '  float alpha=uOpacity*edge*(0.58+0.42*fres+0.25*(s1+s2));\n'+
    '  alpha=clamp(alpha,0.0,1.0);\n'+
    '  gl_FragColor=vec4(col*alpha,alpha);}\n';

  function compile(type,src){
    var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){throw new Error(gl.getShaderInfoLog(s));}
    return s;
  }
  var prog;
  try{
    prog=gl.createProgram();
    gl.attachShader(prog,compile(gl.VERTEX_SHADER,VERT));
    gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,FRAG));
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){throw new Error(gl.getProgramInfoLog(prog));}
  }catch(e){document.documentElement.classList.add('no-webgl');return;}
  gl.useProgram(prog);

  /* ---- grid geometry: x along ribbon, second coord = depth ---- */
  var COLS=240,ROWS=40,XW=19.0,ZD=2.4;
  var verts=[],uvs=[],idx=[];
  for(var r=0;r<=ROWS;r++){
    for(var c=0;c<=COLS;c++){
      var u=c/COLS,v=r/ROWS;
      verts.push(-XW+u*2.0*XW, -ZD+v*2.0*ZD);
      uvs.push(u,v);
    }
  }
  for(var r2=0;r2<ROWS;r2++){
    for(var c2=0;c2<COLS;c2++){
      var a=r2*(COLS+1)+c2,b=a+1,c3=a+COLS+1,d=c3+1;
      idx.push(a,c3,b, b,c3,d);
    }
  }
  function buf(target,data,Type){
    var b=gl.createBuffer();gl.bindBuffer(target,b);
    gl.bufferData(target,new Type(data),gl.STATIC_DRAW);return b;
  }
  var posBuf=buf(gl.ARRAY_BUFFER,verts,Float32Array);
  var uvBuf=buf(gl.ARRAY_BUFFER,uvs,Float32Array);
  var idxBuf=buf(gl.ELEMENT_ARRAY_BUFFER,idx,Uint16Array);
  var idxType=gl.UNSIGNED_SHORT;

  var aPos=gl.getAttribLocation(prog,'aPos'),aUv=gl.getAttribLocation(prog,'aUv');
  gl.bindBuffer(gl.ARRAY_BUFFER,posBuf);gl.enableVertexAttribArray(aPos);gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,uvBuf);gl.enableVertexAttribArray(aUv);gl.vertexAttribPointer(aUv,2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,idxBuf);

  var U={};
  ['uProj','uView','uTime','uPhase','uAmp','uYOff','uZOff','uOpacity','uColorA','uColorB','uCam']
    .forEach(function(n){U[n]=gl.getUniformLocation(prog,n);});

  /* ---- tiny mat4 helpers (column-major) ---- */
  function perspective(fovy,aspect,near,far){
    var f=1/Math.tan(fovy/2),nf=1/(near-far);
    return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
  }
  function lookAt(eye,center,up){
    var zx=eye[0]-center[0],zy=eye[1]-center[1],zz=eye[2]-center[2];
    var zl=1/Math.hypot(zx,zy,zz);zx*=zl;zy*=zl;zz*=zl;
    var xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx;
    var xl=1/(Math.hypot(xx,xy,xz)||1);xx*=xl;xy*=xl;xz*=xl;
    var yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
    return new Float32Array([
      xx,yx,zx,0, xy,yy,zy,0, xz,yz,zz,0,
      -(xx*eye[0]+xy*eye[1]+xz*eye[2]),
      -(yx*eye[0]+yy*eye[1]+yz*eye[2]),
      -(zx*eye[0]+zy*eye[1]+zz*eye[2]),1]);
  }
  function hex(h){return [parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];}

  var CAM=[0,1.9,11.5];
  var view=lookAt(CAM,[0,-2.7,0],[0,1,0]);
  var proj=perspective(32*Math.PI/180,1,0.1,100);

  var ribbons=[
    {phase:2.6,amp:0.70,opacity:0.26,yOff:-3.65,zOff:-2.6,speed:0.75,colorA:hex('#4593d2'),colorB:hex('#8fdbf7')},
    {phase:0.0,amp:0.80,opacity:0.92,yOff:-4.35,zOff: 0.0,speed:1.00,colorA:hex('#0055a5'),colorB:hex('#00a4e4')}
  ];

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0,0,0,0);

  function resize(){
    var dpr=Math.min(window.devicePixelRatio||1,2);
    var w=Math.floor(window.innerWidth*dpr),h=Math.floor(window.innerHeight*dpr);
    if(canvas.width!==w||canvas.height!==h){
      canvas.width=w;canvas.height=h;
      gl.viewport(0,0,w,h);
      proj=perspective(32*Math.PI/180,w/h,0.1,100);
    }
  }
  window.addEventListener('resize',resize);
  resize();

  var start=performance.now(),playing=true,raf=null;
  function frame(now){
    raf=null;
    resize();
    var t=(now-start)*0.00028;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(U.uProj,false,proj);
    gl.uniformMatrix4fv(U.uView,false,view);
    gl.uniform3f(U.uCam,CAM[0],CAM[1],CAM[2]);
    for(var i=0;i<ribbons.length;i++){
      var rb=ribbons[i];
      gl.uniform1f(U.uTime,t*rb.speed);
      gl.uniform1f(U.uPhase,rb.phase);
      gl.uniform1f(U.uAmp,rb.amp);
      gl.uniform1f(U.uYOff,rb.yOff);
      gl.uniform1f(U.uZOff,rb.zOff);
      gl.uniform1f(U.uOpacity,rb.opacity);
      gl.uniform3f(U.uColorA,rb.colorA[0],rb.colorA[1],rb.colorA[2]);
      gl.uniform3f(U.uColorB,rb.colorB[0],rb.colorB[1],rb.colorB[2]);
      gl.drawElements(gl.TRIANGLES,idx.length,idxType,0);
    }
    if(playing&&!reduced)raf=requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',function(){
    playing=!document.hidden;
    if(playing&&!reduced&&raf===null)raf=requestAnimationFrame(frame);
  });
  raf=requestAnimationFrame(frame);
})();
