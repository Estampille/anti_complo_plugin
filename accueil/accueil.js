document.addEventListener("DOMContentLoaded", async () => {
  const highlightButton = document.getElementById("highlightButton");
  const evaluer = document.getElementById("evaluer");
  const scoreFiabilite = document.getElementById("scoreFiabilite");
  const submitFeedback = document.getElementById("submitFeedback");
  const scoreContainer = document.querySelector(".score-container");
  const resetButton = document.getElementById("resetButton");
  const similarArticlesContainer = document.getElementById("similarArticlesContainer");
  const similarArticlesButton = document.getElementById("similarArticlesButton");

  let analysisState = { // État local du popup
    isAnalyzing: false,
    startTime: null,
    lastData: null,
    timerInterval: null
  };

  // Fonction pour mettre à jour l'interface avec un score
  function updateInterface(data, error = null) {
    analysisState.lastData = data;
    analysisState.isAnalyzing = false;
    clearInterval(analysisState.timerInterval);
    analysisState.timerInterval = null;
    analysisState.startTime = null;

    if (error) {
      scoreFiabilite.textContent = "Erreur: " + error;
      highlightButton.disabled = false;
      highlightButton.textContent = "Analyser les liens";
      if (similarArticlesButton) similarArticlesButton.style.display = "none";
      return;
    }

    if (data?.main_url && typeof data.main_url.score_fiable_global === "number") {
      const scoreFiable = data.main_url.score_fiable_global;
      const scoreFiablePercent = Math.round(scoreFiable * 100);
      
      scoreFiabilite.textContent = `Score de fiabilité: ${scoreFiablePercent}%`;
      updateScoreIndicator(scoreFiablePercent);
      
      highlightButton.disabled = false;
      highlightButton.textContent = "Analyser les liens";
      
      if (evaluer) {
        evaluer.style.display = "block";
      }
      if (similarArticlesButton) similarArticlesButton.style.display = "block";
    } else {
      scoreFiabilite.textContent = "Erreur: Données invalides";
      highlightButton.disabled = false;
      highlightButton.textContent = "Analyser les liens";
      if (similarArticlesButton) similarArticlesButton.style.display = "none";
    }
  }

  // Fonction pour mettre à jour l'indicateur de score
  function updateScoreIndicator(score) {
    scoreContainer.classList.remove("score-low", "score-medium", "score-high");
    
    if (score < 60) {
      scoreContainer.classList.add("score-low");
    } else if (score >= 60 && score < 85) {
      scoreContainer.classList.add("score-medium");
    } else {
      scoreContainer.classList.add("score-high");
    }
  }

  // Fonction pour mettre à jour l'interface pendant l'analyse
  function updateInterfaceAnalyzing(startTime = Date.now()) {
    analysisState.isAnalyzing = true;
    analysisState.startTime = startTime;
    highlightButton.disabled = true;
    highlightButton.textContent = "Analyse en cours...";
    
    // Démarrer ou reprendre le timer
    if (!analysisState.timerInterval) {
      const updateElapsedTime = () => {
        const elapsed = Math.floor((Date.now() - analysisState.startTime) / 1000);
        scoreFiabilite.textContent = `Analyse en cours... (${elapsed}s)`;
      };
      updateElapsedTime(); // Mettre à jour immédiatement
      analysisState.timerInterval = setInterval(updateElapsedTime, 1000);
    }
  }

  // Charger l'état sauvegardé au démarrage
  try {
    const { savedAnalysisState } = await browser.storage.local.get("savedAnalysisState");
    if (savedAnalysisState && savedAnalysisState.isAnalyzing) {
      // Restaurer l'état si une analyse était en cours
      analysisState.isAnalyzing = true;
      analysisState.startTime = savedAnalysisState.startTime;
      analysisState.lastData = savedAnalysisState.lastData; // Conserver les dernières données si elles existent
      updateInterfaceAnalyzing(analysisState.startTime);
    } else if (savedAnalysisState && savedAnalysisState.lastData) {
      // Restaurer les dernières données si l'analyse était terminée
      analysisState.lastData = savedAnalysisState.lastData;
      updateInterface(analysisState.lastData);
    }
  } catch (error) {
    console.error("Erreur lors du chargement de l'état sauvegardé:", error);
  }

  // Gestionnaire du bouton d'analyse
  if (highlightButton) {
    highlightButton.addEventListener("click", () => {
      updateInterfaceAnalyzing();
      
      browser.tabs.query({ active: true, currentWindow: true })
        .then(tabs => {
          if (tabs[0]) {
            return browser.tabs.sendMessage(tabs[0].id, { action: "extractLinks" });
          }
          throw new Error("Aucun onglet actif trouvé");
        })
        .catch(error => {
          console.error("Erreur lors de l'analyse:", error);
          updateInterface(null, "Erreur lors de l'analyse");
        });
    });
  }

  // Gestionnaire du bouton de feedback
  if (submitFeedback) {
    submitFeedback.addEventListener("click", async () => {
      const selectedFeedback = document.querySelector("input[name='feedback']:checked");
      
      if (selectedFeedback) {
        try {
          await browser.storage.local.set({
            feedback: {
              value: selectedFeedback.value,
              timestamp: Date.now()
            }
          });

          submitFeedback.textContent = "Merci pour votre avis !";
          submitFeedback.disabled = true;
        } catch (error) {
          console.error("Erreur lors de la sauvegarde du feedback:", error);
          alert("Erreur lors de l'envoi de votre avis. Veuillez réessayer.");
        }
      } else {
        alert("Veuillez sélectionner une option avant d'envoyer votre avis.");
      }
    });
  }

  // Charger le feedback sauvegardé
  try {
    const { feedback } = await browser.storage.local.get("feedback");
    if (feedback && feedback.timestamp > Date.now() - 30 * 60 * 1000) {
      const radioButton = document.querySelector(`input[name='feedback'][value='${feedback.value}']`);
      if (radioButton) {
        radioButton.checked = true;
        submitFeedback.textContent = "Merci pour votre avis !";
        submitFeedback.disabled = true;
      }
    }
  } catch (error) {
    console.error("Erreur lors du chargement du feedback:", error);
  }

  // Établir une connexion avec le background script
  const port = browser.runtime.connect({ name: "popup-port" });
  
  // Écouter les messages
  const handleMessage = (message) => {
    if (message.action === "displayScore") {
      if (message.error) {
        updateInterface(null, message.error);
      } else {
        updateInterface(message.data);
      }
    } else if (message.action === "analysisStarted") {
      updateInterfaceAnalyzing();
    } else if (message.action === "showSimilarArticles") {
      if (similarArticlesContainer) {
        similarArticlesContainer.innerHTML = "";
        if (message.articles && message.articles.length > 0) {
          message.articles.forEach(article => {
            const div = document.createElement("div");
            div.className = "similar-article";
            
            const link = document.createElement("a");
            link.href = article.url;
            link.target = "_blank";
            link.textContent = article.url;
            
            const text = document.createTextNode(` — Fiabilité : ${Math.round(article.fiabilite * 100)}%`);
            
            div.appendChild(link);
            div.appendChild(text);
            similarArticlesContainer.appendChild(div);
            
          });
        } else {
          similarArticlesContainer.textContent = message.error || "Aucun article similaire trouvé.";
        }
      }
    }
  };

  port.onMessage.addListener(handleMessage);
  browser.runtime.onMessage.addListener(handleMessage); // Pour les messages diffusés

  // Sauvegarder l'état avant la fermeture du popup
  window.addEventListener('unload', () => {
    browser.storage.local.set({
      savedAnalysisState: {
        isAnalyzing: analysisState.isAnalyzing,
        startTime: analysisState.startTime,
        lastData: analysisState.lastData // Sauvegarder les dernières données reçues
      }
    });
    port.disconnect();
    // Ne pas clearInterval ici, car le timer continue dans le background script
  });

  // Gestionnaire du bouton reset
  if (resetButton) {
    resetButton.addEventListener("click", async () => {
      // Vider le cache local et l'état
      await browser.storage.local.clear();
      clearInterval(analysisState.timerInterval);
      analysisState = {
        isAnalyzing: false,
        startTime: null,
        lastData: null,
        timerInterval: null
      };
      scoreFiabilite.textContent = "Cliquez sur Analyser pour commencer";
      scoreContainer.classList.remove("score-low", "score-medium", "score-high");
      highlightButton.disabled = false;
      highlightButton.textContent = "Analyser les liens";
      if (evaluer) {
        evaluer.style.display = "none";
      }
      // Réinitialiser le feedback
      document.querySelectorAll("input[name='feedback']").forEach(r => r.checked = false);
      submitFeedback.textContent = "Envoyer mon avis";
      submitFeedback.disabled = false;
    });
  }

  // Gestionnaire du bouton 'Articles similaires'
  if (similarArticlesButton) {
    similarArticlesButton.addEventListener("click", async () => {
      if (!analysisState.lastData) return;
      try {
        console.log("Récupération des articles similaires");
        console.log(analysisState.lastData);
        const response = await fetch("http://127.0.0.1:5003/get_similar_articl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(analysisState.lastData)
        });
        const data = await response.json();
        if (similarArticlesContainer) {
          similarArticlesContainer.innerHTML = "";
          if (data && data.length > 0) {
            data.forEach(article => {
              const div = document.createElement("div");
              div.className = "similar-article";
              div.setAttribute("data-fiabilite", article.fiability);
              
              const link = document.createElement("a");
              link.href = article.url;
              link.target = "_blank";
              link.textContent = article.url;
              
              const fiabilite = document.createElement("span");
              fiabilite.className = "fiabilite-badge";
              fiabilite.textContent = article.fiability;
              
              const score = document.createElement("span");
              score.className = "similarity-score";
              score.textContent = `Similarité: ${Math.round(article.similarity_score * 100)}%`;
              
              div.appendChild(link);
              div.appendChild(fiabilite);
              div.appendChild(score);
              
              similarArticlesContainer.appendChild(div);
            });
          } else {
            similarArticlesContainer.textContent = "Aucun article similaire trouvé.";
          }
        }
      } catch (e) {
        if (similarArticlesContainer) {
          similarArticlesContainer.textContent = "Erreur lors de la récupération des articles similaires.";
        }
      }
    });
  }

  // Afficher les articles similaires si déjà présents
  browser.runtime.sendMessage({ action: "getLastSimilarArticles" }).then(result => {
    if (result && result.articles) {
      handleMessage({ action: "showSimilarArticles", ...result });
    }
  });
});
