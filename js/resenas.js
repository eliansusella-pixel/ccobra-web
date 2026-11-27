/* Reseñas de Cuenca Construcciones: API + carrusel con tipeo + cinta + lista.
   Los datos viven en Supabase; las funciones del servidor validan todo y solo devuelven reseñas aprobadas. */
(function () {
  'use strict';
  var API = 'https://ubktodtzqlskkhlwlcen.supabase.co/rest/v1/rpc/';
  var KEY = 'sb_publishable_JrtpzHvWsZm017ozc0mj6Q_bXLxMIwO';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches && !/[?&]motion=full/.test(location.search);
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function rpc(fn, body) {
    return fetch(API + fn, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.text().then(function (t) {
        var data = null;
        try { data = t ? JSON.parse(t) : null; } catch (e) { data = null; }
        if (!r.ok) { var err = new Error((data && data.message) || ('HTTP ' + r.status)); err.code = data && data.message; throw err; }
        return data;
      });
    });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var STAR = 'M12 2.8l2.83 5.73 6.32.92-4.57 4.46 1.08 6.3L12 17.24l-5.66 2.97 1.08-6.3L2.85 9.45l6.32-.92z';
  function estrellas(n, cls) {
    var w = el('span', 'rs-stars' + (cls ? ' ' + cls : ''));
    w.setAttribute('role', 'img');
    w.setAttribute('aria-label', n + ' de 5 estrellas');
    for (var i = 1; i <= 5; i++) {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 24 24');
      s.setAttribute('aria-hidden', 'true');
      s.setAttribute('class', i <= n ? 'on' : 'off');
      s.style.setProperty('--i', i);
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', STAR);
      s.appendChild(p);
      w.appendChild(s);
    }
    return w;
  }

  function iniciales(nombre) {
    var p = String(nombre || '').trim().split(/\s+/);
    return ((p[0] || '')[0] || '').toUpperCase() + ((p[1] || '')[0] || '').toUpperCase();
  }
  var TONOS = ['#4682B4', '#47B59F', '#4760B5', '#47A6B5', '#5047B5', '#2E4C80'];
  function avatar(nombre) {
    var a = el('span', 'rs-av', iniciales(nombre));
    var h = 0;
    for (var i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
    a.style.background = TONOS[h % TONOS.length];
    a.setAttribute('aria-hidden', 'true');
    return a;
  }
  function fecha(iso) {
    var d = new Date(iso);
    return MESES[d.getMonth()] + ' ' + d.getFullYear();
  }
  function detalle(r) {
    return [r.servicio, r.zona].filter(Boolean).join(' · ');
  }
  function promedio(list) {
    if (!list.length) return 0;
    var t = 0;
    list.forEach(function (r) { t += r.estrellas; });
    return Math.round((t / list.length) * 10) / 10;
  }
  function recortar(txt, max) {
    if (txt.length <= max) return txt;
    var c = txt.slice(0, max);
    var sp = c.lastIndexOf(' ');
    return c.slice(0, sp > max * 0.6 ? sp : max).replace(/[\s,.;:]+$/, '') + '…';
  }

  /* ---------- Carrusel con tipeo (home) ---------- */
  function carrusel(root, list) {
    var stage = root.querySelector('.rs-stage');
    var dots = root.querySelector('.rs-dots');
    var bar = root.querySelector('.rs-bar i');
    var btnPause = root.querySelector('.rs-pause');
    var MAX = 230;
    var idx = 0, timer = null, typing = null, paused = false, visible = true, holdStart = 0, holdLeft = 0;
    var HOLD = REDUCED ? 9000 : 4800;

    // Fantasmas: todas las reseñas apiladas e invisibles reservan la altura de la más larga (sin saltos)
    var ghosts = el('div', 'rs-ghosts');
    ghosts.setAttribute('aria-hidden', 'true');
    list.forEach(function (r) {
      var g = el('div', 'rs-slide');
      var gt = el('div', 'rs-slide-top'); gt.appendChild(estrellas(5)); g.appendChild(gt);
      g.appendChild(el('p', 'rs-quote', '“' + recortar(r.comentario, MAX) + '”'));
      var gw = el('div', 'rs-who'); gw.appendChild(avatar(r.nombre)); var gx = el('span', 'rs-who-t'); gx.appendChild(el('b', null, r.nombre)); gx.appendChild(el('small', null, 'x')); gw.appendChild(gx); g.appendChild(gw);
      ghosts.appendChild(g);
    });
    stage.appendChild(ghosts);

    var slide = el('figure', 'rs-slide');
    var top = el('div', 'rs-slide-top');
    var q = el('blockquote', 'rs-quote');
    var typed = el('span', 'rs-typed');
    var caret = el('span', 'rs-caret');
    caret.setAttribute('aria-hidden', 'true');
    q.appendChild(typed); q.appendChild(caret);
    var cap = el('figcaption', 'rs-who');
    slide.appendChild(top); slide.appendChild(q); slide.appendChild(cap);
    stage.appendChild(slide);
    var live = el('p', 'rs-sr');
    live.setAttribute('aria-live', 'polite');
    root.appendChild(live);

    list.forEach(function (r, i) {
      var b = el('button', 'rs-dot');
      b.type = 'button';
      b.setAttribute('aria-label', 'Reseña ' + (i + 1) + ' de ' + list.length);
      b.addEventListener('click', function () { ir(i, true); });
      dots.appendChild(b);
    });
    if (list.length < 2) { root.querySelector('.rs-ctrl').hidden = true; }

    function marcar() {
      Array.prototype.forEach.call(dots.children, function (d, i) { d.setAttribute('aria-current', i === idx ? 'true' : 'false'); });
    }
    function parar() { clearTimeout(timer); clearInterval(typing); timer = typing = null; }
    function barra(ms, desde) {
      if (!bar) return;
      bar.style.transition = 'none';
      bar.style.transform = 'scaleX(' + (desde || 0) + ')';
      void bar.offsetWidth;
      bar.style.transition = 'transform ' + ms + 'ms linear';
      bar.style.transform = 'scaleX(1)';
    }
    function congelarBarra() {
      if (!bar) return;
      var m = getComputedStyle(bar).transform;
      bar.style.transition = 'none';
      bar.style.transform = m === 'none' ? 'scaleX(0)' : m;
    }
    function esperar(ms) {
      holdStart = Date.now(); holdLeft = ms;
      barra(ms, 1 - ms / HOLD);
      timer = setTimeout(function () { ir(idx + 1); }, ms);
    }
    function pintar(r) {
      top.textContent = '';
      top.appendChild(estrellas(r.estrellas, 'pop'));
      cap.textContent = '';
      cap.appendChild(avatar(r.nombre));
      var t = el('span', 'rs-who-t');
      t.appendChild(el('b', null, r.nombre));
      var d = detalle(r);
      t.appendChild(el('small', null, (d ? d + ' · ' : '') + fecha(r.creada)));
      cap.appendChild(t);
      cap.classList.remove('in');
      live.textContent = r.nombre + ', ' + r.estrellas + ' estrellas: ' + r.comentario;
    }
    function ir(i, manual) {
      parar();
      idx = (i + list.length) % list.length;
      marcar();
      var r = list[idx];
      var full = '“' + recortar(r.comentario, MAX) + '”';
      slide.classList.remove('show');
      void slide.offsetWidth;
      pintar(r);
      slide.classList.add('show');
      if (bar) { bar.style.transition = 'none'; bar.style.transform = 'scaleX(0)'; }
      if (REDUCED) {
        typed.textContent = full;
        caret.hidden = true;
        cap.classList.add('in');
        if (!paused && visible) esperar(HOLD);
        return;
      }
      caret.hidden = false;
      typed.textContent = '';
      var n = 0;
      var paso = Math.max(16, Math.min(40, 5200 / full.length));
      setTimeout(function () {
        if (list[idx] !== r) return;
        typing = setInterval(function () {
          n += 1;
          typed.textContent = full.slice(0, n);
          if (n >= full.length) {
            clearInterval(typing); typing = null;
            typed.textContent = full;
            cap.classList.add('in');
            if (!paused && visible) esperar(HOLD);
            else holdLeft = HOLD;
          }
        }, paso);
      }, manual ? 150 : 650);
    }
    function pausar(p) {
      paused = p;
      btnPause.setAttribute('aria-pressed', p ? 'true' : 'false');
      btnPause.setAttribute('aria-label', p ? 'Reanudar reseñas' : 'Pausar reseñas');
      root.classList.toggle('paused', p);
      if (p) {
        if (timer) { clearTimeout(timer); timer = null; holdLeft = Math.max(800, holdLeft - (Date.now() - holdStart)); congelarBarra(); }
      } else if (!typing && !timer && visible) {
        esperar(holdLeft || HOLD);
      }
    }
    btnPause.addEventListener('click', function () { pausar(!paused); });
    root.querySelector('.rs-prev').addEventListener('click', function () { ir(idx - 1, true); });
    root.querySelector('.rs-next').addEventListener('click', function () { ir(idx + 1, true); });

    // Deslizar con el dedo en el celular
    var x0 = null;
    stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 45) ir(idx + (dx < 0 ? 1 : -1), true);
    });

    if ('IntersectionObserver' in window) {
      var primera = true;
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting;
        if (visible && primera) { primera = false; ir(0); return; }
        if (!visible && timer) { clearTimeout(timer); timer = null; holdLeft = Math.max(800, holdLeft - (Date.now() - holdStart)); congelarBarra(); }
        else if (visible && !paused && !typing && !timer) esperar(holdLeft || HOLD);
      }, { threshold: 0.35 }).observe(root);
    } else { ir(0); }
  }

  /* ---------- Cinta de tarjetas que pasan ---------- */
  function tarjeta(r, max) {
    var c = el('article', 'rs-card');
    c.id = 'r-' + r.id;
    var h = el('div', 'rs-card-top');
    h.appendChild(estrellas(r.estrellas));
    h.appendChild(el('time', null, fecha(r.creada)));
    c.appendChild(h);
    c.appendChild(el('p', 'rs-card-txt', max ? recortar(r.comentario, max) : r.comentario));
    var w = el('div', 'rs-card-who');
    w.appendChild(avatar(r.nombre));
    var t = el('span');
    t.appendChild(el('b', null, r.nombre));
    var d = detalle(r);
    if (d) t.appendChild(el('small', null, d));
    w.appendChild(t);
    c.appendChild(w);
    return c;
  }
  function cinta(root, list) {
    var track = el('div', 'rs-track');
    var copias = list.length < 6 ? 3 : 2;
    for (var k = 0; k < copias; k++) {
      list.forEach(function (r) {
        var c = tarjeta(r, 150);
        c.removeAttribute('id');
        if (k) c.setAttribute('aria-hidden', 'true');
        track.appendChild(c);
      });
    }
    track.style.setProperty('--dur', Math.max(28, list.length * 7) + 's');
    track.style.setProperty('--shift', (-100 / copias) + '%');
    root.appendChild(track);
  }

  /* ---------- Resumen (promedio + barras) ---------- */
  function resumen(root, list) {
    var p = promedio(list);
    root.querySelectorAll('[data-rs-avg]').forEach(function (n) { n.textContent = p.toFixed(1).replace('.', ','); });
    root.querySelectorAll('[data-rs-count]').forEach(function (n) { n.textContent = list.length === 1 ? '1 reseña' : list.length + ' reseñas'; });
    root.querySelectorAll('[data-rs-stars]').forEach(function (n) { n.textContent = ''; n.appendChild(estrellas(Math.round(p))); });
    var bars = root.querySelector('[data-rs-bars]');
    if (bars) {
      bars.textContent = '';
      for (var s = 5; s >= 1; s--) {
        var cant = list.filter(function (r) { return r.estrellas === s; }).length;
        var row = el('div', 'rs-barrow');
        row.appendChild(el('span', null, s + '★'));
        var b = el('span', 'rs-barbg');
        var f = el('i');
        f.style.setProperty('--w', list.length ? (cant / list.length) : 0);
        b.appendChild(f);
        row.appendChild(b);
        row.appendChild(el('span', 'rs-barn', String(cant)));
        bars.appendChild(row);
      }
      requestAnimationFrame(function () { requestAnimationFrame(function () { bars.classList.add('go'); }); });
    }
  }

  /* ---------- Página con todas ---------- */
  function lista(root, list) {
    var grid = root.querySelector('.rs-grid');
    var filtros = root.querySelector('.rs-filtros');
    var vacio = root.querySelector('.rs-vacio');
    var filtro = 0;
    function render() {
      grid.textContent = '';
      var ver = list.filter(function (r) { return !filtro || r.estrellas === filtro; });
      vacio.hidden = ver.length > 0;
      if (!list.length) vacio.innerHTML = 'Todavía no hay reseñas publicadas. <a href="/opinar/">¿Fuiste cliente? Sé el primero en dejar la tuya.</a>';
      ver.forEach(function (r, i) {
        var c = tarjeta(r);
        c.style.setProperty('--d', Math.min(i, 8) * 60 + 'ms');
        grid.appendChild(c);
      });
      if (!REDUCED && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
        }, { rootMargin: '0px 0px -8% 0px' });
        Array.prototype.forEach.call(grid.children, function (c) { c.classList.add('rv'); io.observe(c); });
      }
      if (location.hash && /^#r-/.test(location.hash)) {
        var t = document.getElementById(location.hash.slice(1));
        if (t) { t.classList.add('in', 'hl'); t.scrollIntoView({ block: 'center' }); }
      }
    }
    if (filtros) {
      filtros.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        filtro = +b.dataset.f;
        Array.prototype.forEach.call(filtros.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        render();
      });
    }
    render();
  }

  /* ---------- Arranque según lo que haya en la página ---------- */
  function iniciar() {
    var home = document.querySelector('[data-rs="home"]');
    var todas = document.querySelector('[data-rs="todas"]');
    if (!home && !todas) return;
    rpc('ccobra_resenas_publicas').then(function (list) {
      list = list || [];
      if (home) {
        if (!list.length) { home.classList.add('rs-empty'); return; }
        home.classList.add('rs-ready');
        resumen(home, list);
        carrusel(home.querySelector('.rs-car'), list.slice(0, 12));
        var c = home.querySelector('.rs-cinta');
        if (c && list.length >= 3) cinta(c, list); else if (c) c.hidden = true;
      }
      if (todas) {
        todas.classList.add('rs-ready');
        resumen(todas, list);
        lista(todas, list);
      }
    }).catch(function () {
      if (home) home.classList.add('rs-empty');
      if (todas) { todas.classList.add('rs-ready', 'rs-error'); var v = todas.querySelector('.rs-vacio'); if (v) { v.hidden = false; v.textContent = ''; } }
    });
  }

  window.CCResenas = { rpc: rpc, estrellas: estrellas, avatar: avatar, fecha: fecha, detalle: detalle, recortar: recortar, REDUCED: REDUCED };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
