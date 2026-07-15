// @ts-nocheck — extracted from layout/theme.liquid inline script.
// Toggles a `data-blur-videos` attribute on <html> when drawers open/close
// or when the user clicks a same-origin navigation link. The matching CSS
// rule `[data-blur-videos] video { filter: blur(12px) }` in base.css applies
// the actual blur.

(function () {
  function setBlur(v: boolean) {
    if (v) {
      document.documentElement.setAttribute("data-blur-videos", "");
    } else {
      document.documentElement.removeAttribute("data-blur-videos");
    }
  }

  document.addEventListener("dialog:open", function (e: Event) {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      target.querySelector &&
      target.querySelector("dialog[data-drawer]")
    ) {
      setBlur(true);
    }
  });

  document.addEventListener("dialog:close", function () {
    if (!document.querySelector("dialog[data-drawer][open]")) {
      setBlur(false);
    }
  });

  document.addEventListener("click", function (e: MouseEvent) {
    const link = (e.target as HTMLElement).closest("a");
    if (!link || !link.href) return;
    if (link.hasAttribute("data-header-cart")) return;
    if (link.target && link.target !== "_self") return;
    try {
      const url = new URL(link.href);
      if (url.origin !== window.location.origin) return;
    } catch (_) {
      return;
    }
    setBlur(true);
  });
})();
