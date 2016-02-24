System.config({
  baseURL: "/static-pym/",
  defaultJSExtensions: true,
  transpiler: "traceur",
  paths: {
    "app/*": "app/*.js",
    "github:*": "jspm_packages/github/*",
    "npm:*": "jspm_packages/npm/*",
    "vendor/*": "vendor/*"
  },

  meta: {
    "angular": {
      "deps": [
        "jquery"
      ]
    }
  },

  map: {
    "angular": "github:angular/bower-angular@1.5.0",
    "angular-animate": "github:angular/bower-angular-animate@1.5.0",
    "angular-aria": "github:angular/bower-angular-aria@1.5.0",
    "angular-bootstrap": "github:angular-ui/bootstrap-bower@1.1.2",
    "angular-dragula": "npm:angular-dragula@1.2.4",
    "angular-material": "github:angular/bower-material@1.0.5",
    "angular-sanitize": "github:angular/bower-angular-sanitize@1.5.0",
    "angular-toastr": "github:Foxandxss/angular-toastr@1.7.0/angular-toastr.tpls",
    "angular-ui-grid": "github:angular-ui/bower-ui-grid@3.1.1",
    "angular-ui-router": "github:angular-ui/ui-router@0.2.18",
    "babel-polyfill": "npm:babel-polyfill@6.5.0",
    "components/jquery": "github:components/jquery@2.2.1",
    "core-js": "npm:core-js@1.2.6",
    "css": "github:systemjs/plugin-css@0.1.20",
    "jquery": "npm:jquery@2.2.1",
    "jquery.ui.widget": "vendor/fupl/jquery.ui.widget",
    "json": "github:systemjs/plugin-json@0.1.0",
    "pnotify": "vendor/pnotify/pnotify.custom.min.js",
    "text": "github:systemjs/plugin-text@0.0.2",
    "traceur": "github:jmcriffey/bower-traceur@0.0.93",
    "traceur-runtime": "github:jmcriffey/bower-traceur-runtime@0.0.93",
    "github:Foxandxss/angular-toastr@1.7.0": {
      "angular": "github:angular/bower-angular@1.5.0",
      "css": "github:systemjs/plugin-css@0.1.20"
    },
    "github:angular-ui/ui-router@0.2.18": {
      "angular": "github:angular/bower-angular@1.5.0"
    },
    "github:angular/bower-angular-animate@1.5.0": {
      "angular": "github:angular/bower-angular@1.5.0"
    },
    "github:angular/bower-angular-aria@1.5.0": {
      "angular": "github:angular/bower-angular@1.5.0"
    },
    "github:angular/bower-angular-sanitize@1.5.0": {
      "angular": "github:angular/bower-angular@1.5.0"
    },
    "github:angular/bower-material@1.0.5": {
      "angular": "github:angular/bower-angular@1.5.0",
      "angular-animate": "github:angular/bower-angular-animate@1.5.0",
      "angular-aria": "github:angular/bower-angular-aria@1.5.0",
      "css": "github:systemjs/plugin-css@0.1.20"
    },
    "github:jspm/nodelibs-assert@0.1.0": {
      "assert": "npm:assert@1.3.0"
    },
    "github:jspm/nodelibs-path@0.1.0": {
      "path-browserify": "npm:path-browserify@0.0.0"
    },
    "github:jspm/nodelibs-process@0.1.2": {
      "process": "npm:process@0.11.2"
    },
    "github:jspm/nodelibs-util@0.1.0": {
      "util": "npm:util@0.10.3"
    },
    "npm:angular-dragula@1.2.4": {
      "atoa": "npm:atoa@1.0.0",
      "dragula": "npm:dragula@3.6.6",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:assert@1.3.0": {
      "util": "npm:util@0.10.3"
    },
    "npm:babel-polyfill@6.5.0": {
      "babel-regenerator-runtime": "npm:babel-regenerator-runtime@6.5.0",
      "babel-runtime": "npm:babel-runtime@5.8.35",
      "core-js": "npm:core-js@1.2.6",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:babel-regenerator-runtime@6.5.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:babel-runtime@5.8.35": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:contra@1.9.1": {
      "atoa": "npm:atoa@1.0.0",
      "ticky": "npm:ticky@1.0.0"
    },
    "npm:core-js@1.2.6": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.0"
    },
    "npm:crossvent@1.5.4": {
      "child_process": "github:jspm/nodelibs-child_process@0.1.0",
      "custom-event": "npm:custom-event@1.0.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.0"
    },
    "npm:dragula@3.6.6": {
      "contra": "npm:contra@1.9.1",
      "crossvent": "npm:crossvent@1.5.4"
    },
    "npm:inherits@2.0.1": {
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:path-browserify@0.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:process@0.11.2": {
      "assert": "github:jspm/nodelibs-assert@0.1.0"
    },
    "npm:ticky@1.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:util@0.10.3": {
      "inherits": "npm:inherits@2.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    }
  }
});
