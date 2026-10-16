// Search and category filter for the products page. A sidebar (a swipe row on phones) switches category; typing searches every category. Without JavaScript the full list is shown.
(function () {
  var input = document.getElementById("q");
  var sections = Array.prototype.slice.call(document.querySelectorAll(".cat"));
  var count = document.getElementById("count");
  var empty = document.getElementById("empty");
  var btn = document.getElementById("browse-btn");
  var badge = document.getElementById("browse-badge");
  var panel = document.getElementById("browse-panel");
  var chipsBox = document.getElementById("chips");
  var form = input && input.closest("form");
  if (!input || !sections.length || !panel) return;

  var cats = sections.map(function (sec) {
    return {
      slug: sec.getAttribute("data-cat"),
      name: sec.querySelector(".cat-head h2").textContent,
      desc: sec.querySelector(".cat-head p").textContent,
      total: sec.querySelectorAll(".prod").length
    };
  });
  var total = cats.reduce(function (n, c) { return n + c.total; }, 0);
  var selected = []; // slugs; empty means every category

  function svg(id) {
    return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>';
  }

  function nameOf(slug) {
    return cats.filter(function (c) { return c.slug === slug; })[0].name;
  }

  function terms() {
    return input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  // ---- filtering ----
  function update() {
    var t = terms();
    // Typing searches every category; the sidebar choice applies again once the box is empty.
    var scope = t.length ? [] : selected;
    var shown = 0;
    sections.forEach(function (sec) {
      var inCat = !scope.length || scope.indexOf(sec.getAttribute("data-cat")) !== -1;
      var visible = 0;
      Array.prototype.forEach.call(sec.querySelectorAll(".prod"), function (row) {
        var name = row.getAttribute("data-name");
        var match = inCat && t.every(function (w) { return name.indexOf(w) !== -1; });
        row.hidden = !match;
        if (match) visible++;
      });
      sec.hidden = visible === 0;
      shown += visible;
    });
    empty.hidden = shown !== 0;
    var label = shown === 1 ? "1 product" : shown + " products";
    count.textContent = label;
    var go = panel.querySelector(".browse-go");
    if (go) go.textContent = "Show " + label;
    drawChips();
    badge.textContent = selected.length;
    badge.hidden = !selected.length;
    syncSide(t.length);
    alignHeads();
  }

  // Desktop: the sidebar heading and the first visible category heading get the same height,
  // so the box under "Products" always starts level with the first product card, even if a description wraps.
  function alignHeads() {
    var side = document.querySelector(".shop-side .cat-head");
    if (!side) return;
    Array.prototype.forEach.call(document.querySelectorAll(".cat-head"), function (h) { h.style.minHeight = ""; });
    if (!window.matchMedia || !window.matchMedia("(min-width: 900px)").matches) return;
    var first = document.querySelector(".cat:not([hidden]) .cat-head");
    if (!first) return;
    var h = Math.max(side.offsetHeight, first.offsetHeight);
    side.style.minHeight = h + "px";
    first.style.minHeight = h + "px";
  }
  window.addEventListener("resize", function () { alignHeads(); });
  window.addEventListener("load", function () { alignHeads(); });

  function setSelected(list) {
    selected = list;
    syncChecks();
    update();
  }

  // ---- panel ----
  function buildPanel() {
    var html = '<div class="browse-grid">' + card("", "All products", "", total, true);
    cats.forEach(function (c) { html += card(c.slug, c.name, c.desc, c.total, false); });
    html += '</div><div class="browse-foot"><button class="link-btn browse-clear" type="button">Clear all</button>' +
      '<button class="btn btn-primary browse-go" type="button"></button></div>';
    panel.innerHTML = html;

    Array.prototype.forEach.call(panel.querySelectorAll("input"), function (cb) {
      cb.addEventListener("change", function () {
        if (!cb.value) {
          setSelected([]);
        } else {
          setSelected(Array.prototype.filter.call(panel.querySelectorAll("input[value]:checked"), function (x) { return x.value; })
            .map(function (x) { return x.value; }));
        }
      });
    });
    panel.querySelector(".browse-clear").addEventListener("click", function () { setSelected([]); });
    panel.querySelector(".browse-go").addEventListener("click", function () { open(false); btn.focus(); backToTop(); });
  }

  function card(slug, name, desc, n, all) {
    return '<label class="cat-card' + (all ? " cat-card--all" : "") + '">' +
      '<input type="checkbox" value="' + slug + '">' +
      '<span class="cat-box">' + svg("i-tick") + '</span>' +
      '<span class="cat-name">' + name + '</span><span class="cat-num">' + n + "</span>" +
      (desc ? '<span class="cat-desc">' + desc + "</span>" : "") + "</label>";
  }

  function syncChecks() {
    Array.prototype.forEach.call(panel.querySelectorAll("input"), function (cb) {
      cb.checked = cb.value ? selected.indexOf(cb.value) !== -1 : !selected.length;
    });
  }

  function open(show) {
    panel.hidden = !show;
    btn.setAttribute("aria-expanded", show ? "true" : "false");
  }

  btn.addEventListener("click", function () { open(panel.hidden); });
  document.addEventListener("click", function (e) {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) open(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) { open(false); btn.focus(); }
  });

  // ---- chips ----
  function drawChips() {
    chipsBox.textContent = "";
    selected.forEach(function (slug) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "filter-chip";
      b.setAttribute("aria-label", "Remove filter " + nameOf(slug));
      b.appendChild(document.createTextNode(nameOf(slug)));
      var x = document.createElement("i");
      x.setAttribute("aria-hidden", "true");
      x.innerHTML = "&times;";
      b.appendChild(x);
      b.addEventListener("click", function () {
        setSelected(selected.filter(function (s) { return s !== slug; }));
      });
      chipsBox.appendChild(b);
    });
    if (selected.length > 1) {
      var clear = document.createElement("button");
      clear.type = "button";
      clear.className = "link-btn";
      clear.textContent = "Clear all";
      clear.addEventListener("click", function () { setSelected([]); });
      chipsBox.appendChild(clear);
    }
  }

  // ---- search ----
  input.addEventListener("input", update);
  if (form) {
    // Suggestions only offer products from the ticked categories.
    form.hsScope = function () { return true; };
    form.addEventListener("hs-pick", function (e) {
      input.value = e.detail.text;
      update();
    });
    if (window.MST_initSearch) window.MST_initSearch(form);
  }

  // ---- start-up: ?q=search from the header, #category from the homepage tiles ----
  buildPanel();
  buildShop();
  var q = new URLSearchParams(location.search).get("q");
  if (q) input.value = q;
  var hash = location.hash.replace("#", "");
  var known = cats.some(function (c) { return c.slug === hash; });
  // No hash: open on the first category so the page is not one long scroll. "All products" is in the sidebar.
  setSelected(known ? [hash] : (q ? [] : [cats[0].slug]));

  // ---- sidebar (desktop) / swipe row (phones), and a category icon plus spec tags on every row ----
  function buildShop() {
    var wrap = document.querySelector(".catalogue");
    if (!wrap) return;
    var ICONS = {
      "high-pressure-washers": '<path d="M4 8h10v8H4zM14 10h3l3 2v2l-3 2h-3M7 8V5h4v3"/>',
      "pressure-washer-accessories": '<path d="M5 20l9-9M14 4l6 6-3 3-6-6zM3 21l3-1"/>',
      "pressure-washer-parts": '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
      "engines-engine-spares": '<rect x="4" y="8" width="14" height="9" rx="1"/><path d="M8 8V5h6v3M18 11h3v3h-3M7 17v2M15 17v2"/>',
      "vacuum-motors": '<circle cx="11" cy="12" r="6"/><path d="M17 12h4M7 8l8 8M4 9v6"/>',
      "vacuum-spares": '<circle cx="12" cy="13" r="8"/><path d="M12 13l4-4M12 5v2"/>',
      "vacuum-accessories": '<path d="M4 6h10l4 8h-6M10 6v8M4 20h16"/>'
    };
    function icon(slug) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[slug] || ICONS["vacuum-spares"]) + "</svg>";
    }

    // Spec tags read from the product name (only figures the name already states).
    function specs(n) {
      var o = [], m;
      if ((m = n.match(/(\d+)\s*bar/i))) o.push([m[1] + " bar", 1]);
      if ((m = n.match(/(\d+(?:\.\d+)?)\s*(?:HP|Horsepower)/i))) o.push([m[1] + " HP", 1]);
      if ((m = n.match(/(\d+(?:\.\d+)?)\s*kW/i))) o.push([m[1] + " kW", 1]);
      if ((m = n.match(/\b(\d{3})\s*V\b/))) o.push([m[1] + " V"]);
      if ((m = n.match(/\b(Petrol|Diesel)\b/i))) o.push([m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()]);
      if ((m = n.match(/(\d+)\s*(?:L|Liter)\b/i))) o.push([m[1] + " L"]);
      if ((m = n.match(/\b(\d+)\s*m\b/))) o.push([m[1] + " m"]);
      return o.slice(0, 4);
    }

    sections.forEach(function (sec) {
      var slug = sec.getAttribute("data-cat");
      Array.prototype.forEach.call(sec.querySelectorAll(".prod"), function (row) {
        var nameEl = row.querySelector(".prod-name");
        if (!nameEl) return;
        var ic = document.createElement("span");
        ic.className = "prod-ic";
        ic.setAttribute("aria-hidden", "true");
        ic.innerHTML = icon(slug);
        var body = document.createElement("div");
        body.className = "prod-body";
        row.insertBefore(ic, row.firstChild);
        row.insertBefore(body, nameEl);
        body.appendChild(nameEl);
        var tags = specs(nameEl.textContent);
        if (tags.length) {
          var box = document.createElement("span");
          box.className = "prod-tags";
          tags.forEach(function (t) {
            var s = document.createElement("span");
            s.className = "prod-tag" + (t[1] ? " prod-tag--key" : "");
            s.textContent = t[0];
            box.appendChild(s);
          });
          body.appendChild(box);
        }
      });
    });

    // Sidebar: a heading in the same style as a category heading, so the two line up, then the category list.
    var side = document.createElement("aside");
    side.className = "shop-side";
    side.setAttribute("aria-label", "Product categories");
    var head = document.createElement("div");
    head.className = "cat-head";
    head.innerHTML = "<h2>Products</h2><p>" + total + " products</p>";
    var list = document.createElement("div");
    list.className = "side-list";
    list.appendChild(sideButton("", "All products", total));
    cats.forEach(function (c) { list.appendChild(sideButton(c.slug, c.name, c.total)); });
    side.appendChild(head);
    side.appendChild(list);

    var main = document.createElement("div");
    main.className = "shop-main";
    Array.prototype.slice.call(wrap.children).forEach(function (el) { main.appendChild(el); });
    wrap.appendChild(side);
    wrap.appendChild(main);
    wrap.classList.add("has-shop");

    // Desktop uses the sidebar; phones use the Filters button and panel (CSS hides whichever is not needed).
    document.documentElement.classList.add("has-shop-ui");
  }

  function sideButton(slug, name, n) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "side-btn";
    b.setAttribute("data-slug", slug);
    b.innerHTML = "<span>" + name + "</span><b>" + n + "</b>";
    b.addEventListener("click", function () {
      input.value = "";
      setSelected(slug ? [slug] : []);
      backToTop();
      if (history.replaceState) history.replaceState(null, "", slug ? "#" + slug : location.pathname + location.search.replace(/[?&]q=[^&]*/, ""));
    });
    return b;
  }

  // Choosing a category from further down the page takes you back up to the start of its list.
  function backToTop() {
    var wide = window.matchMedia && window.matchMedia("(min-width: 900px)").matches;
    // Desktop: the start of the list, clear of the sticky header. Phones: the Filters bar, so it stays in view above the list.
    var anchor = document.querySelector(wide ? ".catalogue" : ".tools");
    if (!anchor) return;
    var target = anchor.getBoundingClientRect().top + window.scrollY - (wide ? 150 : 12);
    if (window.scrollY <= target) return;
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, target), behavior: calm ? "auto" : "smooth" });
  }

  function syncSide(searching) {
    Array.prototype.forEach.call(document.querySelectorAll(".side-btn"), function (b) {
      var slug = b.getAttribute("data-slug");
      var on = !searching && (slug ? selected.length === 1 && selected[0] === slug : !selected.length);
      b.classList.toggle("on", on);
      if (on) {
        b.setAttribute("aria-current", "true");
        // On phones the pills sit in a swipe row: bring the chosen one into view.
        var row = b.parentNode;
        if (row.scrollWidth > row.clientWidth + 2) row.scrollTo({ left: Math.max(0, b.offsetLeft - 16), behavior: "smooth" });
      } else {
        b.removeAttribute("aria-current");
      }
    });
  }
})();
