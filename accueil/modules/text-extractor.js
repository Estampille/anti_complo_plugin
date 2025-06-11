// Module d'extraction de texte
window.TextExtractorModule = (function() {
  function extractArticleText() {
    console.log('📄 Début extraction de texte article...');
    const paragraphs = [];
    
    // Sélecteurs spécifiques pour les articles
    const selectors = [
      '.article-section .content p',
      '.article-section p',
      '.content p',
      'article p',
      'section p'
    ];
    
    // Récupérer tous les paragraphes
    const candidates = selectors.flatMap(selector => 
      Array.from(document.querySelectorAll(selector))
    );
    
    console.log(`🔍 ${candidates.length} éléments trouvés`);

    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      const isDisplayNone = style.display === 'none';
      const isVisibilityHidden = style.visibility === 'hidden';
      const hasOffsetParent = el.offsetParent !== null;
      
      console.log('🔍 Vérification visibilité:', {
        element: el,
        text: el.textContent.trim().slice(0, 50) + '...',
        isDisplayNone,
        isVisibilityHidden,
        hasOffsetParent,
        display: style.display,
        visibility: style.visibility,
        offsetParent: el.offsetParent
      });
      
      return !isDisplayNone && !isVisibilityHidden && hasOffsetParent;
    };

    const isRelevant = (el) => {
      const text = el.textContent.trim();
      // Vérifier si l'élément ou ses parents ont une classe à exclure
      const excludedClasses = ['comment', 'bottom', 'ad', 'podcast', 'inread', 'dailymotion'];
      const hasExcludedClass = excludedClasses.some(className => 
        el.closest(`[class*="${className}"]`) !== null
      );
      
      return text.length > 20 && 
             !hasExcludedClass && 
             !el.closest('header, footer, nav, aside, form, menu') && 
             isVisible(el);
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

  return {
    extractArticleText
  };
})(); 