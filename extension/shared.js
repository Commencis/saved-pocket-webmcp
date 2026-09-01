// Shared collector runtime for all platform content scripts.
window.SavedPocket = {
  /**
   * @param {Object} opts
   * @param {string} opts.platform
   * @param {() => boolean} [opts.isActivePage] gate for client-routed pages
   * @param {() => Array<{url: string, externalId?: string, title?: string, description?: string, imageUrl?: string}>} opts.collect
   */
  startCollector({ platform, isActivePage, collect }) {
    const sentUrls = new Set();

    const flush = debounce(() => {
      try {
        if (isActivePage && !isActivePage()) return;
        const items = collect().filter(
          (item) => item && item.url && !sentUrls.has(item.url)
        );
        if (items.length === 0) return;
        items.forEach((item) => sentUrls.add(item.url));
        chrome.runtime.sendMessage({
          type: "SAVEDPOCKET_ITEMS",
          platform,
          items,
        });
      } catch (err) {
        console.warn("[SavedPocket] collect failed", err);
      }
    }, 800);

    const observer = new MutationObserver(flush);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", flush, { passive: true });
    flush();
  },
};

function debounce(fn, ms) {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}
