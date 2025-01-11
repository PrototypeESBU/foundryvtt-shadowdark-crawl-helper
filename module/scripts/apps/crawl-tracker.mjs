const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export default class crawlTracker extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        tag: "form",
        form: {
          handler: crawlTracker.formHandler,
          submitOnChange: false,
          closeOnSubmit: false
        },
        position: {
            width: 640,
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
        form: {
          template: "./modules/shadowdark-crawl-helper/templates/crawl-tracker.hbs"
        }
    }

    _prepareContext(options) {
        const data = "hello";
        return data
    }

    _onRender(context, options) {
        this.element.querySelector("input[name=something]").addEventListener("click", /* ... */);
        // We will deal with reset later
    }

    // ***************
    // Required Fuctions
    // ***************

    _renderHTML(context, options) {
        return
    }

    _replaceHTML(context, options) {
        return
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