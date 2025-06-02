// background.js - Script de fond pour la communication

// Cache pour stocker les scores par URL et l'état des requêtes
let scoreCache = new Map();
let pendingRequests = new Map();
let popupPorts = new Map(); // Pour stocker les ports de communication avec les popups

// Constantes
const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes en millisecondes
const CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes

// Gestion des connexions popup
browser.runtime.onConnect.addListener((port) => {
  if (port.name === "popup-port") {
    console.log("Nouvelle connexion popup établie");
    port.onDisconnect.addListener(() => {
      console.log("Popup déconnecté");
      popupPorts.delete(port);
    });
    popupPorts.set(port, true);
  }
});

// Fonction pour envoyer un message à tous les popups connectés
function broadcastToPopups(message) {
  console.log("Diffusion du message aux popups:", message);
  const activePopups = Array.from(popupPorts.keys());
  if (activePopups.length === 0) {
    console.log("Aucun popup actif pour recevoir le message");
    return;
  }
  
  activePopups.forEach(port => {
    try {
      port.postMessage(message);
    } catch (error) {
      console.log("Erreur d'envoi au popup, suppression du port:", error);
      popupPorts.delete(port);
    }
  });
}

// Fonction pour sauvegarder les données
async function saveData(tabId, data) {
  try {
    const savedData = {
      ...data,
      timestamp: Date.now(),
      isAnalyzing: !!pendingRequests.get(tabId)
    };
    console.log("Sauvegarde des données:", savedData);
    await browser.storage.local.set({
      [`tab_${tabId}`]: savedData
    });
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des données:", error);
  }
}

// Fonction pour récupérer les données
async function getData(tabId) {
  try {
    const result = await browser.storage.local.get(`tab_${tabId}`);
    console.log("Données récupérées:", result[`tab_${tabId}`]);
    return result[`tab_${tabId}`] || null;
  } catch (error) {
    console.error("Erreur lors de la récupération des données:", error);
    return null;
  }
}

// Fonction pour réinitialiser l'état d'analyse
async function resetAnalysisState(tabId) {
  console.log("Réinitialisation de l'état d'analyse pour tabId:", tabId);
  pendingRequests.delete(tabId);
  await saveData(tabId, {
    isAnalyzing: false,
    timestamp: Date.now()
  });
}

// Fonction pour nettoyer les anciennes données
async function cleanupOldData() {
      try {
    const data = await browser.storage.local.get();
    const timeoutAgo = Date.now() - TIMEOUT_DURATION;
    
    for (const [key, value] of Object.entries(data)) {
      if (value.timestamp && value.timestamp < timeoutAgo) {
        await browser.storage.local.remove(key);
      }
    }

    // Nettoyer aussi les requêtes en attente expirées
    for (const [tabId, request] of pendingRequests.entries()) {
      if (request.timestamp < timeoutAgo) {
        await resetAnalysisState(tabId);
        try {
          await browser.tabs.sendMessage(tabId, {
            action: "displayScore",
            error: "La requête a expiré après 15 minutes"
        });
      } catch (error) {
          console.error("Erreur lors de la notification d'expiration:", error);
        }
      }
    }
  } catch (error) {
    console.error("Erreur lors du nettoyage des données:", error);
  }
}

// Nettoyer les anciennes données régulièrement
setInterval(cleanupOldData, CLEANUP_INTERVAL);

// Fonction pour démarrer le compteur pour un tabId
function startCounter(tabId) {
  const request = pendingRequests.get(tabId);
  if (!request) return;

  const updateCounter = () => {
    if (!pendingRequests.has(tabId)) return;
    
    const elapsedTime = Math.floor((Date.now() - request.timestamp) / 1000);
    broadcastToPopups({
      action: "updateCounter",
      elapsedTime: elapsedTime
    });
    
    // Continuer tant que la requête est en cours
    if (pendingRequests.has(tabId)) {
      setTimeout(updateCounter, 1000);
    }
  };

  updateCounter();
}

