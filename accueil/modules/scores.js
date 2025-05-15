// Module de gestion des scores
window.ScoresModule = (function() {
  // Cache pour stocker les scores déjà calculés
  const scoreCache = new Map();

  // Fonction pour normaliser un score
  function normalizeScore(score) {
    if (typeof score === 'string') {
      score = parseFloat(score);
    }
    
    if (isNaN(score)) {
      return null;
  }

    // Limiter le score entre 0 et 100
    return Math.min(Math.max(score, 0), 100);
  }

  // Fonction pour obtenir la classe de score
  function getScoreClass(score) {
    score = normalizeScore(score);
    
    if (score === null) {
      return 'neutral';
    }
    
    if (score < 45) {
      return 'low';
    } else if (score < 70) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  // Fonction pour formater le texte du score
  function formatScoreText(score, details = null) {
    score = normalizeScore(score);
    
    if (score === null) {
      return 'Score non disponible';
    }

    let text = `Score de confiance: ${score}%`;
    
    if (details) {
      text += `\n${details}`;
    }
    
    return text;
  }

  // Fonction pour mettre en cache un score
  function cacheScore(url, score, details = null) {
    scoreCache.set(url, {
      score,
      details,
      timestamp: Date.now()
    });
  }

  // Fonction pour récupérer un score du cache
  function getCachedScore(url) {
    const cached = scoreCache.get(url);
    
    if (!cached) {
      return null;
    }

    // Vérifier si le cache est encore valide (30 minutes)
    if (Date.now() - cached.timestamp > 30 * 60 * 1000) {
      scoreCache.delete(url);
      return null;
    }

    return cached;
  }

  // Fonction pour nettoyer le cache
  function clearCache() {
    scoreCache.clear();
  }

  // API publique
  return {
    normalizeScore,
    getScoreClass,
    formatScoreText,
    cacheScore,
    getCachedScore,
    clearCache
  };
})();
