<script type="text/ng-template" id="ItemPropertiesDlgTpl.html">
    <div class="modal-header">
        <h3 class="modal-title">{{dlg.rawData._name}} <small>${_("Item Properties")}</small></h3>
        <div>Path: {{dlg.path}}</div>
    </div>
    <div class="modal-body">

        <tabset>
            <tab>
                <tab-heading>${_('Item')}</tab-heading>
                <textarea ng-model="dlg.data.item" style="width: 100%; height: 40ex; white-space: pre; font-family: monospace; border: none;">{{dlg.data.item}}</textarea>
            </tab>
            <tab>
                <tab-heading>${_('Meta JSON')}</tab-heading>
                <textarea ng-model="dlg.data.meta_json" style="width: 100%; height: 40ex; white-space: pre; font-family: monospace; border: none;">{{dlg.data.meta_json}}</textarea>
            </tab>
            <tab>
                <tab-heading>${_('Meta XMP')}</tab-heading>
                <textarea ng-model="dlg.data.meta_xmp" style="width: 100%; height: 40ex; white-space: pre; font-family: monospace; border: none;">{{dlg.data.meta_xmp}}</textarea>
            </tab>
            <tab>
                <tab-heading>${_('Content Text')}</tab-heading>
                <textarea ng-model="dlg.data.data_text" style="width: 100%; height: 40ex; white-space: pre; font-family: monospace; border: none;">{{dlg.data.data_text}}</textarea>
            </tab>
            <tab>
                <tab-heading>${_('Content HTML')}</tab-heading>
                <div style="width: 100%; height: 40ex; overflow: auto;" ng-bind-html="dlg.data.data_html_body">
                </div>
            </tab>
            <tab>
                <tab-heading>${_('RC')}</tab-heading>
                <textarea ng-model="dlg.data.rc" style="width: 100%; height: 40ex; white-space: pre; font-family: monospace; border: none;">{{dlg.data.rc}}</textarea>
            </tab>
        </tabset>

    </div>
    <div class="modal-footer">
        <button class="btn btn-warning" ng-click="dlg.cancel()">Cancel</button>
        <button class="btn btn-primary" ng-click="dlg.save()">Save</button>
    </div>
</script>
