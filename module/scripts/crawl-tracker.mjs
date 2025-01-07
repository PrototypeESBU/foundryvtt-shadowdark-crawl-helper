const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export default class roundTracker extends Applicationv2 {
    static DEFAULT_OPTIONS = {
        tag: "form",
        form: {
          handler: roundTracker.formHandler,
          submitOnChange: false,
          closeOnSubmit: false
        },
        position: {
            width: 640,
            height: "auto",
        },
        window: {
            icon: "fas fa-gear", // You can now add an icon to the header
            title: "Crawl Tracker"
        },
        actions: {
            myAction: roundTracker.myAction
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

    static myAction(event, target) {
        console.log(this) // logs the specific application class instance
    }
}