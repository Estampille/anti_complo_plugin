document.addEventListener("DOMContentLoaded", (event) => {
  // Ensure the button exists

  document.getElementById("highlightButton").addEventListener("click", () => {
    console.log("Highlight button clicked");
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      browser.tabs.sendMessage(tabs[0].id, { action: "highlight" });
    });
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message.action === "displayScore") {
      console.log("Score received:", message.score);
      document.getElementById(
        "scoreFiabilite"
      ).textContent = `confiance ${message.score*100}%`;
      let color;
      const score = message.score;
      if (score < 0.45) {
        const red = Math.round((255 * (1 - (score-0.55))) / 0.45);
        // color = `rgb( ${orange}, 255, 0)`;
        color='red';
      } else if (score >= 0.45 && score < 0.6) {
        color = "yellow";
      } else {
        const green = Math.round(255 * (1 - (score - 0.55) / 0.45));
        color = `rgb( ${green},255, 0)`;
      }
   
      document.getElementById('evaluer').style.display = 'block';
      
      document.getElementById("highlightButton").style.backgroundColor = color;
    }
    
  });
});
