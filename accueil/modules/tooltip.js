// Module de gestion des infobulles
console.log('🔄 Chargement du module Tooltip...');

// Définir le module globalement
window.TooltipModule = (function() {
  console.log('📦 Initialisation du module Tooltip...');
  
  let activeTooltip = null;
  let moveHandler = null;
  let paragraphScores = null;
  let globalScore = null;

  // Fonction de débogage
  function debug(message, data = null) {
    console.log(`🔍 DEBUG: ${message}`, data || '');
  }

  // Fonction modulaire d'extraction de texte
  function extractPageText() {
    console.log('📄 Début extraction de texte...');
    debug('Début extraction de texte');
    const paragraphs = [];
    
    // Sélecteurs pertinents pour les paragraphes "riches"
    const selector = 'article p, section p, div p, p';
    const candidates = Array.from(document.querySelectorAll(selector));
    console.log(`🔍 ${candidates.length} éléments trouvés avec le sélecteur`);

    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        el.offsetParent !== null
      );
    };

    const isRelevant = (el) => {
      const text = el.textContent.trim();
      const wordCount = text.split(/\s+/).length;
      console.log(`📝 Paragraphe trouvé (${wordCount} mots):`, text.substring(0, 50) + "...");
      
      return (
        text.length > 50 &&
        wordCount > 3 &&
        !el.closest('header, footer, nav, aside, form, menu') &&
        isVisible(el)
      );
    };

    candidates.forEach((el, index) => {
      if (isRelevant(el)) {
        console.log(`✅ Paragraphe pertinent ${index + 1}:`, el.textContent.substring(0, 50) + "...");
        paragraphs.push({
          element: el,
          text: el.textContent.trim()
        });
      }
    });

    // Supprimer les doublons basés sur le texte
    const seen = new Set();
    const uniqueParagraphs = paragraphs.filter(p => {
      const hash = p.text.slice(0, 150); // hash rudimentaire
      if (seen.has(hash)) {
        console.log('🔄 Doublon trouvé:', p.text.substring(0, 50) + "...");
        return false;
      }
      seen.add(hash);
      return true;
    });

    console.log(`📊 ${uniqueParagraphs.length} paragraphes uniques trouvés`);

    // Formater pour l'API
    const formattedParagraphs = uniqueParagraphs.map(p => p.text);

    const apiData = {
      urls: [],
      main_url: {
        url: window.location.href,
        scores_paragraphes: formattedParagraphs
      }
    };

    console.log('📤 Données extraites pour API:', apiData);
    return apiData;
  }
  

  // Fonction pour définir les scores
  function setScores(data) {
    debug('Début setScores', data);
    
    // Si pas de données, extraire les paragraphes et les envoyer
    if (!data?.main_url) {
      debug('Pas de données, préparation nouvelle requête');
      const apiData = extractPageText();
      
      if (!apiData) {
        debug('ERREUR: Impossible d\'extraire les données');
        return;
      }

      // Envoyer les données à l'API via le background script
      debug('Envoi des données au background script');
      browser.runtime.sendMessage({
        action: 'analyzePage',
        data: apiData
      }).then(response => {
        debug('Réponse reçue du background script:', response);
        if (response?.main_url) {
          paragraphScores = response.main_url.scores_paragraphes || [];
          globalScore = response.main_url.score_fiable_global;
          applyScoresToParagraphs();
        }
      }).catch(error => {
        debug('ERREUR lors de l\'envoi:', error);
      });
      return;
    }

    // Si on a des données, les appliquer
    paragraphScores = data.main_url.scores_paragraphes || [];
    globalScore = data.main_url.score_fiable_global;
    applyScoresToParagraphs();
  }

  // Fonction pour appliquer les scores aux paragraphes
  function applyScoresToParagraphs() {
    debug('Début applyScoresToParagraphs');
    if (!paragraphScores || paragraphScores.length === 0) {
      debug('ERREUR: Pas de scores à appliquer');
      return;
    }

    const pageParagraphs = getAllPageParagraphs();
    debug('Paragraphes trouvés pour application des scores:', pageParagraphs.length);
    
    paragraphScores.forEach((scoredParagraph, index) => {
      const apiWords = getFirstAndLastWords(scoredParagraph.texte);
      if (!apiWords) {
        debug(`ERREUR: Impossible d'extraire les mots du paragraphe ${index}`);
        return;
      }

      debug(`Recherche correspondance pour paragraphe ${index}:`, {
        first: apiWords.first,
        last: apiWords.last
      });

      for (const {element, text} of pageParagraphs) {
        if (text.includes(apiWords.first) && text.includes(apiWords.last)) {
          debug('Correspondance trouvée:', text.substring(0, 50));
          wrapTextWithScore(element, {
            fiable: scoredParagraph.Fiable,
            faux: scoredParagraph.Faux
          });
          break;
        }
      }
    });
  }

  // Fonction pour vérifier si des scores sont disponibles
  function hasScores() {
    return Array.isArray(paragraphScores) && paragraphScores.length > 0;
  }

  // Fonction pour vérifier si un score global est disponible
  function hasGlobalScore() {
    return globalScore !== null;
  }

  // Fonction pour obtenir le premier et dernier mot significatif d'un texte
  function getFirstAndLastWords(text) {
    if (!text) {
      console.log("❌ Texte vide ou invalide");
      return null;
    }

    console.log("\n📝 Analyse du texte:");
    console.log("Texte original:", text.substring(0, 199) + "...");

    // Séparer le texte en mots (sans modification du texte)
    const words = text.trim().split(/\s+/);

    if (words.length < 2) {
      console.log("❌ Pas assez de mots");
      return null;
    }

    const result = {
      first: words[0],
      last: words[words.length - 1],
      fullText: text
    };

    console.log("✓ Résultat analyse:", result);
    return result;
  }

  // Fonction pour encapsuler le texte avec la couleur et le score
  function wrapTextWithScore(element, score) {
    // Nouveau comportement : n'ajoute qu'une classe et un data-score, sans toucher au contenu
    const colorClass = getColorClass(score.fiable);
    const scorePercent = Math.round(score.fiable * 100);
    element.classList.add('score-highlight', colorClass);
    element.setAttribute('data-score', scorePercent);
  }

  // Fonction pour trouver le score correspondant au texte
  function findScoreForText(element) {
    if (!paragraphScores) {
      console.log("❌ Pas de scores de paragraphes disponibles");
      return null;
    }

    const elementText = element.textContent;
    console.log("\n🔍 DÉBUT RECHERCHE DE CORRESPONDANCE");
    console.log("Texte de l'élément:", elementText.substring(0, 100) + "...");

    // Obtenir les mots clés du texte de l'élément
    const elementWords = getFirstAndLastWords(elementText);
    if (!elementWords) {
      console.log("❌ Échec analyse du texte de l'élément");
      return null;
    }

    // Chercher dans les scores
    for (const [index, scored] of paragraphScores.entries()) {
      const scoredWords = getFirstAndLastWords(scored.texte);
      if (!scoredWords) continue;

      // Vérifier la correspondance exacte des premiers et derniers mots
      if (elementWords.first === scoredWords.first && 
          elementWords.last === scoredWords.last) {
        console.log("✅ CORRESPONDANCE EXACTE TROUVÉE !");
        const score = {
          fiable: scored.Fiable,
          faux: scored.Faux
        };
        // Encapsuler le texte avec la couleur et le score
        wrapTextWithScore(element, score);
        return score;
      }
    }
    
    console.log("❌ AUCUNE CORRESPONDANCE TROUVÉE");
    return null;
  }

  // Fonction pour formater le contenu de l'infobulle
  function formatTooltipContent(scores) {
    if (!scores) return "Score non disponible";

    const fiablePercent = Math.round(scores.fiable * 100);
    const fauxPercent = Math.round(scores.faux * 100);
    
    console.log("Formatage du tooltip:", {
      scoresFiable: fiablePercent,
      scoresFaux: fauxPercent
    });
    
    let message = `Fiabilité: ${fiablePercent}%\nDoute: ${fauxPercent}%`;
    
    // Ajouter un message qualitatif
    if (scores.fiable >= 0.7) {
      message += "\n✓ Contenu fiable";
    } else if (scores.fiable >= 0.4) {
      message += "\n⚠ Fiabilité moyenne";
    } else {
      message += "\n⚠ Contenu peu fiable";
    }
    
    return message;
  }

  // Fonction pour obtenir la classe de couleur
  function getColorClass(fiableScore) {
    if (fiableScore >= 0.7) return 'score-high';
    if (fiableScore >= 0.4) return 'score-medium';
    return 'score-low';
  }

  // Fonction pour afficher une infobulle
  function showTooltip(element) {
    hideTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'mylink-tooltip';
    tooltip.id = 'mylink-tooltip';

    let scores = null;
    let tooltipContent = '';

    if (element.tagName.toLowerCase() === 'p') {
      scores = findScoreForText(element);
      if (scores) {
        tooltipContent = formatTooltipContent(scores);
        tooltip.classList.add(getColorClass(scores.fiable));
      } else {
        tooltipContent = "Paragraphe non analysé";
        tooltip.classList.add('mylink-tooltip-neutral');
      }
    } else if (element.tagName.toLowerCase() === 'a') {
      if (globalScore !== null) {
        scores = { fiable: globalScore, faux: 1 - globalScore };
        tooltipContent = formatTooltipContent(scores);
        tooltip.classList.add(getColorClass(globalScore));
    } else {
        tooltipContent = "Lien non analysé";
        tooltip.classList.add('mylink-tooltip-neutral');
      }
    }

    tooltip.style.whiteSpace = 'pre-line';
    tooltip.textContent = tooltipContent;

    document.body.appendChild(tooltip);
    activeTooltip = tooltip;

    const updatePosition = (e) => {
    const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let left = e.pageX + 15;
      let top = e.pageY + 15;

      if (left + tooltipRect.width > window.innerWidth) {
        left = e.pageX - tooltipRect.width - 15;
      }

      if (top + tooltipRect.height > window.innerHeight) {
        top = e.pageY - tooltipRect.height - 15;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    moveHandler = updatePosition;
    element.addEventListener('mousemove', moveHandler);

    updatePosition({ 
      pageX: element.getBoundingClientRect().right, 
      pageY: element.getBoundingClientRect().top 
    });
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

  // Fonction pour charger les styles des infobulles
  function loadTooltipStyles() {
    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = browser.runtime.getURL('accueil/infobulles.css');
      document.head.appendChild(link);
      initScorePosition(); // Initialiser le gestionnaire de position
    } catch (error) {
      console.warn('Erreur lors du chargement des styles:', error);
    }
  }

  window.addEventListener('unload', hideTooltip);

  // Initialisation
  console.log('🚀 Initialisation des styles et écouteurs...');
  loadTooltipStyles();

  // S'assurer que le module est initialisé
  if (document.readyState === 'loading') {
    console.log('⏳ DOM en cours de chargement, attente...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('📄 DOM chargé, initialisation du module Tooltip');
      loadTooltipStyles();
    });
  } else {
    console.log('✅ DOM déjà chargé, initialisation immédiate');
    loadTooltipStyles();
  }

  // Écouter les messages du background script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    debug('Message reçu dans TooltipModule:', message);
    if (message.action === 'analyzePage') {
      setScores(message.data);
    }
  });

  // Exposer la fonction d'extraction
  const module = {
    showTooltip,
    hideTooltip,
    loadTooltipStyles,
    setScores,
    hasScores,
    hasGlobalScore,
    extractPageText
  };

  console.log('✅ Module Tooltip initialisé avec succès');
  return module;
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
