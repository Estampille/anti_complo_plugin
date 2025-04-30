browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message reçu dans background.js:", message);

  try {
    if (message.action === "sendLinks" && sender.tab) {
      console.log("Liens à analyser :", message.links);

      const mainUrl = sender.tab.url;

      fetch("http://localhost:5001/analyze_site_infos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls: [],
          main_url: mainUrl,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Réponse API :", data);

          browser.runtime.sendMessage({
            action: "displayScore",
            globalScore: data.main_url.score_fiable_global,
          });
        })
        .catch((error) => {
          console.error("Erreur lors de l'appel à l'API :", error);
        });
    }
  } catch (error) {
    console.error("Erreur inattendue dans le listener onMessage:", error);
  }

  return false;
});
