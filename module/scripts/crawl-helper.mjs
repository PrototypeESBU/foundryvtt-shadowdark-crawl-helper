import registerSettings from "./settings.mjs";
import crawlTracker from "./apps/crawl-tracker.mjs";
import crawlingHelperMacro from "./apps/crawling-helper-macro.mjs";

// -----------------------------------------------
// Hooks on Init: triggered when the module is first initialized
// -----------------------------------------------
Hooks.on("init", () => {
    registerSettings();

    // initialize persistant apps and vairables
    game.crawlHelper = {
		crawlTracker: new crawlTracker(),
        crawlingHelperMacro: new crawlingHelperMacro()
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

