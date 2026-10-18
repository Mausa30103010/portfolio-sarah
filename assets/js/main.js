/* Sarah Beets, portfolio. Interactions et animations. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (hasGSAP) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    // la barre d'adresse des téléphones qui apparaît et disparaît ne doit pas recalculer la séquence figée
    window.ScrollTrigger.config({ ignoreMobileResize: true });
  }
  var gsap = window.gsap;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Roulement de lettres ---------- */
  function splitRoll(el) {
    if (el.getAttribute("data-rolled")) return;
    el.setAttribute("data-rolled", "1");
    var text = el.textContent;
    var vis = document.createElement("span");
    vis.className = "roll"; vis.setAttribute("aria-hidden", "true");
    var i = 0;
    text.split(/([ \t\n\r]+)/).forEach(function (part) {
      if (!part) return;
      if (/^[ \t\n\r]+$/.test(part)) { vis.appendChild(document.createTextNode(" ")); return; }
      var w = document.createElement("span"); w.className = "roll__w";
      Array.from(part).forEach(function (ch) {
        var c = document.createElement("span");
        c.className = "roll__c"; c.textContent = ch; c.setAttribute("data-c", ch);
        c.style.setProperty("--i", i++);
        w.appendChild(c);
      });
      vis.appendChild(w);
    });
    var sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = text;
    el.textContent = "";
    el.appendChild(sr); el.appendChild(vis);
  }
  if (!reduce) $$("[data-roll]").forEach(splitRoll);

  /* ---------- Défilement doux ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    try {
      lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
      if (hasGSAP) {
        lenis.on("scroll", window.ScrollTrigger.update);
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
      } else {
        var rafLoop = function (t) { lenis.raf(t); requestAnimationFrame(rafLoop); };
        requestAnimationFrame(rafLoop);
      }
    } catch (e) { lenis = null; }
  }
  function scrollToEl(el, immediate) {
    if (lenis) lenis.scrollTo(el, { duration: immediate ? 0 : 1.4, immediate: !!immediate });
    else el.scrollIntoView({ behavior: reduce || immediate ? "auto" : "smooth", block: "start" });
  }
  var locks = 0;
  function lockScroll(on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    var locked = locks > 0;
    if (lenis) { locked ? lenis.stop() : lenis.start(); }
    doc.style.overflow = locked ? "hidden" : "";
  }

  /* ---------- Toast ---------- */
  var toastEl = $(".toast"), toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
  }

  /* ---------- Le ruban 3D derrière la grande phrase ---------- */
  var heroRibbon = $(".hero__ribbon"), hero3d = null, heroVisible = true;
  if (heroRibbon && !reduce && window.SBRibbon) {
    try { hero3d = window.SBRibbon.create(heroRibbon, { maxDpr: finePointer ? 1.75 : 1.5 }); } catch (e) { hero3d = null; }
  }
  if (!hero3d) doc.classList.add("no-3d");
  function startHero() {
    if (!hero3d) return;
    hero3d.start();
  }

  /* ---------- En-tête : logo clair sur les panneaux sombres, fil d'Ariane ---------- */
  var header = $(".site-header");
  var tones = $$("[data-tone]");
  var headerTicking = false;
  var crumbHere = $(".crumbs__here"), crumbTxt = $(".crumbs__txt", crumbHere || document);
  var crumbSecs = $$("[data-crumb]"), crumbName = null;
  function updateCrumb() {
    if (!crumbHere) return;
    var line = Math.min(window.innerHeight * 0.4, 360), name = "";
    for (var i = 0; i < crumbSecs.length; i++) {
      var r = crumbSecs[i].getBoundingClientRect();
      if (r.top <= line && r.bottom > line) name = crumbSecs[i].getAttribute("data-crumb");
    }
    if (name === crumbName) return;
    crumbName = name;
    crumbHere.hidden = !name;
    crumbTxt.textContent = name;
    crumbHere.classList.remove("is-new"); void crumbHere.offsetWidth; crumbHere.classList.add("is-new");
  }
  function updateHeader() {
    headerTicking = false;
    var y = header.offsetHeight / 2, dark = false;
    for (var i = 0; i < tones.length; i++) {
      var r = tones[i].getBoundingClientRect();
      if (r.top <= y && r.bottom >= y && r.left <= 50 && r.right >= 50) dark = tones[i].getAttribute("data-tone") === "dark";
    }
    header.classList.toggle("is-dark", dark);
    updateCrumb();
  }
  window.addEventListener("scroll", function () { if (!headerTicking) { headerTicking = true; requestAnimationFrame(updateHeader); } }, { passive: true });
  updateHeader();

  /* ---------- Menu ---------- */
  var menu = $("#menu"), menuBtn = $(".menu-btn"), menuOpen = false;
  function openMenu() {
    if (!menu || menuOpen) return;
    menu.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add("is-open"); }); });
    menuOpen = true; menuBtn.setAttribute("aria-expanded", "true");
    var first = $(".menu__links a", menu); if (first) first.focus({ preventScroll: true });
  }
  function closeMenu(restoreFocus) {
    if (!menu || !menuOpen) return;
    menu.classList.remove("is-open"); menuOpen = false; menuBtn.setAttribute("aria-expanded", "false");
    setTimeout(function () { if (!menuOpen) menu.hidden = true; }, 450);
    if (restoreFocus) menuBtn.focus({ preventScroll: true });
  }
  if (menuBtn) menuBtn.addEventListener("click", function () { menuOpen ? closeMenu(true) : openMenu(); });
  if (menu) menu.addEventListener("click", function (e) { if (e.target === menu) closeMenu(true); });

  /* ---------- Fiches ---------- */
  var currentSheet = null, sheetReturn = null, pushedSheet = false;
  function pauseMediaIn(root) { $$("video", root).forEach(function (v) { try { v.pause(); } catch (e) {} }); }
  function openSheet(id, how) {
    var s = document.getElementById(id);
    if (!s || !s.classList.contains("sheet")) return false;
    if (currentSheet === s) return true;
    closeMenu(false);
    var prev = currentSheet;
    if (!prev) sheetReturn = document.activeElement;
    clearTimeout(s._closeTimer);
    s.classList.add("is-active");
    s.style.zIndex = prev ? 72 : 70;
    var panel = $(".sheet__panel", s);
    panel.scrollTop = 0;
    void s.offsetHeight;
    s.classList.add("is-open");
    currentSheet = s;
    if (!prev) {
      doc.classList.add("has-sheet");
      lockScroll(true);
      if (hero3d) hero3d.stop();
      if (contact3d) contact3d.stop();
      if (match3d) match3d.stop();
    } else {
      pauseMediaIn(prev);
      prev._closeTimer = setTimeout(function () {
        if (currentSheet !== prev) { prev.classList.remove("is-open", "is-active"); prev.style.zIndex = ""; }
        s.style.zIndex = "";
      }, reduce ? 0 : 960);
    }
    try {
      if (how === "push") { history.pushState({ sheet: id }, "", "#" + id); pushedSheet = true; }
      else if (how === "replace") history.replaceState({ sheet: id }, "", "#" + id);
    } catch (e) {}
    setTimeout(function () { panel.focus({ preventScroll: true }); }, 60);
    if (!reduce) $$(".sheet__hero .card__tile--1 video", s).forEach(function (v) {
      v.addEventListener("playing", function () { v.parentNode.classList.add("is-playing"); }, { once: true });
      playVideo(v);
    });
    return true;
  }
  function closeSheet(fromPop) {
    if (!currentSheet) return;
    var s = currentSheet; currentSheet = null;
    s.classList.remove("is-open");
    pauseMediaIn(s);
    s._closeTimer = setTimeout(function () { if (!s.classList.contains("is-open")) s.classList.remove("is-active"); }, reduce ? 0 : 960);
    doc.classList.remove("has-sheet");
    lockScroll(false);
    if (hero3d && heroVisible) hero3d.start();
    if (contact3d) contact3d.start();
    if (match3d && !matchAsleep) match3d.start();
    if (!fromPop) {
      try {
        if (pushedSheet && history.state && history.state.sheet) history.back();
        else history.replaceState(null, "", location.pathname + location.search);
      } catch (e) {}
    }
    pushedSheet = false;
    if (sheetReturn && sheetReturn.focus) sheetReturn.focus({ preventScroll: true });
  }
  window.addEventListener("popstate", function () {
    var id = (location.hash || "").slice(1);
    var el = id && document.getElementById(id);
    if (el && el.classList.contains("sheet")) openSheet(id, null);
    else if (currentSheet) closeSheet(true);
  });
  $$("[data-sheet-close]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); closeSheet(false); });
  });

  /* ---------- Liens d'ancrage ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    if (el.classList.contains("sheet")) {
      openSheet(id, currentSheet ? "replace" : "push");
      return;
    }
    closeMenu(false);
    var go = function () {
      scrollToEl(el);
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      try { el.focus({ preventScroll: true }); } catch (err) {}
    };
    if (currentSheet) { closeSheet(false); setTimeout(go, reduce ? 0 : 450); }
    else go();
  });

  /* ---------- Flèche pour remonter, toujours sur le côté dès qu'on a quitté le haut ---------- */
  var totop = $(".totop");
  if (totop) {
    var totopTick = false;
    var updateTotop = function () {
      totopTick = false;
      var on = false, dark = false;
      if (currentSheet) {
        var sp = $(".sheet__panel", currentSheet);
        on = !!sp && sp.scrollTop > 360;
      } else {
        on = (window.pageYOffset || doc.scrollTop) > Math.min(window.innerHeight * 0.5, 420);
        var x = window.innerWidth - 44, y = window.innerHeight - 44;
        for (var i = 0; i < tones.length; i++) {
          var r = tones[i].getBoundingClientRect();
          if (r.top <= y && r.bottom >= y && r.left <= x && r.right >= x) dark = tones[i].getAttribute("data-tone") === "dark";
        }
      }
      totop.classList.toggle("is-on", on && !menuOpen);
      totop.classList.toggle("is-dark", dark);
    };
    var askTotop = function () { if (!totopTick) { totopTick = true; requestAnimationFrame(updateTotop); } };
    window.addEventListener("scroll", askTotop, { passive: true });
    window.addEventListener("resize", askTotop);
    $$(".sheet__panel").forEach(function (sp) { sp.addEventListener("scroll", askTotop, { passive: true }); });
    if (window.MutationObserver) {
      var mo = new MutationObserver(askTotop);
      mo.observe(doc, { attributes: true, attributeFilter: ["class"] });
      if (menu) mo.observe(menu, { attributes: true, attributeFilter: ["class"] });
    }
    totop.addEventListener("click", function (e) {
      if (!currentSheet) return; /* sur la page, le lien vers l'accueil fait le travail avec le défilement doux */
      e.preventDefault(); e.stopPropagation();
      var sp = $(".sheet__panel", currentSheet);
      if (sp) { try { sp.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); } catch (err) { sp.scrollTop = 0; } }
    });
    updateTotop();
  }

  /* ---------- Héro : écran de chargement puis entrée ---------- */
  var loader = $("#loader");
  var skipLoader = doc.classList.contains("no-loader") || !loader;
  var introPlayed = false;
  function playIntro() {
    if (introPlayed) return; introPlayed = true;
    startHero();
    if (hasGSAP && !reduce) {
      var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".hl > span", { yPercent: 112, duration: 1.5, stagger: 0.06 }, 0.15)
        .from(".site-header__start, .site-header__actions", { autoAlpha: 0, y: -16, duration: 1, stagger: 0.08 }, 0.4)
        .from(".hero__down", { autoAlpha: 0, y: 18, duration: 1.2 }, 0.9);
    }
    var hash = (location.hash || "").slice(1);
    var target = hash && document.getElementById(hash);
    if (target && target.classList.contains("sheet")) setTimeout(function () { openSheet(hash, null); }, skipLoader ? 0 : 400);
    else if (target) setTimeout(function () { scrollToEl(target, true); }, 50);
  }
  if (skipLoader) {
    if (loader) loader.classList.add("is-gone");
    if (document.readyState === "complete") playIntro();
    else { setTimeout(playIntro, 30); }
  } else {
    var count = $(".loader__count", loader), bar = $(".loader__bar", loader);
    var tasks = { fonts: false, load: false, min: false };
    var shown = 0, finished = false, t0 = performance.now();
    var mark = function (k) { tasks[k] = true; };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { mark("fonts"); }); else mark("fonts");
    if (document.readyState === "complete") mark("load"); else window.addEventListener("load", function () { mark("load"); });
    setTimeout(function () { mark("min"); }, 1300);
    var finish = function () {
      if (finished) return; finished = true;
      count.textContent = "100"; bar.style.setProperty("--p", 1);
      store.set("sb-seen", "1");
      setTimeout(function () {
        loader.classList.add("is-done");
        playIntro();
        setTimeout(function () { loader.classList.add("is-gone"); }, 1100);
      }, 180);
    };
    var loop = function () {
      if (finished) return;
      var n = 0, total = 0;
      for (var k in tasks) { total++; if (tasks[k]) n++; }
      var target = 12 + 88 * n / total;
      shown += (target - shown) * 0.06 + 0.15;
      if (shown > target) shown = target;
      count.textContent = String(Math.floor(shown)).padStart(3, "0");
      bar.style.setProperty("--p", (shown / 100).toFixed(3));
      if (n === total && shown >= 99.4) return finish();
      if (performance.now() - t0 > 6500) return finish();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* Le ruban se met en pause hors de l'écran et remonte quand on quitte le héro */
  if (hero3d && "IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      heroVisible = en[0].isIntersecting;
      if (!currentSheet && introPlayed) { heroVisible ? hero3d.start() : hero3d.stop(); }
    }).observe(heroRibbon);
  }
  if (hero3d && hasGSAP && !reduce) {
    window.ScrollTrigger.create({
      trigger: ".hero", start: "top top", end: "bottom top",
      onUpdate: function (st) { hero3d.setScroll(st.progress); }
    });
  }

  /* ---------- Sur le terrain : la séquence handball ----------
     La section se fige, l'écran de la tablette grandit jusqu'à remplir la page, le tir part, la caméra passe
     derrière le but, l'iris se ferme sur le ballon puis se rouvre sur la photo de Sarah en noir et blanc,
     d'abord floue puis nette, avec la question de fin. */
  var match3d = null, matchAsleep = false;
  (function () {
    var root = $(".match");
    if (!root || reduce || !hasGSAP || !window.SBMatch) return;
    var pin = $(".match__pin", root), stage = $(".match__stage", root), device = $(".match__device", root), screen = $(".match__screen", root);
    var text = $(".match__text", root), iris = $(".match__iris", root);
    var photo = $(".match__photo", root), pMid = $(".match__photo-mid", root), pSharp = $(".match__photo-sharp", root);
    var kicker = $(".match__kicker", root), cta = $(".match__cta", root), lines = $$(".match__title .line > span", root);
    try { match3d = window.SBMatch.create(stage, { maxDpr: finePointer ? 1.5 : 1.25, shadow: finePointer ? 2048 : 1024 }); } catch (e) { match3d = null; }
    if (!match3d) return;
    root.classList.add("is-live");

    var W = 1, H = 1, slot = { x: 0, y: 0, w: 1, h: 1 }, slotR = 20, hx = 50, hy = 30;
    function measure() {
      var keep = device.style.transform;
      device.style.transform = "none";
      var pr = pin.getBoundingClientRect(), sr = screen.getBoundingClientRect();
      W = pr.width || window.innerWidth; H = pr.height || window.innerHeight;
      slot = { x: sr.left - pr.left, y: sr.top - pr.top, w: sr.width || 1, h: sr.height || 1 };
      slotR = parseFloat(window.getComputedStyle(screen).borderTopLeftRadius) || 20;
      device.style.transform = keep;
      hy = header.offsetHeight / 2;
    }
    function ease(t) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function sm(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
    function seg(p, a, b) { return Math.max(0, Math.min(1, (p - a) / (b - a))); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    // les repères de la fin : l'iris se ferme (0.79 à 0.862), la photo prend la place du terrain, l'iris se rouvre (0.866 à 0.915)
    var SHUT = 0.862, OPEN = [0.866, 0.915];
    var mx = 0, my = 0, smx = 0, smy = 0, isDark = false, ix = 0.5, iy = 0.42, irisSet = false;
    function apply(p) {
      match3d.setProgress(p);
      var e = ease(seg(p, 0, 0.14));
      var rx = lerp(slot.x, 0, e), ry = lerp(slot.y, 0, e), rw = lerp(slot.w, W, e), rh = lerp(slot.h, H, e);
      var sc = Math.max(rw / W, rh / H);
      var cx = rx + rw / 2 - W / 2, cy = ry + rh / 2 - H / 2;
      stage.style.transform = "translate3d(" + cx.toFixed(2) + "px," + cy.toFixed(2) + "px,0) scale(" + sc.toFixed(5) + ")";
      var ix0 = Math.max(0, (W - rw / sc) / 2), iy0 = Math.max(0, (H - rh / sc) / 2), rr = lerp(slotR, 0, e) / sc;
      stage.style.clipPath = e >= 1 ? "none" : "inset(" + iy0.toFixed(2) + "px " + ix0.toFixed(2) + "px round " + rr.toFixed(2) + "px)";
      var k = rw / slot.w, dx = rx + rw / 2 - (slot.x + slot.w / 2), dy = ry + rh / 2 - (slot.y + slot.h / 2);
      device.style.transform = e > 0 ? "translate3d(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px,0) scale(" + k.toFixed(4) + ")" : "";
      device.style.opacity = (1 - sm(seg(p, 0.04, 0.11))).toFixed(3);
      text.style.opacity = (1 - sm(seg(p, 0, 0.055))).toFixed(3);
      text.style.transform = "translate3d(" + (sm(seg(p, 0, 0.08)) * 70).toFixed(1) + "px,0,0)";
      text.style.visibility = p > 0.08 ? "hidden" : "";

      // l'iris suit le ballon pendant qu'il se ferme, puis se rouvre au même endroit sur la photo
      if (p < SHUT || !irisSet) {
        if (!irisSet && p >= SHUT) match3d.renderOnce();
        var bs = match3d.ballScreen(); ix = bs.x; iy = bs.y; irisSet = true;
      }
      var px = ix * W, py = iy * H;
      var far = Math.hypot(Math.max(px, W - px), Math.max(py, H - py)) + 2;
      var rad;
      if (p < 0.864) rad = lerp(far, Math.min(W, H) * 0.13, sm(seg(p, 0.79, 0.84))) * (1 - sm(seg(p, 0.845, SHUT)));
      else rad = far * ease(seg(p, OPEN[0], OPEN[1]));
      var irisOn = p > 0.79 && p < OPEN[1];
      iris.style.opacity = irisOn ? "1" : "0";
      if (irisOn) {
        iris.style.setProperty("--ix", (ix * 100).toFixed(2) + "%");
        iris.style.setProperty("--iy", (iy * 100).toFixed(2) + "%");
        iris.style.setProperty("--ir", rad.toFixed(1) + "px");
      }
      // le logo passe en blanc tant que le haut de l'écran est dans le noir
      var dark = irisOn && Math.hypot(hx - px, hy - py) > rad;
      if (dark !== isDark) { isDark = dark; pin.setAttribute("data-tone", dark ? "dark" : "light"); updateHeader(); }

      // la photo remplace le terrain quand l'iris est fermé, et la 3D se met en pause
      var showPhoto = p >= 0.858;
      photo.style.visibility = showPhoto ? "visible" : "hidden";
      var asleep = p > 0.868;
      if (asleep !== matchAsleep) {
        matchAsleep = asleep;
        stage.style.visibility = asleep ? "hidden" : "";
        if (asleep) match3d.stop(); else if (!currentSheet) match3d.start();
      }
      if (showPhoto) {
        // la mise au point : du flou au net pendant que la question arrive
        pMid.style.opacity = sm(seg(p, 0.888, 0.928)).toFixed(3);
        pSharp.style.opacity = sm(seg(p, 0.922, 0.962)).toFixed(3);
        photo.style.setProperty("--ps", lerp(1.1, 1.025, ease(seg(p, SHUT, 0.97))).toFixed(4));
        photo.style.setProperty("--px", (smx * -10).toFixed(1) + "px");
        photo.style.setProperty("--py", (smy * -7).toFixed(1) + "px");
      }
      kicker.style.opacity = sm(seg(p, 0.896, 0.926)).toFixed(3);
      for (var j = 0; j < lines.length; j++) {
        var lt = ease(seg(p, 0.9 + j * 0.008, 0.936 + j * 0.008));
        lines[j].style.transform = "translate3d(0," + ((1 - lt) * 112).toFixed(1) + "%,0)";
      }
      var ct = sm(seg(p, 0.935, 0.96));
      cta.style.opacity = ct.toFixed(3);
      cta.style.visibility = ct > 0.05 ? "visible" : "hidden";
    }

    var target = 0, cur = 0, raf = 0, lastT = 0;
    function tick(t) {
      raf = 0;
      // un lissage réglé sur le temps écoulé, pour la même fluidité quel que soit l'appareil
      var dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 1 / 60; lastT = t;
      var k = 1 - Math.exp(-dt * 7.5), km = 1 - Math.exp(-dt * 4);
      var d = target - cur;
      cur = Math.abs(d) < 0.00015 ? target : cur + d * k;
      smx += (mx - smx) * km; smy += (my - smy) * km;
      apply(cur);
      if (cur !== target || Math.abs(mx - smx) > 0.002 || Math.abs(my - smy) > 0.002) raf = requestAnimationFrame(tick);
      else lastT = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }
    window.addEventListener("pointermove", function (ev) {
      if (cur < 0.86 || ev.pointerType === "touch") return;
      mx = ev.clientX / window.innerWidth * 2 - 1; my = ev.clientY / window.innerHeight * 2 - 1;
      kick();
    }, { passive: true });

    measure();
    apply(0);
    window.ScrollTrigger.create({
      trigger: root, start: "top top", end: "+=480%", pin: pin, anticipatePin: 1,
      onUpdate: function (st) { target = st.progress; kick(); },
      onRefresh: function (st) { measure(); target = st.progress; cur = target; apply(cur); }
    });
    if (!matchAsleep) match3d.start();
  })();

  /* Le même ruban revient derrière « Collaborons ! », il se dessine quand la section arrive */
  var contact3d = null;
  (function () {
    var box = $(".contact__ribbon");
    if (!box || reduce || !window.SBRibbon || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting || contact3d || !box.offsetWidth) return;
      io.disconnect();
      try {
        contact3d = window.SBRibbon.create(box, {
          maxDpr: 1.5, scrollCenter: 0.5, scrollAmp: 0.5,
          points: [[1.3, 0.78, -1.0], [0.74, 0.7, -0.4], [0.42, 0.22, 0.4], [0.16, -0.3, 1.0], [-0.3, -0.52, 1.2], [-0.64, -0.28, 0.6],
                   [-0.62, 0.24, -0.2], [-0.28, 0.4, -0.6], [-0.02, 0.06, 0.2], [-0.06, -0.5, 0.9], [-0.42, -0.95, 0.6], [-1.3, -1.12, -0.6]]
        });
      } catch (e) { contact3d = null; }
      if (!contact3d) return;
      if (!currentSheet) contact3d.start();
      if (hasGSAP) window.ScrollTrigger.create({
        trigger: ".contact", start: "top bottom", end: "bottom top",
        onUpdate: function (st) { contact3d.setScroll(st.progress); }
      });
    }, { rootMargin: "120px 0px" });
    io.observe(box);
  })();

  /* ---------- Titres révélés, parallaxe, ruban ---------- */
  if (hasGSAP && !reduce) {
    $$(".reveal").forEach(function (title) {
      gsap.from($$(".line > span", title), {
        yPercent: 108, duration: 1.4, ease: "expo.out", stagger: 0.09,
        scrollTrigger: { trigger: title, start: "top 88%", once: true }
      });
    });
    $$("[data-parallax]").forEach(function (el) {
      var v = parseFloat(el.getAttribute("data-parallax")) || -6;
      gsap.fromTo($("img", el) || el, { yPercent: -v }, { yPercent: v, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  /* Vague de lettres sur le grand « Collaborons ! » quand il arrive à l'écran */
  function wave(el) {
    el.classList.add("is-rolled");
    var chars = $$(".roll__c", el), n = chars.length;
    setTimeout(function () {
      chars.forEach(function (c) { c.style.transition = "none"; });
      el.classList.remove("is-rolled");
      void el.offsetHeight;
      chars.forEach(function (c) { c.style.transition = ""; });
    }, 650 + n * 16);
  }
  var bigTitle = $(".contact__title");
  if (bigTitle && hasGSAP && !reduce) {
    window.ScrollTrigger.create({ trigger: bigTitle, start: "top 80%", onEnter: function () { wave(bigTitle); }, onEnterBack: function () { wave(bigTitle); } });
  }

  /* ---------- Clients : l'accordéon de logos ----------
     Sur grand écran la bande sous la souris (ou atteinte au clavier) s'ouvre et reste ouverte.
     Sur un grand écran tactile, le premier toucher ouvre la bande et le second ouvre la fiche. */
  (function () {
    var list = $("[data-logos]");
    if (!list) return;
    var items = $$(".logos__item", list);
    var wide = window.matchMedia ? window.matchMedia("(min-width: 1100px)") : { matches: false };
    var lx = -1, ly = -1;
    function open(it) { items.forEach(function (x) { x.classList.toggle("is-open", x === it); }); }
    list.addEventListener("pointermove", function (ev) {
      if (!wide.matches || ev.pointerType === "touch") return;
      if (ev.clientX === lx && ev.clientY === ly) return;
      lx = ev.clientX; ly = ev.clientY;
      var it = ev.target.closest ? ev.target.closest(".logos__item") : null;
      if (it && !it.classList.contains("is-open")) open(it);
    }, { passive: true });
    items.forEach(function (it) {
      it.addEventListener("focusin", function () { if (wide.matches) open(it); });
      var strip = it.firstElementChild;
      if (strip) strip.addEventListener("click", function (ev) {
        if (wide.matches && !it.classList.contains("is-open")) { ev.preventDefault(); ev.stopPropagation(); open(it); }
      });
    });
  })();

  /* ---------- Compteurs ---------- */
  var fmt = function (v, dec) {
    return v.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/\s/g, " ");
  };
  $$("[data-count]").forEach(function (el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var pre = el.getAttribute("data-prefix") || "", suf = el.getAttribute("data-suffix") || "";
    var finalText = pre + fmt(target, dec) + suf;
    el.setAttribute("aria-label", finalText);
    if (!hasGSAP || reduce) return;
    var obj = { v: 0 };
    window.ScrollTrigger.create({
      trigger: el, start: "top 92%", once: true,
      onEnter: function () {
        gsap.to(obj, { v: target, duration: 1.9, ease: "power3.out",
          onUpdate: function () { el.textContent = pre + fmt(obj.v, dec) + suf; },
          onComplete: function () { el.textContent = finalText; } });
      }
    });
  });

  /* ---------- Services : les cartes qui s'empilent ---------- */
  var svcCards = $$(".svc-card");
  function playIn(el) { $$("video", el).forEach(function (v) { if (!v.getAttribute("src")) v.src = v.getAttribute("data-src"); var p = v.play(); if (p && p.catch) p.catch(function () {}); }); }
  function pauseIn(el) { $$("video", el).forEach(function (v) { try { v.pause(); } catch (e) {} }); }
  svcCards.forEach(function (card) {
    $$(".svc-m--video video", card).forEach(function (v) { v.addEventListener("playing", function () { v.parentNode.classList.add("is-playing"); }); });
  });
  if (svcCards.length && hasGSAP && !reduce) {
    svcCards.forEach(function (card, i) {
      var next = svcCards[i + 1];
      if (!next) return;
      gsap.fromTo(card, { "--shrink": 0 }, {
        "--shrink": 1, ease: "none",
        scrollTrigger: {
          trigger: next, start: "top bottom", scrub: true,
          end: function () { return "top " + (header.offsetHeight + (i + 1) * 10.4) + "px"; },
          onUpdate: function (st) { card._covered = st.progress > 0.55; if (card._covered) pauseIn(card); else if (card._seen) playIn(card); }
        }
      });
    });
  }
  if (!reduce && "IntersectionObserver" in window) {
    var svcIO = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        var card = x.target;
        card._seen = x.isIntersecting;
        if (x.isIntersecting && !card._covered) playIn(card); else pauseIn(card);
      });
    }, { threshold: 0.35 });
    svcCards.forEach(function (c) { if ($(".svc-m--video", c)) svcIO.observe(c); });
  }

  /* ---------- Vidéos d'aperçu (cartes, panneau reels) ---------- */
  function playVideo(v) {
    if (!v) return;
    if (!v.getAttribute("src")) v.src = v.getAttribute("data-src");
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  if (finePointer) {
    $$(".card__link").forEach(function (a) {
      var vids = $$(".card__tile--video video", a);
      if (!vids.length) return;
      vids.forEach(function (v) { v.addEventListener("playing", function () { v.parentNode.classList.add("is-playing"); }); });
      a.addEventListener("pointerenter", function () { vids.forEach(playVideo); });
      a.addEventListener("pointerleave", function () { vids.forEach(function (v) { v.pause(); v.parentNode.classList.remove("is-playing"); }); });
    });
  }

  /* ---------- Chiffres : le téléphone qui montre la preuve ---------- */
  (function () {
    var grid = $("[data-proofs]");
    if (!grid) return;
    var btns = $$(".stat", grid), shots = $$(".device__shot", grid), device = $("[data-device]", grid), cap = $(".device__caption", grid);
    var panel = grid.closest(".numbers__panel") || grid;
    var cur = 0, timer = null, inView = false, hover = false, CYCLE = 5500;
    grid.style.setProperty("--cycle", CYCLE + "ms");
    function select(i, focus) {
      cur = i;
      btns.forEach(function (b, k) {
        var on = k === i;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        if (on) { var bar = $(".stat__bar", b); if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; } }
      });
      shots.forEach(function (s, k) { s.classList.toggle("is-on", k === i); });
      if (device) device.classList.toggle("is-land", shots[i].classList.contains("device__shot--land"));
      if (cap) cap.textContent = shots[i].getAttribute("data-caption") || "";
      if (focus) btns[i].focus();
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      var run = !reduce && inView && !hover;
      grid.classList.toggle("is-cycling", run);
      if (run) timer = setTimeout(function () { select((cur + 1) % btns.length); }, CYCLE);
    }
    btns.forEach(function (b, k) {
      b.addEventListener("click", function () { select(k); });
      if (finePointer) b.addEventListener("pointerenter", function () { if (k !== cur) select(k); });
      b.addEventListener("keydown", function (e) {
        var n = btns.length;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); select((cur + 1) % n, true); }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); select((cur + n - 1) % n, true); }
        if (e.key === "Home") { e.preventDefault(); select(0, true); }
        if (e.key === "End") { e.preventDefault(); select(n - 1, true); }
      });
    });
    var statsBox = $(".stats", grid);
    statsBox.addEventListener("pointerenter", function () { hover = true; grid.classList.add("is-paused"); schedule(); });
    statsBox.addEventListener("pointerleave", function () { hover = false; grid.classList.remove("is-paused"); schedule(); });
    grid.addEventListener("focusin", function () { hover = true; schedule(); });
    grid.addEventListener("focusout", function () { hover = false; schedule(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { inView = en[0].isIntersecting; schedule(); }, { threshold: 0.35 }).observe(grid);
    }
    // le téléphone se penche vers le curseur
    if (device && finePointer && !reduce) {
      panel.addEventListener("pointermove", function (e) {
        var r = device.getBoundingClientRect();
        var x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.35)));
        var y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight * 0.45)));
        device.classList.add("is-tracking");
        device.style.setProperty("--ry", (x * 16).toFixed(2) + "deg");
        device.style.setProperty("--rx", (-y * 11).toFixed(2) + "deg");
        device.style.setProperty("--gx", (x * 14).toFixed(1) + "%");
      });
      panel.addEventListener("pointerleave", function () {
        device.classList.remove("is-tracking");
        device.style.setProperty("--ry", "0deg"); device.style.setProperty("--rx", "0deg"); device.style.setProperty("--gx", "0%");
      });
    }
    select(0);
  })();

  /* ---------- Reels : le panneau plein écran et son dock ---------- */
  var show = $("[data-reelshow]");
  function dockData(btn) {
    return { src: btn.getAttribute("data-src"), poster: $("img", btn).getAttribute("src"), client: btn.getAttribute("data-client"), title: btn.getAttribute("data-title") || "" };
  }
  if (show) {
    var showPanel = $(".reelshow__panel", show), dock = $(".dock", show);
    var dockItems = $$(".dock__item", show), dockBtns = $$(".dock__btn", show);
    var narrowReels = window.matchMedia("(max-width: 760px)");
    function dockPlay(item) {
      var v = $("video", item), btn = $(".dock__btn", item);
      if (!v) return;
      if (!v.getAttribute("src")) v.src = btn.getAttribute("data-src");
      v.onplaying = function () { item.classList.add("is-playing"); };
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    function dockStop(item) { var v = $("video", item); if (v) { try { v.pause(); } catch (e) {} } item.classList.remove("is-playing"); }
    if (hasGSAP && !reduce) {
      showPanel.setAttribute("data-tone", "light");
      gsap.fromTo(showPanel,
        { "--cy": narrowReels.matches ? "10%" : "14%", "--cx": narrowReels.matches ? "5%" : "22%", "--cr": "22px", "--inner": 0.78, "--ui": 0 },
        { "--cy": "0%", "--cx": "0%", "--cr": "0px", "--inner": 1, "--ui": 1, ease: "none",
          scrollTrigger: {
            trigger: show, start: "top 70%", end: "top top", scrub: 0.6, invalidateOnRefresh: true,
            onUpdate: function (st) { showPanel.setAttribute("data-tone", st.progress > 0.55 ? "dark" : "light"); }
          } });
    }
    // le reel survolé grandit, ses voisins un peu moins, comme un dock
    if (finePointer && !reduce) {
      var mag = dockItems.map(function () { return 1; }), dockX = null, dockRaf = 0;
      var dockLoop = function () {
        dockRaf = 0;
        if (narrowReels.matches) { dockItems.forEach(function (it) { it.style.removeProperty("--m"); }); return; }
        var centers = dockItems.map(function (it) { var r = it.getBoundingClientRect(); return r.left + r.width / 2; });
        var w0 = dockItems[0].offsetWidth / (mag[0] || 1), moving = false;
        dockItems.forEach(function (it, k) {
          var t = 1;
          if (dockX !== null) { var d = (dockX - centers[k]) / (w0 * 1.3); t = 1 + 0.3 * Math.exp(-d * d); }
          mag[k] += (t - mag[k]) * 0.2;
          if (Math.abs(t - mag[k]) > 0.001) moving = true;
          it.style.setProperty("--m", mag[k].toFixed(4));
        });
        if (moving) dockRaf = requestAnimationFrame(dockLoop);
      };
      dock.addEventListener("pointermove", function (e) { dockX = e.clientX; if (!dockRaf) dockRaf = requestAnimationFrame(dockLoop); });
      dock.addEventListener("pointerleave", function () { dockX = null; if (!dockRaf) dockRaf = requestAnimationFrame(dockLoop); });
      dockItems.forEach(function (it) {
        it.addEventListener("pointerenter", function () { dockItems.forEach(function (o) { if (o !== it) dockStop(o); }); dockPlay(it); });
        it.addEventListener("pointerleave", function () { dockStop(it); });
      });
    }
    // sur mobile, le reel du centre se lance tout seul, sans le son
    if (!reduce && "IntersectionObserver" in window) {
      var dockIO = new IntersectionObserver(function (en) {
        if (!narrowReels.matches && finePointer) return;
        en.forEach(function (x) { if (x.isIntersecting) dockPlay(x.target); else dockStop(x.target); });
      }, { root: narrowReels.matches ? dock : null, threshold: 0.75 });
      dockItems.forEach(function (it) { dockIO.observe(it); });
    }
    dockBtns.forEach(function (b, k) {
      b.addEventListener("click", function () {
        dockItems.forEach(dockStop);
        openReel(dockBtns.map(dockData), k);
      });
    });
  }

  /* ---------- Carrousels façon Instagram ---------- */
  $$("[data-carousel]").forEach(function (fig) {
    var track = $(".ig__track", fig), slides = $$(".ig__slide", fig), n = slides.length;
    var countEl = $(".ig__count", fig), dots = $$(".ig__dots span", fig);
    var prev = $(".ig__nav--prev", fig), next = $(".ig__nav--next", fig);
    var map = $(".pano-map", fig), idx = -1;
    var go = function (i) { i = Math.max(0, Math.min(n - 1, i)); track.scrollTo({ left: i * track.clientWidth, behavior: reduce ? "auto" : "smooth" }); };
    var sync = function () {
      var w = Math.max(1, track.clientWidth);
      var i = Math.round(track.scrollLeft / w);
      if (map) map.style.setProperty("--i", (track.scrollLeft / w).toFixed(3));
      if (i === idx) return; idx = i;
      if (countEl) countEl.textContent = (i + 1) + "/" + n;
      dots.forEach(function (d, k) { d.classList.toggle("is-on", k === i); });
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === n - 1;
      slides.forEach(function (s, k) { s.setAttribute("aria-hidden", k === i ? "false" : "true"); });
    };
    var t = null;
    track.addEventListener("scroll", function () { if (!t) t = requestAnimationFrame(function () { t = null; sync(); }); }, { passive: true });
    if (prev) prev.addEventListener("click", function () { go(idx - 1); });
    if (next) next.addEventListener("click", function () { go(idx + 1); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); }
    });
    var down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
      track.style.scrollSnapType = "none"; track.style.cursor = "grabbing";
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", function (e) {
      if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 3) moved = true;
      track.scrollLeft = sl - dx;
    });
    var end = function (e) {
      if (!down) return; down = false; track.style.cursor = "";
      var dx = e.clientX - sx, w = track.clientWidth, base = Math.round(sl / w);
      var target = Math.abs(dx) > w * 0.12 ? base + (dx < 0 ? 1 : -1) : base;
      target = Math.max(0, Math.min(n - 1, target));
      track.scrollTo({ left: target * w, behavior: "smooth" });
      setTimeout(function () { track.style.scrollSnapType = ""; }, 450);
    };
    track.addEventListener("pointerup", end); track.addEventListener("pointercancel", end);
    track.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    window.addEventListener("resize", function () { idx = -1; sync(); });
    sync();
  });

  /* ---------- Lecteur (stories et reels) ---------- */
  var viewer = $("#viewer");
  var vMedia = $(".viewer__media", viewer), vBars = $(".viewer__bars", viewer), vName = $(".viewer__name", viewer), vAvatar = $(".viewer__avatar", viewer);
  var vSound = $(".viewer__sound", viewer), vCaption = $(".viewer__caption", viewer), vClose = $(".viewer__close", viewer);
  var storySets = [];
  try { storySets = JSON.parse($("#stories-data").textContent); } catch (e) {}
  var mode = null, setIdx = 0, itemIdx = 0, timer = null, tween = null, lastFocus = null, reelList = [], reelIdx = 0, paused = false;
  var DURATION = 5200;

  function openViewer() {
    lastFocus = document.activeElement;
    viewer.hidden = false;
    requestAnimationFrame(function () { viewer.classList.add("is-open"); });
    lockScroll(true);
    vClose.focus({ preventScroll: true });
  }
  function closeViewer() {
    stopTimer();
    var v = $("video", vMedia); if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
    viewer.classList.remove("is-open");
    lockScroll(false);
    setTimeout(function () { if (!viewer.classList.contains("is-open")) { viewer.hidden = true; vMedia.innerHTML = ""; } }, 350);
    mode = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function stopTimer() { if (tween && tween.kill) tween.kill(); tween = null; clearTimeout(timer); }
  function initials(name) { return name.split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase(); }

  function showStory() {
    stopTimer();
    var set = storySets[setIdx]; if (!set) return closeViewer();
    viewer.classList.remove("is-video");
    vName.textContent = set.name; vAvatar.textContent = initials(set.name);
    vMedia.innerHTML = "";
    var img = new Image(); img.src = set.items[itemIdx]; img.alt = set.name + ", story " + (itemIdx + 1) + " sur " + set.items.length;
    vMedia.appendChild(img);
    vBars.innerHTML = set.items.map(function (_, k) { return '<span class="' + (k < itemIdx ? "is-done" : "") + '"><i></i></span>'; }).join("");
    var bar = vBars.children[itemIdx].firstChild;
    var startBar = function () {
      if (hasGSAP) {
        tween = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: DURATION / 1000, ease: "none", onComplete: nextStory });
        if (paused) tween.pause();
      } else { bar.style.transition = "transform " + DURATION + "ms linear"; requestAnimationFrame(function () { bar.style.transform = "scaleX(1)"; }); timer = setTimeout(nextStory, DURATION); }
    };
    if (img.complete) startBar(); else { img.onload = startBar; img.onerror = startBar; }
    var nx = set.items[itemIdx + 1]; if (nx) { var p = new Image(); p.src = nx; }
  }
  function nextStory() {
    var set = storySets[setIdx];
    if (itemIdx < set.items.length - 1) { itemIdx++; showStory(); }
    else if (setIdx < storySets.length - 1) { setIdx++; itemIdx = 0; showStory(); }
    else closeViewer();
  }
  function prevStory() {
    if (itemIdx > 0) { itemIdx--; showStory(); }
    else if (setIdx > 0) { setIdx--; itemIdx = storySets[setIdx].items.length - 1; showStory(); }
    else showStory();
  }
  function openStories(s, i) { mode = "story"; setIdx = s; itemIdx = i || 0; paused = false; openViewer(); showStory(); }

  function showReel() {
    stopTimer();
    var r = reelList[reelIdx]; if (!r) return closeViewer();
    viewer.classList.add("is-video");
    vName.textContent = r.client; vAvatar.textContent = initials(r.client);
    vCaption.textContent = r.title ? r.title : "";
    var v = document.createElement("video");
    v.src = r.src; v.poster = r.poster; v.playsInline = true; v.setAttribute("playsinline", ""); v.loop = true; v.preload = "auto";
    v.setAttribute("aria-label", r.client + (r.title ? ", " + r.title : ""));
    vMedia.innerHTML = ""; vMedia.appendChild(v);
    v.muted = false;
    var p = v.play();
    vSound.hidden = false; vSound.textContent = "Couper le son";
    if (p && p.catch) p.catch(function () { v.muted = true; v.play().catch(function () {}); vSound.textContent = "Activer le son"; });
  }
  function openReel(list, i) { if (!list.length) return; mode = "reel"; reelList = list; reelIdx = i; openViewer(); showReel(); }

  if (viewer) {
    vClose.addEventListener("click", closeViewer);
    $(".viewer__tap--next", viewer).addEventListener("click", function () { if (mode === "story") nextStory(); else if (mode === "reel" && reelIdx < reelList.length - 1) { reelIdx++; showReel(); } });
    $(".viewer__tap--prev", viewer).addEventListener("click", function () { if (mode === "story") prevStory(); else if (mode === "reel" && reelIdx > 0) { reelIdx--; showReel(); } });
    vSound.addEventListener("click", function () {
      var v = $("video", vMedia); if (!v) return;
      v.muted = !v.muted; if (!v.muted) v.play().catch(function () {});
      vSound.textContent = v.muted ? "Activer le son" : "Couper le son";
    });
    viewer.addEventListener("click", function (e) { if (e.target === viewer) closeViewer(); });
    var frame = $(".viewer__frame", viewer);
    frame.addEventListener("pointerdown", function () { if (mode === "story" && tween && tween.pause) { paused = true; tween.pause(); } });
    var resume = function () { if (mode === "story" && tween && tween.resume) { paused = false; tween.resume(); } };
    frame.addEventListener("pointerup", resume); frame.addEventListener("pointerleave", resume);
  }
  $$("[data-story-set]").forEach(function (b) {
    b.addEventListener("click", function () { openStories(parseInt(b.getAttribute("data-story-set"), 10), parseInt(b.getAttribute("data-story-index") || "0", 10)); });
  });

  /* ---------- Clavier : Échap et focus gardé ---------- */
  function trap(e, root) {
    var f = $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', root).filter(function (el) { return el.offsetParent !== null && !el.closest("[hidden]") && !el.closest(".sheet__backdrop"); });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener("keydown", function (e) {
    if (viewer && !viewer.hidden) {
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowRight") $(".viewer__tap--next", viewer).click();
      if (e.key === "ArrowLeft") $(".viewer__tap--prev", viewer).click();
      if (e.key === "Tab") trap(e, viewer);
      return;
    }
    if (currentSheet) {
      if (e.key === "Escape") closeSheet(false);
      if (e.key === "Tab") trap(e, currentSheet);
      return;
    }
    if (menuOpen && e.key === "Escape") closeMenu(true);
  });

  /* ---------- Reels ---------- */
  var reelEls = $$(".reel");
  function reelData(el) {
    return { src: el.getAttribute("data-src"), poster: $("img", el).getAttribute("src"), client: el.getAttribute("data-client"), title: el.getAttribute("data-title") || "" };
  }
  reelEls.forEach(function (el) {
    var btn = $(".reel__btn", el), v = $("video", el);
    if (finePointer && v) {
      btn.addEventListener("pointerenter", function () {
        if (!v.getAttribute("src")) v.src = el.getAttribute("data-src");
        var p = v.play(); if (p && p.catch) p.catch(function () {});
        v.onplaying = function () { el.classList.add("is-playing"); };
      });
      btn.addEventListener("pointerleave", function () { v.pause(); el.classList.remove("is-playing"); });
    }
    btn.addEventListener("click", function () {
      if (v) { v.pause(); el.classList.remove("is-playing"); }
      var scope = el.closest(".reel-row, .ads, .post") || document;
      var list = $$(".reel", scope).filter(function (r) { return !r.hidden; });
      openReel(list.map(reelData), list.indexOf(el));
    });
  });
  var rail = $("#reels-rail");
  $$(".filters .filter").forEach(function (f) {
    f.addEventListener("click", function () {
      var cat = f.getAttribute("data-filter");
      $$(".filters .filter").forEach(function (o) { o.setAttribute("aria-pressed", o === f ? "true" : "false"); });
      $$(".reel", rail).forEach(function (r) { r.hidden = !(cat === "all" || r.getAttribute("data-cat") === cat); });
      rail.scrollTo({ left: 0, behavior: reduce ? "auto" : "smooth" });
    });
  });
  var railStep = function (d) { rail.scrollBy({ left: d * rail.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" }); };
  var rp = $("[data-rail-prev]"), rn = $("[data-rail-next]");
  if (rp) rp.addEventListener("click", function () { railStep(-1); });
  if (rn) rn.addEventListener("click", function () { railStep(1); });

  /* ---------- Diaporamas ---------- */
  $$("[data-deck]").forEach(function (deck) {
    var rails = $$(".deck__rail", deck), tabs = $$(".deck__tab", deck);
    var countEl = $(".deck__count", deck), cap = $(".deck__caption", deck);
    var cur = rails[0];
    var update = function () {
      var slides = $$(".deck__slide", cur);
      var w = slides[0] ? slides[0].offsetWidth : 1;
      var gap = slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft - w : 0;
      var i = Math.round(cur.scrollLeft / Math.max(1, w + gap));
      if (cur.scrollLeft + cur.clientWidth >= cur.scrollWidth - 4) i = slides.length - 1;
      countEl.textContent = (i + 1) + " / " + slides.length;
      if (cap) cap.textContent = cur.getAttribute("data-caption") || "";
    };
    rails.forEach(function (r) { r.addEventListener("scroll", function () { requestAnimationFrame(update); }, { passive: true }); });
    var step = function (d) {
      var s = $(".deck__slide", cur); var w = s ? s.offsetWidth + 20 : cur.clientWidth;
      cur.scrollBy({ left: d * w, behavior: reduce ? "auto" : "smooth" });
    };
    var p = $("[data-deck-prev]", deck), n = $("[data-deck-next]", deck);
    if (p) p.addEventListener("click", function () { step(-1); });
    if (n) n.addEventListener("click", function () { step(1); });
    tabs.forEach(function (t, k) {
      t.addEventListener("click", function () {
        tabs.forEach(function (o) { o.setAttribute("aria-pressed", o === t ? "true" : "false"); });
        rails.forEach(function (r, j) { r.hidden = j !== k; });
        cur = rails[k]; cur.scrollLeft = 0; update();
      });
    });
    update();
  });

  /* ---------- Polaroïds déplaçables ---------- */
  $$(".polaroids").forEach(function (table) {
    var z = 10, wide = window.matchMedia("(min-width: 761px)");
    $$(".polaroid", table).forEach(function (p) {
      var drag = null;
      p.addEventListener("pointerdown", function (e) {
        if (!wide.matches) return;
        var tr = table.getBoundingClientRect(), pr = p.getBoundingClientRect();
        drag = { dx: e.clientX - pr.left, dy: e.clientY - pr.top, tr: tr };
        p.style.zIndex = ++z; p.classList.add("is-dragging"); p.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      p.addEventListener("pointermove", function (e) {
        if (!drag) return;
        var l = e.clientX - drag.tr.left - drag.dx, t = e.clientY - drag.tr.top - drag.dy;
        l = Math.max(-40, Math.min(drag.tr.width - p.offsetWidth + 40, l));
        t = Math.max(-40, Math.min(drag.tr.height - p.offsetHeight + 40, t));
        p.style.left = (l / drag.tr.width * 100).toFixed(2) + "%"; p.style.top = t + "px";
      });
      var up = function () { if (!drag) return; drag = null; p.classList.remove("is-dragging"); };
      p.addEventListener("pointerup", up); p.addEventListener("pointercancel", up);
    });
  });

  /* ---------- Maquettes de publications ---------- */
  document.addEventListener("click", function (e) {
    var tg = e.target.closest && e.target.closest(".post__toggle");
    if (tg) {
      var post = tg.closest(".post"), open = !post.classList.contains("is-open");
      post.classList.toggle("is-open", open);
      tg.setAttribute("aria-expanded", open ? "true" : "false");
      tg.textContent = open ? "moins" : "plus";
      return;
    }
    var opt = e.target.closest && e.target.closest(".pv-poll__opt");
    if (opt) {
      $$(".pv-poll__opt", opt.parentNode).forEach(function (o) { o.setAttribute("aria-pressed", o === opt ? "true" : "false"); });
    }
  });

  /* ---------- Copier ---------- */
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var txt = b.getAttribute("data-copy");
      var ok = function () { toast(txt.indexOf("@") > -1 ? "Adresse copiée" : "Numéro copié"); };
      var fallback = function () {
        var val = b.closest(".ccard").querySelector(".ccard__value");
        var r = document.createRange(); r.selectNodeContents(val);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        toast("Sélectionné, il ne reste qu'à copier");
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fallback);
        else fallback();
      } catch (e) { fallback(); }
    });
  });

  /* ---------- Résultats en graphiques : entrée des barres, compteurs et infobulle ---------- */
  (function () {
    var figs = $$("[data-viz]"), counters = $$("[data-vcount]");
    if (!figs.length && !counters.length) return;
    function runCount(el) {
      var target = parseFloat(el.getAttribute("data-vcount")), dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var pre = el.getAttribute("data-prefix") || "", suf = el.getAttribute("data-suffix") || "";
      var finalText = el.textContent, t0 = 0;
      el.setAttribute("aria-label", finalText);
      function step(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / 1600), ease = 1 - Math.pow(1 - k, 3);
        el.textContent = k < 1 ? pre + fmt(target * ease, dec) + suf : finalText;
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (reduce || !("IntersectionObserver" in window)) {
      figs.forEach(function (f) { f.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (x) {
          if (!x.isIntersecting) return;
          io.unobserve(x.target);
          if (x.target.hasAttribute("data-vcount")) runCount(x.target);
          else x.target.classList.add("is-in");
        });
      }, { threshold: 0.35 });
      figs.forEach(function (f) { io.observe(f); });
      counters.forEach(function (c) { io.observe(c); });
    }
    var tip = document.createElement("div"), tv = document.createElement("strong"), tl = document.createElement("span");
    tip.className = "viz-tip"; tip.setAttribute("aria-hidden", "true");
    tip.appendChild(tv); tip.appendChild(tl);
    document.body.appendChild(tip);
    var cur = null;
    function place(x, y) {
      var w = tip.offsetWidth || 160, m = 10;
      x = Math.max(w / 2 + m, Math.min(window.innerWidth - w / 2 - m, x));
      y = Math.max(tip.offsetHeight + 24, y);
      tip.style.left = x + "px"; tip.style.top = y + "px";
    }
    function show(mark, x, y) {
      if (cur !== mark) {
        tv.textContent = mark.getAttribute("data-tip-v") || "";
        tl.textContent = mark.getAttribute("data-tip-l") || "";
        cur = mark;
      }
      place(x, y);
      tip.classList.add("is-on");
    }
    function hide() { if (!cur) return; cur = null; tip.classList.remove("is-on"); }
    document.addEventListener("pointermove", function (e) {
      var m = e.target.closest && e.target.closest(".vz-mark");
      if (m) show(m, e.clientX, e.clientY); else hide();
    }, { passive: true });
    document.addEventListener("pointerdown", function (e) {
      var m = e.target.closest && e.target.closest(".vz-mark");
      if (m) show(m, e.clientX, e.clientY); else hide();
    }, { passive: true });
    document.addEventListener("focusin", function (e) {
      var m = e.target.closest && e.target.closest(".vz-mark");
      if (!m) return hide();
      var r = m.getBoundingClientRect();
      show(m, r.left + r.width / 2, r.top);
    });
    document.addEventListener("focusout", function (e) { if (e.target.closest && e.target.closest(".vz-mark")) hide(); });
    window.addEventListener("scroll", hide, { passive: true });
    document.addEventListener("scroll", hide, { passive: true, capture: true });
  })();

  if (hasGSAP) {
    window.addEventListener("load", function () { window.ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { window.ScrollTrigger.refresh(); });
  }
})();
