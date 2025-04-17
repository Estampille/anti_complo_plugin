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
                console.log("Erreur lors de l'envoi du message au content script:", error);
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
    if ((message.action === "displayScores" || message.action === "displayScore") && sender.tab) {
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

    // 🎯 Nouveau : si le message demande d'analyser les liens
    if (message.action === "sendLinks" && sender.tab) {
      console.log("Liens à analyser :", message.links);

      fetch("http://146.59.218.238:5001/analyze_site_infos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ urls: message.links })
      })
        .then(response => response.json())
        .then(data => {
          console.log("Réponse de l'API :", data);

          // Relayer la réponse vers le popup
          browser.runtime.sendMessage({
            action: "displayScore",
            globalScore: data.globalScore // adapte ce champ selon ta vraie réponse API
          });

        })
        .catch(error => {
          console.error("Erreur lors de l'appel à l'API :", error);
        });
    }

  } catch (error) {
    console.log("Erreur générale dans le gestionnaire de messages:", error);
  }

  return false;
});

// Informer lorsque le script est chargé
console.log("Background script chargé");
