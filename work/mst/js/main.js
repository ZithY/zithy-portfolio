// Mobile menu toggle. Without JavaScript the links simply stay visible.
(function () {
  var button = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (!button || !nav) return;

  function setOpen(open) {
    button.setAttribute("aria-expanded", open ? "true" : "false");
    nav.setAttribute("data-open", open ? "true" : "false");
    button.textContent = open ? "Close" : "Menu";
  }

  button.addEventListener("click", function () {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });

  nav.addEventListener("click", function (event) {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setOpen(false);
  });
})();

// Wide screens: hide the nav pills while scrolling down, bring them back on scroll up.
// Hiding the pills makes the (sticky) header shorter, which shifts the page and can nudge the scroll position.
// Some browsers and laptops read that nudge as "scrolling up" and bring the pills straight back, over and over.
// So: after every change the script ignores scroll movement for a moment, and the CSS turns off scroll anchoring.
(function () {
  var header = document.querySelector(".site-header");
  if (!header || !window.matchMedia) return;
  var wide = window.matchMedia("(min-width: 900px)");
  var last = window.scrollY;
  var lockUntil = 0;
  var queued = false;

  function update() {
    queued = false;
    var y = window.scrollY;
    header.classList.toggle("scrolled", y > 30); // homepage CSS fades a soft band in behind the header

    if (performance.now() < lockUntil) { last = y; return; }

    var hidden = header.classList.contains("nav-hidden");
    var hide = wide.matches && y > last + 6 && y > 120;
    var show = !wide.matches || y < last - 6 || y <= 120;
    if (hide && !hidden) {
      header.classList.add("nav-hidden");
      lockUntil = performance.now() + 500;
    } else if (show && hidden) {
      header.classList.remove("nav-hidden");
      lockUntil = performance.now() + 500;
    }
    last = y;
  }

  window.addEventListener("scroll", function () {
    if (!queued) { queued = true; window.requestAnimationFrame(update); }
  }, { passive: true });

  // Keyboard users tabbing into the header always get the full bar.
  var nav = header.querySelector(".site-nav");
  if (nav) nav.addEventListener("focusin", function () { header.classList.remove("nav-hidden"); });
})();

// Light / dark switch. Follows the device until the visitor picks a side, then remembers the choice.
(function () {
  var toggle = document.getElementById("theme-toggle");
  if (!toggle) return;
  var root = document.documentElement;
  var query = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function effective() {
    var set = root.getAttribute("data-theme");
    if (set === "light" || set === "dark") return set;
    return query && query.matches ? "dark" : "light";
  }

  function show() {
    toggle.setAttribute("aria-checked", effective() === "dark" ? "true" : "false");
  }

  toggle.hidden = false;
  show();

  toggle.addEventListener("click", function () {
    var next = effective() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("mst-theme", next); } catch (e) { /* private mode: still works for this visit */ }
    show();
  });

  if (query && query.addEventListener) query.addEventListener("change", show);
})();

// Page glow: on the home page it starts where the hero photo ends.
(function () {
  var hero = document.querySelector(".hero");
  var main = document.getElementById("main");
  if (!hero || !main) return;
  function place() {
    main.style.setProperty("--glow-top", hero.offsetHeight + "px");
  }
  place();
  window.addEventListener("resize", place);
  window.addEventListener("load", place);
})();

// Phones: the dots under the tile row follow the swipe and can be clicked to jump to a tile. The hint fades at the end.
(function () {
  var bento = document.querySelector(".bento");
  var dots = document.querySelectorAll(".bento-dots button");
  var swipe = document.querySelector(".bento-swipe");
  if (!bento || !dots.length) return;
  var tiles = bento.querySelectorAll(".tile");

  function pad() {
    return parseFloat(getComputedStyle(bento).paddingLeft) || 0;
  }

  function atEnd() {
    var max = bento.scrollWidth - bento.clientWidth;
    return max > 0 && bento.scrollLeft >= max - 4;
  }

  function update() {
    var edge = bento.getBoundingClientRect().left + pad();
    var index = 0;
    var best = Infinity;
    for (var i = 0; i < tiles.length; i++) {
      var d = Math.abs(tiles[i].getBoundingClientRect().left - edge);
      if (d < best) { best = d; index = i; }
    }
    if (atEnd()) index = tiles.length - 1;
    for (var j = 0; j < dots.length; j++) {
      dots[j].classList.toggle("on", j === index);
      if (j === index) dots[j].setAttribute("aria-current", "true");
      else dots[j].removeAttribute("aria-current");
    }
    if (swipe) swipe.classList.toggle("is-end", atEnd());
  }

  dots.forEach(function (dot, i) {
    dot.addEventListener("click", function () {
      var tile = tiles[i];
      if (!tile) return;
      var left = bento.scrollLeft + tile.getBoundingClientRect().left - bento.getBoundingClientRect().left - pad();
      var smooth = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      bento.scrollTo({ left: left, behavior: smooth ? "smooth" : "auto" });
    });
  });

  bento.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
