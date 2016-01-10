import angular from 'angular';


class FooController {
    constructor($timeout, $http, growler, storageService, dialogsService) {
        let self = this;

        this.$timeout = $timeout;
        this.$http    = $http;
        this.growler  = growler;
        this.dialogs = dialogsService;
        this.storage = storageService.getStorage('foo', 'localStorage');
        this.storageKey = 'fooUI';
        this.state = this.loadState();

        this.tree1        = {
            rc: {
                oid: 'FOO'
            },
            filterExpr: '3',
            data: [
                {
                    text: 't1-alpha', children: [
                    {
                        text: 't1-alpha-1', children: [
                        {text: 't1-alpha-1-a'},
                        {text: 't1-alpha-1-b'}
                    ]
                    },
                    {
                        text: 't1-alpha-2', children: [
                        {text: 't1-alpha-2-a'},
                        {text: 't1-alpha-2-b'}
                    ]
                    },
                    {
                        text: 't1-alpha-3', children: [
                        {text: 't1-alpha-3-a'},
                        {text: 't1-alpha-3-b'}
                    ]
                    }
                ]
                },
                {
                    text: 't1-beta', children: [
                    {
                        text: 't1-beta-1', children: [
                        {text: 't1-beta-1-a'},
                        {text: 't1-beta-1-b'}
                    ]
                    },
                    {
                        text: 't1-beta-2', children: [
                        {text: 't1-beta-2-a'},
                        {text: 't1-beta-2-b'}
                    ]
                    },
                    {
                        text: 't1-beta-3', children: [
                        {text: 't1-beta-3-a'},
                        {text: 't1-beta-3-b'}
                    ]
                    }
                ]
                }
            ]
        };
        this.tree1.filter = function () {
            self.tree1.tree.filter(self.tree1.filterExpr);
        };
        this.tree1.rc.onTreeReady = function(tree) {
            if (self.state && self.state.tree1) {
                tree.setState(self.state.tree1);
                self.tree1.filterExpr = self.state.tree1.filterExpr;
            }
        };

        this.tree2 = {
            rc: {
                oid: 'BAR'
            },
            data: [
                {
                    text: 't2-green', children: [
                    {
                        text: 't2-green-1', children: [
                        {text: 't2-green-1-a'},
                        {text: 't2-green-1-b'}
                    ]
                    },
                    {
                        text: 't2-green-2', children: [
                        {text: 't2-green-2-a'},
                        {text: 't2-green-2-b'}
                    ]
                    },
                    {
                        text: 't2-green-3', children: [
                        {text: 't2-green-3-a'},
                        {text: 't2-green-3-b'}
                    ]
                    }
                ]
                },
                {
                    text: 't2-blue', children: [
                    {
                        text: 't2-blue-1', children: [
                        {text: 't2-blue-1-a'},
                        {text: 't2-blue-1-b'}
                    ]
                    },
                    {
                        text: 't2-blue-2', children: [
                        {text: 't2-blue-2-a'},
                        {text: 't2-blue-2-b'}
                    ]
                    },
                    {
                        text: 't2-blue-3', children: [
                        {text: 't2-blue-3-a'},
                        {text: 't2-blue-3-b'}
                    ]
                    }
                ]
                }
            ]
        };

        window.addEventListener(
            "beforeunload", e => {
                this.saveState();
                //let confirmationMessage = "Some message";
                //e.returnValue = confirmationMessage;     // Gecko, Trident, Chrome 34+
                //return confirmationMessage;              // Gecko, WebKit, Chrome <34
            }
        );

    }

    loadState() {
        return this.storage.getObject(this.storageKey);
    }

    saveState() {
        let state = {};
        if (this.tree1.tree) {
            state.tree1 = this.tree1.tree.getState();
        }
        this.storage.setObject(this.storageKey, state);
    }

    growl() {
        this.growler.growlTest();
        this.$http.get('/foo').then(
            x => window.alert(x),
            y => this.growler.httpError(y)
        );
    }

    alert() {
        this.dialogs.alert().result.then(
            result => this.alertResult = 'OK: ' + result,
            result => this.alertResult = 'CANCEL: ' + result
        );
    }

    info() {
        this.dialogs.info().result.then(
            result => this.infoResult = 'OK: ' + result,
            result => this.infoResult = 'CANCEL: ' + result
        );
    }

    confirm() {
        this.dialogs.confirm().result.then(
            result => this.confirmResult = 'OK: ' + result,
            result => this.confirmResult = 'CANCEL: ' + result
        );
    }

    dialog() {
        let data = {
            title: `<i class="fa fa-puzzle-piece text-info"></i>Some <span style="color:red;">fancy</span> title`,
            body: `
            <p>The title's icon is automatically styled.</p>
            <p>Foo</p>
            <p>Bar</p>
        `,
            actionOkCaption: 'Do baz',
            actionCancelCaption: 'Do not do baz'
        };
        this.dialogs.dialog(data).result.then(
            result => this.dialogResult = 'OK: ' + result,
            result => this.dialogResult = 'CANCEL: ' + result
        );
    }
}

FooController.$inject = ['$timeout', '$http', 'pym.growler.service', 'pym.storage.service', 'pym.dialogs.service'];

export { FooController };
