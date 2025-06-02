// Module de gestion des infobulles
window.TooltipModule = (function() {
  let activeTooltip = null;
  let moveHandler = null;
  let paragraphScores = null;
  let globalScore = null;
  let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Gestionnaire pour mettre à jour la position du score
  function initScorePosition() {
    document.addEventListener('mousemove', (e) => {
      const hoveredElement = document.elementFromPoint(e.clientX, e.clientY);
      if (hoveredElement && hoveredElement.classList.contains('score-highlight')) {
        const score = hoveredElement.getAttribute('data-score');
        if (score) {
          hoveredElement.style.setProperty('--score-x', `${e.clientX}px`);
          hoveredElement.style.setProperty('--score-y', `${e.clientY}px`);
        }
      }
    });
  }

  // Fonction pour récupérer tous les paragraphes de texte de la page
  function getAllPageParagraphs() {
    const paragraphs = [];
    
    // Fonction récursive pour parcourir le DOM
    function extractTextFromNode(node) {
      // Ignorer les scripts, styles, et autres éléments non pertinents
      if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE' || 
          node.nodeName === 'NOSCRIPT' || node.nodeName === 'IFRAME') {
        return;
      }

      // Si c'est un nœud texte avec du contenu significatif
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text.length > 0) {
          // Remonter jusqu'au parent block le plus proche
          let parent = node.parentElement;
          while (parent && window.getComputedStyle(parent).display !== 'block') {
            parent = parent.parentElement;
          }
          if (parent) {
            paragraphs.push({
              element: parent,
              text: parent.textContent.trim()
            });
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Récursivement parcourir les enfants
        for (const child of node.childNodes) {
          extractTextFromNode(child);
        }
      }
    }

    // Commencer l'extraction depuis le body
    extractTextFromNode(document.body);

    // Éliminer les doublons (même élément parent)
    const uniqueParagraphs = Array.from(new Map(
      paragraphs.map(p => [p.element, p])
    ).values());

    console.log(`📝 Trouvé ${uniqueParagraphs.length} blocs de texte uniques dans la page`);
    return uniqueParagraphs;
  }

  // Fonction pour définir les scores
  function setScores(data) {
    console.log("Mise à jour des scores avec:", JSON.stringify(data, null, 2));
    if (data?.main_url) {
      paragraphScores = data.main_url.scores_paragraphes || [];
      globalScore = data.main_url.score_fiable_global;
      console.log("Nombre de paragraphes avec scores:", paragraphScores.length);
      
      // Récupérer tous les paragraphes de la page
      const pageParagraphs = getAllPageParagraphs();
      
      // Pour chaque paragraphe de l'API
      paragraphScores.forEach((scoredParagraph, index) => {
        const apiWords = getFirstAndLastWords(scoredParagraph.texte);
        if (!apiWords) return;

        console.log(`\n🔍 Recherche correspondance pour paragraphe API #${index + 1}`);
        console.log("Premier mot:", apiWords.first);
        console.log("Dernier mot:", apiWords.last);

        // Chercher dans les paragraphes de la page
        for (const {element, text} of pageParagraphs) {
          if (text.includes(apiWords.first) && text.includes(apiWords.last)) {
            console.log("✅ Correspondance trouvée dans:", 
              text.substring(0, 50) + "...");
            
            // Appliquer le score et la couleur
            wrapTextWithScore(element, {
              fiable: scoredParagraph.Fiable,
              faux: scoredParagraph.Faux
            });
            break;
          }
        }
      });
    } else {
      paragraphScores = null;
      globalScore = null;
      console.log("Réinitialisation des scores - données invalides");
    }
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
    const text = element.textContent;
    const words = getFirstAndLastWords(text);
    if (!words) return;

    const colorClass = getColorClass(score.fiable);
    const scorePercent = Math.round(score.fiable );
    
    // Trouver l'index du premier et du dernier mot
    const firstIndex = text.indexOf(words.first);
    const lastIndex = text.lastIndexOf(words.last) + words.last.length;

    if (firstIndex === -1 || lastIndex === -1) {
      console.log("❌ Impossible de trouver les mots dans le texte");
      return;
    }

    // Construire le HTML avec tout le texte entre les mots encapsulé
    const html = 
      text.substring(0, firstIndex) +
      `<span class="score-highlight ${colorClass}" data-score="${scorePercent}">` +
      text.substring(firstIndex, lastIndex) +
      '</span>' +
      text.substring(lastIndex);

    element.innerHTML = html;
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

    const fiablePercent = Math.round(scores.fiable );
    const fauxPercent = Math.round(scores.faux );
    
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

    // Ajouter un bouton de fermeture pour mobile
    if (isMobile) {
      const closeButton = document.createElement('button');
      closeButton.className = 'tooltip-close';
      closeButton.innerHTML = '×';
      closeButton.onclick = hideTooltip;
      tooltip.appendChild(closeButton);
    }

    document.body.appendChild(tooltip);
    activeTooltip = tooltip;

    const updatePosition = (e) => {
      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let left, top;

      if (isMobile) {
        // Sur mobile, centrer l'infobulle en bas de l'écran
        left = (window.innerWidth - tooltipRect.width) / 2;
        top = window.innerHeight - tooltipRect.height - 20;
      } else {
        // Sur desktop, positionner près du curseur
        left = e.pageX + 15;
        top = e.pageY + 15;

        if (left + tooltipRect.width > window.innerWidth) {
          left = e.pageX - tooltipRect.width - 15;
        }

        if (top + tooltipRect.height > window.innerHeight) {
          top = e.pageY - tooltipRect.height - 15;
        }
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    moveHandler = updatePosition;
    
    if (!isMobile) {
      element.addEventListener('mousemove', moveHandler);
    }

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

      // Ajouter les écouteurs d'événements tactiles pour mobile
      if (isMobile) {
        document.querySelectorAll('p').forEach(element => {
          element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            showTooltip(element);
          });
        });

        // Fermer l'infobulle en touchant en dehors
        document.addEventListener('touchstart', (e) => {
          if (activeTooltip && !activeTooltip.contains(e.target)) {
            hideTooltip();
          }
        });
      }
    } catch (error) {
      console.warn('Erreur lors du chargement des styles:', error);
    }
  }

  window.addEventListener('unload', hideTooltip);

  return {
    showTooltip,
    hideTooltip,
    loadTooltipStyles,
    setScores,
    hasScores,
    hasGlobalScore
  };
})();
