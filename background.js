// background.js - Script de fond pour la communication

// Cache pour stocker les scores par URL et l'état des requêtes
let scoreCache = new Map();
let pendingRequests = new Map();

// Constantes
const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes en millisecondes
const CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes

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

// Fonction pour faire la requête API avec timeout
async function makeAPIRequest(payload, tabId) {
  console.log("Envoi de la requête API:", payload);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

  try {
    console.log("Début de la requête API vers http://localhost:5001/analyze_site_infos");
    // const response = await fetch("http://localhost:5001/analyze_site_infos", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify(payload),
    //   signal: controller.signal
    // });

    // clearTimeout(timeoutId);
    // console.log("Réponse API reçue, status:", response.status);

    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }

    // const data = await response.json();
    const data = {
      "main_url": {
          "score_faux_global": 0.6312,
          "score_fiable_global": 0.3688,
          "scores_paragraphes": [
              {
                  "Faux": 0.6396,
                  "Fiable": 0.36039999723434446,
                  "texte": "La résistance est un sport, et un sport qui ne se joue pas seulement en salle, ou devant l’écran. C’est le travail de tous les jours d’un muscle qui s’appellecourage, et dont l’atrophie s’appelle lâcheté. On ne dit pas que Rudy et ses amis sont lâches, mais ils ont derrière eux toute l’armée du Système, alors que nous, comme disait Mao, on ne peut compter que sur nos propres forces. Et par propres forces, on entend tous les militants, tous les sympathisants, tous les contributeurs, et toute l’équipe qui forme le noyau dur de la résistance."
              },
              {
                  "Faux": 0.6485,
                  "Fiable": 0.35150001049041746,
                  "texte": "Sinon, on s’appelle désormais Résistance & Réinformation, mais c’est pas grave, ça rentrera doucement dans la tête des gars de la régie publicitaire. On remarque quelques changements dans le top 10, comme la baisse de France-Soir, qui était très haut pendant les années covid, et qui n’a pas vraiment enfourché d’autres chevaux de bataille aussi puissants depuis. Il y a aussi la montée fulgurante de Marcel en 4-4-2, que Reichstadt associe à R&R, mais qui est indépendant en réalité. Ce n’est pas le Hamas et le Fatah : dans la résistance, il y a plusieurs tendances, et c’est une bonne chose."
              },
              {
                  "Faux": 0.5188,
                  "Fiable": 0.48120001554489134,
                  "texte": "Au lieu de mettre tout le monde dans le même panier de crabes, il serait temps que les petits soldats du Système travaillent de manière plus professionnelle sur les lignes éditoriales des principaux sites susnommés. Leur analyseest ici; la nôtre, sur leur analyse, sera courte : on continue le combat, on ne va pas se laisser distraire par une coupe de France. Il y a le championnat 2025, qui est en cours et qui sera acharné, plus la Ligue des champions, qui réclame un niveau encore plus haut, et on y travaille. Tout ça pour libérer la France, oui, comme en 44. Certes, les enjeux et les participants ont changé, mais la France est toujours sous occupation. Et c’est ça qui nous préoccupe."
              },
              {
                  "Faux": 0.6476,
                  "Fiable": 0.3523999810218811,
                  "texte": "Voyez ici ce que des fous nous promettent. On espère que ce ne sont que des mots, sinon les crimes futurs seront signés. Imaginez une seconde qu’on appelle à faire des attentats à Tel-Aviv, à tuer des civils, des innocents... De l’autre côté, on ne se gêne pas, car les bombardements sur Gaza ont repris, juste après la libération d’un Israélo-Américain, le jeune Edan."
              },
              {
                  "Faux": 0.6462,
                  "Fiable": 0.35379997491836546,
                  "texte": "Alors, monsieur Retailleau, c’est qui, les fous dangereux ? Ceux qui veulent arrêter le massacre ou ceux qui les annoncent et les produisent ? On vit actuellement une période d’inversion totale des valeurs, où notre président joue au chef de guerre en jetant de l’huile sur tous les feux possibles, à l’intérieur comme à l’extérieur."
              },
              {
                  "Faux": 0.6451,
                  "Fiable": 0.3548999786376953,
                  "texte": "De fait, il n’y a plus d’autorité dans notre pays, il n’y a que de la répression, et cela se voit dans les rues et les tribunaux, où les faibles sont persécutés et les forts respectés.Au moment où tout un peuple a peur, où tout a été fait pour qu’il vive dans la peur, où l’avenir semble noir, c’est là qu’il faut montrer du courage, car c’est la seule voie possible vers la lumière, la libération."
              },
              {
                  "Faux": 0.6484,
                  "Fiable": 0.35160002708435056,
                  "texte": "Égalité & Réconciliation, devenu Résistance & Réinformation – Conspi Watch apprendra à l’écrire – a gagné : alors qu’on avait gracieusement cédé la première place en 2022 à FranceSoir, qui avait axé son contenu sur le covidisme, nous avons retrouvé notre place naturelle de numéro un au bénéfice, si l’on peut dire, de la guerre en Ukraine et de la guerre à Gaza, conflits que nous couvrons et commentons (...)"
              },
              {
                  "Faux": 0.6379,
                  "Fiable": 0.3620999813079834,
                  "texte": "C’est le petit classement de Conspy Watch qui fait plaisir, quand il tombe, chaque année que Dieu fait [1]. Et en cela, on envoie un grand merci à Rudy et ses amis, qui passent leur temps à nous faire une pub de tous les diables. Sur le haut du podium, le duo de tête reste inchangé, FranceSoir s’étant, à la faveur de la crise sanitaire, imposé comme l’un des acteurs phares de la complosphère (...)"
              },
              {
                  "Faux": 0.6484,
                  "Fiable": 0.35160002708435056,
                  "texte": "AVERTISSEMENT !Eu égard au climat délétère actuel, nous ne validerons plus aucun commentaire ne respectant pas de manière stricte la charte E&R :- Aucun message à caractère raciste ou contrevenant à la loi- Aucun appel à la violence ou à la haine,ni d'insultes- Commentaire rédigé en bon français et sans fautes d'orthographeQuoi qu'il advienne,les modérateurs n'auront en aucune manière à justifier leurs décisions.Tous les commentaires appartiennent à leurs auteurs respectifs et ne sauraient engager la responsabilité de l'association Egalité & Réconciliation ou ses représentants."
              }
          ]
      }
  }
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
          browser.runtime.sendMessage({
            action: "displayScore",
            data: responseData
          }).catch(error => {
            console.log("Erreur d'envoi au popup (normal si fermé):", error);
          });
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
            browser.runtime.sendMessage(errorMessage).catch(() => {});
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
