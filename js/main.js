// Contact form: messages are sent directly to Radh Shahmat's inbox via FormSubmit.
// FormSubmit will ask you to confirm the email address once before the first live submission.
const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

// split headings into animated characters (words stay unbroken)
$$('[data-split]').forEach(el => {
  let i = 0;
  el.setAttribute('aria-label', el.textContent);
  el.innerHTML = el.textContent.split(' ').map(w => `<span class="w" aria-hidden="true">${[...w].map(ch => `<span class="ch" style="--i:${i++}">${ch}</span>`).join('')}</span>`).join(' ');
});

// Ra.One-style intro: cubes fly in and fill up the name
function intro(done) {
  const box = $('#intro'), cv = $('#cubes'), x = cv.getContext('2d');
  let fin = false;
  const end = () => { if (fin) return; fin = true; box.classList.add('hide'); setTimeout(() => box.remove(), 900); done(); };
  if (RM) { box.remove(); return done(); }
  box.onclick = end;
  setTimeout(end, 9000);
  (document.fonts ? document.fonts.load('800 100px Unbounded') : Promise.resolve()).catch(() => {}).then(() => {
    if (fin) return;
    const d = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
    cv.width = W * d; cv.height = H * d; x.scale(d, d);
    const m = W < 700, lines = m ? ['RADH', 'SHAHMAT'] : ['RADH SHAHMAT'], fs = m ? W * .14 : W * .085, s = m ? 6 : 10;
    const o = document.createElement('canvas'); o.width = W; o.height = H;
    const g = o.getContext('2d');
    g.fillStyle = '#fff'; g.font = `800 ${fs}px Unbounded, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((t, i) => g.fillText(t, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fs * 1.25));
    const D = g.getImageData(0, 0, W, H).data, C = [];
    for (let yy = 0; yy < H; yy += s) for (let xx = 0; xx < W; xx += s) {
      if (D[(((yy + s / 2) | 0) * W + ((xx + s / 2) | 0)) * 4 + 3] > 120)
        C.push({ x: xx, y: yy, sx: Math.random() * W, sy: Math.random() * H * 1.4 - H * .2, d: Math.random() * 1.7 + xx / W * .9, u: .7 + Math.random() * .5 });
    }
    const T = Math.max(...C.map(c => c.d + c.u)), t0 = performance.now();
    (function f(n) {
      if (fin) return;
      const t = (n - t0) / 1000; let k = 0;
      x.clearRect(0, 0, W, H);
      for (const c of C) {
        const p = Math.min(Math.max((t - c.d) / c.u, 0), 1);
        if (p <= 0) continue;
        if (p >= 1) k++;
        const e = 1 - Math.pow(1 - p, 3), px = c.sx + (c.x - c.sx) * e, py = c.sy + (c.y - c.sy) * e, q = (s - 1) * (.3 + .7 * e);
        x.globalAlpha = Math.min(1, p * 2);
        x.fillStyle = '#3ee6ff'; x.fillRect(px, py, q, q);
        x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(px, py, q, Math.max(1, q * .22));
        x.fillStyle = 'rgba(20,40,120,.45)'; x.fillRect(px, py + q * .78, q, q * .22);
      }
      x.globalAlpha = 1;
      $('#pct').textContent = Math.round(k / C.length * 100);
      if (t < T + .2) requestAnimationFrame(f);
      else { $('#pct').textContent = 100; box.classList.add('done'); setTimeout(end, 1100); }
    })(t0);
  });
}

// floating cubes in the background
function bg() {
  const c = $('#bg'), x = c.getContext('2d'); let W, H, P;
  const rs = () => {
    W = c.width = innerWidth; H = c.height = innerHeight;
    P = Array.from({ length: Math.round(W / 45) }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 8 + Math.random() * 26, v: .1 + Math.random() * .35, r: Math.random() * 6, a: .04 + Math.random() * .08 }));
  };
  rs(); addEventListener('resize', rs);
  (function f() {
    x.clearRect(0, 0, W, H);
    for (const p of P) {
      p.y -= p.v; p.r += .004; if (p.y < -40) p.y = H + 40;
      x.save(); x.translate(p.x, p.y); x.rotate(p.r);
      x.fillStyle = `rgba(139,107,255,${p.a})`; x.strokeStyle = `rgba(62,230,255,${p.a * 2})`;
      x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); x.strokeRect(-p.s / 2, -p.s / 2, p.s, p.s); x.restore();
    }
    requestAnimationFrame(f);
  })();
}

function count(el) {
  const n = +el.dataset.n, t0 = performance.now();
  (function f(now) { const p = Math.min((now - t0) / 1200, 1); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
}

function typed() {
  const el = $('#role'), R = ['Full-Stack Developer', 'NLP Researcher', 'UI Craftsman'];
  let i = 0, j = 0, del = false;
  (function f() {
    const w = R[i]; el.textContent = w.slice(0, j);
    if (!del && j === w.length) { del = true; return setTimeout(f, 1400); }
    if (del && j === 0) { del = false; i = (i + 1) % R.length; }
    j += del ? -1 : 1; setTimeout(f, del ? 35 : 70);
  })();
}

function init() {
  document.body.classList.add('ready');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    if (e.target.dataset.n) count(e.target);
  }), { threshold: .15 });
  $$('.rv,[data-split],[data-n]').forEach(e => io.observe(e));

  const so = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) $$('#menu a').forEach(a => a.classList.toggle('on', a.hash === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50%' });
  $$('section[id]').forEach(s => so.observe(s));

  typed();
  if (!RM) bg();
}

// scroll progress
addEventListener('scroll', () => {
  $('#bar').style.transform = `scaleX(${scrollY / (document.documentElement.scrollHeight - innerHeight || 1)})`;
}, { passive: true });

// cursor glow, card tilt, magnetic buttons
let gx = 0, gy = 0, tx = 0, ty = 0;
if (!RM) {
  addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  (function f() { gx += (tx - gx) * .12; gy += (ty - gy) * .12; $('#glow').style.transform = `translate(${gx}px,${gy}px)`; requestAnimationFrame(f); })();
  document.addEventListener('mousemove', e => {
    const c = e.target.closest && e.target.closest('.tilt');
    if (c) {
      const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.style.setProperty('--ry', ((px - .5) * 8).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((.5 - py) * 8).toFixed(2) + 'deg');
      c.style.setProperty('--mx', px * 100 + '%'); c.style.setProperty('--my', py * 100 + '%');
    }
    const b = e.target.closest && e.target.closest('.mag');
    if (b) { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .2}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; }
  });
  document.addEventListener('mouseout', e => {
    const c = e.target.closest && e.target.closest('.tilt'), b = e.target.closest && e.target.closest('.mag');
    if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); c.style.setProperty('--mx', '50%'); c.style.setProperty('--my', '0%'); }
    if (b && !b.contains(e.relatedTarget)) b.style.transform = '';
  });
}

// mobile menu
$('#burger').onclick = () => $('#nav').classList.toggle('open');
$$('#menu a').forEach(a => a.addEventListener('click', () => $('#nav').classList.remove('open')));

// Contact form uses a standard FormSubmit POST so it works on static hosting
// (GitHub Pages / Vercel / Render) without browser-side fetch/CORS issues.

// ===== Projects / Research / Skills: design from the first build =====
const PJ=[
{n:'AcademiaConnect',img:'assets/academiaconnect.jpg',a:'#8b6bff',tag:'Where campus life connects.',d:'A university platform for courses with video lectures and notes, clubs, events, notices, real-time student messaging, profiles and an admin panel.',st:['React','Node.js','MongoDB','Socket.io'],live:'https://academia-client.vercel.app/',cl:'https://github.com/radhshahmat91/academia-client',sv:'https://github.com/radhshahmat91/academia-server'},
{n:'Vroomly',img:'assets/vroomly.jpg',a:'#ff6fa5',tag:'Find it. Book it. Drive it.',d:'Peer-to-peer car rental marketplace for renters, hosts and admins, with search filters, availability calendar, Stripe payments, reviews, live notifications and earnings charts.',st:['Next.js','TypeScript','Express','MongoDB','Stripe','BetterAuth'],live:'https://vroomly-client.vercel.app',cl:'https://github.com/radhshahmat91/vroomly-client',sv:'https://github.com/radhshahmat91/vroomly-server'},
{n:'Elan',img:'assets/elan.jpg',a:'#ff8a5b',tag:'Dining, beautifully digital.',d:'A restaurant platform pairing an elegant customer experience with the tools a kitchen needs: menu, ordering and management in one system.',st:['React','Node.js','Express','MongoDB','Vercel','Render'],live:'https://elan-client.vercel.app',cl:'https://github.com/radhshahmat91/elan-client',sv:'https://github.com/radhshahmat91/elan-server'},
{n:'BookNook',img:'assets/booknook.jpg',a:'#3ee6ff',tag:'A cozy corner for every reader.',d:'A book discovery and library-style platform to explore titles, organise reads and enjoy a warm, distraction-free browsing experience.',st:['React','Node.js','Express','MongoDB','Vercel'],live:'https://booknook-client-murex.vercel.app',cl:'https://github.com/radhshahmat91/booknook-client',sv:'https://github.com/radhshahmat91/booknook-server'}];
const CAT=[['Frontend',['HTML5','CSS3','Tailwind','JavaScript ES6+','TypeScript','React']],['Backend & Data',['Node.js','Express.js','MongoDB','Mongoose','SQL','REST APIs']],['Modern Web',['Next.js','Git','GitHub','Render','Vercel','Deployment workflows']],['NLP & ML',['Python','Scikit-learn','Transformers','Sentiment analysis','Text classification']],['AI & Productivity',['Prompt Engineering','AI Tools','Code Optimization','Debugging','Productivity','AI Workflows']]];
const CORE=['Natural Language Processing (NLP)','Machine Learning','Python','Sentiment Analysis','Text Classification','Toxicity Detection','Bangla/Banglish Text Processing','Data Preprocessing','Data Annotation','Scikit-learn','Transformers'];
const ALL=CAT.flatMap(c=>c[1]);
$('#pjs').innerHTML=PJ.map((p,i)=>`<article class="pj rv" style="--a:${p.a}"><div class="th" data-i="${i}"><img src="${p.img}" alt="${p.n} project theme" loading="lazy"><div class="play"><i><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></i>Watch the reel</div></div><div><div class="no">0${i+1}</div><h3>${p.n}</h3><p>${p.d}</p><div class="tags">${p.st.map(s=>`<span>${s}</span>`).join('')}</div><div class="lk"><a class="btn sm pri mag" href="${p.live}" target="_blank" rel="noopener">Live Site ↗</a><a class="btn sm mag" href="${p.cl}" target="_blank" rel="noopener">Client ↗</a><a class="btn sm mag" href="${p.sv}" target="_blank" rel="noopener">Server ↗</a></div></div></article>`).join('');
$('#ck').innerHTML=CORE.map(s=>`<span>${s}</span>`).join('');
$('#skg').innerHTML=CAT.map(([t,l],i)=>`<div class="rv" style="--d:${i}"><div class="sc2 glass"><h3>${t}</h3><div class="tags" style="--a:${['#8b6bff','#3ee6ff','#ff6fa5','#3dff9a','#ffb86b'][i]}">${l.map((s,k)=>`<span style="--k:${k}">${s}</span>`).join('')}</div></div></div>`).join('');
const row=a=>{const h=a.map(s=>`<span>${s}</span>`).join('');return h+h};
$('#m1 div').innerHTML=row(ALL);$('#m2 div').innerHTML=row([...ALL.slice(12),...ALL.slice(0,12)].reverse());
$$('.th').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
 el.style.transform=`perspective(900px) rotateY(${(x-.5)*9}deg) rotateX(${(.5-y)*7}deg) scale(1.02)`;el.style.setProperty('--mx',x*100+'%');el.style.setProperty('--my',y*100+'%')});
 el.addEventListener('pointerleave',()=>el.style.transform='')});
$$('.sc2').forEach(el=>el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.setProperty('--mx',e.clientX-r.left+'px');el.style.setProperty('--my',e.clientY-r.top+'px')}));
// 3D skill sphere
const cl=$('#cloud'),ws=ALL.map(t=>{const s=document.createElement('span');s.textContent=t;cl.append(s);return s}),N=ws.length;
const pts=ws.map((_,i)=>{const p=Math.acos(1-2*(i+.5)/N),t=Math.PI*(1+5**.5)*(i+.5);return[Math.sin(p)*Math.cos(t),Math.cos(p),Math.sin(p)*Math.sin(t)]});
let ax=.0025,ay=.0035,vis=true;new IntersectionObserver(e=>vis=e[0].isIntersecting).observe(cl);
cl.addEventListener('pointermove',e=>{const r=cl.getBoundingClientRect();ay=((e.clientX-r.left)/r.width-.5)*.014;ax=-((e.clientY-r.top)/r.height-.5)*.014});
cl.addEventListener('pointerleave',()=>{ax=.0025;ay=.0035});
(function sph(){if(vis&&!RM){const R=cl.clientWidth/2.35,ca=Math.cos(ay),sa=Math.sin(ay),cb=Math.cos(ax),sb=Math.sin(ax);
 pts.forEach((p,i)=>{const x1=p[0]*ca+p[2]*sa,z1=-p[0]*sa+p[2]*ca,y1=p[1]*cb-z1*sb,z2=p[1]*sb+z1*cb,n=Math.hypot(x1,y1,z2);
  p[0]=x1/n;p[1]=y1/n;p[2]=z2/n;const sc=(p[2]+2.2)/3.2;
  ws[i].style.transform=`translate(-50%,-50%) translate(${p[0]*R}px,${p[1]*R}px) scale(${sc})`;ws[i].style.opacity=.3+.7*(p[2]+1)/2;ws[i].style.zIndex=Math.round(p[2]*10)+10})}
 requestAnimationFrame(sph)})();
// project reels
let rt;const DUR=[3200,5200,3800,3400];
function reel(i){const p=PJ[i],st=$('#stage');st.style.setProperty('--a',p.a);
 st.innerHTML=`<div class="bgi" style="background-image:url(${p.img})"></div><div class="shade"></div><div class="sc"></div><div class="bars">${DUR.map(()=>'<i><b></b></i>').join('')}</div><button class="x" aria-label="Close">✕</button>`;
 const S=[{k:'Project 0'+(i+1),h:p.n,p:p.tag},{k:'The idea',p:p.d},{k:'Built with',t:p.st},{k:'See it live',h:'Try it now',p:p.live.replace('https://',''),u:p.live}];
 (function sc(n){clearTimeout(rt);n%=S.length;const s=S[n];
  $$('.bars i').forEach((b,j)=>{b.className=j<n?'d':j==n?'a':'';b.style.setProperty('--t',DUR[n]+'ms')});
  $('.sc').innerHTML=`<small>${s.k}</small>`+(s.h?`<h4>${s.h}</h4>`:'')+(s.p?`<p>${s.p}</p>`:'')+(s.t?`<div class="tags">${s.t.map((t,j)=>`<span style="animation-delay:${j*.2}s">${t}</span>`).join('')}</div>`:'')+(s.u?`<a class="btn pri" style="align-self:flex-start;margin-top:22px" href="${s.u}" target="_blank" rel="noopener">Open live site ↗</a>`:'');
  rt=setTimeout(()=>sc(n+1),DUR[n])})(0);
 $('#reel').classList.add('on');document.body.style.overflow='hidden'}
function shut(){clearTimeout(rt);$('#reel').classList.remove('on');document.body.style.overflow=''}
$('#pjs').addEventListener('click',e=>{const t=e.target.closest('.th');if(t)reel(+t.dataset.i)});
$('#reel').addEventListener('click',e=>{if(e.target.id=='reel'||e.target.closest('.x'))shut()});
addEventListener('keydown',e=>e.key=='Escape'&&shut());


intro(init);
