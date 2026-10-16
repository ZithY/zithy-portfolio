// "Request a quote" pop-up. Any link to mailto:Sales@mstindustrial.co.za?subject=Quote... opens it.
// Without JavaScript (or an old browser) those links still open an email as before.
(function () {
  if (typeof HTMLDialogElement === "undefined") return;

  var EMAIL = "Sales@mstindustrial.co.za";

  // Web3Forms delivers the request straight to the sales inbox. Paste the free access key between the
  // quotes (from https://web3forms.com). While it is empty, or if sending fails, the form falls back to
  // opening the visitor's email app with the details filled in.
  var ENDPOINT = "https://api.web3forms.com/submit";
  var ACCESS_KEY = "ee8a036d-6094-40d6-a65d-f605f5fbfd57";

  var dlg, form, productRow, productName, formView, doneView, lastFocus;
  var itemsBox, leadEl, listMode = false, subscribed = false;

  function build() {
    dlg = document.createElement("dialog");
    dlg.className = "quote-dialog";
    dlg.setAttribute("aria-labelledby", "quote-title");
    dlg.innerHTML =
      '<div class="quote-card">' +
        '<button class="quote-close" type="button" aria-label="Close">&times;</button>' +
        '<div class="quote-view" data-view="form">' +
          '<h2 id="quote-title">Request a quote</h2>' +
          '<p class="quote-lead">Tell us how to reach you and we will come back with a price.</p>' +
          '<p class="quote-product" hidden>Quote for: <strong></strong></p>' +
          '<div class="quote-items" hidden></div>' +
          '<form novalidate>' +
            field("name", "Your name", "text", "name", true, "") +
            field("email", "Email address", "email", "email", true, "") +
            field("phone", "Contact number", "tel", "tel", true, ' inputmode="tel" pattern="[0-9+()\\s\\-]{9,}"') +
            field("company", "Company name <span class=\"quote-opt\">(optional)</span>", "text", "organization", false, "") +
            '<div class="quote-field"><label for="quote-message">What do you need a price on? <span class="quote-opt">(optional)</span></label>' +
            '<textarea id="quote-message" name="message" rows="3"></textarea></div>' +
            '<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
            '<div class="quote-actions">' +
              '<button class="btn btn-primary" type="submit">Send request</button>' +
              '<button class="btn btn-secondary" type="button" data-close>Cancel</button>' +
            '</div>' +
            '<p class="quote-note">' + (ACCESS_KEY
              ? 'We only use your details to reply to your request.'
              : 'Sending opens your email app with these details filled in, ready to send to ' + EMAIL + '.') + '</p>' +
          '</form>' +
        '</div>' +
        '<div class="quote-view" data-view="done" hidden>' +
          '<h2></h2>' +
          '<p class="quote-lead done-msg"></p>' +
          '<p class="quote-lead done-help"></p>' +
          '<div class="quote-actions"><button class="btn btn-primary" type="button" data-close>Close</button></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    form = dlg.querySelector("form");
    productRow = dlg.querySelector(".quote-product");
    productName = productRow.querySelector("strong");
    itemsBox = dlg.querySelector(".quote-items");
    leadEl = dlg.querySelector('[data-view="form"] .quote-lead');
    formView = dlg.querySelector('[data-view="form"]');
    doneView = dlg.querySelector('[data-view="done"]');

    dlg.addEventListener("click", function (e) {
      var qb = e.target.closest && e.target.closest("[data-qi]");
      if (qb && window.MSTList) {
        var id = qb.getAttribute("data-id"), role = qb.getAttribute("data-qi");
        if (role === "inc") window.MSTList.setQty(id, window.MSTList.qty(id) + 1);
        else if (role === "dec") window.MSTList.setQty(id, window.MSTList.qty(id) - 1);
        else window.MSTList.remove(id);
        return;
      }
      if (e.target === dlg || e.target.closest(".quote-close, [data-close]")) dlg.close();
    });
    dlg.addEventListener("close", function () {
      document.documentElement.classList.remove("modal-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    });
    form.addEventListener("submit", submit);
    form.addEventListener("input", function (e) { if (e.target.getAttribute("aria-invalid")) validate(e.target); });
  }

  // ---------- quote list mode: the pop-up shows every item with a quantity stepper ----------
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

  function renderItems() {
    var L = window.MSTList; if (!L || !itemsBox) return;
    var items = L.items();
    itemsBox.textContent = "";
    itemsBox.appendChild(mk("h3", "qi-title", "Your quote list (" + L.count() + ")"));
    var ul = mk("ul", "qi-lines");
    items.forEach(function (it) {
      var li = mk("li", "qi-line");
      var info = mk("span", "qi-info");
      info.appendChild(mk("span", "qi-name", it.n));
      info.appendChild(mk("span", "qi-price", it.p + " each"));
      var step = mk("span", "qstep qstep--sm"); step.setAttribute("role", "group"); step.setAttribute("aria-label", "Quantity of " + it.n);
      var minus = mk("button", "", "−"); minus.type = "button"; minus.setAttribute("data-qi", "dec"); minus.setAttribute("data-id", it.id); minus.setAttribute("aria-label", "One fewer " + it.n);
      var val = mk("b", "", String(it.q)); val.setAttribute("aria-live", "polite");
      var plus = mk("button", "", "+"); plus.type = "button"; plus.setAttribute("data-qi", "inc"); plus.setAttribute("data-id", it.id); plus.setAttribute("aria-label", "One more " + it.n);
      step.appendChild(minus); step.appendChild(val); step.appendChild(plus);
      var rm = mk("button", "qi-remove", "Remove"); rm.type = "button"; rm.setAttribute("data-qi", "rm"); rm.setAttribute("data-id", it.id); rm.setAttribute("aria-label", "Remove " + it.n + " from your quote list");
      li.appendChild(info); li.appendChild(step); li.appendChild(rm);
      ul.appendChild(li);
    });
    itemsBox.appendChild(ul);
    itemsBox.appendChild(mk("p", "qi-note", "Prices are a guide. We confirm stock, delivery and the final price."));
  }

  function listText(items) {
    return items.map(function (it) { return it.q + " x " + it.n + " (" + it.p + " each)"; }).join("\n");
  }

  function field(name, label, type, auto, required, extra) {
    return '<div class="quote-field">' +
      '<label for="quote-' + name + '">' + label + (required ? ' <span class="quote-req" aria-hidden="true">*</span>' : "") + "</label>" +
      '<input id="quote-' + name + '" name="' + name + '" type="' + type + '" autocomplete="' + auto + '"' + (required ? " required" : "") + extra + ">" +
      '<p class="quote-error" id="quote-' + name + '-err" hidden></p></div>';
  }

  var MESSAGES = {
    name: "Please enter your name.",
    email: "Please enter a valid email address.",
    phone: "Please enter a contact number, for example 061 979 0504."
  };

  function validate(input) {
    var err = document.getElementById(input.id + "-err");
    if (!err) return true;
    var ok = input.checkValidity();
    input.setAttribute("aria-invalid", ok ? "" : "true");
    if (ok) input.removeAttribute("aria-invalid");
    input.setAttribute("aria-describedby", ok ? "" : err.id);
    if (ok) input.removeAttribute("aria-describedby");
    err.textContent = ok ? "" : MESSAGES[input.name] || "Please check this field.";
    err.hidden = ok;
    return ok;
  }

  function submit(e) {
    e.preventDefault();
    var bad = null;
    Array.prototype.forEach.call(form.querySelectorAll("input[required], input[pattern]"), function (input) {
      if (!validate(input) && !bad) bad = input;
    });
    if (bad) { bad.focus(); return; }

    var v = function (n) { return form.elements[n].value.trim(); };
    var product = productName.textContent;
    var items = listMode && window.MSTList ? window.MSTList.items() : [];
    var kinds = items.length;
    var data = {
      name: v("name"), email: v("email"), phone: v("phone"), company: v("company"),
      product: product, message: v("message"), items: items.length ? listText(items) : "",
      subject: "Quote request" + (kinds ? ": " + kinds + (kinds === 1 ? " product" : " products") : product ? ": " + product : "") + " - " + v("name")
    };
    if (ACCESS_KEY) sendToInbox(data); else openEmailApp(data);
  }

  // Shows the thank-you screen. kind is "sent" (delivered) or "mail" (email app opened instead).
  function showDone(kind) {
    var title = doneView.querySelector("h2"), msg = doneView.querySelector(".done-msg"), help = doneView.querySelector(".done-help");
    if (kind === "sent") {
      title.textContent = "Thank you";
      msg.textContent = "We have your request and will be in touch soon.";
      help.innerHTML = 'Need us sooner? Call <a href="tel:+27619790504">061 979 0504</a>.';
    } else {
      title.textContent = "Nearly done";
      msg.textContent = "Your email app should now be open with your request ready to send. Press send there to finish.";
      help.innerHTML = 'Nothing opened? Email <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> or call <a href="tel:+27619790504">061 979 0504</a>.';
    }
    formView.hidden = true;
    doneView.hidden = false;
    doneView.querySelector("button").focus();
    // Delivered: the list has done its job, so empty it (leave it alone if only the email app opened).
    if (kind === "sent" && listMode && window.MSTList) { listMode = false; window.MSTList.clear(); }
  }

  function openEmailApp(d) {
    var lines = ["Name: " + d.name, "Email: " + d.email, "Phone: " + d.phone];
    if (d.company) lines.push("Company: " + d.company);
    if (d.product) lines.push("Product: " + d.product);
    if (d.items) lines.push("", "Items:", d.items);
    if (d.message) lines.push("", "Message:", d.message);
    window.location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(d.subject) +
      "&body=" + encodeURIComponent(lines.join("\r\n"));
    showDone("mail");
  }

  function sendToInbox(d) {
    var button = form.querySelector('[type="submit"]');
    var label = button.textContent;
    button.disabled = true;
    button.textContent = "Sending...";
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: ACCESS_KEY, from_name: "MST website", subject: d.subject,
        name: d.name, email: d.email, phone: d.phone, company: d.company,
        product: d.product, items: d.items, message: d.message, botcheck: form.elements.botcheck.checked
      }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.json().then(function (j) { return r.ok && j.success; }); })
      .then(function (ok) { if (!ok) throw new Error("not accepted"); showDone("sent"); })
      .catch(function () { openEmailApp(d); }) // never lose a request: fall back to the email app
      .then(function () { clearTimeout(timer); button.disabled = false; button.textContent = label; });
  }

  // open("Product name") asks about one product; open("", { list: true }) shows the whole quote list.
  function open(product, opts) {
    if (!dlg) build();
    form.reset();
    Array.prototype.forEach.call(form.querySelectorAll("[aria-invalid]"), function (i) {
      i.removeAttribute("aria-invalid");
      i.removeAttribute("aria-describedby");
    });
    Array.prototype.forEach.call(form.querySelectorAll(".quote-error"), function (p) { p.hidden = true; });

    listMode = !!(opts && opts.list && window.MSTList && window.MSTList.count() > 0);
    if (listMode && !subscribed) {
      subscribed = true;
      window.MSTList.on(function () {
        if (!dlg.open || !listMode) return;
        if (!window.MSTList.count()) dlg.close(); else renderItems();
      });
    }
    itemsBox.hidden = !listMode;
    if (listMode) renderItems();
    leadEl.textContent = listMode
      ? "Check your list, then tell us how to reach you and we will come back with a price."
      : "Tell us how to reach you and we will come back with a price.";

    productName.textContent = listMode ? "" : product || "";
    productRow.hidden = listMode || !product;
    formView.hidden = false;
    doneView.hidden = true;
    lastFocus = document.activeElement;
    document.documentElement.classList.add("modal-open");
    dlg.showModal();
    form.elements.name.focus();
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var href = a.getAttribute("href");
    if (href.toLowerCase().indexOf("mailto:" + EMAIL.toLowerCase()) !== 0) return;
    var query = href.split("?")[1] || "";
    var subject = new URLSearchParams(query).get("subject") || "";
    if (subject.toLowerCase().indexOf("quote") !== 0) return;
    e.preventDefault();
    open(subject.replace(/^quote request:?\s*/i, "").trim());
  });

  window.MSTQuote = { open: open };
})();
