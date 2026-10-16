// Quote list: visitors add products (with quantities) and send one request for everything.
// - Products page: every row gets an "Add to Quote" button that turns into a quantity stepper.
// - Every page: a floating "Quote list (n)" button appears while the list has items and opens the request form.
// The list is kept in the browser (localStorage), so it survives leaving the page. js/quote.js shows the form.
(function () {
  var KEY = "mst-quote-list";
  var MAX = 999;
  var state = {};
  var subs = [];

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      Object.keys(raw).forEach(function (k) {
        var it = raw[k];
        if (it && typeof it.n === "string" && it.q > 0) {
          state[k] = { n: it.n.slice(0, 200), p: String(it.p || "").slice(0, 30), c: String(it.c || "").slice(0, 80), q: Math.min(MAX, Math.floor(it.q)) };
        }
      });
    } catch (e) { state = {}; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: list lasts for this visit */ } }
  function notify() { subs.forEach(function (f) { f(); }); }

  var api = {
    items: function () { return Object.keys(state).map(function (k) { return { id: k, n: state[k].n, p: state[k].p, c: state[k].c, q: state[k].q }; }); },
    count: function () { return Object.keys(state).reduce(function (n, k) { return n + state[k].q; }, 0); },
    qty: function (id) { return state[id] ? state[id].q : 0; },
    add: function (item) {
      if (state[item.id]) state[item.id].q = Math.min(MAX, state[item.id].q + 1);
      else state[item.id] = { n: item.n, p: item.p, c: item.c, q: 1 };
      save(); notify();
    },
    setQty: function (id, q) {
      if (!state[id]) return;
      if (q <= 0) delete state[id]; else state[id].q = Math.min(MAX, q);
      save(); notify();
    },
    remove: function (id) { delete state[id]; save(); notify(); },
    clear: function () { state = {}; save(); notify(); },
    on: function (fn) { subs.push(fn); }
  };
  window.MSTList = api;
  load();

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ---------- floating button (every page) ----------
  var fab = el("button", "ql-fab");
  fab.type = "button";
  fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h15l-2 9H8L6 3H3"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>';
  var fabText = el("span");
  fab.appendChild(fabText);
  fab.addEventListener("click", function () { if (window.MSTQuote) window.MSTQuote.open("", { list: true }); });
  document.body.appendChild(fab);

  function renderFab() {
    var n = api.count();
    fab.classList.toggle("show", n > 0);
    fabText.textContent = "Quote list (" + n + ")";
    fab.setAttribute("aria-label", "Open your quote list, " + n + (n === 1 ? " item" : " items"));
  }

  // ---------- product rows (Products page) ----------
  var rows = Array.prototype.slice.call(document.querySelectorAll(".prod"));
  var focusAfter = null;

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  rows.forEach(function (row) {
    var nameEl = row.querySelector(".prod-name"), priceEl = row.querySelector(".prod-price"), old = row.querySelector(".prod-quote");
    if (!nameEl || !priceEl) return;
    var sec = row.closest(".cat"), head = sec && sec.querySelector(".cat-head h2");
    var act = el("span", "prod-act");
    if (old) old.replaceWith(act); else row.appendChild(act);
    var n = nameEl.textContent.trim();
    row._ql = { id: slug(n), n: n, p: priceEl.textContent.trim(), c: head ? head.textContent.trim() : "", act: act };
  });

  function renderRow(row) {
    var d = row._ql; if (!d) return;
    var q = api.qty(d.id);
    d.act.textContent = "";
    if (q > 0) {
      var box = el("span", "qstep"); box.setAttribute("role", "group"); box.setAttribute("aria-label", "Quantity of " + d.n);
      var minus = el("button", "", "−"); minus.type = "button"; minus.setAttribute("data-ql", "dec"); minus.setAttribute("data-id", d.id); minus.setAttribute("aria-label", "One fewer " + d.n);
      var val = el("b", "", String(q)); val.setAttribute("aria-live", "polite");
      var plus = el("button", "", "+"); plus.type = "button"; plus.setAttribute("data-ql", "inc"); plus.setAttribute("data-id", d.id); plus.setAttribute("aria-label", "One more " + d.n);
      box.appendChild(minus); box.appendChild(val); box.appendChild(plus);
      d.act.appendChild(box);
    } else {
      var add = el("button", "btn btn-secondary prod-add", "Add to Quote");
      add.type = "button"; add.title = "Add to quote"; add.setAttribute("data-ql", "add"); add.setAttribute("data-id", d.id); add.setAttribute("aria-label", "Add " + d.n + " to your quote list");
      d.act.appendChild(add);
    }
  }

  function renderRows() {
    rows.forEach(renderRow);
    if (focusAfter) {
      var row = rows.filter(function (r) { return r._ql && r._ql.id === focusAfter.id; })[0];
      if (row) {
        var target = row.querySelector('[data-ql="' + (api.qty(focusAfter.id) > 0 ? focusAfter.role : "add") + '"]') || row.querySelector("[data-ql]");
        if (target) target.focus();
      }
      focusAfter = null;
    }
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-ql]");
    if (!b) return;
    var id = b.getAttribute("data-id"), role = b.getAttribute("data-ql");
    var row = rows.filter(function (r) { return r._ql && r._ql.id === id; })[0];
    if (!row) return;
    focusAfter = { id: id, role: role === "add" ? "inc" : role };
    if (role === "add") api.add(row._ql);
    else if (role === "inc") api.setQty(id, api.qty(id) + 1);
    else if (role === "dec") api.setQty(id, api.qty(id) - 1);
  });

  api.on(function () { renderFab(); renderRows(); });
  renderFab();
  renderRows();
})();
