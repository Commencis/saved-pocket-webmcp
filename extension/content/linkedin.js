// Scrapes linkedin.com/my-items/saved-posts/.
window.SavedPocket.startCollector({
  platform: "linkedin",
  collect: () => {
    const anchors = document.querySelectorAll('a[href*="/feed/update/"]');
    return Array.from(anchors).map((a) => {
      const url = new URL(a.getAttribute("href"), location.origin).href;
      const match = url.match(/\/feed\/update\/(urn:li:activity:\d+)/);
      const container = a.closest("li, div[data-urn], article") || a.parentElement;

      // Prefer the actual post text over the whole card (which contains
      // author lines, follower counts, timestamps, etc.)
      const textEl = container?.querySelector(
        [
          ".update-components-text",
          ".entity-result__content-summary",
          ".update-components-update-v2__commentary",
          ".feed-shared-text",
        ].join(", ")
      );
      const text = (textEl?.innerText || container?.innerText || "")
        .trim()
        .replace(/\s+/g, " ");

      const img = container?.querySelector(
        '.update-components-image img, .entity-result__embedded-object img, img[src*="media.licdn.com"]'
      );

      return {
        url,
        externalId: match ? match[1] : undefined,
        title: text ? text.slice(0, 300) : undefined,
        description: text ? text.slice(0, 2000) : undefined,
        imageUrl: img?.src || undefined,
      };
    });
  },
});
