/* ==========================================================================
   Cube-name intro
   A procedural WebGL2 recreation of the "swarm of glowing cubes assembling"
   look: thousands of glass/gunmetal cubes lift off a debris field, spiral in
   and lock together to spell RADH SHAHMAT, then burst outward to reveal the
   portfolio.  Everything is generated at runtime (no video file needed).

   URL helpers for testing:  ?intro=0  skip,  ?introT=3.2  freeze at 3.2 s
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var overlay = document.getElementById('intro');
  if (!overlay) return;

  // Intro disabled (?intro=0, reduced motion): remove the overlay and stay out of the way.
  if (!root.classList.contains('has-intro')) {
    window.__introDone = true;
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    return;
  }

  var canvas = overlay.querySelector('.intro__canvas');
  var skipBtn = overlay.querySelector('.intro__skip');
  var pctEl = overlay.querySelector('.intro__pct');
  var tagEl = overlay.querySelector('.intro__tag');
  var params = new URLSearchParams(location.search);
  var frozenT = params.has('introT') ? parseFloat(params.get('introT')) : null;

  /* ---- timeline (seconds) ------------------------------------------------ */
  var T_LAND = 3.9;      // last cube has locked into place
  var T_EXIT = 5.5;      // burst begins (unless skipped earlier)
  var EXIT_LEN = 1.9;    // burst length incl. stagger
  var READY_AT = 0.85;   // seconds into exit when the page content starts to reveal

  var done = false, readyFired = false, raf = 0, gl = null;
  var tExit = T_EXIT;

  function markReady() {
    if (readyFired) return;
    readyFired = true;
    document.body.classList.add('is-ready');
    root.classList.remove('intro-lock');
  }
  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    markReady();
    overlay.classList.add('is-done');
    window.__introDone = true;
    window.dispatchEvent(new Event('intro:done'));
    window.removeEventListener('keydown', onKey);
    setTimeout(function () {
      try {
        var ext = gl && gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch (e) { /* ignore */ }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 1400);
  }

  /* ---- tiny helpers ------------------------------------------------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mul(a, b) {            // column-major 4x4  (a * b)
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++)
      for (var r = 0; r < 4; r++)
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  }
  function persp(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); }
  function trans(x, y, z) { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]); }
  function easeOut(x) { x = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - x, 3); }

  /* ---- GLSL -------------------------------------------------------------- */
  var MOTION = [
    'const float PI = 3.14159265;',
    'uniform float uTime;',
    'uniform float uExit;',
    'uniform vec4 uBounds;',            // minX, maxX, shine, -
    'layout(location=3) in vec3 iStart;',
    'layout(location=4) in vec3 iTarget;',
    'layout(location=5) in vec4 iTiming;',  // delay, duration, size, kind
    'layout(location=6) in vec4 iRand;',
    'layout(location=7) in vec2 iMat;',     // material, exit delay',
    'mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0., 0.,c,s, 0.,-s,c);}',
    'mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s, 0.,1.,0., s,0.,c);}',
    'mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0., -s,c,0., 0.,0.,1.);}',
    'struct M { vec3 pos; mat3 rot; float scale; float heat; float flash; };',
    'M motion(){',
    '  M m;',
    '  float delay=iTiming.x, dur=iTiming.y, size=iTiming.z, kind=iTiming.w;',
    '  float p=clamp((uTime-delay)/dur,0.,1.);',
    '  float e=1.-pow(1.-p,3.2);',
    '  vec3 pos=mix(iStart,iTarget,e);',
    '  float bump=4.*e*(1.-e);',
    '  float dir=iRand.y<0.5?-1.:1.;',
    '  float phi=bump*dir*(1.1+iRand.x*1.5);',
    '  vec3 q=vec3(pos.x,0.,pos.z);',
    '  q=rotY(phi)*q;',
    '  pos.x=q.x; pos.z=q.z;',
    '  pos.y+=sin(PI*e)*(110.+iRand.z*360.);',
    '  vec3 ang=(iRand.xyz-0.5)*2.*(PI*(2.+3.*iRand.w))*(1.-e);',
    '  m.rot=rotZ(ang.z)*rotY(ang.y)*rotX(ang.x);',
    '  m.scale=size*(0.55+0.45*smoothstep(0.,0.25,p));',
    '  float landed=step(1.,p);',
    '  float since=uTime-(delay+dur);',
    '  m.flash=since>0.?exp(-since*4.2):0.;',
    '  m.heat=clamp(smoothstep(0.,0.5,p)*0.55+smoothstep(0.82,1.,p)*0.45,0.,1.);',
    '  pos.z+=landed*(1.-kind)*sin(uTime*1.7+iTarget.x*0.012+iTarget.y*0.02)*size*0.28;',
    '  pos+=landed*kind*vec3(sin(uTime*0.5+iRand.x*6.28),cos(uTime*0.4+iRand.y*6.28),sin(uTime*0.3+iRand.z*6.28))*26.;',
    '  float xn=(iTarget.x-uBounds.x)/(uBounds.y-uBounds.x);',
    '  float band=exp(-pow((xn-uBounds.z)*7.,2.));',
    '  m.flash+=band*(1.-kind)*landed*0.85;',
    '  float qx=clamp((uExit-iMat.y*0.65)/1.15,0.,1.);',
    '  vec3 dv=normalize(vec3((iRand.x-0.5)*2.,(iRand.y-0.3)*1.6,0.45+iRand.z*0.8));',
    '  pos+=dv*(qx*qx)*(900.+iRand.w*800.);',
    '  m.rot=rotY(qx*(iRand.x-0.5)*8.)*rotX(qx*(iRand.y-0.5)*8.)*m.rot;',
    '  m.scale*=1.-smoothstep(0.5,1.,qx);',
    '  m.heat=min(1.,m.heat+qx*0.6);',
    '  m.pos=pos;',
    '  return m;',
    '}'
  ].join('\n');

  var VS_CUBE = [
    '#version 300 es',
    'precision highp float;',
    'layout(location=0) in vec3 aPos;',
    'layout(location=1) in vec3 aNorm;',
    'layout(location=2) in vec2 aUV;',
    'uniform mat4 uVP;',
    MOTION,
    'out vec3 vN; out vec2 vUV; out vec3 vWorld; out float vHeat; out float vFlash; out float vMat;',
    'void main(){',
    '  M m=motion();',
    '  vec3 world=m.pos+m.rot*(aPos*m.scale);',
    '  vN=m.rot*aNorm; vUV=aUV; vWorld=world; vHeat=m.heat; vFlash=m.flash; vMat=iMat.x;',
    '  gl_Position=uVP*vec4(world,1.);',
    '}'
  ].join('\n');

  var FS_CUBE = [
    '#version 300 es',
    'precision highp float;',
    'in vec3 vN; in vec2 vUV; in vec3 vWorld; in float vHeat; in float vFlash; in float vMat;',
    'uniform vec3 uCam;',
    'out vec4 o;',
    'void main(){',
    '  vec3 N=normalize(vN);',
    '  vec3 V=normalize(uCam-vWorld);',
    '  vec3 L1=normalize(vec3(-0.45,0.7,0.8));',
    '  vec3 L2=normalize(vec3(0.8,-0.25,0.45));',
    '  float d1=max(dot(N,L1),0.), d2=max(dot(N,L2),0.);',
    '  float fres=pow(1.-max(dot(N,V),0.),2.4);',
    '  float spec=pow(max(dot(N,normalize(L1+V)),0.),46.);',
    '  float metal=step(0.76,vMat);',
    '  vec3 glass=vec3(0.50,0.025,0.075);',
    '  vec3 steel=vec3(0.075,0.095,0.15);',
    '  vec3 base=mix(glass,steel,metal);',
    '  vec3 col=base*(0.32+0.95*d1+0.40*d2);',
    '  col+=(1.-metal)*vec3(0.80,0.06,0.12)*vHeat*(0.45+0.9*d1);',
    '  col+=vec3(0.85,0.9,1.)*spec*(0.35+0.5*metal);',
    '  col+=vec3(0.55,0.12,0.18)*fres*0.55;',
    '  float e=max(abs(vUV.x),abs(vUV.y));',
    '  float edge=smoothstep(0.80,0.975,e);',
    '  vec3 hot=mix(vec3(1.,0.13,0.2),vec3(1.,0.66,0.56),clamp(vHeat*vHeat*0.55+vFlash,0.,1.));',
    '  col+=hot*edge*(0.7+1.35*vHeat+2.2*vFlash);',
    '  col+=vec3(1.,0.12,0.2)*smoothstep(0.45,0.95,e)*0.16*(0.4+vHeat);',
    '  col+=vec3(1.,0.55,0.5)*vFlash*0.35;',
    '  col=col/(1.+col*0.30);',
    '  o=vec4(col,1.);',
    '}'
  ].join('\n');

  var VS_HALO = [
    '#version 300 es',
    'precision highp float;',
    'uniform mat4 uVP;',
    'uniform float uFocal;',
    'uniform float uMaxPt;',
    MOTION,
    'out float vI;',
    'void main(){',
    '  M m=motion();',
    '  vec4 cp=uVP*vec4(m.pos,1.);',
    '  gl_Position=cp;',
    '  gl_PointSize=clamp(m.scale*uFocal/max(cp.w,1.)*3.4,1.,uMaxPt);',
    '  vI=(0.07+0.5*m.heat+0.9*m.flash)*(1.-0.55*iTiming.w)*smoothstep(0.,0.05,m.scale);',
    '}'
  ].join('\n');

  var FS_HALO = [
    '#version 300 es',
    'precision highp float;',
    'in float vI;',
    'out vec4 o;',
    'void main(){',
    '  vec2 d=gl_PointCoord*2.-1.;',
    '  float a=exp(-dot(d,d)*3.4)*vI;',
    '  o=vec4(vec3(1.,0.14,0.22)*a,a);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  /* ---- geometry: unit cube, 36 vertices --------------------------------- */
  function cubeGeometry() {
    var faces = [
      [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
      [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
      [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]
    ];
    var quad = [[-1, -1], [1, -1], [1, 1], [-1, 1]], idx = [0, 1, 2, 0, 2, 3];
    var pos = [], nor = [], uv = [];
    faces.forEach(function (f) {
      var n = f[0], u = f[1], v = f[2];
      idx.forEach(function (i) {
        var a = quad[i][0], b = quad[i][1];
        pos.push((n[0] + u[0] * a + v[0] * b) * 0.5, (n[1] + u[1] * a + v[1] * b) * 0.5, (n[2] + u[2] * a + v[2] * b) * 0.5);
        nor.push(n[0], n[1], n[2]);
        uv.push(a, b);
      });
    });
    return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv) };
  }

  /* ---- sample the name into a cube lattice ------------------------------ */
  function sampleText(W, H, rng) {
    var portrait = H / W > 1.0;
    var lines = portrait ? ['RADH', 'SHAHMAT'] : ['RADH SHAHMAT'];
    var font = function (px) { return px + 'px Anton, Impact, "Arial Narrow", sans-serif'; };
    var c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.font = font(300);
    var widest = 0;
    lines.forEach(function (l) { widest = Math.max(widest, ctx.measureText(l).width); });
    var maxW = W * (portrait ? 0.86 : 0.74);
    var maxH = H * (portrait ? 0.46 : 0.34);
    var fs = 300 * maxW / widest;
    var pitch = fs * 0.98;
    if (pitch * lines.length > maxH) { fs *= maxH / (pitch * lines.length); pitch = fs * 0.98; }
    fs = Math.floor(fs);
    var pad = Math.ceil(fs * 0.2);
    c.width = Math.ceil(widest * fs / 300) + pad * 2;
    c.height = Math.ceil(pitch * lines.length + fs * 0.4) + pad * 2;
    ctx = c.getContext('2d');
    ctx.font = font(fs);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff';
    lines.forEach(function (l, i) { ctx.fillText(l, c.width / 2, pad + fs * 0.92 + i * pitch); });
    var img = ctx.getImageData(0, 0, c.width, c.height).data;
    // bounding box of ink
    var x0 = c.width, x1 = 0, y0 = c.height, y1 = 0;
    for (var y = 0; y < c.height; y++) for (var x = 0; x < c.width; x++) {
      if (img[(y * c.width + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    var step = Math.max(4, Math.round(fs / (portrait ? 17 : 24)));
    var cols = Math.ceil((x1 - x0) / step) + 1, rows = Math.ceil((y1 - y0) / step) + 1;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var pts = [];
    function a(px, py) { px = Math.round(px); py = Math.round(py); if (px < 0 || py < 0 || px >= c.width || py >= c.height) return 0; return img[(py * c.width + px) * 4 + 3] > 128 ? 1 : 0; }
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var px = cx + (i - (cols - 1) / 2) * step, py = cy + (j - (rows - 1) / 2) * step, q = step * 0.28;
      var hit = a(px, py) + a(px - q, py - q) + a(px + q, py - q) + a(px - q, py + q) + a(px + q, py + q);
      if (hit >= 3) pts.push([px - cx, -(py - cy)]);
    }
    return { pts: pts, step: step, halfH: (y1 - y0) / 2, halfW: (x1 - x0) / 2 };
  }

  function buildInstances(W, H, D) {
    var rng = mulberry32(20261119);
    var t = sampleText(W, H, rng);
    var yOff = H * 0.035;
    var nText = t.pts.length, nDust = Math.min(720, Math.round(nText * 0.34));
    var N = nText + nDust, F = 16, data = new Float32Array(N * F);
    var minX = -t.halfW, maxX = t.halfW;
    var floorY = -H * 0.46;
    function put(i, o) {
      var k = i * F;
      data[k] = o.sx; data[k + 1] = o.sy; data[k + 2] = o.sz;
      data[k + 3] = o.tx; data[k + 4] = o.ty; data[k + 5] = o.tz;
      data[k + 6] = o.delay; data[k + 7] = o.dur; data[k + 8] = o.size; data[k + 9] = o.kind;
      data[k + 10] = rng(); data[k + 11] = rng(); data[k + 12] = rng(); data[k + 13] = rng();
      data[k + 14] = o.mat; data[k + 15] = rng();
    }
    for (var i = 0; i < nText; i++) {
      var p = t.pts[i];
      var xn = (p[0] - minX) / (maxX - minX);
      put(i, {
        sx: (rng() - 0.5) * W * 1.5, sy: floorY + (rng() - 0.5) * 50, sz: -900 + rng() * 1250,
        tx: p[0], ty: p[1] + yOff, tz: 0,
        delay: 0.12 + 1.5 * (0.5 * rng() + 0.5 * xn), dur: 1.35 + rng() * 0.95,
        size: t.step * 0.9, kind: 0, mat: rng() < 0.88 ? rng() * 0.7 : 0.8 + rng() * 0.2
      });
    }
    for (var j = 0; j < nDust; j++) {
      var tx = (rng() - 0.5) * W * 1.15, ty = (rng() - 0.5) * H * 0.8, tz = -520 + rng() * 900;
      if (Math.abs(tx) < t.halfW + 40 && Math.abs(ty - yOff) < t.halfH + 40 && Math.abs(tz) < 260) tz = tz < 0 ? tz - 300 : tz + 300;
      put(nText + j, {
        sx: (rng() - 0.5) * W * 1.6, sy: floorY + (rng() - 0.5) * 60, sz: -900 + rng() * 1300,
        tx: tx, ty: ty, tz: tz,
        delay: 0.05 + rng() * 1.6, dur: 1.6 + rng() * 1.3,
        size: t.step * (0.32 + rng() * 0.55), kind: 1, mat: 0.25 + rng() * 0.75
      });
    }
    return { data: data, count: N, textBottom: t.halfH - yOff, bounds: [minX, maxX], step: t.step };
  }

  /* ---- boot --------------------------------------------------------------- */
  function startGL() {
    gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('no webgl2');

    var progCube = program(VS_CUBE, FS_CUBE);
    var progHalo = program(VS_HALO, FS_HALO);
    var U = function (p, n) { return gl.getUniformLocation(p, n); };
    var uc = { vp: U(progCube, 'uVP'), time: U(progCube, 'uTime'), exit: U(progCube, 'uExit'), bounds: U(progCube, 'uBounds'), cam: U(progCube, 'uCam') };
    var uh = { vp: U(progHalo, 'uVP'), time: U(progHalo, 'uTime'), exit: U(progHalo, 'uExit'), bounds: U(progHalo, 'uBounds'), focal: U(progHalo, 'uFocal'), maxPt: U(progHalo, 'uMaxPt') };
    var maxPt = Math.min(72, gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]);

    var geo = cubeGeometry();
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    function attr(loc, arr, size) {
      var b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }
    attr(0, geo.pos, 3); attr(1, geo.nor, 3); attr(2, geo.uv, 2);
    var instBuf = gl.createBuffer();
    var stride = 16 * 4;
    function inst(loc, size, off) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off);
      gl.vertexAttribDivisor(loc, 1);
    }
    var count = 0, W = 0, H = 0, dpr = 1, fov = 0.62, D = 1400, bounds = [0, 1];
    var mouseX = 0, mouseY = 0, camX = 0, camY = 0;

    function layout() {
      W = overlay.clientWidth || window.innerWidth;
      H = overlay.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 2 : 1.75);
      if (layout.dprCap) dpr = Math.min(dpr, layout.dprCap);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      D = (H / 2) / Math.tan(fov / 2);
      var built = buildInstances(W, H, D);
      count = built.count;
      bounds = built.bounds;
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, built.data, gl.STATIC_DRAW);
      inst(3, 3, 0); inst(4, 3, 12); inst(5, 4, 24); inst(6, 4, 40); inst(7, 2, 56);
      if (tagEl) tagEl.style.top = Math.round(H / 2 + built.textBottom + Math.max(38, built.step * 3.8)) + 'px';
    }

    function render(t) {
      var exitT = Math.max(0, t - tExit);
      // camera: starts angled, settles frontal; subtle mouse parallax
      var settle = easeOut(t / T_LAND);
      camX += (mouseX - camX) * 0.06; camY += (mouseY - camY) * 0.06;
      var yaw = -0.30 * (1 - settle) + camX * 0.07 + Math.sin(t * 0.9) * 0.05 * settle;
      var pitch = 0.12 * (1 - settle) + camY * 0.05 + Math.sin(t * 0.7 + 1.0) * 0.028 * settle;
      var dist = D * (1.14 - 0.14 * settle);
      var proj = persp(fov, W / H, 40, dist + 4000);
      var view = mul(trans(0, 0, -dist), mul(rotX(pitch), rotY(yaw)));
      var vp = mul(proj, view);
      // eye position in world space (for specular) – approximate
      var cam = [Math.sin(yaw) * dist * Math.cos(pitch), -Math.sin(pitch) * dist, Math.cos(yaw) * dist * Math.cos(pitch)];
      var shine = (t - (T_LAND - 0.15)) / 1.15;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.bindVertexArray(vao);

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.useProgram(progCube);
      gl.uniformMatrix4fv(uc.vp, false, vp);
      gl.uniform1f(uc.time, t); gl.uniform1f(uc.exit, exitT);
      gl.uniform4f(uc.bounds, bounds[0], bounds[1], shine, 0);
      gl.uniform3f(uc.cam, cam[0], cam[1], cam[2]);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, count);

      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(progHalo);
      gl.uniformMatrix4fv(uh.vp, false, vp);
      gl.uniform1f(uh.time, t); gl.uniform1f(uh.exit, exitT);
      gl.uniform4f(uh.bounds, bounds[0], bounds[1], shine, 0);
      gl.uniform1f(uh.focal, (canvas.height / 2) / Math.tan(fov / 2));
      gl.uniform1f(uh.maxPt, maxPt);
      gl.drawArraysInstanced(gl.POINTS, 0, 1, count);

      // DOM layer
      if (pctEl) pctEl.textContent = String(Math.min(100, Math.floor(t / T_LAND * 100))).padStart(3, '0');
      if (t > T_LAND - 0.2) overlay.classList.add('is-landed');
      if (t > tExit) overlay.classList.add('is-exiting');
      if (exitT > READY_AT) markReady();
      return exitT;
    }

    function ensureFont(cb) {
      var once = false; function go() { if (!once) { once = true; cb(); } }
      if (document.fonts && document.fonts.load) {
        document.fonts.load('200px Anton', 'RADHSMT').then(go, go);
        setTimeout(go, 1500);
      } else go();
    }

    ensureFont(function () {
      layout();
      var t0 = 0, last = 0, slow = 0, frames = 0;
      function loop(now) {
        if (done) return;
        if (!t0) { t0 = now; last = now; }
        var dt = now - last; last = now; frames++;
        if (frames > 4 && frames < 40 && dt > 42) slow++;
        if (frames === 40 && slow > 12 && dpr > 1) { layout.dprCap = 1; layout(); }
        var t = frozenT !== null ? frozenT : (now - t0) / 1000;
        var exitT = render(t);
        if (frozenT === null && exitT >= EXIT_LEN) { finish(); return; }
        raf = requestAnimationFrame(loop);
      }
      raf = requestAnimationFrame(loop);
      overlay.classList.add('is-running');

      window.addEventListener('resize', function () { if (!done) layout(); });
      window.addEventListener('pointermove', function (e) {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
      // expose for the skip handler
      startGL.now = function () { return (performance.now() - t0) / 1000; };
    });
  }

  function skip() {
    if (done) return;
    var t = startGL.now ? startGL.now() : 0;
    if (t < tExit) tExit = Math.max(t, 0.3);
  }
  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); }
  }

  function fallback() {
    overlay.classList.add('intro--fallback', 'is-running');
    setTimeout(function () { overlay.classList.add('is-exiting'); markReady(); }, 2300);
    setTimeout(finish, 3300);
  }

  if (skipBtn) skipBtn.addEventListener('click', skip);
  window.addEventListener('keydown', onKey);

  try {
    startGL();
  } catch (err) {
    if (window.console) console.warn('Intro fallback:', err && err.message);
    fallback();
  }
})();
