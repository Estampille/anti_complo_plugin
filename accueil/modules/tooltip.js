/**
 * Module de gestion des infobulles
 * Utilise une approche avec namespace au lieu des modules ES6
 */

// Créer un namespace global pour les infobulles
window.TooltipModule = (function () {
  // Fonction pour afficher une infobulle
  function showTooltip(element, score) {
    // Supprimer toute infobulle existante
    hideTooltip();

    // Créer une nouvelle infobulle
    const tooltip = document.createElement("div");
    tooltip.className = "mylink-tooltip";
    tooltip.id = "mylink-tooltip";

    // Ajouter une classe en fonction du score
    if (score < 45) {
      tooltip.classList.add("mylink-tooltip-low");
    } else if (score >= 45 && score < 70) {
      tooltip.classList.add("mylink-tooltip-medium");
    } else {
      tooltip.classList.add("mylink-tooltip-high");
    }

    // Définir le texte de l'infobulle
    tooltip.textContent = `Score de confiance : ${score}%`;

    // Ajouter l'infobulle au body
    document.body.appendChild(tooltip);

    // Positionner initialement l'infobulle près de l'élément
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${window.scrollX + rect.right + 10}px`;
    tooltip.style.top = `${window.scrollY + rect.top}px`;

    // Gestionnaire pour suivre la souris
    const moveHandler = (e) => {
      tooltip.style.left = `${e.pageX + 15}px`;
      tooltip.style.top = `${e.pageY + 15}px`;
    };

    // Stocker le gestionnaire sur l'élément pour le supprimer plus tard
    element._tooltipMoveHandler = moveHandler;

    // Attacher le gestionnaire de mouvement
    element.addEventListener("mousemove", moveHandler);
  }

  // Fonction pour masquer l'infobulle
  function hideTooltip() {
    const tooltip = document.getElementById("mylink-tooltip");

    if (tooltip) {
      tooltip.remove();
    }

    // Supprimer tous les gestionnaires de mouvement
    document.querySelectorAll("p, a").forEach((element) => {
      if (element._tooltipMoveHandler) {
        element.removeEventListener("mousemove", element._tooltipMoveHandler);
        delete element._tooltipMoveHandler;
      }
    });
  }

  // Fonction pour charger la feuille de style des infobulles
  function loadTooltipStyles() {
    try {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = browser.runtime.getURL("accueil/infobulles.css");
      document.head.appendChild(link);
    } catch (error) {
      // Silencieux en production
    }
  }

  // Exposer les fonctions publiques
  return {
    showTooltip: showTooltip,
    hideTooltip: hideTooltip,
    loadTooltipStyles: loadTooltipStyles,
  };
})();
