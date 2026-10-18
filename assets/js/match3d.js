/* Sarah Beets, la séquence handball.
   Un terrain épuré aux couleurs de la marque, un but rayé rouille et blanc, un filet qui se creuse
   et un ballon qui laisse derrière lui le ruban rouille de l'ouverture. Tout est piloté par le défilement,
   setProgress(p) place la scène à un instant précis de 0 à 1, dans un sens comme dans l'autre. */
(function () {
  "use strict";

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function outCubic(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function inOutCubic(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // les moments clés de la séquence, en fraction du défilement
  var K = {
    windup: [0.15, 0.26],   // le bras arme le tir
    fast: [0.26, 0.38],     // le ballon part
    slow: [0.38, 0.585],    // ralenti pendant que la caméra passe derrière le but
    net: [0.585, 0.655],    // le filet se creuse
    drop: [0.655, 0.715],   // le ballon retombe dans le but
    night: [0.815, 0.845],  // la lumière s'éteint pendant que l'iris se ferme sur le ballon
    rise: [0.72, 0.8]       // le ballon remonte au centre de l'image
  };

  function create(container, opts) {
    opts = opts || {};
    var THREE = window.THREE;
    if (!THREE || !container) return null;
    var ok = false;
    try { var tc = document.createElement("canvas"); ok = !!(window.WebGLRenderingContext && (tc.getContext("webgl2") || tc.getContext("webgl"))); } catch (e) { ok = false; }
    if (!ok) return null;
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: !!opts.still }); }
    catch (e) { return null; }
    var canvas = renderer.domElement;
    canvas.className = "match3d__canvas";
    canvas.setAttribute("aria-hidden", "true");
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(canvas);

    var C = function (hex) { return new THREE.Color(hex); };
    var BG_DAY = C(0xF3EFEB), BG_NIGHT = C(0x0E0C0D), bg = BG_DAY.clone();
    var scene = new THREE.Scene();
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 15, 38);

    (function env() {
      var e = new THREE.Scene();
      e.add(new THREE.Mesh(new THREE.SphereGeometry(20, 24, 16), new THREE.MeshBasicMaterial({ color: C(0xd8d3ce), side: THREE.BackSide })));
      function box(w, h, k, hex, x, y, z) {
        var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: C(hex).multiplyScalar(k), side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); e.add(m);
      }
      box(14, 3, 4.0, 0xffffff, 0, 9, 4);
      box(4, 10, 2.2, 0xfff1e6, -9, 1, 5);
      box(4, 10, 1.4, 0xe9f0ff, 9, 2, 3);
      box(16, 6, 0.3, 0x8a6a55, 0, -9, 0);
      var pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(e, 0.02).texture;
      pm.dispose();
    })();

    var hemi = new THREE.HemisphereLight(C(0xffffff), C(0xcdbfb2), 0.55);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(C(0xfff6ee), 1.9);
    sun.position.set(5, 11, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(opts.shadow || 2048, opts.shadow || 2048);
    sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -5;
    sun.shadow.camera.near = 2; sun.shadow.camera.far = 30;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
    sun.target.position.set(0, 0, 1);
    scene.add(sun); scene.add(sun.target);
    var rim = new THREE.DirectionalLight(C(0xffd2b4), 0.0);
    rim.position.set(-2, 3, -6);
    scene.add(rim);

    var aniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4;

    /* ---------- Le terrain ---------- */
    var FLOOR = "#CDBCA9", RUST = "#93380A";
    function courtTexture() {
      var S = 2048, M = S / 24;
      var c = document.createElement("canvas"); c.width = c.height = S;
      var g = c.getContext("2d");
      var X = function (x) { return (x + 12) * M; }, Z = function (z) { return (z + 6) * M; };
      g.fillStyle = FLOOR; g.fillRect(0, 0, S, S);
      // les lames du parquet, à peine visibles
      for (var i = 0; i * 0.14 < 24; i++) {
        var k = (i * 7919) % 5;
        g.fillStyle = k === 0 ? "rgba(140,100,70,.045)" : k === 2 ? "rgba(255,255,255,.07)" : k === 4 ? "rgba(120,90,60,.025)" : "rgba(0,0,0,0)";
        g.fillRect(X(-12 + i * 0.14), 0, 0.14 * M + 1, S);
      }
      g.fillStyle = "rgba(90,60,40,.05)";
      for (i = 0; i * 0.14 < 24; i++) g.fillRect(X(-12 + i * 0.14), 0, 1, S);
      function zone(r) {
        g.beginPath();
        g.moveTo(X(-1.5 - r), Z(0));
        g.arc(X(-1.5), Z(0), r * M, Math.PI, Math.PI / 2, true);
        g.lineTo(X(1.5), Z(r));
        g.arc(X(1.5), Z(0), r * M, Math.PI / 2, 0, true);
      }
      // la zone du gardien, peinte en rouille
      zone(6); g.closePath(); g.fillStyle = RUST; g.fill();
      var lw = 0.05 * M;
      g.strokeStyle = "#FFFFFF"; g.lineWidth = lw; g.lineCap = "butt";
      zone(6); g.stroke();
      g.setLineDash([0.15 * M, 0.15 * M]); zone(9); g.stroke(); g.setLineDash([]);
      g.fillStyle = "#FFFFFF";
      g.fillRect(X(-10), Z(0) - lw / 2, 20 * M, lw);            // ligne de but
      g.fillRect(X(-0.5), Z(7) - lw / 2, 1 * M, lw);            // ligne des 7 m
      g.fillRect(X(-0.075), Z(4) - lw / 2, 0.15 * M, lw);       // limite du gardien
      g.fillRect(X(-10) - lw / 2, Z(0), lw, 18 * M);            // lignes de touche
      g.fillRect(X(10) - lw / 2, Z(0), lw, 18 * M);
      var t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding; t.anisotropy = aniso;
      return t;
    }
    var court = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.8, metalness: 0, envMapIntensity: 0.45 }));
    court.rotation.x = -Math.PI / 2; court.position.set(0, 0, 6);
    court.receiveShadow = true;
    scene.add(court);
    var outer = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: C(FLOOR), roughness: 0.85, envMapIntensity: 0.45 }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.002; outer.receiveShadow = true;
    scene.add(outer);

    /* ---------- Le but, rayé rouille et blanc ---------- */
    var goal = new THREE.Group();
    scene.add(goal);
    var matRust = new THREE.MeshStandardMaterial({ color: C(0xB34A12), roughness: 0.42, metalness: 0.05 });
    var matWhite = new THREE.MeshStandardMaterial({ color: C(0xF6F2EE), roughness: 0.48, metalness: 0.05 });
    var T8 = 0.08;
    function stripeBar(len, axis, cx, cy, cz, n) {
      var w = len / n;
      for (var i = 0; i < n; i++) {
        var geo = axis === "y" ? new THREE.BoxGeometry(T8, w, T8) : new THREE.BoxGeometry(w, T8, T8);
        var m = new THREE.Mesh(geo, i % 2 === 0 ? matRust : matWhite);
        var o = -len / 2 + w * (i + 0.5);
        if (axis === "y") m.position.set(cx, cy + o, cz); else m.position.set(cx + o, cy, cz);
        m.castShadow = true; m.receiveShadow = true;
        goal.add(m);
      }
    }
    stripeBar(2.0, "y", -1.54, 1.0, 0, 10);
    stripeBar(2.0, "y", 1.54, 1.0, 0, 10);
    stripeBar(3.16, "x", 0, 2.04, 0, 15);
    var matFrame = new THREE.MeshStandardMaterial({ color: C(0x8f8781), roughness: 0.5, metalness: 0.3 });
    function rod(a, b, r) {
      var A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]);
      var len = A.distanceTo(B);
      var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), matFrame);
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
      m.castShadow = true;
      goal.add(m);
    }
    [-1.54, 1.54].forEach(function (x) {
      rod([x, 2.02, -0.04], [x, 2.0, -0.8], 0.012);
      rod([x, 2.0, -0.8], [x, 0.02, -1.0], 0.012);
      rod([x, 0.015, -0.04], [x, 0.015, -1.0], 0.012);
    });
    rod([-1.54, 0.015, -1.0], [1.54, 0.015, -1.0], 0.012);
    rod([-1.54, 2.0, -0.8], [1.54, 2.0, -0.8], 0.01);

    /* ---------- Le filet ---------- */
    // quatre pans : le fond (qui se creuse), le dessus et les deux côtés
    var NU = 31, NV = 21, NT = 9;
    var panels = [];
    function backBase(u, v, out) {
      out[0] = lerp(-1.5, 1.5, u);
      out[1] = lerp(1.99, 0.03, v);
      out[2] = lerp(-0.8, -1.0, v) - 0.05 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
    }
    function topBase(u, w, out) {
      out[0] = lerp(-1.5, 1.5, u);
      out[1] = 1.99 - 0.05 * Math.sin(Math.PI * u) * Math.sin(Math.PI * w);
      out[2] = lerp(-0.03, -0.8, w);
    }
    function sideBase(side) {
      return function (a, b, out) {
        out[0] = side * 1.5 + side * 0.03 * Math.sin(Math.PI * a) * Math.sin(Math.PI * b);
        out[1] = lerp(1.99, 0.03, b);
        out[2] = lerp(-0.03, lerp(-0.8, -1.0, b), a);
      };
    }
    panels.push({ nu: NU, nv: NV, base: backBase, back: true });
    panels.push({ nu: NU, nv: NT, base: topBase });
    panels.push({ nu: NT, nv: NV, base: sideBase(-1) });
    panels.push({ nu: NT, nv: NV, base: sideBase(1) });
    var nodeCount = 0;
    panels.forEach(function (pn) { pn.start = nodeCount; nodeCount += pn.nu * pn.nv; });
    var netPos = new Float32Array(nodeCount * 3), netBase = new Float32Array(nodeCount * 3), netUV = new Float32Array(nodeCount * 2);
    var netIdx = [];
    var tmp3 = [0, 0, 0];
    panels.forEach(function (pn) {
      for (var j = 0; j < pn.nv; j++) {
        for (var i = 0; i < pn.nu; i++) {
          var n = pn.start + j * pn.nu + i;
          pn.base(i / (pn.nu - 1), j / (pn.nv - 1), tmp3);
          netBase[n * 3] = tmp3[0]; netBase[n * 3 + 1] = tmp3[1]; netBase[n * 3 + 2] = tmp3[2];
          netUV[n * 2] = i / (pn.nu - 1); netUV[n * 2 + 1] = j / (pn.nv - 1);
          if (i < pn.nu - 1) netIdx.push(n, n + 1);
          if (j < pn.nv - 1) netIdx.push(n, n + pn.nu);
        }
      }
    });
    netPos.set(netBase);
    var netGeo = new THREE.BufferGeometry();
    netGeo.setAttribute("position", new THREE.BufferAttribute(netPos, 3));
    netGeo.setIndex(netIdx);
    var netMat = new THREE.LineBasicMaterial({ color: C(0x3a3330), transparent: true, opacity: 0.55, fog: true });
    var net = new THREE.LineSegments(netGeo, netMat);
    net.frustumCulled = false;
    scene.add(net);

    /* ---------- Le ballon ----------
       Un ballon de hand dessiné pour le site. Ses 32 panneaux cousus (12 pentagones et 20 hexagones) sont
       calculés dans le shader, avec les coutures en creux, le grain du cuir, le ruban rouille imprimé
       tout autour comme celui de l'ouverture et le nom de Sarah, deux fois, sous la vague. */
    var R = 0.095;
    var BALL_AX = (function () {
      // les directions des panneaux, divisées par leur distance au centre pour retrouver la découpe exacte
      var p = (1 + Math.sqrt(5)) / 2, iv = [], faces = [], out = [];
      [[0, 1, p], [1, p, 0], [p, 0, 1]].forEach(function (b) {
        [1, -1].forEach(function (s1) {
          [1, -1].forEach(function (s2) {
            var v = b.slice(), k = 0;
            for (var i = 0; i < 3; i++) if (v[i] !== 0) { v[i] *= k++ === 0 ? s1 : s2; }
            iv.push(new THREE.Vector3(v[0], v[1], v[2]));
          });
        });
      });
      for (var a = 0; a < 12; a++) for (var b2 = a + 1; b2 < 12; b2++) for (var c = b2 + 1; c < 12; c++) {
        if (Math.abs(iv[a].distanceTo(iv[b2]) - 2) < 1e-3 && Math.abs(iv[b2].distanceTo(iv[c]) - 2) < 1e-3 && Math.abs(iv[a].distanceTo(iv[c]) - 2) < 1e-3) {
          faces.push(iv[a].clone().add(iv[b2]).add(iv[c]));
        }
      }
      function canon(v) { return v.x > 1e-6 || (Math.abs(v.x) <= 1e-6 && (v.y > 1e-6 || (Math.abs(v.y) <= 1e-6 && v.z > 0))); }
      iv.forEach(function (v) { if (canon(v)) out.push(v.clone().normalize().divideScalar(2.32744)); });
      faces.forEach(function (v) { if (canon(v)) out.push(v.clone().normalize().divideScalar(2.26728)); });
      return out;
    })();
    // le nom imprimé, dessiné une fois en Bebas Neue puis posé comme une décalcomanie
    var printTex = (function () {
      var cv = document.createElement("canvas"); cv.width = 1024; cv.height = 256;
      var tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = aniso;
      function draw() {
        var g = cv.getContext("2d"), txt = "SARAH BEETS", size = 168, track = 11;
        g.clearRect(0, 0, cv.width, cv.height);
        g.font = size + 'px "Bebas Neue", "Arial Narrow", Arial, sans-serif';
        g.textBaseline = "middle"; g.fillStyle = "#fff";
        var w = 0, ws = [];
        for (var i = 0; i < txt.length; i++) { ws.push(g.measureText(txt[i]).width); w += ws[i] + (i < txt.length - 1 ? track : 0); }
        var sc = Math.min(1, (cv.width - 40) / w), x = (cv.width - w * sc) / 2;
        g.save(); g.translate(x, cv.height / 2 + size * 0.04); g.scale(sc, 1);
        for (i = 0; i < txt.length; i++) { g.fillText(txt[i], 0, 0); g.translate(ws[i] + track, 0); }
        g.restore();
        tex.needsUpdate = true;
      }
      draw();
      try { if (document.fonts && document.fonts.load) document.fonts.load('168px "Bebas Neue"').then(draw, function () {}); } catch (e) {}
      return tex;
    })();
    var PLAT = -0.03, PPHI = Math.PI / 4;
    var printC = new THREE.Vector3(-Math.cos(PPHI) * Math.cos(PLAT), Math.sin(PLAT), Math.sin(PPHI) * Math.cos(PLAT));
    var printR = new THREE.Vector3(0, 1, 0).cross(printC).normalize(), printU = printC.clone().cross(printR).normalize();
    var ballMat = new THREE.MeshPhysicalMaterial({
      color: C(0xffffff), roughness: 0.5, clearcoat: 0.32, clearcoatRoughness: 0.4,
      sheen: 0.18, sheenRoughness: 0.6, sheenColor: C(0xfff0e6), envMapIntensity: 0.95
    });
    ballMat.onBeforeCompile = function (sh) {
      sh.uniforms.uAx = { value: BALL_AX };
      sh.uniforms.uPrint = { value: printTex };
      sh.uniforms.uWhite = { value: C(0xF5F2ED) };
      sh.uniforms.uRustHi = { value: C(0xCB5B1E) };
      sh.uniforms.uRustLo = { value: C(0x8A3306) };
      sh.uniforms.uInk = { value: C(0x2A2224) };
      sh.uniforms.uDc = { value: printC }; sh.uniforms.uDr = { value: printR }; sh.uniforms.uDu = { value: printU };
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vBallP;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBallP = position;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", [
          "#include <common>",
          "varying vec3 vBallP;",
          "uniform vec3 uAx[16];",
          "uniform sampler2D uPrint;",
          "uniform vec3 uWhite, uRustHi, uRustLo, uInk, uDc, uDr, uDu;",
          "float bHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }",
          "float bNoise(vec3 x) {",
          "  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);",
          "  return mix(mix(mix(bHash(i), bHash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(bHash(i + vec3(0.0, 1.0, 0.0)), bHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),",
          "             mix(mix(bHash(i + vec3(0.0, 0.0, 1.0)), bHash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(bHash(i + vec3(0.0, 1.0, 1.0)), bHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);",
          "}",
          "float bPrint(vec3 d, vec3 c, vec3 r, vec3 u) {",
          "  vec2 q = vec2(dot(d, r), dot(d, u)) / vec2(0.86, 0.215) + 0.5;",
          "  float inside = step(0.0, dot(d, c)) * step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0);",
          "  return inside * texture2D(uPrint, clamp(q, 0.0, 1.0)).a;",
          "}",
          "vec3 bPerturb(vec3 sp, vec3 sn, vec2 dh, float fd) {",
          "  vec3 sx = dFdx(sp); vec3 sy = dFdy(sp);",
          "  vec3 r1 = cross(sy, sn); vec3 r2 = cross(sn, sx);",
          "  float det = dot(sx, r1) * fd;",
          "  return normalize(abs(det) * sn - sign(det) * (dh.x * r1 + dh.y * r2));",
          "}"
        ].join("\n"))
        .replace("#include <map_fragment>", [
          "#include <map_fragment>",
          "vec3 bD = normalize(vBallP);",
          // la pièce de cuir sous ce point et la distance à sa couture
          "float s1 = -1.0, s2 = -1.0; vec3 a1 = vec3(0.0), a2 = vec3(1.0); float bId = 0.0;",
          "for (int k = 0; k < 16; k++) {",
          "  float v = dot(bD, uAx[k]); float av = abs(v); vec3 sa = v < 0.0 ? -uAx[k] : uAx[k];",
          "  if (av > s1) { s2 = s1; a2 = a1; s1 = av; a1 = sa; bId = float(k) + (v < 0.0 ? 16.0 : 0.0); }",
          "  else if (av > s2) { s2 = av; a2 = sa; }",
          "}",
          "float bArc = asin(clamp((s1 - s2) / max(length(a1 - a2), 1e-4), 0.0, 1.0)) * " + R.toFixed(4) + ";",
          "float bAA = max(fwidth(bArc), 1e-6);",
          "float bSeam = 1.0 - smoothstep(0.00075 - bAA, 0.00075 + bAA, bArc);",
          "float bH = -0.0015 * (1.0 - smoothstep(0.0, 0.0068, bArc));",
          // le grain du cuir, effacé quand il devient plus fin qu'un pixel
          "float bGF = 1.0 - smoothstep(0.25, 0.8, length(fwidth(bD * 120.0)));",
          "bH += 0.0001 * (bNoise(bD * 120.0) - 0.5) * bGF;",
          "vec3 bCol = uWhite * (0.982 + 0.036 * bHash(vec3(bId, bId * 1.7, 3.1)));",
          // le ruban imprimé, une vague qui fait le tour du ballon et se vrille comme celui de l'ouverture
          "float bLat = asin(clamp(bD.y, -1.0, 1.0));",
          "float bPhi = atan(bD.z, -bD.x + 1e-7);",
          "float bF = (bLat - 0.42 * sin(2.0 * bPhi)) / sqrt(1.0 + pow(0.84 * cos(2.0 * bPhi) / max(cos(bLat), 0.25), 2.0));",
          "float bAF = max(fwidth(bF), 1e-5);",
          "float bBand = 1.0 - smoothstep(0.185 - bAF, 0.185 + bAF, abs(bF));",
          "float bT = clamp(bF / 0.185 * 0.5 + 0.5, 0.0, 1.0);",
          "float bTw = 0.5 + 0.5 * sin(3.0 * bPhi + 0.6);",
          "vec3 bRib = mix(uRustLo, uRustHi, smoothstep(0.0, 1.0, mix(bT, 1.0 - bT, bTw)));",
          "bCol = mix(bCol, bRib, bBand);",
          "float bLine = 1.0 - smoothstep(0.0085 - bAF, 0.0085 + bAF, abs(bF + 0.245));",
          "bCol = mix(bCol, uRustLo, bLine);",
          "float bP = max(bPrint(bD, uDc, uDr, uDu), bPrint(bD, -uDc, -uDr, uDu));",
          "bCol = mix(bCol, uInk, bP);",
          "bCol *= mix(1.0, 0.45, bSeam);",
          "diffuseColor.rgb = bCol;"
        ].join("\n"))
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.85, bSeam);")
        .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\nnormal = bPerturb(-vViewPosition, normal, vec2(dFdx(bH), dFdy(bH)), faceDirection);")
        .replace("#include <clearcoat_normal_fragment_begin>", "#include <clearcoat_normal_fragment_begin>\n#ifdef USE_CLEARCOAT\nclearcoatNormal = normal;\n#endif");
    };
    ballMat.customProgramCacheKey = function () { return "sb-ball-v1"; };
    var ball = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 48), ballMat);
    ball.castShadow = true;
    scene.add(ball);

    /* ---------- La trajectoire du tir et son ruban ---------- */
    var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
    // le ballon rebondit d'abord au sol, comme un dribble, puis part en lucarne
    var DRIB = V(1.02, 0, 10.05), COCK = V(1.06, 1.96, 9.95);
    var path = new THREE.CatmullRomCurve3([
      V(1.06, 1.96, 9.95), V(0.8, 2.14, 7.2), V(0.18, 2.1, 4.2), V(-0.44, 1.88, 1.6), V(-0.7, 1.63, 0.0), V(-0.72, 1.57, -0.74)
    ], false, "centripetal", 0.5);
    var CONTACT = path.getPoint(1);
    var trailSEG = 160, trailRAD = 12;
    var tCount = (trailSEG + 1) * (trailRAD + 1);
    var tPos = new Float32Array(tCount * 3), tNor = new Float32Array(tCount * 3), tCol = new Float32Array(tCount * 4);
    var tIdx = [];
    for (var i = 0; i < trailSEG; i++) for (var j = 0; j < trailRAD; j++) {
      var a = i * (trailRAD + 1) + j, b = (i + 1) * (trailRAD + 1) + j, c2 = (i + 1) * (trailRAD + 1) + j + 1, d = i * (trailRAD + 1) + j + 1;
      tIdx.push(a, d, b, b, d, c2);
    }
    (function () {
      var A = C(0x6E2504), B = C(0xA84309), D = C(0xE58A52), tmp = new THREE.Color();
      for (var s = 0; s <= trailSEG; s++) {
        var t = s / trailSEG;
        tmp.copy(A).lerp(B, smooth(t * 1.6)).lerp(D, smooth((t - 0.55) / 0.45));
        var al = smooth(t / 0.4);
        for (var r = 0; r <= trailRAD; r++) { var o = (s * (trailRAD + 1) + r) * 4; tCol[o] = tmp.r; tCol[o + 1] = tmp.g; tCol[o + 2] = tmp.b; tCol[o + 3] = al; }
      }
    })();
    var trailGeo = new THREE.BufferGeometry();
    trailGeo.setIndex(tIdx);
    trailGeo.setAttribute("position", new THREE.BufferAttribute(tPos, 3));
    trailGeo.setAttribute("normal", new THREE.BufferAttribute(tNor, 3));
    trailGeo.setAttribute("color", new THREE.BufferAttribute(tCol, 4));
    var trailMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.25, sheenColor: C(0xffc29c), envMapIntensity: 0.85, transparent: true, opacity: 1 });
    var trail = new THREE.Mesh(trailGeo, trailMat);
    trail.frustumCulled = false;
    trail.castShadow = true;
    scene.add(trail);
    var TP = new THREE.Vector3(), TN = new THREE.Vector3(), TB = new THREE.Vector3(), TT = new THREE.Vector3(), Pa = new THREE.Vector3(), Pb = new THREE.Vector3(), prevN = new THREE.Vector3();
    function buildTrail(head, tailLen, radius) {
      // le ruban suit la trajectoire jusqu'au ballon, fin à la queue, plus épais près du ballon
      var tail = Math.max(0, head - tailLen);
      prevN.set(0, 1, 0);
      for (var s = 0; s <= trailSEG; s++) {
        var u = s / trailSEG, t = lerp(tail, head, u);
        path.getPoint(clamp(t, 0, 1), TP);
        path.getPoint(clamp(t + 0.004, 0, 1), Pa); path.getPoint(clamp(t - 0.004, 0, 1), Pb);
        TT.subVectors(Pa, Pb); if (TT.lengthSq() < 1e-10) TT.set(0, 0, -1); TT.normalize();
        TN.copy(prevN).addScaledVector(TT, -prevN.dot(TT)); if (TN.lengthSq() < 1e-6) TN.set(1, 0, 0); TN.normalize();
        TB.crossVectors(TT, TN); prevN.copy(TN);
        var r = radius * Math.pow(u, 0.85) * (head > 0 ? 1 : 0);
        for (var j = 0; j <= trailRAD; j++) {
          var th = j / trailRAD * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
          var nx = cs * TN.x + sn * TB.x, ny = cs * TN.y + sn * TB.y, nz = cs * TN.z + sn * TB.z;
          var o = (s * (trailRAD + 1) + j) * 3;
          tPos[o] = TP.x + r * nx; tPos[o + 1] = TP.y + r * ny; tPos[o + 2] = TP.z + r * nz;
          tNor[o] = nx; tNor[o + 1] = ny; tNor[o + 2] = nz;
        }
      }
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.attributes.normal.needsUpdate = true;
    }

    /* ---------- La caméra ---------- */
    var camera = new THREE.PerspectiveCamera(38, 1, 0.05, 90);
    var KEYS = [
      [0.00, [2.05, 1.3, 12.6], [-0.45, 1.02, 0.0]],
      [0.15, [2.05, 1.34, 12.3], [-0.42, 1.06, 0.0]],
      [0.26, [1.95, 1.62, 12.35], [-0.3, 1.38, 0.0]],
      [0.36, [1.4, 1.9, 8.1], [-0.55, 1.6, 0.0]],
      [0.45, [3.45, 1.9, 2.8], [-0.7, 1.55, -0.3]],
      [0.53, [2.95, 1.72, -2.3], [-0.7, 1.5, 0.2]],
      [0.6, [1.25, 1.56, -3.2], [-0.72, 1.5, 0.3]],
      [0.7, [0.95, 1.42, -3.0], [-0.75, 1.2, 0.2]],
      [0.82, [0.45, 1.5, -2.95], [-0.62, 1.45, 0.3]],
      [1.0, [0.35, 1.5, -2.85], [-0.62, 1.45, 0.3]]
    ];
    var camCurve = new THREE.CatmullRomCurve3(KEYS.map(function (k) { return V(k[1][0], k[1][1], k[1][2]); }), false, "centripetal", 0.5);
    var tgtCurve = new THREE.CatmullRomCurve3(KEYS.map(function (k) { return V(k[2][0], k[2][1], k[2][2]); }), false, "centripetal", 0.5);
    function keyT(p) {
      for (var i = 0; i < KEYS.length - 1; i++) {
        if (p <= KEYS[i + 1][0]) {
          var f = (p - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0]);
          return (i + inOutCubic(f) * 0.6 + f * 0.4) / (KEYS.length - 1);
        }
      }
      return 1;
    }

    var W = 1, H = 1, baseFov = 38;
    function layout() {
      W = container.clientWidth || 1; H = container.clientHeight || 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxDpr || 1.75));
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      // en hauteur, on ouvre le champ pour garder le but et le ballon dans l'image
      baseFov = camera.aspect >= 1 ? 38 : 38 + (1 - camera.aspect) * 30;
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
    }
    layout();

    /* ---------- L'état de la scène pour un instant p ---------- */
    var progress = 0, clock = 0;
    var PRJ = new THREE.Vector3(), BP2 = new THREE.Vector3(), BP = new THREE.Vector3(), CP = new THREE.Vector3(), CT = new THREE.Vector3(), FW = new THREE.Vector3(), RT = new THREE.Vector3(), UP = new THREE.Vector3();
    var spinAxis = new THREE.Vector3(1, 0.2, 0).normalize(), qSpin = new THREE.Quaternion();
    var TOC = new THREE.Vector3(), SX = new THREE.Vector3(), SY = new THREE.Vector3(), WUP = new THREE.Vector3(0, 1, 0);
    var MA = new THREE.Matrix4(), MB = new THREE.Matrix4(), qT = new THREE.Quaternion(), qY = new THREE.Quaternion();
    function update() {
      var p = progress;
      // caméra
      var kt = keyT(p);
      camCurve.getPoint(kt, CP); tgtCurve.getPoint(kt, CT);
      // sur un écran en hauteur, le début vise un peu plus à droite pour garder le ballon et le but dans l'image
      var narrow = clamp((1 - camera.aspect) / 0.55, 0, 1);
      if (narrow > 0) CT.x += 0.75 * narrow * (1 - smooth(seg(p, 0.26, 0.4)));
      var sway = (1 - seg(p, 0.3, 0.45)) * 0.016;
      CP.x += Math.sin(clock * 0.7) * sway; CP.y += Math.sin(clock * 1.1) * sway * 0.6;

      // ballon
      var spin = 0, penetration = 0, flight = 0;
      if (p < K.fast[0]) {
        // le dribble ralentit puis le ballon monte armer le tir
        var w = inOutCubic(seg(p, K.windup[0], K.windup[1]));
        var bounce = Math.abs(Math.sin(clock * Math.PI / 0.58));
        BP.copy(DRIB); BP.y = R + 0.78 * bounce * (1 - smooth(w * 1.6));
        BP.lerp(COCK, w);
        spin = clock * 1.5 * (1 - w) + w * 0.6;
      } else if (p < K.net[0]) {
        flight = p < K.slow[0] ? outCubic(seg(p, K.fast[0], K.fast[1])) * 0.64 : 0.64 + seg(p, K.slow[0], K.slow[1]) * 0.36;
        path.getPoint(flight, BP);
        spin = 0.6 + flight * 26;
      } else {
        flight = 1;
        var n = outCubic(seg(p, K.net[0], K.net[1]));
        penetration = 0.36 * n;
        BP.copy(CONTACT); BP.z -= penetration; BP.y -= 0.05 * n;
        spin = 26.6 + n * 3;
        var dr = seg(p, K.drop[0], K.drop[1]);
        if (dr > 0) {
          // la balle glisse dans le filet et retombe avec un petit rebond
          var fall = dr < 0.62 ? Math.pow(dr / 0.62, 2) : 1 - 0.18 * Math.sin(Math.PI * (dr - 0.62) / 0.38);
          BP.y = lerp(CONTACT.y - 0.05, R, clamp(fall, 0, 1));
          BP.z = lerp(CONTACT.z - 0.36, -0.7, smooth(dr));
          BP.x = lerp(CONTACT.x, -0.95, smooth(dr));
          penetration = 0.36 * (1 - smooth(dr / 0.5));
          spin += dr * 4;
        }
        // à la fin, le ballon remonte au centre de l'image
        var ri = inOutCubic(seg(p, K.rise[0], K.rise[1]));
        if (ri > 0) {
          // on vise le centre de l'image de la caméra
          FW.subVectors(CT, CP).normalize();
          RT.copy(CP).addScaledVector(FW, 1.2);
          // un peu sous le centre, la question de fin s'écrit au-dessus du ballon
          UP.set(0, 1, 0); BP2.crossVectors(FW, UP).normalize(); UP.crossVectors(BP2, FW);
          RT.addScaledVector(UP, -0.16);
          BP.lerp(RT, ri);
          spin += ri * 2 + clock * 0.4 * ri;
        }
      }
      ball.position.copy(BP);
      qSpin.setFromAxisAngle(spinAxis, spin * 2.2);
      // en remontant, le ballon se tourne vers la caméra pour montrer le ruban et le nom, puis se balance doucement
      var show = inOutCubic(seg(p, K.rise[0] + 0.01, K.rise[1] + 0.02));
      if (show > 0) {
        TOC.subVectors(CP, BP).normalize();
        SX.crossVectors(WUP, TOC).normalize(); SY.crossVectors(TOC, SX);
        MB.makeBasis(SX, SY, TOC); MA.makeBasis(printR, printU, printC).transpose();
        qT.setFromRotationMatrix(MB.multiply(MA));
        qY.setFromAxisAngle(SY, -0.42 + 0.14 * Math.sin(clock * 0.75)); qT.premultiply(qY);
        qY.setFromAxisAngle(SX, 0.1 + 0.05 * Math.sin(clock * 0.6 + 1.3)); qT.premultiply(qY);
        qSpin.slerp(qT, show);
      }
      ball.quaternion.copy(qSpin);

      // pendant le vol, la caméra garde le ballon dans l'image
      var track = smooth(seg(p, 0.22, 0.3)) * (1 - smooth(seg(p, 0.5, 0.6))) * 0.5;
      if (track > 0) CT.lerp(BP, track);
      camera.position.copy(CP); camera.lookAt(CT);
      camera.fov = baseFov - 3 * smooth(seg(p, 0.26, 0.36)) + 5 * smooth(seg(p, 0.36, 0.5)) - 2 * smooth(seg(p, 0.5, 0.6));
      camera.updateProjectionMatrix();

      // ruban
      var head = p < K.fast[0] ? 0 : flight;
      var fade = 1 - smooth(seg(p, 0.78, 0.83));
      var appear = smooth((head - 0.27) / 0.12);
      trail.visible = head > 0.27 && fade > 0.01;
      if (trail.visible) {
        buildTrail(head, Math.min(0.5, head - 0.2), 0.04);
        trailMat.opacity = fade * appear;
      }

      // filet
      var pos = netGeo.attributes.position.array;
      var hit = penetration;
      var settle = seg(p, K.drop[0] + 0.02, K.drop[1] + 0.06);
      var osc = settle > 0 && settle < 1 ? 0.07 * Math.exp(-settle * 4) * Math.sin(settle * 18) : 0;
      var cx = CONTACT.x, cy = CONTACT.y, sig = 0.34;
      var back = panels[0];
      pos.set(netBase);
      if (hit > 0.001 || Math.abs(osc) > 0.0005) {
        for (var jj = 0; jj < back.nv; jj++) for (var ii = 0; ii < back.nu; ii++) {
          var nn = back.start + jj * back.nu + ii;
          var dx = netBase[nn * 3] - cx, dy = netBase[nn * 3 + 1] - cy;
          var g2 = Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig));
          var edge = Math.sin(Math.PI * ii / (back.nu - 1)) * Math.sin(Math.PI * jj / (back.nv - 1));
          pos[nn * 3 + 2] -= (hit * 1.05 + osc) * g2 * Math.pow(edge, 0.35);
        }
      }
      netGeo.attributes.position.needsUpdate = true;

      // la lumière baisse, le fond passe au noir
      var night = smooth(seg(p, K.night[0], K.night[1]));
      bg.copy(BG_DAY).lerp(BG_NIGHT, night);
      scene.fog.color.copy(bg);
      scene.fog.near = lerp(15, 1.22, night);
      scene.fog.far = lerp(38, 1.65, night);
      hemi.intensity = lerp(0.55, 0.22, night);
      sun.intensity = lerp(1.9, 0.8, night);
      rim.intensity = 3.2 * night;
      netMat.opacity = 0.55 * (1 - night);
      var flash = Math.exp(-Math.pow((p - (K.net[0] + 0.02)) / 0.018, 2));
      renderer.toneMappingExposure = 1.0 + 0.28 * flash;
    }

    /* ---------- Boucle ---------- */
    var running = false, raf = 0, last = 0, visible = true;
    function frame(t) {
      raf = 0;
      if (!running || !visible) return;
      var dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      clock += dt;
      update();
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
    function renderOnce() { update(); renderer.render(scene, camera); }
    renderOnce();

    return {
      canvas: canvas, start: start, stop: stop, renderOnce: renderOnce,
      setProgress: function (p) { progress = clamp(p, 0, 1); },
      getProgress: function () { return progress; },
      // la position du ballon à l'écran, de 0 à 1, pour centrer l'iris dessus
      ballScreen: function () {
        PRJ.copy(ball.position).project(camera);
        return { x: (PRJ.x + 1) / 2, y: (1 - PRJ.y) / 2 };
      },
      setClock: function (c) { clock = c; },
      // pour les essais de rendu uniquement
      debug: { ball: ball, camera: camera, scene: scene, renderer: renderer },
      destroy: function () {
        stop(); if (io) io.disconnect(); if (ro) ro.disconnect();
        renderer.dispose();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  window.SBMatch = { create: create, keys: K };
})();
