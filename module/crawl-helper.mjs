import registerSettings from "./scripts/settings.mjs";

// -----------------------------------------------
// Hooks on Init: triggered when the module is first initialized
// -----------------------------------------------
Hooks.once("init", () => {
    console.log("Crawling Helper | Initializing module");
});


// -----------------------------------------------
// Hooks on Ready: triggers once the module is fully loaded
// -----------------------------------------------
Hooks.once("ready", () => {
    console.log("Crawling Helper | Module ready");
    game.crawlingHelper = new CrawlingHelper();  // Makes it accessible in the console
});
Hooks.on("getSceneControlButtons", (controls) => {
    controls.push({
        name: "crawling-helper",
        title: "Crawling Helper",
        icon: "fas fa-dungeon",
        visible: game.user.isGM,
        onClick: () => game.crawlingHelper.openDialog(),
        button: true
    });
});