// Modification de la fonction makeAPIRequest pour gérer le compteur
async function makeAPIRequest(payload, tabId) {
  console.log("Envoi de la requête API:", payload);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

  try {
    // Démarrer le compteur dès le début de la requête
    startCounter(tabId);

    console.log("Début de la requête API vers http://localhost:5001/analyze_site_infos");
    const response = await fetch("https://52f7-85-190-91-51.ngrok-free.app/analyze_site_infos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log("Réponse API reçue, status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log("Données API reçues:", data);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Erreur API détaillée:", error);
    if (error.name === 'AbortError') {
      throw new Error("La requête a expiré après 15 minutes");
    }
    throw error;
  }
}

// Fonction pour vérifier l'état d'une requête en cours
async function checkPendingRequest(tabId) {
  const request = pendingRequests.get(tabId);
  const data = await getData(tabId);
  
  console.log("Vérification de la requête en cours:", { request, data });
  
  // Si isAnalyzing est true mais qu'il n'y a pas de requête en cours,
  // on réinitialise l'état
  if (data?.isAnalyzing && !request) {
    console.log("État incohérent détecté, réinitialisation...");
    await resetAnalysisState(tabId);
    return {
      isPending: false,
      startTime: null,
      elapsedTime: 0,
      lastData: data?.data || null,
      isAnalyzing: false
    };
  }
  
  return {
    isPending: !!request,
    startTime: request?.timestamp,
    elapsedTime: request ? Math.floor((Date.now() - request.timestamp) / 1000) : 0,
    lastData: data?.data || null,
    isAnalyzing: data?.isAnalyzing || false
  };
}

// Relayer les messages entre le popup et les content scripts
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log("Message reçu dans background.js:", message, "de:", sender);

  try {
    // Si le message demande l'état de la requête
    if (message.action === "checkStatus") {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        const status = await checkPendingRequest(tabs[0].id);
        console.log("Status renvoyé:", status);
        return Promise.resolve(status);
      }
      return Promise.resolve({ isPending: false, isAnalyzing: false });
    }

    // Si le message demande d'analyser les liens
    if (message.action === "sendLinks" && sender.tab) {
      console.log("Liens à analyser :", message.links);

      // Vérifier si une requête est déjà en cours
      if (pendingRequests.has(sender.tab.id)) {
        throw new Error("Une analyse est déjà en cours");
      }

      const payload = {
        urls: [],
        main_url: sender.tab.url || message.links[0]
      };

      // Enregistrer la requête en cours
      pendingRequests.set(sender.tab.id, {
        timestamp: Date.now(),
        links: message.links
      });

      // Sauvegarder l'état d'analyse
      await saveData(sender.tab.id, {
        isAnalyzing: true,
        timestamp: Date.now()
      });

      try {
        // Informer que l'analyse commence
        await browser.tabs.sendMessage(sender.tab.id, {
          action: "analysisStarted",
          timestamp: Date.now()
        });

        const data = await makeAPIRequest(payload, sender.tab.id);
        console.log("Réponse API reçue dans background:", data);

        // Supprimer la requête en cours et réinitialiser l'état
        await resetAnalysisState(sender.tab.id);

        // Préparer les données à envoyer
        const responseData = {
          main_url: {
            score_fiable_global: data.main_url.score_fiable_global,
            score_faux_global: data.main_url.score_faux_global,
            scores_paragraphes: data.main_url.scores_paragraphes
          }
        };

        console.log("Données préparées pour l'envoi:", responseData);

        // Sauvegarder les données
        await saveData(sender.tab.id, {
          data: responseData,
          timestamp: Date.now(),
          isAnalyzing: false
        });

        // Envoyer au content script
        console.log("Envoi au content script...");
        await browser.tabs.sendMessage(sender.tab.id, {
            action: "displayScore",
          data: responseData
        });

        // Envoyer au popup via port
        try {
          console.log("Tentative d'envoi au popup...");
          broadcastToPopups(responseData);
        } catch (error) {
          console.log("Popup probablement fermé:", error);
        }

        return true;

      } catch (error) {
        console.error("Erreur lors de l'analyse :", error);
        
        // Réinitialiser l'état en cas d'erreur
        await resetAnalysisState(sender.tab.id);
        
        // Informer de l'erreur
        const errorMessage = {
          action: "displayScore",
          error: error.message
        };
        
        // Envoyer l'erreur au content script
        if (sender.tab?.id) {
          await browser.tabs.sendMessage(sender.tab.id, errorMessage);
          
          // Tenter d'informer le popup aussi
          try {
            broadcastToPopups(errorMessage);
          } catch (error) {
            console.log("Popup probablement fermé lors de l'envoi de l'erreur");
          }
        }
        
        throw error; // Propager l'erreur pour le logging
      }
    }
  } catch (error) {
    console.error("Erreur inattendue dans le listener onMessage:", error);
    return Promise.reject(error);
  }

  return false;
});

// Nettoyer les données lors de la fermeture d'un onglet
browser.tabs.onRemoved.addListener(async (tabId) => {
  try {
    await browser.storage.local.remove(`tab_${tabId}`);
    pendingRequests.delete(tabId);
  } catch (error) {
    console.error("Erreur lors du nettoyage des données de l'onglet:", error);
  }
});

console.log("Background script chargé");
