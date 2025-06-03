(function () {
  console.log("🔍 Content Script (extract_link.js) chargé");

  // Attendre que le module Tooltip soit initialisé
  function waitForTooltipModule(callback, maxAttempts = 10) {
    let attempts = 0;
    
    function checkModule() {
      if (window.TooltipModule) {
        callback();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkModule, 500);
      }
    }
    
    checkModule();
  }

  // Initialiser le module d'infobulles
  waitForTooltipModule(() => {
    window.TooltipModule.loadTooltipStyles();
  });

  // Fonction pour extraire les liens uniques
  function extractUniqueLinks() {
    const links = new Set();
    const seenUrls = new Set();

    document.querySelectorAll('a').forEach(link => {
      try {
        const url = new URL(link.href);
        if (url.protocol.match(/^https?:$/)) {
          const normalizedUrl = url.origin + url.pathname;
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            links.add(link.href);
          }
        }
      } catch (e) {
        // Ignorer les URLs invalides
      }
    });

    return Array.from(links);
  }

  // Fonction pour mettre à jour les infobulles
  function updateTooltips(data) {
    if (!data || !data.main_url) return;
    window.TooltipModule.setScores(data);
  }

  // Écouteur de messages
  browser.runtime.onMessage.addListener((message) => {
    try {
      if (message.action === "extractLinks") {
        const links = extractUniqueLinks();
        const pageData = window.TooltipModule.extractPageText();

        browser.runtime.sendMessage({
          action: "sendLinks",
          links: links,
          pageData: pageData
        }).catch(error => {
          console.error("Erreur lors de l'envoi des données:", error);
        });
      }

      if (message.action === "displayScore") {
        if (message.error) {
          console.error("Erreur lors de l'analyse:", message.error);
        } else {
          updateTooltips(message.data);
        }
      }
    } catch (error) {
      console.error("Erreur dans extract_link.js:", error);
    }

    return false;
  });
})();
