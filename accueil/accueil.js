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

      // Envoyer l'action "highlight" au script de contenu via le background
      browser.runtime.sendMessage({ action: "highlight" });
    });
  }

  // Écouter les messages pour afficher le score global
  browser.runtime.onMessage.addListener((message) => {
    console.log("Message reçu dans accueil.js :", message);
    if (message.action === "displayScore") {
      console.log("Score received:", message.globalScore);
      const scoreFiabilite = document.getElementById("scoreFiabilite");

      if (scoreFiabilite) {
        scoreFiabilite.textContent = `Confiance : ${message.globalScore}%`;
        console.log("Score affiché dans le popup :", message.globalScore);
      }

      let color;
      const score = parseFloat(message.globalScore); // Convertir en nombre

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
    }
  });
});
