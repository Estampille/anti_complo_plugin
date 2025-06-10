// Menu parent
browser.contextMenus.create({
  id: "anti-complo-root",
  title: "Anti-Complo",
  contexts: ["all"]
});

// Sous-menu
browser.contextMenus.create({
  id: "anti-complo-similar",
  parentId: "anti-complo-root",
  title: "Chercher article similaire",
  contexts: ["all"]
});

// Action au clic
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "anti-complo-similar") {
    console.log("Anti-Complo : recherche d'article similaire (bidon)");
  }
}); 