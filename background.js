// background.js - Script de fond pour la communication

// Relayer les messages entre le popup et les content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message reçu dans background.js:", message);

  try {
    // Si le message vient du popup et est destiné au content script
    if (message.action === "highlight" && !sender.tab) {
      // Transmettre le message au content script de l'onglet actif
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then((tabs) => {
          if (tabs && tabs.length > 0) {
            // Vérifier si l'onglet existe avant d'envoyer le message
            try {
              browser.tabs
                .sendMessage(tabs[0].id, { action: "highlight" })
                .catch((error) => {
                  console.log(
                    "Erreur lors de l'envoi du message au content script:",
                    error
                  );
                });
            } catch (error) {
              console.log("Erreur lors de l'envoi du message:", error);
            }
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
      // Relayer le message au popup
      try {
        browser.runtime.sendMessage(message).catch((error) => {
          // Cette erreur est normale si le popup n'est pas ouvert
          if (!error.message.includes("Receiving end does not exist")) {
            console.log("Erreur lors de l'envoi du message au popup:", error);
          }
        });
      } catch (error) {
        console.log("Erreur lors du relais de message:", error);
      }
    }
  } catch (error) {
    console.log("Erreur générale dans le gestionnaire de messages:", error);
  }

  // Indiquer que nous ne prévoyons pas d'appeler sendResponse de manière asynchrone
  return false;
});

// Informer lorsque le script est chargé
console.log("Background script chargé");
