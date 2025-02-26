// Créer un namespace global pour les scores
window.ScoresModule = (function () {
  // Générer des scores pour tous les éléments textuels de la page
  function generateScores(elements) {
    const scores = {};

    elements.forEach((element) => {
      const textKey = element.innerText.trim().substring(0, 50);
      const scorePourcentage = Math.floor(Math.random() * 100);
      scores[textKey] = scorePourcentage;
    });

    return scores;
  }

  // Calculer le score moyen global
  function calculateAverageScore(scores) {
    const values = Object.values(scores);

    if (values.length === 0) {
      return "0.00";
    }

    const totalScore = values.reduce((sum, val) => sum + val, 0);
    return (totalScore / values.length).toFixed(2);
  }

  // Attacher les écouteurs d'événements pour les infobulles
  function attachEventListeners(elements, scores, showTooltip, hideTooltip) {
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
      const textKey = element.innerText.trim().substring(0, 50);
      const score = scores[textKey];

      if (score !== undefined) {
        // Gestionnaire d'entrée de souris
        const enterHandler = () => {
          showTooltip(element, score);
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
      }
    });
  }

  // Exposer les fonctions publiques
  return {
    generateScores: generateScores,
    calculateAverageScore: calculateAverageScore,
    attachEventListeners: attachEventListeners,
  };
})();
