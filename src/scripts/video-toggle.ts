/**
 * Video toggle — shared play/pause button + optional autoplay.
 *
 * Wraps a button[data-video-toggle] and wires it to the nearest <video>.
 * Add `data-autoplay` to the element for autoplay with reduced-motion respect.
 */
class VideoToggle extends HTMLElement {
  connectedCallback() {
    const video =
      this.querySelector<HTMLVideoElement>("video") ||
      this.closest("section")?.querySelector<HTMLVideoElement>("video");
    if (!video) return;

    // Autoplay with reduced-motion respect.
    // The <video> element carries the native autoplay attribute — the browser
    // handles the poster→frame transition smoothly.  JS only pauses when the
    // user prefers reduced motion.
    if (this.hasAttribute("data-autoplay")) {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");

      const sync = () => {
        if (mql.matches) {
          video.pause();
        } else if (video.paused) {
          video.play();
        }
      };

      sync();
      mql.addEventListener("change", sync);
    }

    // Poster overlay — keeps the poster image visible while Chrome tears
    // down the native poster before the first frame decodes (avoids the
    // dark-purple flash).  Hidden once playback actually starts.
    const poster = this.querySelector<HTMLImageElement>(
      "[data-poster-overlay]",
    );
    if (poster) {
      const showPoster = () => {
        poster.style.display = video.currentTime === 0 ? "" : "none";
      };
      video.addEventListener("playing", () => (poster.style.display = "none"));
      video.addEventListener("pause", showPoster);
      video.addEventListener("ended", showPoster);
    }

    // Play/pause toggle button (optional)
    const btn = this.querySelector<HTMLButtonElement>("[data-video-toggle]");
    if (!btn) return;

    const playLabel = btn.getAttribute("aria-label") || "Play video";
    const pauseLabel =
      btn.dataset.pauseLabel || btn.getAttribute("aria-label") || "Pause video";

    const updateState = () => {
      const paused = video.paused;
      btn.setAttribute("aria-label", paused ? playLabel : pauseLabel);
      this.toggleAttribute("data-paused", paused);
    };

    btn.addEventListener("click", () => {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    });

    video.addEventListener("play", updateState);
    video.addEventListener("pause", updateState);
    video.addEventListener("ended", updateState);

    updateState();
  }
}

if (!customElements.get("video-toggle")) {
  customElements.define("video-toggle", VideoToggle);
}
