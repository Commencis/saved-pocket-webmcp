// Scrapes x.com/i/bookmarks.
window.SavedPocket.startCollector({
  platform: "x",
  collect: () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    return Array.from(articles)
      .map((article) => {
        const link = article.querySelector('a[href*="/status/"]');
        if (!link) return null;
        const url = new URL(link.getAttribute("href"), location.origin).href;
        const match = url.match(/\/status\/(\d+)/);
        const text = article
          .querySelector('[data-testid="tweetText"]')
          ?.innerText?.trim();
        const image = article.querySelector('[data-testid="tweetPhoto"] img');
        return {
          url,
          externalId: match ? match[1] : undefined,
          title: text ? text.slice(0, 200) : undefined,
          description: text ? text.slice(0, 2000) : undefined,
          imageUrl: image?.src || undefined,
        };
      })
      .filter(Boolean);
  },
});
