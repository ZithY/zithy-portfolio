// Sliding "bubble" behind the active nav link.
// Markup: <nav data-pills> ... <div class="pills" data-pill="slide|stretch|follow|spring"> <a class="nav-link"> ...
//   slide   - bubble glides to the clicked tab
//   stretch - bubble stretches across both tabs, then settles (gooey)
//   follow  - bubble tracks the pointer / keyboard focus and returns to the active tab on leave
//   spring  - bubble glides with a small overshoot
// Add data-demo to the nav to make clicks switch tabs in place (mockups only).
// Add data-persist to the nav so the bubble slides in from the previous page's tab after navigation.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var KEY = "mst-pill";

  function init(nav) {
    var pills = nav.querySelector(".pills") || nav;
    var links = Array.prototype.slice.call(pills.querySelectorAll(".nav-link"));
    if (!links.length) return;

    var mode = pills.getAttribute("data-pill") || "slide";
    var demo = nav.hasAttribute("data-demo");
    var persist = nav.hasAttribute("data-persist");

    var bubble = document.createElement("span");
    bubble.className = "pill-bubble";
    bubble.setAttribute("aria-hidden", "true");
    pills.insertBefore(bubble, pills.firstChild);
    pills.classList.add("has-bubble");

    var active = links.filter(function (l) { return l.hasAttribute("aria-current"); })[0] || null;
    var current = null;
    var timer;

    function rect(l) {
      return { x: l.offsetLeft, y: l.offsetTop, w: l.offsetWidth, h: l.offsetHeight };
    }

    function apply(r) {
      bubble.style.width = r.w + "px";
      bubble.style.height = r.h + "px";
      bubble.style.transform = "translate(" + r.x + "px," + r.y + "px)";
    }

    function lit(l) {
      links.forEach(function (a) { a.classList.toggle("is-lit", a === l); });
    }

    function jump(r) {
      bubble.classList.add("no-anim");
      apply(r);
      void bubble.offsetWidth;
      bubble.classList.remove("no-anim");
    }

    function move(l, instant) {
      clearTimeout(timer);
      if (!l) {
        bubble.style.opacity = "0";
        lit(null);
        current = null;
        return;
      }
      var r = rect(l);
      bubble.style.opacity = "1";
      if (instant || reduce || !current) {
        jump(r);
      } else if (mode === "stretch") {
        var p = current.offsetWidth !== undefined ? rect(current) : current;
        var x0 = Math.min(p.x, r.x);
        var x1 = Math.max(p.x + p.w, r.x + r.w);
        apply({ x: x0, y: r.y, w: x1 - x0, h: r.h });
        timer = setTimeout(function () { apply(r); }, 170);
      } else {
        apply(r);
      }
      current = l;
      lit(l);
    }

    // Slide in from where the previous page left the bubble.
    var stored = null;
    if (persist) {
      try { stored = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { stored = null; }
    }
    if (stored && active && !reduce) {
      bubble.style.opacity = "1";
      jump(stored);
      current = stored;
      requestAnimationFrame(function () { requestAnimationFrame(function () { move(active); }); });
    } else {
      move(active, true);
    }

    if (mode === "follow") {
      links.forEach(function (l) {
        l.addEventListener("mouseenter", function () { move(l); });
        l.addEventListener("focus", function () { move(l); });
      });
      pills.addEventListener("mouseleave", function () { move(active); });
      pills.addEventListener("focusout", function () {
        setTimeout(function () { if (!pills.contains(document.activeElement)) move(active); }, 0);
      });
    }

    links.forEach(function (l) {
      l.addEventListener("click", function (e) {
        if (demo) {
          e.preventDefault();
          links.forEach(function (a) { a.removeAttribute("aria-current"); });
          l.setAttribute("aria-current", "page");
          active = l;
          move(l);
        } else if (persist) {
          try { sessionStorage.setItem(KEY, JSON.stringify(rect(l))); } catch (err) { /* private mode */ }
          move(l);
        } else {
          move(l);
        }
      });
    });

    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var target = current && current.offsetWidth !== undefined ? current : active;
        if (target) move(target, true);
      }).observe(pills);
    } else {
      window.addEventListener("resize", function () { move(current || active, true); });
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-pills]"), init);
})();
