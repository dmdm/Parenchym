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
<%block name="meta_title">${_("The Bar")}</%block>
<div class="outer-gutter">
    <p>This "Journal" is The Bar.</p>
    <p>In 2005 some guys of MIT created a bogus article which got accepted at the WMSCI 2005 conference.</p>
    <p>To be precise, they created a program [!] that created an article, and they published their experience along with
    the code SCIgen here: <a href="http://pdos.csail.mit.edu/scigen/">http://pdos.csail.mit.edu/scigen/</a>.</p>

    <p>You may have guessed, the article in "Proceedings of Foo" is also bogus, although Professor Sokal is a real guy
    and professor and did write interesting stuff about quality of scientific publications and reviews, e.g. his book "Beyond the Hoax: Science, Philosophy and Culture", <a href="http://www.timeshighereducation.co.uk/401027.article">reviewed here</a>.</p>

    <p>As three is a lucky number, here is <a href="http://diehimmelistschoen.blogspot.de/">another hoax</a> that got accepted to some conference, and the author Herbert Schlangemann was also invited as a peer reviewer.</p>
    <p>In his blog profile he mentions his favourite movie "Der Schlangemann", which can be <a href="https://archive.org/details/Der_Schlangemann">found here</a> in the internet archive; worth a treat -- keep away from minors ;)</p>



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
