/* ==========================================================================
   projects.js — poster tiles, hover preview, tilt, and the film player modal
   ========================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---- headings split into masked characters (as in the original main.js) ---- */
  $$('[data-np-split="chars"]').forEach(function (el) {
    var idx = 0;
    $$('.np-ln__in', el).forEach(function (inner) {
      var text = inner.textContent; inner.textContent = '';
      text.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { inner.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span'); w.className = 'np-w';
        Array.from(part).forEach(function (c) { var s = document.createElement('span'); s.className = 'np-ch'; s.textContent = c; s.style.setProperty('--i', idx++); w.appendChild(s); });
        inner.appendChild(w);
      });
    });
  });

  /* ---- play-when-seen reveals ---- */
  $$('[data-np-reveal]').forEach(function (el) { el.style.setProperty('--rd', Math.min(Array.prototype.indexOf.call(el.parentNode.children, el), 6) * 90 + 'ms'); });
  $$('.np-chips').forEach(function (list) { $$('li', list).forEach(function (li, i) { li.style.setProperty('--i', i); }); });
  var targets = $$('[data-np-reveal], [data-np-split], [data-np-scene]');
  if (!('IntersectionObserver' in window)) targets.forEach(function (t) { t.classList.add('is-in'); });
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }); }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---- scroll-linked scene state (parallax of the big number and the poster) ---- */
  var vh = window.innerHeight, scenes = $$('[data-np-scene]'), ticking = false;
  function updateScenes() {
    ticking = false; if (reduce) return;
    scenes.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.bottom > -240 && r.top < vh + 240) s.style.setProperty('--p', clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1).toFixed(3)); });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(updateScenes); } }, { passive: true });
  window.addEventListener('resize', function () { vh = window.innerHeight; updateScenes(); });
  updateScenes();

  /* ---- pointer parallax for the poster and its floating tags (as in the original main.js) ---- */
  function tilt(area, host, range) {
    if (!fine || reduce) return;
    var items = $$('[data-np-depth]', host).map(function (el) { return { el: el, d: parseFloat(el.getAttribute('data-np-depth')) || 0 }; });
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    function loop() {
      cx = lerp(cx, tx, 0.1); cy = lerp(cy, ty, 0.1);
      host.style.setProperty('--px', cx.toFixed(3)); host.style.setProperty('--py', cy.toFixed(3));
      for (var i = 0; i < items.length; i++) items[i].el.style.translate = (cx * items[i].d * 0.6).toFixed(1) + 'px ' + (cy * items[i].d * 0.6).toFixed(1) + 'px';
      raf = (Math.abs(cx - tx) > 0.002 || Math.abs(cy - ty) > 0.002) ? requestAnimationFrame(loop) : 0;
    }
    area.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = range.getBoundingClientRect();
      tx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1); ty = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
      if (!raf) raf = requestAnimationFrame(loop);
    });
    area.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
  }

  var FILMS = {
    academiaconnect: {
      title: 'AcademiaConnect', cat: 'University platform', audio: true,
      src: 'assets/video/academiaconnect.mp4', poster: 'assets/video/academiaconnect.jpg',
      live: 'https://academia-client.vercel.app/',
      client: 'https://github.com/radhshahmat91/academia-client', server: 'https://github.com/radhshahmat91/academia-server'
    },
    vroomly: {
      title: 'Vroomly', cat: 'Car-rental marketplace', audio: true,
      src: 'assets/video/vroomly.mp4', poster: 'assets/video/vroomly.jpg',
      live: 'https://vroomly-client.vercel.app',
      client: 'https://github.com/radhshahmat91/vroomly-client', server: 'https://github.com/radhshahmat91/vroomly-server'
    },
    elan: {
      title: 'Élan', cat: 'Restaurant platform', audio: true,
      src: 'assets/video/elan.mp4', poster: 'assets/video/elan.jpg',
      live: 'https://elan-client.vercel.app',
      client: 'https://github.com/radhshahmat91/elan-client', server: 'https://github.com/radhshahmat91/elan-server'
    },
    booknook: {
      title: 'BookNook', cat: 'Online library', audio: true,
      src: 'assets/video/booknook.mp4', poster: 'assets/video/booknook.jpg',
      live: 'https://booknook-client-murex.vercel.app',
      client: 'https://github.com/radhshahmat91/booknook-client', server: 'https://github.com/radhshahmat91/booknook-server'
    }
  };
  var ORDER = ['academiaconnect', 'vroomly', 'elan', 'booknook'];

  /* ---- posters: cube-tile dissolve, tilt, hover preview ------------------------------------------ */
  $$('.np-poster').forEach(function (poster) {
    var tiles = $('.np-poster__tiles', poster);
    if (tiles) {
      var cols = 6, rows = 8;
      tiles.style.setProperty('--c', cols); tiles.style.setProperty('--r', rows);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var t = document.createElement('i');
          t.style.setProperty('--td', Math.round((c + r) * 55 + Math.random() * 320));
          tiles.appendChild(t);
        }
      }
    }
    tilt(poster, poster, poster);

    var vid = $('.np-poster__video', poster);
    if (fine && vid) {
      var hovering = false;
      poster.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        hovering = true;
        if (!vid.getAttribute('src') && vid.getAttribute('data-src')) vid.src = vid.getAttribute('data-src');
        var p = vid.play(); if (p && p.catch) p.catch(function () { /* autoplay refused: stay on still */ });
      });
      vid.addEventListener('playing', function () { if (hovering) poster.classList.add('is-preview'); });
      vid.addEventListener('error', function () { poster.classList.remove('is-preview'); });
      poster.addEventListener('pointerleave', function () {
        hovering = false;
        poster.classList.remove('is-preview');
        setTimeout(function () { if (!hovering) vid.pause(); }, 800);
      });
    }
    poster.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poster.click(); }
    });
  });

  /* ---- film modal ---------------------------------------------------------------------------------------- */
  var modal = $('#film'); if (!modal) return;
  var video = $('.np-film__video', modal);
  var seek = $('.np-film__seek', modal);
  var timeEl = $('.np-film__time', modal);
  var closeBtn = $('.np-film__close', modal);
  var current = null, lastFocus = null, raf = 0;

  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function paintTime() {
    var d = video.duration || 0, t = video.currentTime || 0;
    var pct = d ? (t / d) * 100 : 0;
    seek.value = d ? Math.round((t / d) * 1000) : 0;
    seek.style.setProperty('--v', pct.toFixed(2) + '%');
    timeEl.textContent = fmt(t) + ' / ' + fmt(d);
  }
  function tick() { paintTime(); raf = video.paused ? 0 : requestAnimationFrame(tick); }

  function load(key) {
    var f = FILMS[key]; if (!f) return;
    current = key;
    $('.np-film__title', modal).textContent = f.title;
    $('.np-film__cat', modal).textContent = f.cat;
    $('[data-np-link="live"]', modal).href = f.live;
    $('[data-np-link="client"]', modal).href = f.client;
    $('[data-np-link="server"]', modal).href = f.server;
    modal.classList.toggle('has-audio', !!f.audio);
    modal.classList.remove('is-playing', 'is-muted');
    video.muted = false;
    video.poster = f.poster;
    video.src = f.src;
    video.currentTime = 0;
    paintTime();
    var p = video.play(); if (p && p.catch) p.catch(function () { /* waiting for a click */ });
  }

  function open(key, opener) {
    lastFocus = opener || document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('film-open');
    load(key);
    requestAnimationFrame(function () { requestAnimationFrame(function () { modal.classList.add('is-open'); }); });
    setTimeout(function () { closeBtn.focus({ preventScroll: true }); }, 80);
  }
  function close() {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    video.pause();
    document.documentElement.classList.remove('film-open');
    setTimeout(function () {
      if (modal.classList.contains('is-open')) return;
      modal.hidden = true;
      video.removeAttribute('src'); video.load();
    }, 560);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function step(dir) {
    var i = (ORDER.indexOf(current) + dir + ORDER.length) % ORDER.length;
    load(ORDER[i]);
  }
  function toggle() { if (video.paused || video.ended) { if (video.ended) video.currentTime = 0; var p = video.play(); if (p && p.catch) p.catch(function () {}); } else video.pause(); }

  $$('[data-np-film]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); open(el.getAttribute('data-np-film'), el); });
  });
  $$('[data-np-film-close]', modal).forEach(function (el) { el.addEventListener('click', close); });
  $$('[data-np-film-step]', modal).forEach(function (el) { el.addEventListener('click', function () { step(parseInt(el.getAttribute('data-np-film-step'), 10)); }); });
  $('.np-film__big', modal).addEventListener('click', toggle);
  video.addEventListener('click', toggle);

  video.addEventListener('play', function () { modal.classList.add('is-playing'); if (!raf) raf = requestAnimationFrame(tick); });
  video.addEventListener('pause', function () { modal.classList.remove('is-playing'); });
  video.addEventListener('ended', function () { modal.classList.remove('is-playing'); paintTime(); });
  video.addEventListener('loadedmetadata', paintTime);
  video.addEventListener('timeupdate', function () { if (!raf) paintTime(); });
  seek.addEventListener('input', function () {
    if (video.duration) video.currentTime = (seek.value / 1000) * video.duration;
    paintTime();
  });

  modal.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-np-act]') : null; if (!b) return;
    var act = b.getAttribute('data-np-act');
    if (act === 'toggle') toggle();
    else if (act === 'mute') { video.muted = !video.muted; modal.classList.toggle('is-muted', video.muted); }
    else if (act === 'full') {
      var box = $('.np-film__player', modal);
      if (document.fullscreenElement) document.exitFullscreen();
      else if (box.requestFullscreen) box.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    }
  });

  window.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowRight') { video.currentTime = Math.min(video.duration || 0, video.currentTime + 5); paintTime(); }
    else if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 5); paintTime(); }
    else if (e.key === ' ' && document.activeElement && document.activeElement.tagName !== 'BUTTON' && document.activeElement.tagName !== 'A') { e.preventDefault(); toggle(); }
    else if (e.key === 'Tab') {
      var f = $$('button, a[href], input', modal).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();
