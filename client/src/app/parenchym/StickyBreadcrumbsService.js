import angular from 'angular';


class StickyBreadcrumbsService {
    constructor($log, $window) {
        this.$log = $log;
        this.$window = $window;
        this.rc = {
            selector: '#breadcrumbs',
            classSticky: 'sticky-breadcrumbs'
        };

        this.isSticky = false;
        this.placeholder = undefined;
        this.exists = false;

        this.elem = undefined;
        this.height = undefined;
        this.width = undefined;
        this.placeholderWidth = undefined;
        this.offsetTop = undefined;
        this.triggerPos = undefined;
    }

    init() {
        this.initElem();
        this.handleEvents();
    }

    handleEvents () {
        let win = angular.element(this.$window);
        win.on('resize', () => this.updatePosition() );
        win.on('scroll', () => this.onScroll(win.scrollTop()) );
        // init
        this.updatePosition();
        this.onScroll(win.scrollTop());
    }

    onScroll(scrollTop) {
        if (scrollTop > this.triggerPos) {
            this.stick();
        }
        else {
            this.unstick();
        }
    }

    updatePosition() {
        this.placeholderWidth = this.placeholder.outerWidth();
        if (this.isSticky) {
            this.elem.css({ width: this.placeholderWidth });
        }
    }

    initElem() {
        let elem = angular.element(document).find(this.rc.selector);
        if (elem.length) {
            this.exists = true;
            this.elem = elem;
            this.height = elem.height();
            this.width = elem.width();
            this.offsetTop = elem.offset().top;
            this.triggerPos = this.offsetTop;
            this.createPlaceholder();
        }
    }

    createPlaceholder() {
        this.placeholder = angular.element('<div style="display: none; width: 100%;"></div>');
        this.placeholder.css({
            height: this.elem.outerHeight()
        });
        this.placeholderWidth = this.placeholder.outerWidth();
        this.placeholder.insertBefore(this.elem);
        angular.element(this.$window).on('resize',
                                          () => { this.updatePosition(); });
    }

    stick() {
        if (! this.exists) {
            this.$log.error('Breadcrumbs element not found');
            return;
        }
        if (! this.isSticky) {
            this.isSticky = true;
            this.elem.addClass(this.rc.classSticky);
            this.placeholder.show();
            this.updatePosition();
        }
    }

    unstick() {
        if (! this.exists) {
            this.$log.error('Breadcrumbs element not found');
            return;
        }
        if (this.isSticky) {
            this.isSticky = false;
            this.elem.removeClass(this.rc.classSticky);
            this.placeholder.hide();
            this.elem.css({ width: '' });
        }
    }

    static serviceFactory(...all) {
        return new StickyBreadcrumbsService(...all);
    }

}

StickyBreadcrumbsService.serviceFactory.$inject = ['$log', '$window'];

export default StickyBreadcrumbsService;
