browser.runtime.onMessage.addListener((message) => {
  if (message.action === "highlight") {
    // Récupérer les liens de la page (inutile pour le moment)
    // let liens = document.getElementsByTagName("a");
    // let links_array = [];
    // let pageUrl = window.location.href;
    // const base_url = "https://9377-87-121-211-134.ngrok-free.app";

    console.log("Message 'highlight' reçu, analyse en cours...");
    const scorePourcentage = Math.floor(Math.random() * 100);
    // Simuler une requête et générer un score de confiance
    const responseJson = [
      {
        field: "score de confiance",
        confidence: scorePourcentage, // Converti entre 0 et 1
        value: `${scorePourcentage}%`, // Affichage correct
        displayText: `Score de confiance : ${scorePourcentage}%`,
      },
    ];

    console.log(
      "JSON généré avant envoi :",
      JSON.stringify(responseJson, null, 2)
    );

    const result = responseJson.map((item) => ({
      field: item.field,
      confidence: scorePourcentage, // Convertir en pourcentage
      value: item.value,
      displayText: `${item.field} : score de confiance ${scorePourcentage}%, value : ${item.value}`,
    }));

    console.log("Envoi du message displayScore:", result);

    // Envoie le message au script du popup (accueil.js)
    browser.runtime.sendMessage({
      action: "displayScore",
      score: result[0].confidence,
    });
  }
});
const fieldset = document.getElementById("evaluer");
const responseMessage = document.getElementById("Merci !");

fieldset.addEventListener("change", (event) => {
  const selectedResponse = event.target.value;
  console.log("Réponse de l'utilisateur :", selectedResponse);
  responseMessage.textContent = "Réponse envoyée";
});
