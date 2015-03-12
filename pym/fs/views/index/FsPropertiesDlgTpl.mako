<script type="text/ng-template" id="FsPropertiesDlgTpl.html">
    <div class="modal-header">
        <h3 class="modal-title">${_("Filesystem Properties")}</h3>
    </div>
    <div class="modal-body">
        <textarea ng-model="dlg.data" style="width: 100%; height: 20ex; white-space: pre; font-family: monospace;">{{dlg.data|json:4}}</textarea>
    </div>
    <div class="modal-footer">
        <button class="btn btn-warning" ng-click="dlg.cancel()">Cancel</button>
        <button class="btn btn-primary" ng-click="dlg.save()">Save</button>
    </div>
</script>
