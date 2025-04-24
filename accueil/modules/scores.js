// Créer un namespace global pour les scores
window.ScoresModule = (function () {
  // Conserver le score global renvoyé par l'API
  let apiGlobalScore = null;

  // Cette fonction sera appelée avec les données de l'API
  function updateWithApiData(scoreData) {
    apiGlobalScore = scoreData.globalScore;
    return apiGlobalScore;
  }

  // Calculer le score moyen global - maintenant utilise la valeur de l'API si disponible
  function calculateAverageScore() {
    if (apiGlobalScore !== null) {
      return apiGlobalScore;
    }
    return "0.00"; // Valeur par défaut si l'API n'a pas encore répondu
  }

  // Attacher les écouteurs d'événements pour les infobulles
  function attachEventListeners(elements, showTooltip, hideTooltip) {
    // Nettoyer les anciens écouteurs
    elements.forEach((element) => {
      if (element._tooltipEnterHandler) {
        element.removeEventListener("mouseenter", element._tooltipEnterHandler);
      }

      if (element._tooltipLeaveHandler) {
        element.removeEventListener("mouseleave", element._tooltipLeaveHandler);
      }
    });

    // Attacher de nouveaux écouteurs
    elements.forEach((element) => {
      // Utiliser le score global de l'API pour toutes les infobulles
      // Gestionnaire d'entrée de souris
      const enterHandler = () => {
        showTooltip(element, apiGlobalScore || "En attente...");
      };

      // Gestionnaire de sortie de souris
      const leaveHandler = () => {
        hideTooltip();
      };

      // Stocker les références pour pouvoir les supprimer plus tard
      element._tooltipEnterHandler = enterHandler;
      element._tooltipLeaveHandler = leaveHandler;

      // Attacher les écouteurs
      element.addEventListener("mouseenter", enterHandler);
      element.addEventListener("mouseleave", leaveHandler);
    });
  }

  // Exposer les fonctions publiques
  return {
    updateWithApiData: updateWithApiData,
    calculateAverageScore: calculateAverageScore,
    attachEventListeners: attachEventListeners,
  };
})();
