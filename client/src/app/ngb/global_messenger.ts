import {Injectable} from 'angular2/core'
import {Subject}    from 'rxjs/Subject';


/**
 * Messenger to communicate between uncontained components.
 *
 * "Uncontained" means, these components share only the app
 * as their parent: inject this class as a provider into the
 * app component.
 *
 * An example is a bunch of dropdowns.
 *
 * Based on the astronaut example in the cookbook:
 * https://angular.io/docs/ts/latest/cookbook/component-communication.html#!#bidirectional-service
 *
 * Other components may need specialised messengers. E.g.
 * accordion-panels share the accordion as parent. And several
 * accordions on the same page should not interact with each
 * other. For such a case, create a specialised accordion-messenger
 * and inject it as provider into accordion.
 *
 * Hmm, does that mean, each accordion needs its own messenger?
 * No worries, since we're injecting this messenger via 'providers'
 * into each accordion, each accordion gets its own instance of that
 * messenger. See child injectors:
 * http://blog.thoughtram.io/angular/2015/05/18/dependency-injection-in-angular-2.html
 *
 * (If otoh we had injected the messenger really globally via bootstrap(),
 * all components would share the same instance.)
 */
@Injectable()
export class NgbGlobalMessenger {

    // Observable dropdown sources
    private _dropdownOpenedSource = new Subject();
    // Observable dropdown streams
    dropdownOpened$ = this._dropdownOpenedSource.asObservable();
    // Service message commands
    notifyDropdownOpened(dropdown) {
        this._dropdownOpenedSource.next(dropdown)
    }
}
