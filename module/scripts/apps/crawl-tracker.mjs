const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export default class crawlTracker extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "crawlTracker",
        form: {
          handler: crawlTracker.formHandler,
          submitOnChange: false,
          closeOnSubmit: false
        },
        position: {
            width: 300,
            height: "auto",
        },
        window: {
            icon: "far fa-clipboard", // You can now add an icon to the header
            title: "Crawl Tracker"
        },
        actions: {
            myAction: crawlTracker.myAction
        }
    };

    static PARTS = {
        main: {
          template: "./modules/shadowdark-crawl-helper/templates/crawl-tracker.hbs"
        }
    }

    _prepareContext(options) {
        const context = {
            maintext:"hello"
        };
        return context
    }

    _onRender(context, options) {
        this.element.querySelector("input[name=something]").addEventListener("click", /* ... */);
        // We will deal with reset later
    }

    /**
    * @param {PointerEvent} event - The originating click event
    * @param {HTMLElement} target - the capturing HTML element which defined a [data-action]
    */
    static async formHandler(event, form, formData) {
        // Do things with the returned FormData
    }

    // ***************
    // Action Handlers
    // ***************

    static async myAction(event, target) {
        console.warn(this) // logs the specific application class instance
    }
}