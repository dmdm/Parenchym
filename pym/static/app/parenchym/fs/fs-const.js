'use strict';

angular.module('pym.fs').constant('FILE_STATES', {
    'NEW': 0,
    'VALIDATING': 10,
    'VALIDATION_OK': 20,
    'VALIDATION_ERROR': -20,
    'CAN_UPLOAD': 70,
    'UPLOADING': 80,
    'UPLOAD_OK': 90,
    'UPLOAD_ERROR': -90,
    'UPLOAD_CANCELED': -100
}).constant('FILE_STATE_CAPTIONS', {
    '0': 'New (0)',
    '10': 'Validating (10)',
    '20': 'Validation OK (20)',
    '-20': 'Validation Error (-20)',
    '70': 'Can Upload (70)',
    '80': 'Uploading (80)',
    '90': 'Upload OK (90)',
    '-90': 'Upload Error (-90)',
    '-100': 'Upload Canceled (-100)'
});
//# sourceMappingURL=fs-const.js.map
