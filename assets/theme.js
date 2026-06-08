/* Shogol — shared behavior: theme toggle, scroll-reveal, diagram draw-on.
   The no-FOUC theme is set by a tiny inline <head> script on every page;
   this file only wires the toggle button + IntersectionObservers. */
(function () {
  // ---- theme toggle ----
  var root = document.documentElement;
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('shogol-theme', t); } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.toggle');
    if (!btn) return;
    setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  // ---- scroll reveal + diagram draw-on ----
  function reveal() {
    var els = document.querySelectorAll('.reveal, .diagram');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  if (document.readyState !== 'loading') reveal();
  else document.addEventListener('DOMContentLoaded', reveal);
})();

/* ---- Vercel Web Analytics (static-site injection — no npm, no build) ----
   Loads /_vercel/insights/script.js, which Vercel serves only once Web
   Analytics is enabled for the project in the dashboard. Skipped on
   localhost/file:// so local dev doesn't 404. */
(function () {
  if (location.protocol === 'file:' ||
      /^(localhost$|127\.|0\.0\.0\.0)/.test(location.hostname)) return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  var s = document.createElement('script');
  s.defer = true;
  s.src = '/_vercel/insights/script.js';
  document.head.appendChild(s);
})();
