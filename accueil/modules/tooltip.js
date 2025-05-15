// Module de gestion des infobulles
window.TooltipModule = (function() {
  let activeTooltip = null;
  let moveHandler = null;
  let paragraphScores = null;
  let globalScore = null;

  // Fonction pour définir les scores
  function setScores(data) {
    console.log("Mise à jour des scores avec:", JSON.stringify(data, null, 2));
    if (data?.main_url) {
      paragraphScores = data.main_url.scores_paragraphes || [];
      globalScore = data.main_url.score_fiable_global;
      console.log("Nombre de paragraphes avec scores:", paragraphScores.length);
      console.log("Score global:", globalScore);
      
      // Log détaillé des paragraphes reçus
      paragraphScores.forEach((score, index) => {
        const words = getFirstAndLastWords(score.texte);
        console.log(`Paragraphe API #${index + 1}:`, {
          debut: score.texte.substring(0, 50) + "...",
          motsSignificatifs: words,
          fiable: score.Fiable,
          faux: score.Faux
        });
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
    console.log("Texte original:", text.substring(0, 100) + "...");

    // Nettoyer et séparer le texte en mots
    const words = text.trim()
      .toLowerCase()
      .replace(/[.,!?;:"'()\[\]{}]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    console.log("Mots filtrés:", words);
    console.log("Nombre de mots significatifs:", words.length);

    if (words.length < 2) {
      console.log("❌ Pas assez de mots significatifs");
      return null;
    }

    const result = {
      first: words[0],
      last: words[words.length - 1],
      wordCount: words.length
    };

    console.log("✓ Résultat analyse:", result);
    return result;
  }

  // Fonction pour calculer la similarité entre deux textes
  function calculateSimilarity(words1, words2) {
    if (!words1 || !words2) return 0;
    
    // Vérifier les mots limites
    const firstWordMatch = words1.first === words2.first;
    const lastWordMatch = words1.last === words2.last;
    
    // Calculer la différence de longueur
    const lengthDiff = Math.abs(words1.wordCount - words2.wordCount);
    const lengthThreshold = words1.wordCount * 0.2;
    
    // Calculer un score de similarité
    let similarity = 0;
    if (firstWordMatch) similarity += 0.4;
    if (lastWordMatch) similarity += 0.4;
    if (lengthDiff <= lengthThreshold) similarity += 0.2;
    
    return similarity;
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

    console.log("\n📊 Mots clés de l'élément:", {
      premier: elementWords.first,
      dernier: elementWords.last,
      nombreMots: elementWords.wordCount
    });

    // Chercher dans les scores
    for (const [index, scored] of paragraphScores.entries()) {
      console.log(`\n🔄 Comparaison avec paragraphe API #${index + 1}:`);
      console.log("Texte API:", scored.texte.substring(0, 100) + "...");

      const scoredWords = getFirstAndLastWords(scored.texte);
      if (!scoredWords) {
        console.log("❌ Échec analyse du texte API");
        continue;
      }

      console.log("Comparaison:", {
        element: {
          premier: elementWords.first,
          dernier: elementWords.last,
          nombreMots: elementWords.wordCount
        },
        api: {
          premier: scoredWords.first,
          dernier: scoredWords.last,
          nombreMots: scoredWords.wordCount
        }
      });

      // Vérifier si le nombre de mots est similaire (±20%)
      const wordCountDiff = Math.abs(elementWords.wordCount - scoredWords.wordCount);
      const wordCountThreshold = elementWords.wordCount * 0.2;

      // Vérifier la correspondance des mots limites
      const firstWordMatch = elementWords.first === scoredWords.first;
      const lastWordMatch = elementWords.last === scoredWords.last;

      console.log("Résultats comparaison:", {
        premierMotIdentique: firstWordMatch,
        dernierMotIdentique: lastWordMatch,
        différenceNombreMots: wordCountDiff,
        seuilToléré: wordCountThreshold,
        différenceAcceptable: wordCountDiff <= wordCountThreshold
      });

      if (wordCountDiff <= wordCountThreshold && firstWordMatch && lastWordMatch) {
        console.log("✅ CORRESPONDANCE TROUVÉE !");
        console.log("Scores:", {
          fiable: scored.Fiable,
          faux: scored.Faux
        });
        return {
          fiable: scored.Fiable,
          faux: scored.Faux
        };
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
    if (fiableScore >= 0.7) return 'mylink-tooltip-high';
    if (fiableScore >= 0.4) return 'mylink-tooltip-medium';
    return 'mylink-tooltip-low';
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
