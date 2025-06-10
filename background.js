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
    const url='https://3053-2001-861-4240-fdf0-6846-d04b-6202-5131.ngrok-free.app'
    console.log("Début de la requête API vers http://localhost:5001/analyze_site_infos");
    const response = await fetch("http://127.0.0.1:5001/analyze_site_infos", {
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
    // const data = 'data'
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
    startTime: request?.timestamp || null,
    elapsedTime: request ? Math.floor((Date.now() - request.timestamp) / 1000) : 0,
    lastData: data?.data || null,
    isAnalyzing: data?.isAnalyzing || false
  };
}

// Écouteur de messages
browser.runtime.onMessage.addListener(async (message, sender) => {
  console.log("Message reçu dans background.js:", message, "de:", sender);
  
  try {
    if (message.action === "sendLinks") {
      const tabId = sender.tab?.id;
      if (!tabId) {
        console.error("❌ Pas d'ID d'onglet disponible");
        return;
      }

      console.log("Liens à analyser :", message.links);
      console.log("Données de la page :", message.pageData);
      
      // Sauvegarder l'état d'analyse
      await saveData(tabId, {
        isAnalyzing: true,
        timestamp: Date.now()
      });

      // Préparer la requête API avec les scores des paragraphes
      const payload = {
        urls: message.links,
        main_url: {
          url: sender.tab.url,
          scores_paragraphes: message.pageData?.main_url?.scores_paragraphes || []
        }
      };

      console.log("Envoi de la requête API avec payload:", payload);
      broadcastToPopups({
        action: "updateCounter",
        elapsedTime: 0
      });

      try {
        console.log("Début de la requête API vers http://localhost:5001/analyze_site_infos");
        const response = await fetch("http://127.0.0.1:5001/analyze_site_infos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Données API reçues:", data);

        // Sauvegarder les données
        await saveData(tabId, {
          isAnalyzing: false,
          data: data,
          timestamp: Date.now()
        });

        // Envoyer les données au content script
        await browser.tabs.sendMessage(tabId, {
            action: "displayScore",
          data: data
        });

        // Informer les popups
        broadcastToPopups({
            action: "displayScore",
          data: data
        });

      } catch (error) {
        console.error("Erreur API détaillée:", error);
        await resetAnalysisState(tabId);
        broadcastToPopups({
          action: "displayScore",
          error: error.message
        });
      }
    }
  } catch (error) {
    console.error("Erreur inattendue dans le listener onMessage:", error);
  }
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

// (Aucune gestion de menu contextuel ici, tout est géré via le popup) 