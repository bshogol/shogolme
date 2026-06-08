/* Shogol — renders the homepage timeline feed and the dynamic series page
   from the manifest in posts.js. Pure client-side, no build step. */
(function () {
  var S = window.SHOGOL_SERIES || {};
  var P = (window.SHOGOL_POSTS || []).slice();
  var MON = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  function fmtDate(iso) { var p = iso.split("-"); return MON[parseInt(p[1], 10) - 1] + " " + p[2]; }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function row(post, mode) {
    var a = el("a", "row"); a.href = post.url;
    var nn = el("div", "nn", mode === "series" ? "N°" + pad2(post.part) : fmtDate(post.date));
    var ttl = el("div", "ttl");
    ttl.appendChild(el("h3", null, post.title));
    ttl.appendChild(el("p", null, post.dek));
    var side = el("div", "side");
    var label = mode === "series" ? post.category : (S[post.series] ? S[post.series].title : post.series);
    side.appendChild(el("span", "cat", label));
    side.appendChild(el("span", "ar", "→"));
    a.appendChild(nn); a.appendChild(ttl); a.appendChild(side);
    return a;
  }
  function stagger(container) {
    var kids = container.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].classList.add("anim");
      kids[i].style.animationDelay = (i * 40) + "ms";
    }
  }

  // ---------- homepage feed ----------
  var feed = document.getElementById("feed");
  if (feed) {
    var chips = document.getElementById("chips");
    var cta = document.getElementById("series-cta");
    var sorted = P.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });

    function draw(filter) {
      feed.innerHTML = "";
      sorted.filter(function (p) { return !filter || p.series === filter; })
            .forEach(function (p) { feed.appendChild(row(p, "feed")); });
      stagger(feed);
      if (cta) {
        cta.innerHTML = "";
        if (filter && S[filter]) {
          var a = el("a", "series-cta-link", "Open the full " + S[filter].title + " series →");
          a.href = "series.html?s=" + filter;
          cta.appendChild(a);
        }
      }
    }

    if (chips) {
      var defs = [{ k: "", label: "All posts" }];
      Object.keys(S).forEach(function (k) { defs.push({ k: k, label: S[k].title }); });
      defs.forEach(function (d, i) {
        var b = el("button", "chip" + (i === 0 ? " active" : ""), d.label);
        b.addEventListener("click", function () {
          for (var j = 0; j < chips.children.length; j++) chips.children[j].classList.remove("active");
          b.classList.add("active");
          draw(d.k);
        });
        chips.appendChild(b);
      });
    }
    draw("");
  }

  // ---------- dynamic series page ----------
  var view = document.getElementById("series-view");
  if (view) {
    var slug = new URLSearchParams(location.search).get("s");
    var meta = S[slug];
    var titleEl = document.getElementById("series-title");
    var blurbEl = document.getElementById("series-blurb");
    var metaEl = document.getElementById("series-meta");
    var list = P.filter(function (p) { return p.series === slug; })
                .sort(function (a, b) { return a.part - b.part; });

    if (meta) {
      document.title = meta.title + " — Shogol";
      if (titleEl) titleEl.textContent = meta.title;
      if (blurbEl) blurbEl.textContent = meta.blurb;
      if (metaEl) metaEl.textContent = list.length + " PARTS";
    } else if (titleEl) {
      titleEl.textContent = "Series not found";
    }
    list.forEach(function (p) { view.appendChild(row(p, "series")); });
    stagger(view);
  }
})();
