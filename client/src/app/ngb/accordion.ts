import {Component, Directive, forwardRef, Inject, Input, Query, QueryList} from 'angular2/core';


@Component({
    selector: 'ngb-accordion-panel',
    directives: [],
    template: `
    <div class="panel panel-default" [class.panel-open]="isOpen">
      <div class="panel-heading">
        <h4 class="panel-title">
          <a href tabindex="0"><span [class.text-muted]="isDisabled" (click)="toggleOpen($event)">{{title}}</span></a>
        </h4>
      </div>
      <div class="panel-collapse">
        <div class="panel-body">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `
})
export class NgbAccordionPanel {
    private _isOpen = false;

    @Input()
    isDisabled:boolean;
    @Input()
    title:string;

    @Input()
    set isOpen(value:boolean) {
        this._isOpen = value;
    }

    get isOpen():boolean {
        return this._isOpen;
    }

    toggleOpen():void {
        if (!this.isDisabled) {
            this.isOpen = !this.isOpen;
        }
    }
}
//
// @Directive({selector: 'ngb-accordion'})
// export class NgbAccordion {
//     @Input('closeOthers')
//     onlyOneOpen:boolean;
//
//     constructor(@Query(NgbAccordionPanel)
//                 public panels:QueryList<NgbAccordionPanel>) {
//     }
//
//     closeOthers(openPanel:NgbAccordionPanel):void {
//         if (!this.onlyOneOpen) {
//             return;
//         }
//
//         this.panels.forEach((panel:NgbAccordionPanel) => {
//             if (panel !== openPanel) {
//                 panel.isOpen = false;
//             }
//         });
//     }
// }
