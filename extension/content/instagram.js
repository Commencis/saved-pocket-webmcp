// Scrapes instagram.com/{user}/saved/ (client-routed, so we self-gate on the path).
window.SavedPocket.startCollector({
  platform: "instagram",
  isActivePage: () => location.pathname.includes("/saved"),
  collect: () => {
    const anchors = document.querySelectorAll(
      'main a[href*="/p/"], main a[href*="/reel/"]'
    );
    return Array.from(anchors).map((a) => {
      const url = new URL(a.getAttribute("href"), location.origin).href;
      const match = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
      const img = a.querySelector("img");
      return {
        url,
        externalId: match ? match[1] : undefined,
        title: img?.alt ? img.alt.slice(0, 500) : undefined,
        imageUrl: img?.src || undefined,
      };
    });
  },
});
