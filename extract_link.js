

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "highlight") {

    // Récupérer les liens de la page
    let liens = document.getElementsByTagName("a");
    let links_array = [];
    let pageUrl = window.location.href;
    fetch(`https://270a-87-121-209-252.ngrok-free.app/analyze?url=${pageUrl}`)
      .then(response => response.json())
      .then(data => {
        const messageFiabilite = data[0];
        console.log(messageFiabilite);
      })
      .catch(error => {
        console.log(error);
      });
    // for (let i = 0; i < liens.length; i++) {
    //   links_array.push('https://270a-87-121-209-252.ngrok-free.app/analyze?url=' + liens[i].href);
    //   console.log(liens[i].href);
    //   fetch(`https://270a-87-121-209-252.ngrok-free.app/analyze?url=${liens[i].href}`)
    //     .then(response => response.json())
    //     .then(data => {
    //       const messageFiabilite = data[0];
    //       console.log(messageFiabilite);
    //     })
    //     .catch(error => {
    //       console.log(error);
    //     });
    //   break; // à retirer pour traiter tous les liens
    // }

    // Mettre en surbrillance les liens
    // for (let i = 0; i < links_array.length; i++) {
    //   highlightLink(links_array[i]);
    // }
  }
});