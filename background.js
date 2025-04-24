// background.js - Script de fond pour la communication

// Relayer les messages entre le popup et les content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message reçu dans background.js:", message);

  try {
    // Si le message vient du popup et est destiné au content script
    if (message.action === "highlight" && !sender.tab) {
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then((tabs) => {
          if (tabs && tabs.length > 0) {
            browser.tabs
              .sendMessage(tabs[0].id, { action: "highlight" })
              .catch((error) => {
                console.log(
                  "Erreur lors de l'envoi du message au content script:",
                  error
                );
              });
          } else {
            console.log("Aucun onglet actif trouvé");
          }
        })
        .catch((error) => {
          console.log("Erreur lors de la requête tabs.query:", error);
        });
    }

    // Si le message vient du content script et est destiné au popup
    if (
      (message.action === "displayScores" ||
        message.action === "displayScore") &&
      sender.tab
    ) {
      try {
        browser.runtime.sendMessage(message).catch((error) => {
          if (!error.message.includes("Receiving end does not exist")) {
            console.log("Erreur lors de l'envoi du message au popup:", error);
          }
        });
      } catch (error) {
        console.log("Erreur lors du relais de message:", error);
      }
    }

    // Si le message demande d'analyser les liens
    if (message.action === "sendLinks" && sender.tab) {
      console.log("Liens à analyser :", message.links);

      const payload = {
        urls: message.links,
        main_url: message.links[0] || "", // ou tab.url si tu veux l’URL active
      };

      fetch("http://localhost:5001/analyze_site_infos", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Réponse API :", data); // ← pour debug

          if (sender.tab) {
            // Utiliser l'ID de l'onglet courant
            const tabId = sender.tab.id;
            browser.tabs.sendMessage(tabId, {
              action: "displayScore",
              globalScore: data.globalScore ?? "Non défini",
            });
          } else {
            console.error(
              "Impossible de récupérer tabId pour envoyer le message."
            );
          }

          browser.tabs.sendMessage(tabId, {
            action: "displayScore",
            globalScore: data.globalScore ?? "Non défini", // ← selon ce que l’API renvoie
          });
        })
        .catch((error) => {
          console.error("Erreur lors de l'appel à l'API :", error);
          // En cas d'erreur, on informe le popup
          browser.runtime.sendMessage({
            action: "displayScore",
            globalScore: "Erreur",
          });
        });
    }
  } catch (error) {
    console.error("Erreur inattendue dans le listener onMessage:", error);
  }

  return false;
});

// Informer lorsque le script est chargé
console.log("Background script chargé");
