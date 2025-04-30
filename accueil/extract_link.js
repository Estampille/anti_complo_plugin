(function () {
  // Initialiser le module d'infobulles
  TooltipModule.loadTooltipStyles();

  // Écouteur de messages pour l'action "highlight"
  browser.runtime.onMessage.addListener((message) => {
    try {
      if (message.action === "extractLinks") {
        console.log("Action highlight reçue, extraction des liens en cours...");

        // Extraire tous les liens de la page
        const links = Array.from(document.querySelectorAll("a"))
          .map((a) => a.href)
          .filter((href) => href && href.startsWith("http"));
        //const currentUrl = window.location.href;

        // Envoie cette URL pour analyse
        //chrome.runtime.sendMessage({ type: "analyzePage", url: currentUrl });

        console.log(`${links.length} liens extraits pour analyse`);

        // Envoyer les liens au background script pour analyse par l'API
        browser.runtime
          .sendMessage({
            action: "sendLinks",
            links: links,
          })
          .catch((error) => {
            console.log(
              "Erreur lors de l'envoi des liens au background:",
              error
            );
          });

        // Présélectionner les éléments pour les infobulles (à mettre à jour quand le score sera reçu)
        const elements = document.querySelectorAll("p, a");

        // Attacher les écouteurs pour afficher "En attente..." avant d'avoir le score réel
        elements.forEach((element) => {
          // Nettoyer les anciens écouteurs
          if (element._tooltipEnterHandler) {
            element.removeEventListener(
              "mouseenter",
              element._tooltipEnterHandler
            );
          }
          if (element._tooltipLeaveHandler) {
            element.removeEventListener(
              "mouseleave",
              element._tooltipLeaveHandler
            );
          }

          // Nouveaux écouteurs temporaires
          const enterHandler = () => {
            TooltipModule.showTooltip(element, "En attente de l'analyse...");
          };
          const leaveHandler = () => {
            TooltipModule.hideTooltip();
          };

          // Stocker les références
          element._tooltipEnterHandler = enterHandler;
          element._tooltipLeaveHandler = leaveHandler;

          // Attacher les écouteurs
          element.addEventListener("mouseenter", enterHandler);
          element.addEventListener("mouseleave", leaveHandler);
        });
      }

      // Recevoir le score global du background
      if (message.action === "displayScore") {
        console.log("Score global reçu:", message.globalScore);
        const finalScore = message.globalScore;

        // Mettre à jour les infobulles avec le score de l'API
        const elements = document.querySelectorAll("p, a");

        elements.forEach((element) => {
          // Nettoyer les anciens écouteurs
          if (element._tooltipEnterHandler) {
            element.removeEventListener(
              "mouseenter",
              element._tooltipEnterHandler
            );
          }
          if (element._tooltipLeaveHandler) {
            element.removeEventListener(
              "mouseleave",
              element._tooltipLeaveHandler
            );
          }

          // Nouveaux écouteurs avec le score final
          const enterHandler = () => {
            TooltipModule.showTooltip(
              element,
              `Score de confiance: ${finalScore}%`
            );
          };
          const leaveHandler = () => {
            TooltipModule.hideTooltip();
          };

          // Stocker les références
          element._tooltipEnterHandler = enterHandler;
          element._tooltipLeaveHandler = leaveHandler;

          // Attacher les écouteurs
          element.addEventListener("mouseenter", enterHandler);
          element.addEventListener("mouseleave", leaveHandler);
        });
      }
    } catch (error) {
      console.log("Erreur dans extract_link.js:", error);
    }

    return false; // Pas de réponse asynchrone
  });

  // Informer que le script est chargé
  console.log("Extract_link.js chargé");
})();
