document.addEventListener("DOMContentLoaded", async () => {
  console.log("Popup chargé");

  const highlightButton = document.getElementById("highlightButton");
  const evaluer = document.getElementById("evaluer");
  const scoreFiabilite = document.getElementById("scoreFiabilite");
  const submitFeedback = document.getElementById("submitFeedback");
  const scoreContainer = document.querySelector(".score-container");

  let port = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 3;
  let isAnalyzing = false;

  // Fonction pour mettre à jour le compteur
  function updateCounter(elapsedTime) {
    if (isAnalyzing) {
      scoreFiabilite.textContent = `Analyse en cours... (${elapsedTime}s)`;
    }
  }

  // Fonction pour établir la connexion avec le background script
  function connectToBackground() {
    try {
      port = browser.runtime.connect({ name: "popup-port" });
      console.log("Connexion établie avec le background script");

      port.onMessage.addListener((message) => {
        console.log("Message reçu sur le port:", message);
        
        switch (message.action) {
          case "displayScore":
            isAnalyzing = false;
            if (message.error) {
              updateInterface(null, message.error);
            } else {
              updateInterface(message.data);
            }
            break;
            
          case "updateCounter":
            updateCounter(message.elapsedTime);
            break;
            
          case "analysisStarted":
            isAnalyzing = true;
            updateInterfaceAnalyzing();
            break;
        }
      });

      port.onDisconnect.addListener(() => {
        console.log("Déconnexion du port détectée");
        port = null;
        
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`Tentative de reconnexion ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          setTimeout(connectToBackground, 1000);
        }
      });

      // Vérifier l'état actuel dès la connexion
      browser.runtime.sendMessage({ action: "checkStatus" })
        .then(status => {
          console.log("État actuel:", status);
          if (status.isPending || status.isAnalyzing) {
            isAnalyzing = true;
            updateInterfaceAnalyzing();
            if (status.startTime) {
              const elapsed = Math.floor((Date.now() - status.startTime) / 1000);
              updateCounter(elapsed);
            }
          } else if (status.lastData) {
            updateInterface(status.lastData);
          }
        })
        .catch(error => {
          console.error("Erreur lors de la vérification de l'état:", error);
        });

    } catch (error) {
      console.error("Erreur lors de la connexion au background:", error);
    }
  }

  // Fonction pour mettre à jour l'interface avec un score
  function updateInterface(data, error = null) {
    console.log("Mise à jour de l'interface avec:", { data, error });
    
    if (error) {
      scoreFiabilite.textContent = "Erreur: " + error;
      highlightButton.disabled = false;
      highlightButton.textContent = "Analyser les liens";
      return;
    }

    if (data?.main_url) {
      const scoreFiable = data.main_url.score_fiable_global;
      const scoreFaux = data.main_url.score_faux_global;
      
      const scoreFiablePercent = Math.round(scoreFiable * 100);
      const scoreFauxPercent = Math.round(scoreFaux * 100);
      
      console.log("Affichage des scores:", { scoreFiablePercent, scoreFauxPercent });
      
      scoreFiabilite.textContent = `Score de fiabilité: ${scoreFiablePercent}%`;
      updateScoreIndicator(scoreFiablePercent);
      
      highlightButton.disabled = false;
      highlightButton.textContent = "Analyser les liens";
      
      if (evaluer) {
        evaluer.style.display = "block";
      }
    } else {
      console.log("Données invalides reçues:", data);
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

  // Établir la connexion initiale
  connectToBackground();

  // Gestionnaire du bouton d'analyse
  if (highlightButton) {
    highlightButton.addEventListener("click", () => {
      console.log("Démarrage de l'analyse...");
      updateInterfaceAnalyzing();
      
      // Extraire et envoyer les liens pour analyse
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

          console.log("Feedback envoyé:", selectedFeedback.value);
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

  // Écouter les messages normaux aussi
  browser.runtime.onMessage.addListener(message => {
    console.log("Message reçu dans accueil.js:", message);
    
    if (message.action === "displayScore") {
      if (message.error) {
        updateInterface(null, message.error);
      } else {
        updateInterface(message.data);
      }
    } else if (message.action === "analysisStarted") {
      updateInterfaceAnalyzing();
    }
  });

  // Nettoyer la connexion quand le popup se ferme
  window.addEventListener('unload', () => {
    port.disconnect();
  });
});
