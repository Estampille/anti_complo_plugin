document.addEventListener("DOMContentLoaded", async () => {
  const highlightButton = document.getElementById("highlightButton");
  const evaluer = document.getElementById("evaluer");
  const scoreFiabilite = document.getElementById("scoreFiabilite");
  const submitFeedback = document.getElementById("submitFeedback");
  const scoreContainer = document.querySelector(".score-container");

  // Fonction pour mettre à jour l'interface avec un score
  function updateInterface(data, error = null) {
    if (error) {
      scoreFiabilite.textContent = "Erreur: " + error;
      highlightButton.disabled = false;
      highlightButton.textContent = "Analyser les liens";
      return;
    }

    if (data?.main_url) {
      const scoreFiable = data.main_url.score_fiable_global;
      const scoreFiablePercent = Math.round(scoreFiable * 100);
      
      scoreFiabilite.textContent = `Score de fiabilité: ${scoreFiablePercent}%`;
      updateScoreIndicator(scoreFiablePercent);
      
      highlightButton.disabled = false;
      highlightButton.textContent = "Analyser les liens";
      
      if (evaluer) {
        evaluer.style.display = "block";
      }
    } else {
      scoreFiabilite.textContent = "Erreur: Données invalides";
      highlightButton.disabled = false;
      highlightButton.textContent = "Analyser les liens";
    }
  }

  // Fonction pour mettre à jour l'indicateur de score
  function updateScoreIndicator(score) {
    scoreContainer.classList.remove("score-low", "score-medium", "score-high");
    
    if (score < 45) {
      scoreContainer.classList.add("score-low");
    } else if (score >= 45 && score < 70) {
      scoreContainer.classList.add("score-medium");
    } else {
      scoreContainer.classList.add("score-high");
    }
  }

  // Fonction pour mettre à jour l'interface pendant l'analyse
  function updateInterfaceAnalyzing() {
    highlightButton.disabled = true;
    highlightButton.textContent = "Analyse en cours...";
    scoreFiabilite.textContent = "Analyse en cours...";
  }

  // Vérifier l'état actuel et restaurer si nécessaire
  try {
    const response = await browser.runtime.sendMessage({ action: "checkStatus" });

    if (response.isPending || response.isAnalyzing) {
      updateInterfaceAnalyzing();
      
      if (response.startTime) {
        const updateElapsedTime = () => {
          const elapsed = Math.floor((Date.now() - response.startTime) / 1000);
          scoreFiabilite.textContent = `Analyse en cours... (${elapsed}s)`;
        };
        updateElapsedTime();
        const timer = setInterval(updateElapsedTime, 1000);
        window.addEventListener('unload', () => clearInterval(timer));
      }
    } else if (response.lastData) {
      updateInterface(response.lastData);
    }
  } catch (error) {
    console.error("Erreur lors de la vérification de l'état:", error);
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
    }
  };

  port.onMessage.addListener(handleMessage);
  browser.runtime.onMessage.addListener(handleMessage);

  // Nettoyer la connexion quand le popup se ferme
  window.addEventListener('unload', () => {
    port.disconnect();
  });
});
