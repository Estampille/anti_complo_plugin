
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "highlight") {
    // Récupérer les liens de la page (inutile pour le moment)
    // let liens = document.getElementsByTagName("a");
    // let links_array = [];
    // let pageUrl = window.location.href;
    // const base_url = "https://9377-87-121-211-134.ngrok-free.app";

    // Simuler une requête (remplacez par votre fetch réel si besoin)
    const messageFiabilite = { score: 0.2 };
    console.log("Envoi du message displayScore:", messageFiabilite.score);

    // Envoie le message au script du popup (accueil.js)
    browser.runtime.sendMessage({
      action: "displayScore",
      score: messageFiabilite.score,
    });
  }
});
const fieldset = document.getElementById('evaluer');
const responseMessage = document.getElementById('Merci !');

fieldset.addEventListener('change', (event) => {
  const selectedResponse = event.target.value;
  console.log('Réponse de l\'utilisateur :', selectedResponse);
  responseMessage.textContent = "Réponse envoyée"; 
});