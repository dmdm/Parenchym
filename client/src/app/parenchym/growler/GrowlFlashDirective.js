/**
 * Directive growl-flash
 *
 * Growls flash messages the server had included in the page on first load.
 *
 * The directive is an HTML comment and its expression a JSON list of hashes,
 * each hash defines a message: ``{title: "my title", text: "my text",
 * kind: "error"}``.
 *
 * Allowed kinds are "error", "success", "info", "warning".
 *
 * Usage:
 *
 *     <!-- directive: pym-growl-flash ${mq_json|n} -->
 *
 */

class GrowlFlashDirective {
    constructor(growler) {
        this.restrict = 'M';
        this.template = '';
        this.scope = {};
        this._growler = growler;
    }

    // Must use compile(), because link() does not have access to 'this'.
    compile(elem, attrs) {
        let messages = JSON.parse(attrs.pymGrowlFlash);
        if (messages) {
            for (let m of messages) {
                this._growler.growl(m);
            }
        }
    }

    static directiveFactory(growler) {
        GrowlFlashDirective.instance = new GrowlFlashDirective(growler);
        return GrowlFlashDirective.instance;
    }
}

GrowlFlashDirective.directiveFactory.$inject = ['pym.growler.service'];


export default GrowlFlashDirective;
