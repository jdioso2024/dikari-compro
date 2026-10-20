import Matter from "matter-js";
import { createBrowserScope } from "./browser-scope";

// Preserve the original physics, sprite artwork, scroll choreography and game rules.
// React owns the forms, tabs, filters, navigation and image reveal interactions.
export function initializeExperience() {
  const scope = createBrowserScope();
  const {
    listen,
    requestAnimationFrame,
    cancelAnimationFrame,
    setTimeout,
    clearTimeout,
    setInterval,
  } = scope;

  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const tok = (n) =>
    getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const C = {
    navy: tok("--navy"),
    n2: tok("--navy-2"),
    deep: tok("--navy-deep"),
    blue: tok("--blue"),
    orange: tok("--orange"),
    sky: tok("--sky"),
    ice: tok("--ice"),
    white: tok("--white"),
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---- sprite pixel: logo D (arena, game) dan Dika si maskot ---- */
  const SPRITE = [
    "......#####....",
    "###...#####....",
    "###.......###..",
    "#####......##..",
    "..###.......###",
    "..#####.....###",
    "....###.....###",
    "..#####.....###",
    "..###.......###",
    "#####......##..",
    "###.......###..",
    "###...#####....",
    "......#####....",
  ];
  const DIKA = [
    "......OOOOO....",
    "OOO...OOOOO....",
    "OOO.......OOO..",
    "OOOOO......OO..",
    "..OOO.......OOO",
    "..OOOOOWW.WWOOO",
    "....OOOWN.WNOOO",
    "..OOOOO.....OOO",
    "..OOO...NN..OOO",
    "OOOOO......OO..",
    "OOO.......OOO..",
    "OOO...OOOOO....",
    "......OOOOO....",
  ];
  const BLINK = { 5: "..OOOOO.....OOO", 6: "....OOONN.NNOOO" };
  const LEGS = [
    ["......L...L....", "......L...L....", ".....LL..LL...."],
    ["......L...L....", ".....L.....L...", "....LL.....LL.."],
  ];
  const dikaRows = (frame = 0, blink = false) =>
    DIKA.map((r, j) => (blink && BLINK[j] ? BLINK[j] : r)).concat(LEGS[frame]);
  const svgPix = (rows, pal) => {
    let s = "";
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = pal[row[i]];
        if (c)
          s += `<rect x="${i}" y="${j}" width="1.06" height="1.06" fill="${c}"/>`;
      }
    });
    return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${s}</svg>`;
  };
  const PAL_LIGHT = { O: C.orange, W: C.white, N: C.navy, L: C.navy };

  /* ---- 0. ukuran header -> --hdr (dipakai sticky quest) ---- */
  const originalHeaderHeight =
    document.documentElement.style.getPropertyValue("--hdr");
  const top = $("#top");
  const setHdr = () =>
    document.documentElement.style.setProperty(
      "--hdr",
      top.offsetHeight + "px",
    );
  setHdr();
  listen(window, "resize", setHdr);

  /* ================= 1. ARENA FISIKA (Lusion x jigsaw pixel-D) ================= */
  const arena = $("#arena"),
    acv = $("#arena-cv"),
    actx = acv.getContext("2d");
  const aStatus = $("#arena-status"),
    aBtn = $("#arena-btn"),
    aHint = $("#arena-hint");
  const M = Matter;
  const WORDS = [
    ["DATA", "white"],
    ["IDE", "blue"],
    ["KONTEN", "white"],
    ["IKLAN", "blue"],
    ["IP", "white"],
    ["SALE!", "orange"],
  ];
  const LOOSE = [C.orange, C.orange, C.blue, C.sky, C.white, C.ice];
  let A = null;
  if (!finePointer)
    aHint.textContent =
      "Ketuk arena untuk menendang blok. Ketuk logo untuk meledakkannya.";

  const buildArena = (instant) => {
    if (!M) {
      $("#arena-fallback").hidden = false;
      acv.hidden = true;
      aBtn.hidden = true;
      aStatus.textContent = "ARENA 01 / 1P READY";
      return;
    }
    if (A) {
      M.Composite.clear(A.engine.world, false);
      M.Engine.clear(A.engine);
    }
    const W = Math.max(arena.clientWidth || 0, 320),
      H = Math.max(arena.clientHeight || 0, 400),
      dpr = Math.min(2, devicePixelRatio || 1);
    acv.width = W * dpr;
    acv.height = H * dpr;
    const u = clamp(Math.floor(Math.min(W / 26, H / 17)), 14, 34);
    const engine = M.Engine.create({ enableSleeping: true });
    engine.gravity.y = 1.1;
    const wall = { isStatic: true, friction: 0.6 };
    M.Composite.add(engine.world, [
      M.Bodies.rectangle(W / 2, H + 50, W * 3, 100, wall),
      M.Bodies.rectangle(-50, H / 2, 100, H * 5, wall),
      M.Bodies.rectangle(W + 50, H / 2, 100, H * 5, wall),
    ]);
    const ox = (W - 15 * u) / 2,
      oy = Math.max(u * 2.4, (H - 13 * u) / 2 - u * 0.7);
    const specs = [];
    let k = 0;
    SPRITE.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch !== "#") return;
        specs.push({
          kind: "sq",
          w: u,
          h: u,
          col: LOOSE[(i * 7 + j * 3 + k++) % LOOSE.length],
          tx: ox + i * u + u / 2,
          ty: oy + j * u + u / 2,
          col0: null,
        });
      }),
    );
    actx.font = `700 ${Math.round(u * 0.42)}px "Silkscreen", monospace`;
    WORDS.forEach(([t, c]) =>
      specs.push({
        kind: "tile",
        label: t,
        w: Math.ceil(actx.measureText(t).width + u * 0.9),
        h: Math.round(u * 1.1),
        col: C[c],
      }),
    );
    A = {
      engine,
      W,
      H,
      u,
      dpr,
      bodies: [],
      queue: specs.sort(() => Math.random() - 0.5),
      total: specs.length,
      mode: "rain",
      drag: null,
      ptr: null,
      settle: 0,
      flash: new Map(),
      visible: true,
      cx: ox + 7.5 * u,
      cy: oy + 6.5 * u,
    };
    if (instant) {
      A.queue.forEach((s) => addBody(s, true));
      A.queue = [];
      A.mode = "logo";
      status();
    }
  };

  const addBody = (s, atTarget) => {
    const x =
      atTarget && s.kind === "sq"
        ? s.tx
        : s.kind === "tile" && atTarget
          ? A.u * 2 + Math.random() * (A.W - A.u * 4)
          : A.u + Math.random() * (A.W - A.u * 2);
    const y =
      atTarget && s.kind === "sq"
        ? s.ty
        : atTarget
          ? A.H - s.h / 2 - 2
          : -s.h - Math.random() * A.u * 3;
    const b = M.Bodies.rectangle(x, y, s.w, s.h, {
      friction: 0.35,
      frictionAir: 0.012,
      restitution: 0.12,
      density: 0.002,
      angle: atTarget ? 0 : (Math.random() - 0.5) * 0.8,
    });
    b.plugin.s = { ...s, col0: s.col };
    if (atTarget && s.kind === "sq") {
      M.Body.setStatic(b, true);
      b.plugin.s.col = C.orange;
      b.plugin.s.home = true;
    }
    M.Composite.add(A.engine.world, b);
    A.bodies.push(b);
  };

  const status = () => {
    if (!A) return;
    if (A.mode === "rain")
      aStatus.textContent = `ARENA 01 / LOADING (${Math.round((1 - A.queue.length / A.total) * 100)}%)`;
    else
      aStatus.textContent =
        A.mode === "free" ? "ARENA 01 / BEBAS MAIN" : "ARENA 01 / 1P READY";
    aBtn.textContent =
      A.mode === "free" || A.mode === "rain" ? "SUSUN LOGO" : "LEDAKKAN";
  };

  const assemble = () => {
    A.mode = "assembling";
    A.bodies.forEach((b) => {
      const s = b.plugin.s;
      if (s.kind !== "sq") return;
      M.Body.setStatic(b, true);
      s.delay = Math.round((s.tx - (A.cx - 8 * A.u)) / A.u) * 2;
      s.home = false;
    });
    status();
  };

  const explode = (p) => {
    A.mode = "free";
    const c = p || { x: A.cx, y: A.cy };
    A.bodies.forEach((b) => {
      const s = b.plugin.s;
      if (b.isStatic) M.Body.setStatic(b, false);
      if (s.kind === "sq") {
        s.col = s.col0;
        s.home = false;
      }
      M.Sleeping.set(b, false);
      const dx = b.position.x - c.x,
        dy = b.position.y - c.y,
        d = Math.hypot(dx, dy) || 1;
      M.Body.setVelocity(b, {
        x: (dx / d) * (6 + Math.random() * 8),
        y: (dy / d) * 6 - 7 - Math.random() * 6,
      });
      M.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.5);
    });
    status();
  };

  const kick = (p) => {
    const R = A.u * 6;
    A.bodies.forEach((b) => {
      if (b.isStatic) return;
      const dx = b.position.x - p.x,
        dy = b.position.y - p.y,
        d = Math.hypot(dx, dy);
      if (d > R) return;
      M.Sleeping.set(b, false);
      const f = (1 - d / R) * 13;
      M.Body.setVelocity(b, {
        x: b.velocity.x + (dx / (d || 1)) * f,
        y: b.velocity.y - f * 1.1,
      });
    });
  };

  const stepArena = () => {
    if (A.mode === "rain") {
      for (let n = 0; n < 2 && A.queue.length; n++)
        addBody(A.queue.pop(), false);
      status();
      if (!A.queue.length && ++A.settle > 70) assemble();
    }
    if (A.mode === "assembling") {
      let done = true;
      A.bodies.forEach((b) => {
        const s = b.plugin.s;
        if (s.kind !== "sq" || s.home) return;
        if (s.delay > 0) {
          s.delay--;
          done = false;
          return;
        }
        const nx = b.position.x + (s.tx - b.position.x) * 0.2,
          ny = b.position.y + (s.ty - b.position.y) * 0.2;
        M.Body.setPosition(b, { x: nx, y: ny });
        M.Body.setAngle(b, b.angle * 0.75);
        if (Math.abs(s.tx - nx) < 0.6 && Math.abs(s.ty - ny) < 0.6) {
          M.Body.setPosition(b, { x: s.tx, y: s.ty });
          M.Body.setAngle(b, 0);
          s.home = true;
          s.col = C.orange;
          A.flash.set(b, 6);
        } else done = false;
      });
      if (done) {
        A.mode = "logo";
        status();
      }
    }
    if (A.ptr && !A.drag && A.mode === "free" && finePointer) {
      // kursor mendorong blok di dekatnya
      const R = A.u * 2.6;
      A.bodies.forEach((b) => {
        if (b.isStatic) return;
        const dx = b.position.x - A.ptr.x,
          dy = b.position.y - A.ptr.y,
          d = Math.hypot(dx, dy);
        if (d < R && d > 0) {
          M.Sleeping.set(b, false);
          const f = 0.004 * b.mass * (1 - d / R);
          M.Body.applyForce(b, b.position, {
            x: (dx / d) * f,
            y: (dy / d) * f,
          });
        }
      });
    }
    try {
      M.Engine.update(A.engine, 1000 / 60);
    } catch (_) {
      // Prevent internal Matter.js collision exception from crashing the loop
    }
  };

  const drawArena = () => {
    const { u, dpr } = A;
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    actx.clearRect(0, 0, A.W, A.H);
    const logoMode = A.mode === "logo";
    for (const pass of [0, 1])
      for (const b of A.bodies) {
        const s = b.plugin.s,
          homed = s.kind === "sq" && s.home;
        actx.save();
        actx.translate(b.position.x, b.position.y);
        actx.rotate(b.angle);
        if (pass === 0) {
          actx.fillStyle = C.deep;
          actx.fillRect(
            -s.w / 2 + 4,
            -s.h / 2 + 4,
            s.w + (homed ? 1 : 0),
            s.h + (homed ? 1 : 0),
          );
        } else {
          const fl = A.flash.get(b);
          actx.fillStyle = fl ? C.white : s.col;
          if (homed)
            actx.fillRect(-s.w / 2 - 0.5, -s.h / 2 - 0.5, s.w + 1, s.h + 1);
          else {
            actx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
            actx.lineWidth = 2;
            actx.strokeStyle = C.navy;
            actx.strokeRect(-s.w / 2 + 1, -s.h / 2 + 1, s.w - 2, s.h - 2);
            actx.fillStyle = "rgba(255,255,255,.35)";
            actx.fillRect(-s.w / 2 + 3, -s.h / 2 + 3, s.w - 6, 2);
          }
          if (s.kind === "tile") {
            actx.font = `700 ${Math.round(u * 0.42)}px "Silkscreen", monospace`;
            actx.textAlign = "center";
            actx.textBaseline = "middle";
            actx.fillStyle = s.col === C.blue ? C.white : C.navy;
            actx.fillText(s.label, 0, 1);
          }
          if (fl) {
            fl > 1 ? A.flash.set(b, fl - 1) : A.flash.delete(b);
          }
        }
        actx.restore();
      }
    if (logoMode && !reduce) {
      // kilau pixel berjalan di atas logo
      const t = ((performance.now() / 70) % 30) - 8;
      actx.fillStyle = "rgba(255,255,255,.28)";
      A.bodies.forEach((b) => {
        const s = b.plugin.s;
        if (s.kind === "sq" && s.home) {
          const col = Math.round((s.tx - A.cx) / u) + 7;
          if (col === Math.floor(t) || col === Math.floor(t) - 1)
            actx.fillRect(s.tx - u / 2, s.ty - u / 2, u + 0.6, u + 0.6);
        }
      });
    }
  };

  let araf = 0;
  const arenaLoop = () => {
    araf = requestAnimationFrame(arenaLoop);
    if (A && A.visible) {
      stepArena();
      drawArena();
    }
  };
  const ptrPos = (e) => {
    const r = acv.getBoundingClientRect();
    const cx = typeof e.clientX === "number" ? e.clientX : 0;
    const cy = typeof e.clientY === "number" ? e.clientY : 0;
    return { x: cx - r.left, y: cy - r.top };
  };
  listen(acv, "pointerdown", (e) => {
    if (!A) return;
    const p = ptrPos(e);
    const homeHit = M.Query.point(
      A.bodies.filter((b) => b.isStatic),
      p,
    )[0];
    if ((A.mode === "logo" || A.mode === "assembling") && homeHit) {
      explode(p);
      return;
    }
    if (e.pointerType !== "touch") {
      const hit = M.Query.point(
        A.bodies.filter((b) => !b.isStatic),
        p,
      )[0];
      if (hit) {
        A.drag = M.Constraint.create({
          pointA: p,
          bodyB: hit,
          pointB: { x: p.x - hit.position.x, y: p.y - hit.position.y },
          stiffness: 0.2,
          damping: 0.1,
          length: 0,
        });
        M.Composite.add(A.engine.world, A.drag);
        M.Sleeping.set(hit, false);
        acv.setPointerCapture(e.pointerId);
        if (A.mode === "logo") {
          A.mode = "free";
          status();
        }
        return;
      }
    }
    kick(p);
  });
  listen(acv, "pointermove", (e) => {
    if (!A) return;
    const p = ptrPos(e);
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
      A.ptr = p;
      if (A.drag) A.drag.pointA = p;
    }
  });
  listen(acv, "pointerleave", () => {
    if (A) A.ptr = null;
  });
  const endDrag = () => {
    if (A && A.drag) {
      M.Composite.remove(A.engine.world, A.drag);
      A.drag = null;
    }
  };
  listen(acv, "pointerup", endDrag);
  listen(acv, "pointercancel", endDrag);
  listen(aBtn, "click", () => {
    if (!A) return;
    A.mode === "free" || A.mode === "rain"
      ? (A.queue.forEach((s) => addBody(s, false)), (A.queue = []), assemble())
      : explode();
  });

  const startArena = async () => {
    try {
      await document.fonts.load('700 14px "Silkscreen"');
    } catch (_) {}
    if (scope.disposed) return;
    buildArena(reduce);
    if (!M) return;
    if (reduce) {
      drawArena();
      return;
    }
    arenaLoop();
    scope.observe(
      (es) =>
        es.forEach((e) => {
          if (A) A.visible = e.isIntersecting;
        }),
      arena,
    );
    let lastW = arena.clientWidth,
      rt = 0;
    listen(window, "resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (Math.abs(arena.clientWidth - lastW) > 30) {
          lastW = arena.clientWidth;
          buildArena(true);
        }
      }, 250);
    });
  };
  startArena();

  /* jejak pixel di grid hero */
  const trail = $("#trail");
  if (trail && !reduce && finePointer) {
    const tc = trail.getContext("2d"),
      hero = trail.parentElement,
      CELL = 24,
      LIFE = 42,
      cols = [C.orange, C.blue, C.sky];
    const lit = new Map();
    let running = false,
      dpr = 1;
    const size = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      trail.width = hero.clientWidth * dpr;
      trail.height = hero.clientHeight * dpr;
    };
    size();
    listen(window, "resize", size);
    const frame = () => {
      tc.setTransform(dpr, 0, 0, dpr, 0, 0);
      tc.clearRect(0, 0, trail.width, trail.height);
      for (const [k, c] of lit) {
        if (--c.life <= 0) {
          lit.delete(k);
          continue;
        }
        tc.globalAlpha = (Math.ceil((c.life / LIFE) * 4) / 4) * 0.6;
        tc.fillStyle = c.col;
        tc.fillRect(c.x * CELL + 1, c.y * CELL + 1, CELL - 1, CELL - 1);
      }
      tc.globalAlpha = 1;
      if (lit.size) requestAnimationFrame(frame);
      else running = false;
    };
    listen(hero, "pointermove", (e) => {
      if (e.target === acv) return;
      const r = hero.getBoundingClientRect(),
        x = Math.floor((e.clientX - r.left) / CELL),
        y = Math.floor((e.clientY - r.top) / CELL),
        k = x + ":" + y;
      if (!lit.has(k))
        lit.set(k, { x, y, life: LIFE, col: cols[(x * 7 + y * 3) % 3] });
      else lit.get(k).life = LIFE;
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    });
  }

  /* ================= 2. MANIFESTO: kata menyala mengikuti scroll (KPR) ================= */
  const rev = $("#reveal");
  const wspans = [...rev.querySelectorAll("span")];
  const manifestoTick = () => {
    if (reduce) {
      wspans.forEach((s) => s.classList.add("on"));
      return;
    }
    const r = rev.getBoundingClientRect(),
      vh = innerHeight;
    const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.45), 0, 1);
    const n = Math.round(p * wspans.length);
    wspans.forEach((s, i) => s.classList.toggle("on", i < n));
  };

  /* ================= 3. PETA QUEST pinned (Noomo) ================= */
  const qsec = $("#cara-kerja"),
    qpin = $("#quest-pin"),
    qview = $("#quest-view"),
    qworld = $("#quest-world"),
    qfar = $("#qw-far");
  const posts = $$(".qpost"),
    qcells = $$("#qbar i"),
    walker = $("#walker"),
    ring = $("#ring"),
    qleads = $("#qleads");
  const Q = {
    worldW: 0,
    coins: [],
    walkX: 0,
    lastY: 0,
    frame: 0,
    dist: 0,
    pinned: false,
  };
  const PAL_WALK = PAL_LIGHT;
  const layoutQuest = () => {
    Q.pinned = !reduce && matchMedia("(min-width: 901px)").matches;
    qsec.classList.toggle("quest-static", !Q.pinned);
    if (!Q.pinned) return;
    const vw = qview.clientWidth,
      pw = posts[0].offsetWidth;
    const start = vw * 0.42,
      gap = Math.max(pw + 120, vw * 0.5);
    posts.forEach((p, i) => {
      p.style.left = start + i * gap + "px";
      p.dataset.x = start + i * gap;
    });
    Q.worldW = start + 3 * gap + pw + vw * 0.35;
    qworld.style.width = Q.worldW + "px";
    qfar.style.width = Q.worldW * 0.6 + vw + "px";
    if (!qfar.childElementCount) {
      // kota pixel jauh (parallax)
      let x = 0,
        k = 0,
        html = "";
      while (x < 6000) {
        const w = 50 + ((k * 37) % 70),
          h = 60 + ((k * 53) % 150);
        html += `<i class="bld" style="left:${x}px;width:${w}px;height:${h}px"></i>`;
        x += w + 14 + ((k * 29) % 40);
        k++;
      }
      qfar.innerHTML = html;
    }
    qworld.querySelectorAll(".qcoin").forEach((c) => c.remove());
    Q.coins = [];
    for (let x = start - gap * 0.55; x < start + 3 * gap + pw; x += 70) {
      if (
        posts.some((p) => x > +p.dataset.x - 30 && x < +p.dataset.x + pw + 30)
      )
        continue;
      const c = document.createElement("i");
      c.className = "qcoin";
      c.style.left = x + "px";
      c.dataset.x = x;
      qworld.appendChild(c);
      Q.coins.push(c);
    }
    Q.walkX = vw * 0.12;
  };
  const questTick = () => {
    if (!Q.pinned) return;
    const r = qpin.getBoundingClientRect(),
      view = qview.clientHeight,
      vw = qview.clientWidth;
    const p = clamp(-r.top / (qpin.offsetHeight - view), 0, 1);
    const shift = -p * (Q.worldW - vw);
    qworld.style.transform = `translate3d(${shift}px,0,0)`;
    qfar.style.transform = `translate3d(${-p * (Q.worldW - vw) * -0.45}px,0,0)`;
    ring.style.transform = `rotate(${p * 420}deg)`;
    const n = Math.round(p * 8);
    qcells.forEach((c, i) => c.classList.toggle("on", i < n));
    const wx = Q.walkX + 30;
    posts.forEach((pt) =>
      pt.classList.toggle("is-clear", +pt.dataset.x + 30 + shift < wx),
    );
    let got = 0;
    Q.coins.forEach((c) => {
      const g = +c.dataset.x + 10 + shift < wx;
      c.classList.toggle("got", g);
      if (g) got++;
    });
    qleads.textContent = "LEADS " + got;
    const moved = Math.abs(scrollY - Q.lastY);
    Q.lastY = scrollY;
    Q.dist += moved;
    const fr = moved > 0 && p > 0 && p < 1 ? Math.floor(Q.dist / 40) % 2 : 0;
    if (fr !== Q.frame || !walker.firstChild) {
      Q.frame = fr;
      walker.innerHTML = svgPix(dikaRows(fr), PAL_WALK);
    }
  };
  layoutQuest();
  questTick();
  listen(window, "resize", () => {
    layoutQuest();
    questTick();
  });

  /* ================= 4. HUD, stiker parallax, Dika pendamping ================= */
  const cells = $$(".hud__bar i"),
    where = $("#hud-where");
  const SECS = [
    ["start", "ARENA"],
    ["manifesto", "MANIFESTO"],
    ["sistem", "ATURAN MAIN"],
    ["layanan", "MENU"],
    ["karya", "STAGE CLEAR"],
    ["network", "PARTY"],
    ["cara-kerja", "QUEST"],
    ["bonus", "BONUS STAGE"],
    ["klien", "HALL OF FAME"],
    ["kontak", "CONTINUE?"],
  ].map(([id, label]) => [document.getElementById(id), label, id]);
  const SAY = {
    start: [
      "Halo! Aku Dika. Coba lempar blok di arena.",
      "Klik logonya, lihat apa yang terjadi.",
    ],
    manifesto: ["Strategi plus eksekusi. Itu resep kami."],
    sistem: ["Ini aturan main kami. Singkat kok."],
    layanan: [
      "Pilih layanan pakai panah atas dan bawah.",
      "Ada 6 layanan. Mau mulai dari mana?",
    ],
    karya: [
      "Arahkan kursor ke kartu buat lihat versi aslinya.",
      "Coba filter: key visual, branding, sosmed.",
    ],
    network: [
      "Ini party-ku: strategi, film, dan VFX.",
      "Arahkan kursor ke foto tim, ada kejutan.",
    ],
    "cara-kerja": ["Ikut aku jalan dari SCOUT sampai SALE!"],
    bonus: [
      "Main dulu? Lima leads jadi satu sale.",
      "Awas REVISI LAGI. Lompat yang tinggi!",
    ],
    klien: ["Brand-brand ini pernah main bareng kami."],
    kontak: [
      "Isi brief-nya. Aku tunggu ya!",
      "Brief yang jelas bikin quest lebih cepat.",
    ],
  };
  const dika = $("#dika"),
    dikaText = $("#dika-text"),
    dikaSprite = $("#dika-sprite");
  let dikaOff = false;
  try {
    dikaOff = localStorage.getItem("dika-off") === "1";
  } catch (_) {}
  dika.hidden = dikaOff;
  const drawDika = (blink) => {
    dikaSprite.innerHTML = svgPix(dikaRows(0, blink), PAL_LIGHT);
  };
  drawDika(false);
  if (!reduce)
    setInterval(() => {
      drawDika(true);
      setTimeout(() => drawDika(false), 160);
    }, 3600);
  let curSec = "start",
    tipI = 0;
  const say = (id, next) => {
    const list = SAY[id] || SAY.start;
    tipI = next ? (tipI + 1) % list.length : 0;
    dikaText.textContent = list[tipI];
    if (!reduce) {
      dika.classList.remove("is-pop");
      void dika.offsetWidth;
      dika.classList.add("is-pop");
    }
  };
  listen($("#dika-body"), "click", () => {
    say(curSec, true);
    if (!reduce) {
      dika.classList.remove("is-hop");
      void dika.offsetWidth;
      dika.classList.add("is-hop");
    }
  });
  listen($("#dika-x"), "click", () => {
    dika.hidden = true;
    try {
      localStorage.setItem("dika-off", "1");
    } catch (_) {}
  });

  const stickers = $$(".stk");
  let ticking = false;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight,
      p = max > 0 ? scrollY / max : 0;
    const n = Math.max(1, Math.ceil(p * cells.length));
    cells.forEach((c, i) => c.classList.toggle("on", i < n));
    let label = "ARENA",
      id = "start";
    for (const [el, l, sid] of SECS)
      if (el && el.getBoundingClientRect().top < innerHeight * 0.4) {
        label = l;
        id = sid;
      }
    where.textContent = label;
    if (id !== curSec) {
      curSec = id;
      say(id);
    }
    dika.classList.toggle("is-away", id === "cara-kerja" && Q.pinned); // Dika "masuk" ke peta quest
    if (!reduce)
      stickers.forEach((s) => {
        const r = s.parentElement.getBoundingClientRect();
        s.style.setProperty(
          "--py",
          (r.top * +s.dataset.speed).toFixed(1) + "px",
        );
      });
    manifestoTick();
    questTick();
    ticking = false;
  };
  listen(
    window,
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );
  onScroll();

  /* ================= 9. BONUS STAGE: mini game, pemainnya Dika ================= */
  const cv = $("#game"),
    ctx = cv.getContext("2d");
  const W = 320,
    H = 208,
    GROUND = 176,
    PX = 40,
    STEP = 1000 / 60;
  const PS = 2,
    PW = 15 * PS,
    PH = 16 * PS;
  const PAL_GAME = { O: C.orange, W: C.white, N: C.navy, L: C.sky };
  const SPARK = [
    "...#...",
    "...#...",
    "..###..",
    "#######",
    "..###..",
    "...#...",
    "...#...",
  ];
  const LABELS = [
    "REVISI",
    "DEADLINE",
    "ALGORITMA",
    "BUDGET",
    "GHOSTING",
    "REVISI LAGI",
    "KPI",
  ];
  const FONT = '8px "Silkscreen", monospace';
  const box = $("#console"),
    title = $("#title-screen"),
    pressBtn = $("#press"),
    help = $("#g-help"),
    exitBtn = $("#g-exit"),
    gStatus = $("#g-status"),
    gSide = $("#g-side");
  let best = 0;
  try {
    best = +localStorage.getItem("dikari-best") || 0;
  } catch (_) {}
  gSide.textContent = "BEST " + best;
  let st = null,
    raf = 0,
    last = 0,
    acc = 0;
  const reset = () => {
    st = {
      mode: "play",
      t: 0,
      speed: 2.4,
      dist: 0,
      leads: 0,
      sales: 0,
      score: 0,
      hit: "",
      p: { y: GROUND - PH, vy: 0, ground: true, hold: false, buf: 0 },
      obs: [],
      coins: [],
      pops: [],
      next: 80,
    };
  };
  const pop = (txt, big) => {
    if (big) st.pops = [];
    st.pops.push({
      txt,
      big,
      x: PX + 6,
      y: st.p.y - 8 - st.pops.filter((q) => !q.big).length * 10,
      t: 0,
    });
  };
  const spawn = () => {
    const label = LABELS[(Math.random() * LABELS.length) | 0],
      w = 14 + ((Math.random() * 4) | 0) * 4,
      h = [14, 20, 28][(Math.random() * 3) | 0];
    st.obs.push({ x: W + 8, w, h, label });
    if (Math.random() < 0.55)
      [0, 1, 2].forEach((i) =>
        st.coins.push({
          x: W + 8 + w / 2 - 14 + i * 14,
          y: GROUND - h - 34 - (i === 1 ? 10 : 0),
        }),
      );
    else
      st.coins.push({
        x: W + 8 + w + 40 + Math.random() * 30,
        y: GROUND - 18 - Math.random() * 20,
      });
    st.next = (72 + Math.random() * 70) * (2.4 / st.speed) + 34;
  };
  const gameOver = (label) => {
    st.mode = "over";
    st.hit = label;
    st.overAt = st.t;
    const s = Math.floor(st.score);
    if (s > best) {
      best = s;
      try {
        localStorage.setItem("dikari-best", String(best));
      } catch (_) {}
    }
    gStatus.textContent = "GAME OVER: SKOR " + s;
  };
  const update = () => {
    st.t++;
    if (st.mode !== "play") return;
    const p = st.p;
    if (p.buf > 0) {
      p.buf--;
      if (p.ground) {
        p.vy = -7;
        p.ground = false;
        p.buf = 0;
      }
    }
    p.vy += p.hold && p.vy < 0 ? 0.26 : 0.45;
    p.y += p.vy;
    if (p.y >= GROUND - PH) {
      p.y = GROUND - PH;
      p.vy = 0;
      p.ground = true;
    }
    st.speed = Math.min(5.6, 2.4 + st.t * 0.0011);
    st.dist += st.speed;
    st.score += st.speed / 20;
    if (--st.next <= 0) spawn();
    st.obs.forEach((o) => (o.x -= st.speed));
    st.obs = st.obs.filter((o) => o.x + o.w > -4);
    st.coins.forEach((c) => (c.x -= st.speed));
    st.coins = st.coins.filter((c) => c.x > -10 && !c.got);
    const px0 = PX + 4,
      px1 = PX + PW - 4,
      py0 = p.y + 3,
      py1 = p.y + PH - 1;
    for (const o of st.obs)
      if (px1 > o.x && px0 < o.x + o.w && py1 > GROUND - o.h) {
        gameOver(o.label);
        return;
      }
    for (const c of st.coins)
      if (px1 > c.x - 1 && px0 < c.x + 8 && py1 > c.y - 1 && py0 < c.y + 8) {
        c.got = true;
        st.leads++;
        st.score += 10;
        if (st.leads % 5 === 0) {
          st.sales++;
          st.score += 100;
          pop("SALE!", true);
        } else pop("+1 LEAD", false);
      }
    st.pops.forEach((q) => {
      q.t++;
      q.y -= 0.5;
    });
    st.pops = st.pops.filter((q) => q.t < 50);
  };
  const sprite = (rows, x, y, s, pal) =>
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const c = pal[r[i]];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x + i * s, y + j * s, s, s);
        }
      }
    });
  const text = (t, x, y, col, align = "left", size = 8) => {
    ctx.font = size === 8 ? FONT : `${size}px "Silkscreen", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.fillStyle = col;
    ctx.fillText(t, Math.round(x), Math.round(y));
  };
  const draw = () => {
    ctx.fillStyle = C.deep;
    ctx.fillRect(0, 0, W, H);
    const off = st ? st.dist : 0;
    ctx.fillStyle = C.n2;
    for (let i = -1; i < 12; i++) {
      const k = Math.floor((off * 0.3) / 32) + i,
        x = i * 32 - ((off * 0.3) % 32),
        h = 18 + ((k * 37) % 5) * 9;
      ctx.fillRect(Math.round(x), GROUND - h, 26, h);
    }
    ctx.fillStyle = C.ice;
    ctx.fillRect(0, GROUND, W, 2);
    ctx.fillStyle = C.n2;
    for (let x = -(off % 16); x < W; x += 16)
      ctx.fillRect(Math.round(x), GROUND + 8, 8, 4);
    ctx.fillStyle = C.blue;
    for (let x = -(off % 24) + 12; x < W; x += 24)
      ctx.fillRect(Math.round(x), GROUND + 18, 4, 4);
    if (!st) return;
    st.coins.forEach((c) =>
      sprite(SPARK, Math.round(c.x), Math.round(c.y), 1, {
        "#": (st.t >> 3) % 2 ? C.sky : C.ice,
      }),
    );
    st.obs.forEach((o) => {
      const x = Math.round(o.x),
        y = GROUND - o.h;
      ctx.fillStyle = C.blue;
      ctx.fillRect(x, y, o.w, o.h);
      ctx.fillStyle = C.ice;
      ctx.fillRect(x, y, o.w, 2);
      ctx.fillStyle = C.sky;
      ctx.fillRect(x + o.w / 2 - 1, y - 5, 2, 4);
      text(o.label, x + o.w / 2, y - 15, C.sky, "center");
    });
    const legs = st.mode === "play" && st.p.ground ? (st.t >> 3) % 2 : 0;
    sprite(dikaRows(legs), PX, Math.round(st.p.y), PS, PAL_GAME);
    st.pops.forEach((q) =>
      text(q.txt, q.x, q.y, q.big ? C.orange : C.sky, "left", q.big ? 16 : 8),
    );
    text("LEADS " + (st.leads % 5) + "/5", 8, 8, C.ice);
    text("SALES " + st.sales, W / 2, 8, C.orange, "center");
    text("SKOR " + Math.floor(st.score), W - 8, 8, C.ice, "right");
    if (st.mode === "over" || st.mode === "pause") {
      ctx.fillStyle = "rgba(3,14,46,.82)";
      ctx.fillRect(0, 0, W, H);
      if (st.mode === "pause") {
        text("JEDA", W / 2, 70, C.orange, "center", 16);
        text(
          "TEKAN SPASI ATAU KETUK UNTUK LANJUT",
          W / 2,
          100,
          C.ice,
          "center",
        );
        return;
      }
      text("KENA " + st.hit + "!", W / 2, 48, C.orange, "center", 16);
      text(
        "SKOR " + Math.floor(st.score) + "   BEST " + best,
        W / 2,
        80,
        C.ice,
        "center",
      );
      text(
        "LEADS " + st.leads + "   SALES " + st.sales,
        W / 2,
        94,
        C.sky,
        "center",
      );
      if ((st.t >> 5) % 2)
        text("CONTINUE?  > YES", W / 2, 124, C.orange, "center");
      text("SPASI / KETUK UNTUK MAIN LAGI", W / 2, 146, C.sky, "center");
    }
  };
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (!last) last = now;
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= STEP) {
      update();
      acc -= STEP;
    }
    draw();
  };
  const run = () => {
    cancelAnimationFrame(raf);
    last = 0;
    acc = 0;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const press = () => {
    if (!st) return;
    if (st.mode === "over") {
      if (st.t - st.overAt > 24) {
        reset();
        gStatus.textContent = "1P PLAYING";
      }
      return;
    }
    if (st.mode === "pause") {
      st.mode = "play";
      gStatus.textContent = "1P PLAYING";
      run();
      return;
    }
    st.p.hold = true;
    st.p.buf = 7;
  };
  const release = () => {
    if (st) st.p.hold = false;
  };
  const pause = () => {
    if (st && st.mode === "play") {
      st.mode = "pause";
      gStatus.textContent = "1P JEDA";
      draw();
      stop();
    }
  };
  const startGame = async () => {
    try {
      await document.fonts.load(FONT);
    } catch (_) {}
    if (scope.disposed) return;
    title.hidden = true;
    cv.hidden = false;
    pressBtn.hidden = true;
    help.hidden = false;
    exitBtn.hidden = false;
    gSide.hidden = true;
    box.classList.add("is-playing");
    gStatus.textContent = "1P PLAYING";
    reset();
    cv.focus({ preventScroll: true });
    run();
  };
  const exitGame = () => {
    stop();
    st = null;
    title.hidden = false;
    cv.hidden = true;
    pressBtn.hidden = false;
    help.hidden = true;
    exitBtn.hidden = true;
    gSide.hidden = false;
    gSide.textContent = "BEST " + best;
    box.classList.remove("is-playing");
    gStatus.textContent = "1P READY";
    pressBtn.focus();
  };
  listen(pressBtn, "click", startGame);
  listen(exitBtn, "click", exitGame);
  listen(cv, "pointerdown", (e) => {
    e.preventDefault();
    cv.focus({ preventScroll: true });
    press();
  });
  listen(window, "pointerup", release);
  const JUMP = [" ", "ArrowUp", "w", "W"];
  listen(cv, "keydown", (e) => {
    if (JUMP.includes(e.key)) {
      e.preventDefault();
      if (!e.repeat) press();
    }
    if (e.key === "Escape") exitGame();
  });
  listen(cv, "keyup", (e) => {
    if (JUMP.includes(e.key)) release();
  });
  listen(cv, "blur", () => {
    if (st && st.t > 30) pause();
  });
  listen(document, "visibilitychange", () => {
    if (document.hidden) pause();
  });
  scope.observe(
    (es) =>
      es.forEach((e) => {
        if (!e.isIntersecting) pause();
      }),
    box,
  );

  /* ================= 10. easter egg Konami: semua stage terbuka ================= */
  const KONAMI = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];
  let ki = 0;
  const toast = (msg) => {
    let t = $(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._h);
    t._h = setTimeout(() => {
      t.hidden = true;
    }, 3200);
  };
  listen(window, "keydown", (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    ki = k === KONAMI[ki] ? ki + 1 : k === KONAMI[0] ? 1 : 0;
    if (ki === KONAMI.length) {
      ki = 0;
      const on = document.documentElement.classList.toggle("cheat");
      toast(
        on
          ? "CHEAT AKTIF: semua stage terbuka."
          : "CHEAT MATI: kembali ke mode pixel.",
      );
    }
  });

  return () => {
    scope.dispose();
    if (A) {
      M.Composite.clear(A.engine.world, false);
      M.Engine.clear(A.engine);
    }
    document.documentElement.style.setProperty("--hdr", originalHeaderHeight);
    document.documentElement.classList.remove("cheat");
    document.querySelector(".toast")?.remove();
  };
}
