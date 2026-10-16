// About page: colour the rail in as the visitor scrolls down the steps (on every screen size).
// The fill tracks the page's scroll position, like the browser scroll bar.
(function () {
  var list = document.querySelector(".journey");
  if (!list) return;
  var steps = Array.prototype.slice.call(list.querySelectorAll(".step"));
  var wide = { matches: true }; // the rail shows on phones and PCs alike
  var fill = document.createElement("span");
  fill.className = "journey-fill";
  fill.setAttribute("aria-hidden", "true");
  list.appendChild(fill);

  var centres = [];
  var queued = false;

  function measure() {
    centres = steps.map(function (s) { return s.offsetTop + s.offsetHeight / 2; });
    fill.style.top = centres[0] + "px";
  }

  function update() {
    queued = false;
    if (!wide.matches) return;
    // Page scroll position (0 at the top, 1 at the very bottom) maps straight onto the rail,
    // so it behaves like the browser's scroll bar: top dot only at the top, last dot at the bottom.
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0;
    var first = centres[0];
    var last = centres[centres.length - 1];
    var y = first + p * (last - first);
    fill.style.height = (y - first) + "px";
    steps.forEach(function (s, i) { s.classList.toggle("is-reached", y >= centres[i] - 0.5); });
  }

  function queue() {
    if (!queued) { queued = true; window.requestAnimationFrame(update); }
  }

  function refresh() {
    if (!wide.matches) {
      steps.forEach(function (s) { s.classList.remove("is-reached"); });
      fill.style.height = "0";
      return;
    }
    measure();
    update();
  }

  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", refresh);
  if (window.ResizeObserver) new ResizeObserver(refresh).observe(list);
  refresh();
})();
