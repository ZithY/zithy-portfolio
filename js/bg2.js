/* Landing background, four variants picked with ?bg=A|B|C|D (or data-variant on the canvas).
   A dot matrix · B circuit traces · C constellation · D code editor.
   All share the falling binary strips and fading code snippets. Colours come from theme variables. */
(() => {
  const canvas = document.getElementById('bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const V = (new URLSearchParams(location.search).get('bg') || canvas.dataset.variant || 'C').toUpperCase();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (n) => Math.floor(Math.random() * n);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const mono = '"JetBrains Mono", Consolas, monospace';

  const SNIPPETS = [
    'const site = build(brief);', 'git push origin main', '<section class="hero">', 'display: grid;',
    'await deploy({ env: "prod" });', 'npm run build', 'return <Page />;', 'if (ready) launch();',
    'border-radius: 12px;', '@media (max-width: 640px)', 'fetch("/api/quote")', 'lighthouse: 100',
    'export default config;', 'transition: all .2s;', 'SELECT * FROM leads;', 'function ship() {}',
    'status: 200 OK', '// ship it', 'let uptime = 99.9;', 'font-family: Sora;',
  ];

  let w = 0, h = 0, dpr = 1, rgb = '167 139 250', dim = '#7482a0';
  let base = null;
  const strips = [], code = [], glows = [];
  let last = 0, nextGlow = 0, nextCode = 0;

  const readTheme = () => {
    const cs = getComputedStyle(document.documentElement);
    rgb = cs.getPropertyValue('--accent-rgb').trim() || rgb;
    dim = cs.getPropertyValue('--dim').trim() || dim;
  };
  const pulse = (t, born, life) => { const p = (t - born) / life; return p <= 0 || p >= 1 ? 0 : Math.sin(p * Math.PI); };

  /* ---------- variant setup: each returns { build(g), glow(t), live(t, dt) } ---------- */
  const variants = {
    // A: dot matrix, random dots swell and glow
    A() {
      const S = 30;
      return {
        build(g) {
          g.fillStyle = dim; g.globalAlpha = 0.55;
          for (let x = S / 2; x < w; x += S) for (let y = S / 2; y < h; y += S) { g.beginPath(); g.arc(x, y, 1.4, 0, 6.3); g.fill(); }
        },
        spawn(t) { glows.push({ x: rand(Math.floor(w / S)) * S + S / 2, y: rand(Math.floor(h / S)) * S + S / 2, b: t, l: 2400 + rand(2400) }); },
        glow(g, o, t) {
          const a = pulse(t, o.b, o.l);
          g.shadowColor = `rgb(${rgb})`; g.shadowBlur = 14 * a; g.fillStyle = `rgb(${rgb} / ${0.3 + 0.7 * a})`;
          g.beginPath(); g.arc(o.x, o.y, 1.4 + 2.4 * a, 0, 6.3); g.fill();
        },
        live() {},
      };
    },

    // B: circuit traces with pulses travelling along them
    B() {
      const S = 40, paths = [];
      const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      const gen = () => {
        paths.length = 0;
        const n = Math.max(14, Math.round((w * h) / 26000));
        for (let i = 0; i < n; i++) {
          let x = rand(Math.floor(w / S)) * S, y = rand(Math.floor(h / S)) * S, d = rand(4);
          const pts = [[x, y]];
          for (let k = 0; k < 3 + rand(3); k++) {
            const len = (2 + rand(5)) * S;
            x += dirs[d][0] * len; y += dirs[d][1] * len; pts.push([x, y]);
            d = (d + (Math.random() < 0.5 ? 1 : 3)) % 4;
          }
          const cum = [0];
          for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
          paths.push({ pts, cum, total: cum[cum.length - 1] });
        }
      };
      const range = (g, p, a, b) => {
        g.beginPath();
        for (let k = 1; k < p.pts.length; k++) {
          const s0 = p.cum[k - 1], s1 = p.cum[k];
          if (s1 < a || s0 > b) continue;
          const lo = Math.max(a, s0), hi = Math.min(b, s1), f0 = (lo - s0) / (s1 - s0), f1 = (hi - s0) / (s1 - s0);
          const [x0, y0] = p.pts[k - 1], [x1, y1] = p.pts[k];
          g.moveTo(x0 + (x1 - x0) * f0, y0 + (y1 - y0) * f0); g.lineTo(x0 + (x1 - x0) * f1, y0 + (y1 - y0) * f1);
        }
        g.stroke();
      };
      return {
        build(g) {
          gen();
          g.strokeStyle = dim; g.fillStyle = dim; g.lineWidth = 1; g.globalAlpha = 0.28;
          paths.forEach((p) => {
            g.beginPath(); p.pts.forEach(([x, y], k) => (k ? g.lineTo(x + 0.5, y + 0.5) : g.moveTo(x + 0.5, y + 0.5))); g.stroke();
            [p.pts[0], p.pts[p.pts.length - 1]].forEach(([x, y]) => { g.beginPath(); g.arc(x + 0.5, y + 0.5, 3, 0, 6.3); g.stroke(); });
          });
        },
        spawn(t) { const p = paths[rand(paths.length)]; if (p) glows.push({ p, b: t, speed: rnd(0.14, 0.26), tail: 90, l: 99999 }); },
        glow(g, o, t) {
          const s = (t - o.b) * o.speed;
          if (s - o.tail > o.p.total) { o.l = 0; return; }
          g.lineCap = 'round'; g.shadowColor = `rgb(${rgb})`; g.shadowBlur = 10;
          for (let i = 0; i < 4; i++) { // tail fades toward the back
            g.strokeStyle = `rgb(${rgb} / ${0.2 + 0.25 * i})`; g.lineWidth = 1.4;
            range(g, o.p, s - o.tail + (o.tail / 4) * i, s - (o.tail / 4) * (3 - i));
          }
        },
        live() {},
        resize: gen,
      };
    },

    // C: drifting constellation, nodes link when close
    C() {
      let nodes = [];
      const R = 150;
      const init = () => {
        const n = Math.max(24, Math.min(70, Math.round((w * h) / 24000)));
        nodes = Array.from({ length: n }, () => ({ x: rnd(0, w), y: rnd(0, h), vx: rnd(-0.012, 0.012), vy: rnd(-0.012, 0.012), g: 0 }));
      };
      return {
        build() { init(); },
        // carried over to the next page so the constellation continues instead of restarting
        save() { return nodes.map((n) => ({ x: n.x / w, y: n.y / h, vx: n.vx, vy: n.vy })); },
        load(list, elapsed) { nodes = list.map((n) => ({ x: n.x * w + (reduce ? 0 : n.vx * elapsed), y: n.y * h + (reduce ? 0 : n.vy * elapsed), vx: n.vx, vy: n.vy, g: 0 })); },
        index(n) { return nodes.indexOf(n); },
        node(i) { return nodes[i]; },
        spawn(t) { const n = nodes[rand(nodes.length)]; if (n) glows.push({ n, b: t, l: 2600 }); },
        glow() {},
        live(g, t, dt) {
          for (const n of nodes) {
            if (!reduce) { n.x += n.vx * dt; n.y += n.vy * dt; }
            if (n.x < -20) n.x = w + 20; if (n.x > w + 20) n.x = -20; if (n.y < -20) n.y = h + 20; if (n.y > h + 20) n.y = -20;
            n.g = 0;
          }
          glows.forEach((o) => { o.n.g = Math.max(o.n.g, pulse(t, o.b, o.l)); });
          g.lineWidth = 1;
          for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d > R) continue;
            const hot = Math.max(a.g, b.g), al = (1 - d / R) * (0.45 + 0.5 * hot);
            g.strokeStyle = hot > 0.05 ? `rgb(${rgb} / ${al})` : dim; g.globalAlpha = hot > 0.05 ? 1 : al;
            g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
          }
          g.globalAlpha = 1;
          for (const n of nodes) {
            g.shadowColor = `rgb(${rgb})`; g.shadowBlur = 12 * n.g;
            g.fillStyle = n.g > 0.05 ? `rgb(${rgb} / ${0.5 + 0.5 * n.g})` : dim; g.globalAlpha = n.g > 0.05 ? 1 : 0.8;
            g.beginPath(); g.arc(n.x, n.y, 1.6 + 1.8 * n.g, 0, 6.3); g.fill();
          }
          g.shadowBlur = 0; g.globalAlpha = 1;
        },
      };
    },

    // D: code editor: line-number gutter, indent guides, a highlighted "current line" that moves around
    D() {
      const LH = 24, GX = 64;
      return {
        build(g) {
          g.fillStyle = dim; g.strokeStyle = dim; g.font = `11px ${mono}`; g.textAlign = 'right'; g.textBaseline = 'middle';
          g.globalAlpha = 0.6;
          for (let r = 0; r * LH < h; r++) g.fillText(String(r + 1), GX - 16, r * LH + LH / 2);
          g.globalAlpha = 0.4; g.beginPath(); g.moveTo(GX + 0.5, 0); g.lineTo(GX + 0.5, h); g.stroke();
          g.globalAlpha = 0.14; g.setLineDash([2, 5]); g.beginPath();
          for (let k = 1; k <= 4; k++) { const x = GX + 0.5 + k * 28; g.moveTo(x, 0); g.lineTo(x, h); }
          g.stroke(); g.setLineDash([]);
        },
        spawn(t) { glows.push({ r: rand(Math.floor(h / LH)), b: t, l: 2800 + rand(2200), cx: GX + 20 + rand(Math.max(60, w - GX - 120)) }); },
        glow(g, o, t) {
          const a = pulse(t, o.b, o.l), y = o.r * LH;
          g.fillStyle = `rgb(${rgb} / ${0.07 * a})`; g.fillRect(GX, y, w - GX, LH);
          g.fillStyle = `rgb(${rgb} / ${0.35 + 0.65 * a})`; g.font = `11px ${mono}`; g.textAlign = 'right'; g.textBaseline = 'middle';
          g.shadowColor = `rgb(${rgb})`; g.shadowBlur = 8 * a; g.fillText(String(o.r + 1), GX - 16, y + LH / 2);
          if (Math.floor(t / 520) % 2 === 0) { g.fillStyle = `rgb(${rgb} / ${0.9 * a})`; g.fillRect(o.cx, y + 5, 2, LH - 10); }
          g.shadowBlur = 0; g.textAlign = 'left';
        },
        live() {},
        snap: LH,
      };
    },
  };

  let v = null;

  /* ---------- shared layers ---------- */
  const STEP = 18, SLH = 16;
  const makeStrip = () => {
    const fast = Math.random() < 0.25, len = 8 + rand(8);
    return { x: rand(Math.ceil(w / STEP)) * STEP + 4, y: fast ? -20 : -rand(h), len, fast,
      speed: fast ? rnd(4.5, 7) : rnd(0.9, 1.8), alpha: fast ? 0.5 : 0.2, flip: fast ? 60 : 160,
      digits: Array.from({ length: len }, () => rand(2)), timers: new Array(len).fill(0) };
  };

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    readTheme();
    glows.length = 0;
    v = variants[V] ? variants[V]() : variants.A();
    base = document.createElement('canvas'); base.width = w * dpr; base.height = h * dpr;
    const g = base.getContext('2d'); g.scale(dpr, dpr);
    v.build(g);
    if (reduce) draw(0);
  };

  const draw = (t) => {
    const dt = Math.min(t - last, 50); last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(base, 0, 0, w, h);
    v.live(ctx, t, dt);

    // glow events (variant specific)
    for (let i = glows.length - 1; i >= 0; i--) {
      const o = glows[i];
      if (t > o.b + o.l) { glows.splice(i, 1); continue; }
      ctx.save(); v.glow(ctx, o, t); ctx.restore();
    }

    // binary strips
    while (strips.length < 12) strips.push(makeStrip());
    ctx.font = `13px ${mono}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    for (let i = strips.length - 1; i >= 0; i--) {
      const s = strips[i];
      if (!reduce) s.y += (s.speed * dt) / 16.7;
      if (s.y - s.len * SLH > h) { strips.splice(i, 1); continue; }
      for (let j = 0; j < s.len; j++) {
        s.timers[j] -= dt;
        if (s.timers[j] <= 0) { s.digits[j] = rand(2); s.timers[j] = s.flip * (0.5 + Math.random()); }
        const y = s.y - j * SLH;
        if (y < -SLH || y > h) continue;
        const fade = 1 - j / s.len;
        if (j === 0 && s.fast) { ctx.shadowColor = `rgb(${rgb})`; ctx.shadowBlur = 8; ctx.fillStyle = `rgb(${rgb} / 0.85)`; }
        else { ctx.shadowBlur = 0; ctx.fillStyle = `rgb(${rgb} / ${(s.alpha * fade * fade).toFixed(3)})`; }
        ctx.fillText(s.digits[j], s.x, y);
      }
      ctx.shadowBlur = 0;
    }

    // code snippets
    ctx.font = `12px ${mono}`; ctx.textBaseline = 'middle';
    for (let i = code.length - 1; i >= 0; i--) {
      const c = code[i];
      if (t > c.born + c.life) { code.splice(i, 1); continue; }
      ctx.fillStyle = `rgb(${rgb} / ${(pulse(t, c.born, c.life) * c.alpha).toFixed(3)})`;
      ctx.fillText(c.text, c.x, c.y);
    }
  };

  const loop = (t) => {
    if (t > nextGlow) { v.spawn(t); nextGlow = t + (V === 'B' ? 700 : 350) + rand(700); }
    if (t > nextCode && code.length < 6) {
      const row = v.snap || 24;
      code.push({ text: SNIPPETS[rand(SNIPPETS.length)], x: V === 'D' ? 100 + rand(Math.max(100, w - 300)) : rand(Math.max(1, w - 260)),
        y: (rand(Math.floor(h / row)) + 0.5) * row, born: t, life: 5000 + rand(4000), alpha: 0.24 + Math.random() * 0.16 });
      nextCode = t + 700 + rand(1400);
    }
    draw(t);
    requestAnimationFrame(loop);
  };

  // Every page is a separate load, so the background state is saved when you leave and restored on the next page.
  const KEY = 'zithy-bg-v1';
  const save = () => {
    try {
      const t = performance.now();
      sessionStorage.setItem(KEY, JSON.stringify({
        V, at: Date.now(),
        nodes: v.save ? v.save() : null,
        glows: v.save ? glows.filter((o) => o.n).map((o) => ({ i: v.index(o.n), age: t - o.b, l: o.l })) : [],
        strips: strips.map((s) => ({ ...s, x: s.x / w, y: s.y / h })),
        code: code.map((c) => ({ text: c.text, x: c.x / w, y: c.y / h, age: t - c.born, life: c.life, alpha: c.alpha })),
      }));
    } catch (e) { /* storage unavailable: the background just starts fresh */ }
  };
  const restore = () => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.V !== V || Date.now() - d.at > 600000) return;
      const el = Math.min(Date.now() - d.at, 1500), now = performance.now();
      if (v.load && d.nodes) {
        v.load(d.nodes, el);
        d.glows.forEach((g) => { const n = v.node(g.i); if (n) glows.push({ n, b: now - g.age - el, l: g.l }); });
      }
      d.strips.forEach((s) => strips.push({ ...s, x: s.x * w, y: s.y * h + (reduce ? 0 : (s.speed * el) / 16.7) }));
      d.code.forEach((c) => code.push({ text: c.text, x: c.x * w, y: c.y * h, born: now - c.age - el, life: c.life, alpha: c.alpha }));
      nextGlow = now + 200; nextCode = now + 600;
    } catch (e) { /* ignore a corrupt save */ }
  };
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });

  resize();
  restore();
  draw(performance.now()); // paint straight away so the new page never shows a blank background
  addEventListener('resize', resize);
  addEventListener('leadscout-theme', () => { readTheme(); resize(); });
  if (!reduce) requestAnimationFrame(loop);
})();
