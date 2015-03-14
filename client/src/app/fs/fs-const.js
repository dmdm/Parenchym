angular.module('pym.fs')
    .constant('FILE_STATES', {
        'NEW':                 0,
        'VALIDATING':         10,
        'VALIDATION_OK':      20,
        'VALIDATION_ERROR':  -20,
        'UPLOADING':          30,
        'UPLOAD_OK':          40,
        'UPLOAD_ERROR':      -40,
        'UPLOAD_CANCELED':  -100
    })
    .constant('FILE_STATE_CAPTIONS', {
           '0' : 'New (0)',
          '10' : 'Validating (10)',
          '20' : 'Validation OK (20)',
         '-20' : 'Validation Error (-20)',
          '30' : 'Uploading (30)',
          '40' : 'Upload OK (40)',
         '-40' : 'Upload Error (-40)',
        '-100' : 'Upload Canceled (-100)'
    });
