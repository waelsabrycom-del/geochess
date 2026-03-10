/* Material Symbols fallback loader
   Ensures Tailwind CDN is loaded for pages that use ui-offline.css instead of
   the separate local-fonts.css + tailwind-cdn.js pair. */
(function () {
  if (window.__tailwindLoaded) return;
  var s = document.createElement('script');
  s.src = 'assets/local/tailwind-cdn.js';
  s.onload = function () {
    window.__tailwindLoaded = true;
    // Re-apply tailwind config if it was set before script loaded
    if (window.tailwind && window.tailwind.config) {
      try { tailwind.config = window.tailwind.config; } catch (_) {}
    }
  };
  document.head.appendChild(s);
})();
