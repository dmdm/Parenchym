<%inherit file="pym:templates/layouts/sys.mako" />

<%block name="styles">
${parent.styles()}
</%block>
<%block name="require_config">
	${parent.require_config()}
    PYM_APP_REQUIREMENTS.push(
        'ng-ui-bs'
    );
    PYM_APP_INJECTS.push('ui.bootstrap');
</%block>
<%block name="scripts">
${parent.scripts()}
</%block>
<%block name="meta_title">${_("Proceedings of Foo")}</%block>
<div class="outer-gutter">
    <p>This "Journal" has one article, borrowed <a href="http://www.physics.nyu.edu/faculty/sokal/">from here</a>.</p>

    <iframe src="http://www.physics.nyu.edu/faculty/sokal/transgress_v2/transgress_v2_singlefile.html" width="100%" height="500px">

    </iframe>
    <p>
        &nbsp;
    </p>

                                    <div class="comments">
                        <div id="disqus_thread"></div>
                        <script type="text/javascript">
                           var disqus_identifier = "${request.view_name}";
                           (function() {
                                var dsq = document.createElement('script');
                                dsq.type = 'text/javascript'; dsq.async = true;
                                dsq.src = 'http://parenchym.disqus.com/embed.js';
                                (document.getElementsByTagName('head')[0] ||
                                 document.getElementsByTagName('body')[0]).appendChild(dsq);
                          })();
                        </script>
                </div>



        <script type="text/javascript">
    var disqus_shortname = 'parenchym';
    (function () {
        var s = document.createElement('script'); s.async = true;
        s.type = 'text/javascript';
        s.src = 'http://' + disqus_shortname + '.disqus.com/count.js';
        (document.getElementsByTagName('HEAD')[0] || document.getElementsByTagName('BODY')[0]).appendChild(s);
    }());
</script>
</div>
