import angular from 'angular';


class GroupMgrController {
    constructor(authMgrService) {
        this.authMgrService = authMgrService;

        this.myData = [
            {
                "firstName": "Cox",
                "lastName": "Carney",
                "company": "Enormo",
                "employed": true
            },
            {
                "firstName": "Lorraine",
                "lastName": "Wise",
                "company": "Comveyer",
                "employed": false
            },
            {
                "firstName": "Nancy",
                "lastName": "Waters",
                "company": "Fuelton",
                "employed": false
            }
        ];
    }
}

GroupMgrController.$inject = ['pym.authmgr.service'];


export default GroupMgrController;
