const PIXEL_ID = "1239317595052109";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

function loadPixel() {
  if (typeof window === "undefined") return;
  if (window.fbq) return;
  const f = window;
  const b = document;
  const e = "script";
  const v = "https://connect.facebook.net/en_US/fbevents.js";
  const n = (f.fbq = function (...args: unknown[]) {
    n.callMethod ? n.callMethod(...args) : n.queue.push(args);
  });
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  const t = b.createElement(e);
  t.async = true;
  t.src = v;
  const s = b.getElementsByTagName(e)[0];
  s.parentNode?.insertBefore(t, s);
  n("init", PIXEL_ID);
}

export function initFacebookPixel() {
  loadPixel();
  if (window.fbq) window.fbq("track", "PageView");
}

export function trackInitiateCheckout() {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "InitiateCheckout");
  }
}

export function trackPurchase() {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Purchase");
  }
}
