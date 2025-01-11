import registerSettings from "./settings.mjs";
import crawlTracker from "./apps/crawl-tracker.mjs";
import crawlingHelper from "./apps/crawling-helper.mjs";

// -----------------------------------------------
// Hooks on Init: triggered when the module is first initialized
// -----------------------------------------------
Hooks.on("init", () => {
    registerSettings();

    // initialize persistant apps and vairables
    game.crawlHelper = {
		crawlTracker: new crawlTracker(),
        crawlingHelper: new crawlingHelper()
		//actorCarousel: new actorCarousel(),
	};
});


// -----------------------------------------------
// Hooks on Ready: triggers once the module is fully loaded
// -----------------------------------------------
Hooks.on("ready", async () => {
    //show crawlTracker
    game.crawlHelper.crawlTracker.render(true);

    console.warn("Crawl Helper Ready");
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