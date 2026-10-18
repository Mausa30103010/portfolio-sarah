/* Sarah Beets, le ruban 3D de l'ouverture.
   Un tube brillant couleur rouille qui serpente derrière la grande phrase, comme chez Lusion.
   Il se dessine à l'arrivée, ondule doucement, s'écarte du curseur et glisse quand on défile. */
(function () {
  "use strict";

  function create(container, opts) {
    opts = opts || {};
    var THREE = window.THREE;
    if (!THREE || !container) return null;
    var ok = false;
    try { var tc = document.createElement("canvas"); ok = !!(window.WebGLRenderingContext && (tc.getContext("webgl2") || tc.getContext("webgl"))); } catch (e) { ok = false; }
    if (!ok) return null;
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: !!opts.still }); }
    catch (e) { return null; }
    var canvas = renderer.domElement;
    canvas.className = "ribbon3d__canvas";
    canvas.setAttribute("aria-hidden", "true");
    renderer.setClearColor(0xffffff, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.physicallyCorrectLights = true;
    container.appendChild(canvas);

    var C = function (hex) { return new THREE.Color(hex); };
    var scene = new THREE.Scene();
    (function env() {
      var e = new THREE.Scene();
      e.add(new THREE.Mesh(new THREE.SphereGeometry(20, 24, 16), new THREE.MeshBasicMaterial({ color: C(0xd9d6d2), side: THREE.BackSide })));
      function box(w, h, k, hex, x, y, z) {
        var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: C(hex).multiplyScalar(k), side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); e.add(m);
      }
      box(14, 3, 4.2, 0xffffff, 0, 9, 4);      // grande boîte à lumière au-dessus
      box(4, 10, 2.4, 0xfff1e6, -9, 1, 5);     // bandeau chaud à gauche
      box(4, 10, 1.6, 0xe9f0ff, 9, 2, 3);      // bandeau froid à droite
      box(16, 6, 0.25, 0x6b4d3c, 0, -9, 0);    // sol sombre, pour le contraste du bas
      var pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(e, 0.02).texture;
      pm.dispose();
    })();
    scene.add(new THREE.HemisphereLight(C(0xffffff), C(0xb8a090), 0.55));
    var key = new THREE.DirectionalLight(C(0xffffff), 2.4); key.position.set(-4, 6, 8); scene.add(key);
    var rim = new THREE.DirectionalLight(C(0xffe2cc), 1.2); rim.position.set(6, -2, 4); scene.add(rim);

    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 12);

    /* ---------- La courbe ---------- */
    // points d'appui exprimés en fraction de la demi-largeur et de la demi-hauteur visibles
    var BASE = opts.points || [
      [-0.62, 1.45, -1.2], [-0.66, 0.62, 0.2], [-0.5, -0.12, 1.1], [-0.18, -0.46, 1.4], [0.14, -0.28, 0.6],
      [0.24, 0.24, -0.4], [0.06, 0.52, -1.1], [-0.12, 0.16, -0.2], [0.12, -0.32, 0.9], [0.48, -0.62, 0.6],
      [0.74, -0.16, -0.2], [0.82, 0.46, -0.9], [0.96, 1.4, -1.4]
    ];
    // sur un écran en hauteur, la même figure redessinée, avec une boucle plus large pour rester ronde
    var BASE_N = opts.pointsNarrow || (opts.points ? opts.points : null) || [
      [-0.8, 1.45, -1.2], [-0.86, 0.6, 0.2], [-0.66, -0.2, 1.1], [-0.26, -0.5, 1.3], [0.24, -0.3, 0.5],
      [0.44, 0.12, -0.3], [0.22, 0.46, -0.8], [-0.18, 0.36, -0.4], [-0.24, -0.04, 0.3], [0.12, -0.46, 0.9],
      [0.58, -0.62, 0.5], [0.88, 0.1, -0.5], [0.98, 1.4, -1.4]
    ];
    var NP = BASE.length;
    var phase = BASE.map(function (p, i) { return [i * 1.7, i * 2.3 + 1, i * 0.9 + 2]; });
    var push = BASE.map(function () { return new THREE.Vector3(); });
    var pts = BASE.map(function () { return new THREE.Vector3(); });
    var curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);

    var SEG = opts.segments || 420, RAD = 28;
    var count = (SEG + 1) * (RAD + 1);
    var pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
    var idx = [];
    for (var i = 0; i < SEG; i++) {
      for (var j = 0; j < RAD; j++) {
        var a = i * (RAD + 1) + j, b = (i + 1) * (RAD + 1) + j, c = (i + 1) * (RAD + 1) + j + 1, d = i * (RAD + 1) + j + 1;
        idx.push(a, d, b, b, d, c);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setIndex(idx);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    // un dégradé le long du ruban, de la rouille profonde à la pêche
    (function () {
      var A = C(0x6E2504), B = C(0xA84309), D = C(0xDB7238), tmp = new THREE.Color();
      for (var s = 0; s <= SEG; s++) {
        var t = s / SEG, k = 0.5 + 0.5 * Math.sin(t * Math.PI * 3.2 - 0.6);
        tmp.copy(A).lerp(B, Math.min(1, k * 1.6)).lerp(D, Math.max(0, k - 0.62) * 1.4);
        for (var r = 0; r <= RAD; r++) { var o = (s * (RAD + 1) + r) * 3; col[o] = tmp.r; col[o + 1] = tmp.g; col[o + 2] = tmp.b; }
      }
    })();
    var mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.34, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.25, sheenColor: C(0xffc29c), envMapIntensity: 0.85 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);

    var HW = 1, HH = 1, radius = 0.2;
    function layout() {
      var w = container.clientWidth || 1, h = container.clientHeight || 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxDpr || 1.75));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      HH = Math.tan(camera.fov * Math.PI / 360) * camera.position.z;
      HW = HH * camera.aspect;
      // le ruban garde une épaisseur proche à l'écran, un peu plus fin sur mobile
      radius = HH * (camera.aspect < 1 ? 0.05 : 0.064);
    }
    layout();

    var T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), P = new THREE.Vector3(), Pn = new THREE.Vector3(), Pp = new THREE.Vector3(), prevN = new THREE.Vector3(0, 0, 1);
    var mouse = { x: 0, y: 0, on: false, wx: 0, wy: 0 };
    var clock = 0, scrollP = opts.scrollCenter || 0, grow = opts.still ? 1 : 0;
    var scrollC = opts.scrollCenter || 0, scrollA = opts.scrollAmp == null ? 0.55 : opts.scrollAmp;
    function updateCurve(dt) {
      var narrow = camera.aspect < 1, src = narrow ? BASE_N : BASE, ax = Math.max(0.45, Math.min(1, HW / 4));
      for (var i = 0; i < NP; i++) {
        var b = src[i], ph = phase[i];
        var x = b[0] * HW + Math.sin(clock * 0.31 + ph[0]) * 0.22 * ax;
        var y = b[1] * HH + Math.cos(clock * 0.27 + ph[1]) * 0.2 + (scrollP - scrollC) * HH * scrollA * (0.6 + 0.4 * Math.sin(i));
        var z = b[2] * 1.4 + Math.sin(clock * 0.23 + ph[2]) * 0.35;
        // le curseur écarte doucement le ruban
        if (mouse.on) {
          var dx = x - mouse.wx, dy = y - mouse.wy, d = Math.sqrt(dx * dx + dy * dy), R = HH * 0.55;
          if (d < R && d > 1e-4) {
            var f = (1 - d / R); f = f * f * 1.1 * HH * 0.3;
            push[i].x += (dx / d * f - push[i].x) * Math.min(1, dt * 4);
            push[i].y += (dy / d * f - push[i].y) * Math.min(1, dt * 4);
          } else { push[i].multiplyScalar(1 - Math.min(1, dt * 2.2)); }
        } else push[i].multiplyScalar(1 - Math.min(1, dt * 2.2));
        pts[i].set(x + push[i].x, y + push[i].y, z);
      }
    }
    // le ruban est échantillonné à pas réguliers puis lissé, pour que les boucles restent rondes
    // et que le tube ne se replie jamais sur lui-même dans les virages serrés
    var RAW = new Float32Array((SEG + 1) * 3), SM = new Float32Array((SEG + 1) * 3), KER = new Float32Array(64);
    function sampleCurve() {
      curve.updateArcLengths();
      for (var s = 0; s <= SEG; s++) {
        curve.getPointAt(s / SEG, P);
        RAW[s * 3] = P.x; RAW[s * 3 + 1] = P.y; RAW[s * 3 + 2] = P.z;
      }
      var step = curve.getLength() / SEG;
      var sigma = Math.max(0.8, radius * 3 / step), hw = Math.min(60, Math.ceil(sigma * 2.6)), k, wsum = 0;
      for (k = 0; k <= hw; k++) { KER[k] = Math.exp(-k * k / (2 * sigma * sigma)); wsum += k ? 2 * KER[k] : KER[k]; }
      for (s = 0; s <= SEG; s++) {
        var x = 0, y = 0, z = 0;
        for (k = -hw; k <= hw; k++) {
          var q = s + k; q = q < 0 ? 0 : q > SEG ? SEG : q;
          var w = KER[k < 0 ? -k : k];
          x += RAW[q * 3] * w; y += RAW[q * 3 + 1] * w; z += RAW[q * 3 + 2] * w;
        }
        SM[s * 3] = x / wsum; SM[s * 3 + 1] = y / wsum; SM[s * 3 + 2] = z / wsum;
      }
    }
    function at(s, v) { s = s < 0 ? 0 : s > SEG ? SEG : s; return v.set(SM[s * 3], SM[s * 3 + 1], SM[s * 3 + 2]); }
    // dans un virage plus serré que le tube lui-même, le tube s'affine juste assez pour ne pas se plier
    var TT = new Float32Array((SEG + 1) * 3), SPAN = new Float32Array(SEG + 1), RMAX = new Float32Array(SEG + 1), RR = new Float32Array(SEG + 1), RT = new Float32Array(SEG + 1);
    function radiusProfile() {
      var s, k;
      for (s = 0; s <= SEG; s++) {
        at(s + 1, Pn); at(s - 1, Pp); T.subVectors(Pn, Pp);
        var l = T.length() || 1e-6; SPAN[s] = l;
        TT[s * 3] = T.x / l; TT[s * 3 + 1] = T.y / l; TT[s * 3 + 2] = T.z / l;
      }
      for (s = 0; s <= SEG; s++) {
        var a = s > 0 ? s - 1 : 0, c = s < SEG ? s + 1 : SEG;
        var d = TT[a * 3] * TT[c * 3] + TT[a * 3 + 1] * TT[c * 3 + 1] + TT[a * 3 + 2] * TT[c * 3 + 2];
        var ang = Math.acos(d > 1 ? 1 : d < -1 ? -1 : d), kap = ang / Math.max(1e-5, SPAN[s]);
        RMAX[s] = kap > 1e-5 ? 0.9 / kap : 1e9;
      }
      for (s = 0; s <= SEG; s++) {
        var m = radius;
        for (k = -6; k <= 6; k++) { var q = s + k; if (q >= 0 && q <= SEG && RMAX[q] < m) m = RMAX[q]; }
        RR[s] = m;
      }
      for (var pass = 0; pass < 2; pass++) {
        for (s = 0; s <= SEG; s++) RT[s] = (RR[s > 0 ? s - 1 : 0] + 2 * RR[s] + RR[s < SEG ? s + 1 : SEG]) / 4;
        for (s = 0; s <= SEG; s++) RR[s] = Math.min(RT[s], RMAX[s]);
      }
    }
    function buildTube() {
      sampleCurve();
      radiusProfile();
      for (var s = 0; s <= SEG; s++) {
        var t = s / SEG;
        at(s, P);
        T.set(TT[s * 3], TT[s * 3 + 1], TT[s * 3 + 2]);
        // repère transporté le long de la courbe, pour que le tube ne se torde pas
        N.copy(prevN).addScaledVector(T, -prevN.dot(T));
        if (N.lengthSq() < 1e-6) N.set(-T.y, T.x, 0);
        N.normalize();
        B.crossVectors(T, N);
        prevN.copy(N);
        var r = RR[s] * (0.92 + 0.08 * Math.sin(t * 40 + clock));
        for (var j = 0; j <= RAD; j++) {
          var th = j / RAD * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
          var nx = cs * N.x + sn * B.x, ny = cs * N.y + sn * B.y, nz = cs * N.z + sn * B.z;
          var o = (s * (RAD + 1) + j) * 3;
          pos[o] = P.x + r * nx; pos[o + 1] = P.y + r * ny; pos[o + 2] = P.z + r * nz;
          nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
        }
      }
      prevN.set(0, 0, 1);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.normal.needsUpdate = true;
      var shown = Math.max(0, Math.min(SEG, Math.round(SEG * easeOut(grow))));
      geo.setDrawRange(0, shown * RAD * 6);
    }
    function easeOut(t) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3); }

    function onMove(e) {
      var r = container.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) { mouse.on = false; return; }
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      mouse.wx = mouse.x * HW; mouse.wy = mouse.y * HH;
      mouse.on = e.pointerType !== "touch";
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    function onLeave() { mouse.on = false; }
    document.addEventListener("pointerleave", onLeave);

    var running = false, raf = 0, last = 0, visible = true;
    function frame(t) {
      raf = 0;
      if (!running || !visible) return;
      var dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      clock += dt;
      if (grow < 1) grow = Math.min(1, grow + dt / 1.8);
      updateCurve(dt); buildTube();
      mesh.rotation.y = mouse.x * 0.06; mesh.rotation.x = -mouse.y * 0.04;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; last = 0; if (!raf) raf = requestAnimationFrame(frame); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    var io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && running && !raf) { last = 0; raf = requestAnimationFrame(frame); } });
      io.observe(container);
    }
    var ro = null;
    function onResize() { layout(); if (!running) renderOnce(); }
    if ("ResizeObserver" in window) { ro = new ResizeObserver(onResize); ro.observe(container); }
    else window.addEventListener("resize", onResize);
    function renderOnce() { updateCurve(0.016); buildTube(); renderer.render(scene, camera); }
    renderOnce();

    return {
      canvas: canvas, start: start, stop: stop, renderOnce: renderOnce,
      setScroll: function (p) { scrollP = Math.max(0, Math.min(1, p)); },
      setGrow: function (g) { grow = g; },
      advance: function (sec) { for (var s = 0; s < sec; s += 1 / 60) { clock += 1 / 60; updateCurve(1 / 60); } buildTube(); renderer.render(scene, camera); },
      destroy: function () {
        stop(); if (io) io.disconnect(); if (ro) ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerleave", onLeave);
        renderer.dispose(); geo.dispose(); mat.dispose();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  window.SBRibbon = { create: create };
})();
