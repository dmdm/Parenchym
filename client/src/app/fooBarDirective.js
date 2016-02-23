class FooBarDirective {
    constructor() {
        this.require = 'ngModel';  //Properties of DDO have to be attached to the instance through this reference
        this.restrict = 'E';
        this.template = `<h2>Foo Bar Baz</h2>`;
    }

    //link(scope, elem, attrs) {
    //}

    static directiveFactory() {
        FooBarDirective.instance = new FooBarDirective();
        return FooBarDirective.instance;
    }
}

FooBarDirective.directiveFactory.$inject = [];


export {FooBarDirective };