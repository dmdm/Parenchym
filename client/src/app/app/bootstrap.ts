import {provide} from 'angular2/core';
import {bootstrap}    from 'angular2/platform/browser';
import {HTTP_PROVIDERS, Headers, BaseRequestOptions, RequestOptions} from 'angular2/http';
import {AppComponent} from './app.component';
// import {enableProdMode} from "angular2/core";


let appHeaders = new Headers();
appHeaders.append('X-Requested-With', 'XMLHttpRequest');


class AppRequestOptions extends BaseRequestOptions {
    headers = appHeaders;
}


// enableProdMode();
bootstrap(AppComponent, [HTTP_PROVIDERS, provide(RequestOptions, {useClass: AppRequestOptions})]);
