// Header product search with live suggestions from window.MST_PRODUCTS (js/catalogue.js).
// Markup: <form data-search data-base="../" role="search" action="../products/"> with .hs-input and .hs-list inside.
// Without JavaScript the form still submits to the products page.
(function () {
  var data = window.MST_PRODUCTS || [];
  var MAX = 8;

  function norm(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  var index = data.map(function (p) {
    return { p: p, name: " " + norm(p.n), cat: " " + norm(p.c) };
  });

  function search(query, scope) {
    var terms = norm(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var hits = [];
    index.forEach(function (it) {
      if (scope && !scope(it.p)) return;
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        if (it.name.indexOf(" " + t) !== -1) score += 4;
        else if (it.name.indexOf(t) !== -1) score += 2;
        else if (it.cat.indexOf(t) !== -1) score += 0.5;
        else return;
      }
      if (it.name.indexOf(" " + terms[0]) === 0) score += 2;
      hits.push({ p: it.p, score: score - it.name.length / 1000 });
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    return hits;
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(el, text, terms) {
    el.textContent = "";
    if (!terms.length) { el.textContent = text; return; }
    var re = new RegExp("(" + terms.map(escapeRe).join("|") + ")", "ig");
    text.split(re).forEach(function (part, i) {
      if (!part) return;
      if (i % 2 === 1) {
        var m = document.createElement("mark");
        m.textContent = part;
        el.appendChild(m);
      } else {
        el.appendChild(document.createTextNode(part));
      }
    });
  }

  function init(root, n) {
    var input = root.querySelector(".hs-input");
    var list = root.querySelector(".hs-list");
    if (!input || !list) return;
    var base = root.getAttribute("data-base") || "";
    // data-inline: picking a suggestion fills the box and fires "hs-pick" instead of navigating (products page).
    // root.hsScope = function (product) { return Boolean } limits suggestions, e.g. to one category.
    var inline = root.hasAttribute("data-inline");
    var active = -1;
    var options = [];

    list.id = list.id || "hs-list-" + n;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", list.id);
    input.setAttribute("autocomplete", "off");
    list.setAttribute("role", "listbox");

    function allUrl(q) {
      return base + "products/?q=" + encodeURIComponent(q);
    }

    function setActive(i) {
      if (options[active]) options[active].setAttribute("aria-selected", "false");
      active = i;
      if (options[active]) {
        options[active].setAttribute("aria-selected", "true");
        input.setAttribute("aria-activedescendant", options[active].id);
        options[active].scrollIntoView({ block: "nearest" });
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    }

    function close() {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      setActive(-1);
    }

    function pick(text, slug) {
      input.value = text;
      close();
      root.dispatchEvent(new CustomEvent("hs-pick", { bubbles: true, detail: { text: text, slug: slug || "" } }));
    }

    function addOption(href, pickText, pickSlug) {
      var li = document.createElement("li");
      li.className = "hs-opt";
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      li.id = list.id + "-o" + options.length;
      var a = document.createElement("a");
      a.href = href;
      a.tabIndex = -1;
      if (inline) {
        a.addEventListener("click", function (e) { e.preventDefault(); pick(pickText, pickSlug); });
      }
      li.appendChild(a);
      list.appendChild(li);
      options.push(li);
      return a;
    }

    function render() {
      var q = input.value.trim();
      list.textContent = "";
      options = [];
      active = -1;
      input.removeAttribute("aria-activedescendant");
      if (!q) { close(); return; }

      var terms = norm(q).split(/\s+/).filter(Boolean);
      var hits = search(q, root.hsScope);

      if (!hits.length) {
        var none = document.createElement("li");
        none.className = "hs-empty";
        none.textContent = "No products match “" + q + "”. Call 061 979 0504 and we can often source it.";
        list.appendChild(none);
      } else {
        hits.slice(0, MAX).forEach(function (h) {
          var a = addOption(base + "products/?q=" + encodeURIComponent(h.p.n) + "#" + h.p.s, h.p.n, h.p.s);
          var name = document.createElement("span");
          name.className = "hs-name";
          highlight(name, h.p.n, terms);
          var meta = document.createElement("span");
          meta.className = "hs-meta";
          meta.textContent = h.p.c;
          var price = document.createElement("span");
          price.className = "hs-price";
          price.textContent = h.p.p;
          a.appendChild(name);
          a.appendChild(price);
          a.appendChild(meta);
        });
        var more = addOption(allUrl(q), q, "");
        more.className = "hs-all";
        more.textContent = inline
          ? "Show all " + hits.length + " matches below"
          : hits.length > MAX
            ? "See all " + hits.length + " results for “" + q + "”"
            : "Show these on the products page";
      }
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    input.addEventListener("input", render);
    input.addEventListener("focus", function () { if (input.value.trim()) render(); });

    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (list.hidden) render();
        if (!options.length) return;
        e.preventDefault();
        var step = e.key === "ArrowDown" ? 1 : -1;
        setActive((active + step + options.length) % options.length);
      } else if (e.key === "Enter") {
        if (!list.hidden && options[active]) {
          e.preventDefault();
          options[active].querySelector("a").click();
        } else if (inline) {
          e.preventDefault();
          close();
        }
      } else if (e.key === "Escape") {
        if (!list.hidden) { e.preventDefault(); close(); }
      }
    });

    document.addEventListener("click", function (e) {
      if (!root.contains(e.target)) close();
    });

    root.addEventListener("focusout", function () {
      setTimeout(function () { if (!root.contains(document.activeElement)) close(); }, 0);
    });

    list.addEventListener("mousemove", function (e) {
      var li = e.target.closest(".hs-opt");
      var i = options.indexOf(li);
      if (i !== -1 && i !== active) setActive(i);
    });
  }

  var count = 0;
  function setup(root) {
    if (root.hsReady) return;
    root.hsReady = true;
    init(root, count++);
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-search]"), setup);
  window.MST_initSearch = setup; // for forms added to the page after load

  // Press "/" anywhere to jump to the first search box.
  document.addEventListener("keydown", function (e) {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t.matches && t.matches("input, textarea, select, [contenteditable]")) return;
    var first = document.querySelector("[data-search] .hs-input");
    if (first && first.offsetParent !== null) { e.preventDefault(); first.focus(); }
  });
})();
