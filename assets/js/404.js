// GitHub Pages serves this page for any missing path. When the site is published as a
// project site (user.github.io/Portfolio/), the home page lives under the repo folder.
if(/^\/portfolio(\/|$)/i.test(location.pathname))document.getElementById("home").href="/"+location.pathname.split("/")[1]+"/";
