// Menu parent
browser.contextMenus.create({
  id: "anti-complo-root",
  title: "Anti-Complo",
  contexts: ["all"]
});

// Sous-menu
browser.contextMenus.create({
  id: "anti-complo-similar",
  parentId: "anti-complo-root",
  title: "Chercher article similaire",
  contexts: ["all"]
});

let lastSimilarArticles = null;

// Action au clic
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "anti-complo-similar") {
    // Demande au content script d'extraire le texte
    browser.tabs.sendMessage(tab.id, { action: "extractAndSendText" });
  }
});

// Réception du texte extrait, appel API, puis envoi au popup
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "sendTextToBackend") {
    try {
      // Appel API POST avec le texte extrait
      const response = await fetch("https://similarity.prismedariane.fr/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message.data)
      });
      const data = await response.json();

      // On ne garde que les liens et la fiabilité
      const articles = [];
      for (const key in data) {
        for (const item of data[key]) {
          articles.push({
            url: item[2],
            fiabilite: item[1]
          });
        }
      }
      lastSimilarArticles = { articles };
      browser.runtime.sendMessage({
        action: "showSimilarArticles",
        articles
      });
    } catch (e) {
      lastSimilarArticles = { articles: [], error: "Erreur lors de la récupération des articles similaires" };
      browser.runtime.sendMessage({
        action: "showSimilarArticles",
        articles: [],
        error: "Erreur lors de la récupération des articles similaires"
      });
    }
  } else if (message.action === "getLastSimilarArticles") {
    sendResponse(lastSimilarArticles);
  }
}); 