// Module de gestion des infobulles
console.log('🔄 Chargement du module Tooltip...');

window.TooltipModule = (function() {
  console.log('📦 Initialisation du module Tooltip...');
  
  let activeTooltip = null;
  let moveHandler = null;
  let paragraphScores = null;
  let globalScore = null;
  let scoreCache = new Map(); // Cache pour les scores
  let debounceTimer = null; // Pour le debounce des événements

  // Fonction de debounce pour optimiser les performances
  function debounce(func, wait) {
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(debounceTimer);
        func(...args);
      };
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(later, wait);
    };
  }

  // Fonction pour mettre en cache un score
  function cacheScore(text, score) {
    const key = text.toLowerCase().trim();
    scoreCache.set(key, {
      score,
      timestamp: Date.now()
    });
  }

  // Fonction pour récupérer un score du cache
  function getCachedScore(text) {
    const key = text.toLowerCase().trim();
    const cached = scoreCache.get(key);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) { // Cache valide 30 minutes
      return cached.score;
    }
    return null;
  }

  // Fonction pour nettoyer le cache
  function clearCache() {
    scoreCache.clear();
  }

  // Fonction d'extraction de texte
  function extractPageText() {
    console.log('📄 Début extraction de texte...');
    const paragraphs = [];
    
    // Sélecteurs pour les paragraphes
    const selector = 'article p, section p, div p, p';
    const candidates = Array.from(document.querySelectorAll(selector));
    console.log(`🔍 ${candidates.length} éléments trouvés`);

    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    };

    const isRelevant = (el) => {
      const text = el.textContent.trim();
      return text.length > 50 && !el.closest('header, footer, nav, aside, form, menu') && isVisible(el);
    };

    // Extraire les paragraphes pertinents
    candidates.forEach(el => {
      if (isRelevant(el)) {
        paragraphs.push({
          element: el,
          text: el.textContent.trim()
        });
      }
    });

    // Supprimer les doublons
    const seen = new Set();
    const uniqueParagraphs = paragraphs.filter(p => {
      const hash = p.text.slice(0, 150);
      if (seen.has(hash)) return false;
      seen.add(hash);
      return true;
    });

    // Formater pour l'API
    const formattedParagraphs = uniqueParagraphs.map(p => p.text);
    return {
      urls: [],
      main_url: {
        url: window.location.href,
        scores_paragraphes: formattedParagraphs
      }
    };
  }

  // Fonction pour appliquer les scores
  function setScores(data) {
    if (!data?.main_url?.scores_paragraphes) return;

    paragraphScores = data.main_url.scores_paragraphes;
    globalScore = data.main_url.score_fiable_global;

    // Nettoyer les anciens écouteurs
    cleanupPreviousListeners();

    // Appliquer les scores aux paragraphes
    const pageParagraphs = getAllPageParagraphs();
    paragraphScores.forEach(scoredParagraph => {
      for (const {element, text} of pageParagraphs) {
        if (text.toLowerCase().trim() === scoredParagraph.texte.toLowerCase().trim()) {
          wrapTextWithScore(element, {
            fiable: scoredParagraph.Fiable,
            faux: scoredParagraph.Faux
          });
          addTooltipListeners(element);
          break;
        }
      }
    });

    // Appliquer le score global aux liens
    if (globalScore !== null) {
      document.querySelectorAll('a[href^="http"]').forEach(link => {
        addTooltipListeners(link);
        link.setAttribute('data-score', Math.round(globalScore * 100));
      });
    }
  }

  // Fonction pour ajouter les écouteurs d'infobulle
  function addTooltipListeners(element) {
    const enterHandler = () => showTooltip(element);
    const leaveHandler = () => hideTooltip();

    element._tooltipEnterHandler = enterHandler;
    element._tooltipLeaveHandler = leaveHandler;
    
    element.addEventListener('mouseenter', enterHandler);
    element.addEventListener('mouseleave', leaveHandler);
    element.classList.add('has-tooltip');
  }

  // Fonction pour nettoyer les écouteurs
  function cleanupPreviousListeners() {
    document.querySelectorAll('.has-tooltip').forEach(el => {
      if (el._tooltipEnterHandler) el.removeEventListener('mouseenter', el._tooltipEnterHandler);
      if (el._tooltipLeaveHandler) el.removeEventListener('mouseleave', el._tooltipLeaveHandler);
      el.classList.remove('has-tooltip');
    });
  }

  // Fonction pour obtenir tous les paragraphes
  function getAllPageParagraphs() {
    const paragraphs = [];
    const selector = 'article p, section p, div p, p';
    
    document.querySelectorAll(selector).forEach(p => {
      const text = p.textContent.trim();
      if (text && text.length > 150) {
        paragraphs.push({ element: p, text: text });
      }
    });

    return paragraphs;
  }

  // Fonction pour encapsuler le texte avec le score
  function wrapTextWithScore(element, score) {
    const colorClass = getColorClass(score.fiable);
    const scorePercent = Math.round(score.fiable * 100);
    element.classList.add('score-highlight', colorClass);
    element.setAttribute('data-score', scorePercent);
  }

  // Fonction pour obtenir la classe de couleur
  function getColorClass(fiableScore) {
    if (fiableScore >= 0.85) return 'score-high';
    if (fiableScore >= 0.6) return 'score-medium';
    return 'score-low';
  }

  // Fonction pour afficher l'infobulle
  function showTooltip(element) {
    hideTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'mylink-tooltip';
    tooltip.id = 'mylink-tooltip';
    tooltip.style.whiteSpace = 'pre-line';
    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = '10000';

    let scores = null;
    if (element.tagName.toLowerCase() === 'p') {
      scores = findScoreForText(element);
      if (scores) {
        tooltip.textContent = formatTooltipContent(scores);
        tooltip.classList.add(getColorClass(scores.fiable));
      } else {
        tooltip.textContent = "Paragraphe non analysé";
        tooltip.classList.add('mylink-tooltip-neutral');
      }
    } else if (element.tagName.toLowerCase() === 'a' && globalScore !== null) {
      scores = { fiable: globalScore, faux: 1 - globalScore };
      tooltip.textContent = formatTooltipContent(scores);
      tooltip.classList.add(getColorClass(globalScore));
    } else {
      tooltip.textContent = "Lien non analysé";
      tooltip.classList.add('mylink-tooltip-neutral');
    }

    document.body.appendChild(tooltip);
    activeTooltip = tooltip;

    const updatePosition = debounce(() => {
      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const padding = 15;

      // Positionner l'infobulle à droite du texte
      let left = rect.right + padding;
      let top = rect.top;

      // Si l'infobulle dépasse à droite, la positionner à gauche
      if (left + tooltipRect.width > window.innerWidth) {
        left = rect.left - tooltipRect.width - padding;
      }

      // Si l'infobulle dépasse en bas, la remonter
      if (top + tooltipRect.height > window.innerHeight) {
        top = window.innerHeight - tooltipRect.height - padding;
      }

      // S'assurer que l'infobulle ne dépasse pas en haut
      if (top < padding) {
        top = padding;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }, 10); // Debounce de 10ms

    // Mettre à jour la position immédiatement et lors du défilement
    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    // Nettoyer les écouteurs lors de la fermeture de l'infobulle
    const cleanup = () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };

    element.addEventListener('mouseleave', cleanup);
  }

  // Fonction pour masquer l'infobulle
  function hideTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
    if (moveHandler) {
      document.querySelectorAll('p, a').forEach(element => {
        element.removeEventListener('mousemove', moveHandler);
      });
      moveHandler = null;
    }
  }

  // Fonction pour formater le contenu de l'infobulle
  function formatTooltipContent(scores) {
    if (!scores) return "Score non disponible";
    const fiablePercent = Math.round(scores.fiable * 100);
    const fauxPercent = Math.round(scores.faux * 100);
    let message = `Fiabilité: ${fiablePercent}%\nDoute: ${fauxPercent}%`;
    
    // Ajouter un message qualitatif
    if (scores.fiable >= 0.85) {
      message += "\n✓ Contenu très fiable";
    } else if (scores.fiable >= 0.6) {
      message += "\n⚠ Fiabilité moyenne";
    } else {
      message += "\n⚠ Contenu peu fiable";
    }
    
    return message;
  }

  // Fonction pour trouver le score d'un texte
  function findScoreForText(element) {
    if (!paragraphScores) return null;
    const elementText = element.textContent.toLowerCase().trim();

    // Vérifier d'abord le cache
    const cachedScore = getCachedScore(elementText);
    if (cachedScore) return cachedScore;

    // Si pas en cache, chercher dans les scores
    for (const scored of paragraphScores) {
      if (scored.texte.toLowerCase().trim() === elementText) {
        const score = {
          fiable: scored.Fiable,
          faux: scored.Faux
        };
        // Mettre en cache
        cacheScore(elementText, score);
        return score;
      }
    }
    return null;
  }

  // Fonction pour charger les styles
  function loadTooltipStyles() {
    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = browser.runtime.getURL('accueil/infobulles.css');
      document.head.appendChild(link);
    } catch (error) {
      console.warn('Erreur lors du chargement des styles:', error);
    }
  }

  // Initialisation
  loadTooltipStyles();
  window.addEventListener('unload', hideTooltip);

  // Exposer les fonctions nécessaires
  return {
    showTooltip,
    hideTooltip,
    loadTooltipStyles,
    setScores,
    hasScores: () => Array.isArray(paragraphScores) && paragraphScores.length > 0,
    hasGlobalScore: () => globalScore !== null,
    extractPageText,
    clearCache // Exposer la fonction de nettoyage du cache
  };
})();

// Vérification de l'initialisation
if (typeof window.TooltipModule === 'undefined') {
  console.error('❌ ERREUR: Module Tooltip non initialisé');
} else {
  console.log('✅ Module Tooltip disponible globalement');
  // Test d'extraction immédiat
  console.log('🧪 Test d\'extraction de texte...');
  window.TooltipModule.extractPageText();
}

// Exposer le module globalement
window.TooltipModule = window.TooltipModule;
