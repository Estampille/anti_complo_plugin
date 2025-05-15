(function () {
  console.log("🔍 Content Script (extract_link.js) chargé et initialisé");

  // Initialiser le module d'infobulles
  console.log("Initialisation du module d'infobulles...");
  TooltipModule.loadTooltipStyles();

  // Fonction pour extraire les liens uniques
  function extractUniqueLinks() {
    const links = new Set();
    const seenUrls = new Set();

    // Récupérer tous les liens de la page
    document.querySelectorAll('a').forEach(link => {
      try {
        const url = new URL(link.href);
        // Ne garder que les liens HTTP(S)
        if (url.protocol.match(/^https?:$/)) {
          // Normaliser l'URL pour éviter les doublons
          const normalizedUrl = url.origin + url.pathname;
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            links.add(link.href);
          }
        }
      } catch (e) {
        // Ignorer les URLs invalides
      }
    });

    return Array.from(links);
  }

  // Fonction pour nettoyer les écouteurs et styles
  function cleanupPreviousListeners() {
    // Nettoyer les paragraphes
    document.querySelectorAll('p.has-tooltip').forEach(paragraph => {
      if (paragraph._tooltipEnterHandler) {
        paragraph.removeEventListener('mouseenter', paragraph._tooltipEnterHandler);
      }
      if (paragraph._tooltipLeaveHandler) {
        paragraph.removeEventListener('mouseleave', paragraph._tooltipLeaveHandler);
      }
      paragraph.classList.remove('has-tooltip');
    });

    // Nettoyer les liens
    document.querySelectorAll('a.has-tooltip').forEach(link => {
      if (link._tooltipEnterHandler) {
        link.removeEventListener('mouseenter', link._tooltipEnterHandler);
      }
      if (link._tooltipLeaveHandler) {
        link.removeEventListener('mouseleave', link._tooltipLeaveHandler);
      }
      link.classList.remove('has-tooltip');
    });
  }

  // Fonction pour mettre à jour les infobulles
  function updateTooltips(data) {
    console.log("📊 Mise à jour des infobulles avec les données:", data);
    
    // Nettoyer les anciens écouteurs et styles
    cleanupPreviousListeners();
    
    if (!data || !data.main_url) {
      console.warn("❌ Données invalides reçues pour les infobulles");
      return;
    }

    // Mettre à jour les scores dans le module de tooltips
    console.log("💡 Envoi des scores au module de tooltips");
    TooltipModule.setScores(data);

    // Initialiser les nouveaux écouteurs
    console.log("🔄 Initialisation des nouveaux écouteurs d'événements");
    initializeTooltipListeners();
  }

  // Fonction pour initialiser les écouteurs d'événements
  function initializeTooltipListeners() {
    if (!TooltipModule.hasScores()) {
      console.log("⏳ Pas de scores disponibles, écouteurs non initialisés");
      return;
    }

    console.log("👂 Initialisation des écouteurs d'événements pour les infobulles...");
    
    // Sélectionner tous les paragraphes de la page
    const paragraphs = document.querySelectorAll('p');
    console.log(`📝 Nombre de paragraphes trouvés: ${paragraphs.length}`);

    // Compter les paragraphes avec du texte significatif
    let significantParagraphs = 0;
    paragraphs.forEach(p => {
      const text = p.textContent.trim();
      if (text && text.split(/\s+/).length > 3) {
        significantParagraphs++;
      }
    });
    console.log(`📊 Paragraphes avec du texte significatif: ${significantParagraphs}`);

    // N'ajouter les écouteurs qu'aux paragraphes non vides
    paragraphs.forEach((paragraph, index) => {
      const text = paragraph.textContent.trim();
      if (!text || text.split(/\s+/).length <= 3) return;

      const wordCount = text.split(/\s+/).length;
      console.log(`Paragraphe ${index + 1} (${wordCount} mots):`, 
        text.substring(0, 50) + "...");

      const enterHandler = () => {
        console.log("🔍 Survol du paragraphe:", {
          index: index + 1,
          debut: text.substring(0, 50) + "..."
        });
        TooltipModule.showTooltip(paragraph);
      };
      
      const leaveHandler = () => {
        TooltipModule.hideTooltip();
      };

      paragraph._tooltipEnterHandler = enterHandler;
      paragraph._tooltipLeaveHandler = leaveHandler;
      
      paragraph.addEventListener('mouseenter', enterHandler);
      paragraph.addEventListener('mouseleave', leaveHandler);
      paragraph.classList.add('has-tooltip');
    });

    // Gérer les liens seulement si un score global est disponible
    if (TooltipModule.hasGlobalScore()) {
      const links = document.querySelectorAll('a[href^="http"]');
      console.log(`🔗 Nombre de liens externes trouvés: ${links.length}`);

      links.forEach(link => {
        const enterHandler = () => {
          console.log("🔍 Survol du lien:", link.href);
          TooltipModule.showTooltip(link);
        };
        
        const leaveHandler = () => {
          TooltipModule.hideTooltip();
        };

        link._tooltipEnterHandler = enterHandler;
        link._tooltipLeaveHandler = leaveHandler;
        
        link.addEventListener('mouseenter', enterHandler);
        link.addEventListener('mouseleave', leaveHandler);
        link.classList.add('has-tooltip');
      });
    }
  }

  // Écouteur de messages
  browser.runtime.onMessage.addListener((message) => {
    console.log("📨 Message reçu dans le content script:", message);
    
    try {
      if (message.action === "extractLinks") {
        console.log("🔍 Extraction des liens en cours...");

        // Extraire les liens uniques
        const links = extractUniqueLinks();
        console.log(`✓ ${links.length} liens uniques extraits`);

        // Nettoyer les anciens écouteurs et styles avant l'analyse
        cleanupPreviousListeners();

        // Envoyer les liens au background script
        browser.runtime.sendMessage({
          action: "sendLinks",
          links: links
        }).catch(error => {
          console.error("❌ Erreur lors de l'envoi des liens:", error);
        });
      }

      // Recevoir et afficher le score
      if (message.action === "displayScore") {
        console.log("📊 Données reçues pour l'affichage des scores:", message.data);
        
        if (message.error) {
          console.error("❌ Erreur lors de l'analyse:", message.error);
        } else {
          updateTooltips(message.data);
        }
      }
    } catch (error) {
      console.error("❌ Erreur dans extract_link.js:", error);
      cleanupPreviousListeners();
    }

    return false;
  });
})();
