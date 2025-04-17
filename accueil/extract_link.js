(function () {
  // Variable pour stocker les scores
  let scores = {};

  // Initialiser le module d'infobulles
  TooltipModule.loadTooltipStyles();

  // Écouteur de messages pour l'action "highlight"
  browser.runtime.onMessage.addListener((message) => {
    try {
      if (message.action === "highlight") {
        // Sélectionner tous les paragraphes et liens
        const elements = document.querySelectorAll("p, a");

        // Générer des scores pour les éléments
        scores = ScoresModule.generateScores(elements);

        // Calculer le score moyen
        const averageScore = ScoresModule.calculateAverageScore(scores);

        // Envoyer les scores via le background script
        browser.runtime
          .sendMessage({
            action: "displayScores",
            scores: scores,
          })
          .catch((error) => {
            // Ignorer l'erreur si le destinataire n'existe pas
            console.log("Info: Message envoyé mais sans récepteur actif");
          });

        // Envoyer le score global via le background script
        browser.runtime
          .sendMessage({
            action: "displayScore",
            globalScore: averageScore,
          })
          .catch((error) => {
            // Ignorer l'erreur si le destinataire n'existe pas
            console.log("Info: Message envoyé mais sans récepteur actif");
          });

        // Attacher les écouteurs d'événements pour les infobulles
        ScoresModule.attachEventListeners(
          elements,
          scores,
          TooltipModule.showTooltip,
          TooltipModule.hideTooltip
        );
      }

      // Recevoir les scores du background (si nécessaire)
      if (message.action === "displayScores") {
        scores = message.scores;
        ScoresModule.attachEventListeners(
          document.querySelectorAll("p, a"),
          scores,
          TooltipModule.showTooltip,
          TooltipModule.hideTooltip
        );
      }
    } catch (error) {
      console.log("Erreur dans extract_link.js:", error);
    }

    return false; // Pas de réponse asynchrone
  });

  // Informer que le script est chargé
  console.log("Extract_link.js chargé");
})();
