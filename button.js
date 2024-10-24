document.getElementById('highlightButton').addEventListener('click', () => {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    browser.tabs.sendMessage(tabs[0].id, {
      action:
        "highlight"
    });
  });
});

