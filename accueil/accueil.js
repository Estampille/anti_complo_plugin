document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup chargé");

  const scoreFiabilite = document.getElementById("scoreFiabilite");
  const highlightButton = document.getElementById("highlightButton");
  const resetButton = document.getElementById("resetScoreButton");

  // 🔁 Afficher le score sauvegardé
  browser.storage.local
    .get(["savedScore", "savedLabel", "savedColor"])
    .then((result) => {
      if (result.savedScore && result.savedLabel && result.savedColor) {
        if (scoreFiabilite) {
          scoreFiabilite.textContent = `Confiance : ${result.savedScore} % (${result.savedLabel})`;
        }
        if (highlightButton) {
          highlightButton.style.backgroundColor = result.savedColor;
        }
      }
    });

  // ✅ Réinitialiser le score
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      browser.storage.local
        .remove(["savedScore", "savedLabel", "savedColor"])
        .then(() => {
          if (scoreFiabilite) {
            scoreFiabilite.textContent = "Score réinitialisé.";
          }
          if (highlightButton) {
            highlightButton.style.backgroundColor = ""; // réinitialise la couleur
          }
          console.log("Score réinitialisé.");
        });
    });
  }

  // 🎯 Lancer l’analyse
  if (highlightButton) {
    highlightButton.addEventListener("click", () => {
      console.log("Highlight button clicked");
      const evaluer = document.getElementById("evaluer");
      if (evaluer) {
        evaluer.style.display = "block";
      }

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

  // 🎯 Réception du score
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === "displayScore") {
      const rawScore = parseFloat(message.globalScore);
      const scorePourcent = Math.round(rawScore * 100); // arrondi au pourcentage

      let label = "";
      let color = "";

      if (scorePourcent < 45) {
        label = "Pas Fiable";
        color = "red";
      } else if (scorePourcent >= 45 && scorePourcent < 60) {
        label = "Moyen";
        color = "orange";
      } else {
        label = "Fiable";
        color = "green";
      }

      if (scoreFiabilite) {
        scoreFiabilite.textContent = `Confiance : ${scorePourcent} % (${label})`;
      }

      if (highlightButton) {
        highlightButton.style.backgroundColor = color;
      }

      // 💾 Sauvegarder dans le stockage
      browser.storage.local.set({
        savedScore: scorePourcent,
        savedLabel: label,
        savedColor: color,
      });
    }
  });
});
