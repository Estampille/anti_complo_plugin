document.addEventListener("DOMContentLoaded", (event) => {
  console.log("Popup chargé");

  // Vérifier si le bouton existe avant d'ajouter un écouteur
  const highlightButton = document.getElementById("highlightButton");
  if (highlightButton) {
    highlightButton.addEventListener("click", () => {
      console.log("Highlight button clicked");
      const evaluer = document.getElementById("evaluer");
      if (evaluer) {
        evaluer.style.display = "block";
      }

      // Extraire et envoyer les liens pour analyse par l'API
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]) {
          browser.tabs
            .sendMessage(tabs[0].id, { action: "extractLinks" })
            .catch((error) =>
              console.error(
                "Erreur lors de la demande d'extraction des liens:",
                error
              )
            );
        }
      });
    });
  }

  // Écouter les messages pour afficher le score global
  browser.runtime.onMessage.addListener((message) => {
    console.log("Message reçu dans accueil.js :", message);
    if (message.action === "displayScore") {
      console.log("Score received:", message.globalScore);
      const scoreFiabilite = document.getElementById("scoreFiabilite");

      if (scoreFiabilite) {
        if (scoreFiabilite) {
          const scoreSur10 = (parseFloat(message.globalScore) * 100).toFixed(1);
          scoreFiabilite.textContent = `Confiance : ${scoreSur10}`;
        }
        console.log("Score affiché dans le popup :", message.globalScore);
      }

      let color;
      const score = (parseFloat(message.globalScore) * 100).toFixed(1);

      if (!isNaN(score)) {
        let color;

        if (score < 45) {
          color = "red";
        } else if (score >= 45 && score < 60) {
          color = "orange";
        } else {
          color = "green";
        }

        // Appliquer la couleur au bouton
        if (highlightButton) {
          highlightButton.style.backgroundColor = color;
        }
      } else {
        console.warn("Score non numérique reçu :", message.globalScore);
        if (scoreFiabilite) {
          scoreFiabilite.textContent = `Erreur lors de l'analyse`;
        }
      }
    }
  });
});
