import {Component, HostListener, EventEmitter, Output} from 'angular2/core';
//import { ToastsManager } from '../vendor/ng2-toastr/ng2-toastr';
import {NgbDropdown, NgbDropdownToggle, NgbDropdownMenu} from '../ngb/dropdown';
import {NgbGlobalMessenger} from '../ngb/global_messenger';


declare var PYM_PAGE_RC:any;


@Component({
    selector: 'clicker',
    template: '<h1>CLICK ME</h1>'
})
export class Clicker {

    @HostListener('click')
    logClick() {
        console.log('click');
    }

}


@Component({
    selector: 'zippy',
    template: `
      <div class="zippy">
        <div (click)="toggle()">Toggle</div>
        <div [hidden]="!visible">
          <ng-content></ng-content>
        </div>
     </div>`
})
export class Zippy {
    visible:boolean = true;
    @Output()
    open:EventEmitter<any> = new EventEmitter();
    @Output()
    close:EventEmitter<any> = new EventEmitter();

    toggle() {
        this.visible = !this.visible;
        if (this.visible) {
            this.open.emit(null);
        } else {
            this.close.emit(null);
        }
    }
}


@Component({
    selector: 'app-content',
    template: `<ng-content></ng-content>`
})
export class AppContent {
}


@Component({
    selector: 'app',
    directives: [AppContent, Zippy, Clicker, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu],
    template: '<app-content>' + PYM_PAGE_RC.appContent + '</app-content>',
    providers: [NgbGlobalMessenger]
})
export class AppComponent {

    public rc;

    constructor() {
        this.rc = PYM_PAGE_RC;
    }

    sayOpen() {
        console.log('zippy open');
    }

    sayClose() {
        console.log('zippy close');
    }
}
