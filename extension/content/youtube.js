// Scrapes youtube.com/playlist?list=WL (Watch Later).
// Only runs when the user is actually on the Watch Later page.
if (location.pathname === "/playlist" && new URLSearchParams(location.search).get("list") === "WL") {
  window.SavedPocket.startCollector({
    platform: "youtube",
    collect: () => {
      const renderers = document.querySelectorAll("ytd-playlist-video-renderer");
      return Array.from(renderers)
        .map((el) => {
          const anchor = el.querySelector("a#video-title");
          if (!anchor) return null;
          const href = anchor.getAttribute("href");
          if (!href) return null;
          const url = new URL(href, location.origin).href;
          const videoId = new URLSearchParams(new URL(url).search).get("v");
          const title = anchor.getAttribute("title") ?? anchor.textContent?.trim() ?? null;
          const thumb = el.querySelector("img")?.src ?? null;
          return {
            url,
            externalId: videoId ?? undefined,
            title: title ?? undefined,
            imageUrl: thumb ?? undefined,
          };
        })
        .filter(Boolean);
    },
  });
}
