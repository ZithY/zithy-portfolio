// Shared by every page: nav shadow on scroll, current-page highlight, footer year.
const nav = document.getElementById('nav');
const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 8);
onScroll();
addEventListener('scroll', onScroll, { passive: true });

const here = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.l-links a').forEach((a) => {
  if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
});
const yr = document.getElementById('yr');
if (yr) yr.textContent = new Date().getFullYear();

// Custom dropdown: replaces every <select> inside .l-form with a themed menu.
// The real <select> stays in the DOM (hidden) so forms and scripts keep working; dispatch 'change' on it to refresh the menu.
document.querySelectorAll('.l-form select').forEach((sel) => {
  const dd = document.createElement('div');
  dd.className = 'l-dd';
  dd.innerHTML = '<button type="button" class="l-dd-btn" aria-haspopup="listbox" aria-expanded="false"><span></span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><ul class="l-dd-list" role="listbox" tabindex="-1" hidden></ul>';
  sel.classList.add('l-dd-native');
  sel.tabIndex = -1;
  sel.setAttribute('aria-hidden', 'true');
  sel.after(dd);

  const btn = dd.querySelector('button');
  const list = dd.querySelector('ul');
  const label = btn.querySelector('span');
  const items = [...sel.options].map((o, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.textContent = o.text;
    li.addEventListener('mousedown', (e) => e.preventDefault());
    li.addEventListener('click', () => { choose(i); close(true); });
    list.append(li);
    return li;
  });
  let active = sel.selectedIndex;

  const paint = () => {
    label.textContent = sel.options[sel.selectedIndex].text;
    items.forEach((li, i) => {
      li.setAttribute('aria-selected', String(i === sel.selectedIndex));
      li.classList.toggle('active', i === active);
    });
  };
  const choose = (i) => {
    sel.selectedIndex = i;
    active = i;
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    paint();
  };
  const open = () => { list.hidden = false; dd.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); active = sel.selectedIndex; paint(); };
  function close(refocus) { list.hidden = true; dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); if (refocus) btn.focus(); }
  const move = (d) => { active = (active + d + items.length) % items.length; paint(); items[active].scrollIntoView({ block: 'nearest' }); };

  btn.addEventListener('click', () => (list.hidden ? open() : close()));
  btn.addEventListener('keydown', (e) => {
    const isOpen = !list.hidden;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!isOpen) open(); else move(e.key === 'ArrowDown' ? 1 : -1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isOpen) open(); else { choose(active); close(); } }
    else if (e.key === 'Escape' && isOpen) { e.preventDefault(); close(); }
    else if (e.key === 'Tab' && isOpen) close();
    else if (e.key.length === 1) { // type a letter to jump to a matching option
      const i = items.findIndex((li, n) => n > active && li.textContent.toLowerCase().startsWith(e.key.toLowerCase()));
      const j = i >= 0 ? i : items.findIndex((li) => li.textContent.toLowerCase().startsWith(e.key.toLowerCase()));
      if (j >= 0) { if (isOpen) { active = j; paint(); items[j].scrollIntoView({ block: 'nearest' }); } else choose(j); }
    }
  });
  document.addEventListener('click', (e) => { if (!dd.contains(e.target)) close(); });
  sel.addEventListener('change', () => { active = sel.selectedIndex; paint(); });
  paint();
});

// Floating WhatsApp button on every page
(() => {
  const a = document.createElement('a');
  a.className = 'l-wa';
  a.href = 'https://wa.me/27694518820?text=' + encodeURIComponent("Hi ZithY Web Studio, I'd like a quote for a website.");
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', 'Chat with me on WhatsApp');
  a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><g transform="translate(6.5 6.5) scale(0.46)"><path stroke-width="3.4" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></g></svg><span>Chat on WhatsApp</span>';
  document.body.append(a);
})();
