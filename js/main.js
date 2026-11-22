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
const CAT=[['Frontend',['HTML5','CSS3','Tailwind','JavaScript ES6+','TypeScript','React']],['Backend & Data',['Node.js','Express.js','MongoDB','Mongoose','SQL','REST APIs']],['Modern Web',['Next.js','Git','GitHub','Render','Vercel','Deployment workflows']],['NLP & ML',['Python','Scikit-learn','Transformers','Sentiment analysis','Text classification']],['AI & Productivity',['Prompt Engineering','AI Tools','Code Optimization','Debugging','Productivity','AI Workflows']]];
const CORE=['Natural Language Processing (NLP)','Machine Learning','Python','Sentiment Analysis','Text Classification','Toxicity Detection','Bangla/Banglish Text Processing','Data Preprocessing','Data Annotation','Scikit-learn','Transformers'];
const ALL=CAT.flatMap(c=>c[1]);
$('#ck').innerHTML=CORE.map(s=>`<span>${s}</span>`).join('');
$('#skg').innerHTML=CAT.map(([t,l],i)=>`<div class="rv" style="--d:${i}"><div class="sc2 glass"><h3>${t}</h3><div class="tags" style="--a:${['#8b6bff','#3ee6ff','#ff6fa5','#3dff9a','#ffb86b'][i]}">${l.map((s,k)=>`<span style="--k:${k}">${s}</span>`).join('')}</div></div></div>`).join('');
const row=a=>{const h=a.map(s=>`<span>${s}</span>`).join('');return h+h};
$('#m1 div').innerHTML=row(ALL);$('#m2 div').innerHTML=row([...ALL.slice(12),...ALL.slice(0,12)].reverse());
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


// hand-off from the cube-name intro (assets/js/intro.js): reveal the page as soon as the intro marks it ready
(function () {
  let started = false;
  const go = () => { if (started) return; started = true; init(); };
  if (!document.documentElement.classList.contains('has-intro') || window.__introDone || document.body.classList.contains('is-ready')) return go();
  new MutationObserver((m, o) => { if (document.body.classList.contains('is-ready')) { o.disconnect(); go(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('intro:done', go);
  setTimeout(go, 12000);
})();

