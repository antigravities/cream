/* global $, fetch, cream, DOMPurify */

window.cream = {};

cream.ratings = {
  0: "overwhelmingly-positive",
  1: "very-positive",
  2: "mostly-positive",
  3: "positive",
  4: "mixed",
  5: "negative",
  6: "mostly-negative",
  7: "overwhelmingly-negative",
  8: "not-enough-reviews"
};

cream.p = (str) => {
  return DOMPurify.sanitize(str, { SAFE_FOR_JQUERY: true });
};

cream.buildFeaturedWidget = (element, appid, app) => {
  var discount = "???";
  if (app != undefined) {
    if (app.discount < 1) discount = "$" + app.price;
    else discount = `<b>-${app.discount}%</b> $${app.price}`;
  }

  $(element).html(`
    <a href="https://store.steampowered.com/app/${appid}" target="_blank">
      <img src="https://steamcdn-a.akamaihd.net/steam/apps/${appid}/header.jpg?t=${Date.now()}" style="width: 100%;"></img>
      <div class='discount'>
        ${discount}
      </div>
    </a>
  `);
};

cream.buildFeatured = (featured) => {
  let chosenFeaturedApps = [];

  $(".appshowcase").each((i, j) => {
    let app = null;
    while (app === null) {
      app = featured[Math.floor(Math.random() * featured.length)];
      if (chosenFeaturedApps.indexOf(app) > 0) app = null;
    }

    chosenFeaturedApps.push(app);

    cream.buildFeaturedWidget(j, app.appid, app);
  });
};

cream.npp = 50;
cream.cqresult = [];
cream.cqview = "";
cream.cqpage = 0;
cream.cqmaxpages = 0;
cream.cqsort = true;

cream.buildQueryResult = (apps = cream.cqresult, view = cream.cqview, page = cream.cqpage, sort = cream.cqsort) => {
  cream.cqresult = apps;
  cream.cqview = view;
  cream.cqmaxpages = Math.ceil(apps.length / cream.npp);
  cream.cqpage = page;
  cream.cqsort = sort;

  $(".pagecounter").html("Page <b>" + (page + 1) + "</b> of <b>" + (cream.cqmaxpages) + "</b>");

  var html = "";

  apps = apps.filter(i => i !== null); // I don't know

  if (sort) {
    apps = apps.sort((a, b) => {
      if (cream.sort[1] == "asc") {
        if (a[cream.sort[0]] > b[cream.sort[0]]) return 1;
        else if (a[cream.sort[0]] == b[cream.sort[0]]) return 0;
        else return -1;
      }
      else {
        if (a[cream.sort[0]] < b[cream.sort[0]]) return 1;
        else if (a[cream.sort[0]] == b[cream.sort[0]]) return 0;
        else return -1;
      }
    });
  }

  for (let j = cream.npp * page; j < apps.length && j < cream.npp * (page + 1); j++) {
    let i = apps[j];

    if (i === null) return;

    if (j % 2 === 0) {
      html += "<div class='row'>";
    }

    let title = (i && i.title) ? i.title : "???";
    let dev = (i && i.developer) ? i.developer : "???";
    let pub = (i && i.publisher) ? i.publisher : "???";
    let tags = (i && i.tags) ? i.tags : ["..."];
    let rating = cream.ratings[i.reviews] ? cream.ratings[i.reviews] : cream.ratings[8];

    dev = `<a href="#" class="filter" data-q="${dev}">${cream.p(dev)}</a>`;
    pub = `<a href="#" class="filter" data-q="${pub}">${cream.p(pub)}</a>`;

    let attr = (dev == pub) ? dev : dev + " / " + pub;

    let discount = "";
    if (i.price === 0) discount = "Free";
    else if (i.price < 0) discount = "No Price";
    else {
      if (i.discount > 0) discount = `<b>-${i.discount}%</b><br>`;
      discount += `$${i.price}`;
    }

    tags = tags.map(i => `<a href="#" class="filter" data-q="${i}">${i}</a>`);

    html += `
      <div class="col-sm">
        <a href="https://store.steampowered.com/app/${i.appid}" target="_blank">
          <div class='price'>
            ${discount}
          </div>
          <img class="item-img" src="https://steamcdn-a.akamaihd.net/steam/apps/${i.appid}/header.jpg?t=${cream.lt}"></img>
          <div class='title ${rating}' title='${rating}'><b>${cream.p(title)}</b></div>
          <div class='devpub'>${cream.p(attr)}</div>
          <div class='tags'>${tags.join(", ")}</div>
        </a>
      </div>
    `;

    if (j % 2 === 1 || j == apps.length - 1) {
      html += "</div>";
    }
  }

  $("#list").html(html);

  $("#view").text(view);

  cream.bindFilters();

  if (page === 0) $(".back").css("display", "none");
  else $(".back").css("display", "block");

  if ((page + 1) === cream.cqmaxpages) $(".next").css("display", "none");
  else $(".next").css("display", "block");

  $(".pagecontrols").css("display", "block");
};

cream.search = async query => {
  $("#view").text("Please wait...");
  $("#list").html("");
  if (query.trim() !== "") {
    $(".pagecontrols").css("display", "none");
    let res = await (await fetch("/search/" + encodeURIComponent(query))).json();
    cream.buildQueryResult(res.result, "Search: " + cream.p(res.query) + " (" + res.result.length + " apps)", 0, res.is_tag);
  }
  else {
    cream.buildQueryResult(cream.recommendations ? cream.recommendations : [], "Recommended", 0);
  }
};

cream.nextPage = () => {
  if (cream.cqpage + 1 >= cream.cqmaxpages) return;
  cream.cqpage++;
  cream.buildQueryResult();
};

cream.previousPage = () => {
  if (cream.cqpage - 1 < 0) return;
  cream.cqpage--;
  cream.buildQueryResult();
};

cream.setSort = (key, direction) => {
  cream.sort = [key, direction];
  cream.buildQueryResult(cream.cqresult, cream.cqview, 0);
};

cream.bindFilters = () => {
  $(".filter[data-q]").off();

  $(".filter[data-q]").on("click", e => {
    $("#q").val($(e.currentTarget).data("q"));
    cream.search($("#q").val());
  });
};

$(document).ready(async() => {
  $(".pagecontrols").css("display", "none");

  let homebuild = await (await fetch("/homebuild")).json();
  let volunteers = homebuild.volunteers;
  cream.recommendations = homebuild.recommendations;

  cream.buildFeatured(homebuild.featured);

  cream.buildQueryResult(cream.recommendations, "Recommended", 0);

  $("#q").on("keyup", () => {
    if (cream.timeout !== null) clearTimeout(cream.timeout);

    cream.timeout = setTimeout(async() => {
      cream.search($("#q").val());
    }, 1000);
  });

  $(".sort[data-sort]").on("click", e => {
    let m = $(e.currentTarget).data("sort").split(",");
    $("#sorter-button").text("Sort (" + $(e.currentTarget).text() + ")");
    cream.setSort(m[0], m[1]);
  });

  $(".count[data-count]").on("click", e => {
    cream.npp = parseInt($(e.currentTarget).data("count"));
    if (isNaN(cream.npp)) cream.npp = 50;
    $("#count-button").text("Per Page (" + cream.npp + ")");
    cream.buildQueryResult(cream.cqresult, cream.cqview, 0);
  });

  $(".back").on("click", cream.previousPage);
  $(".next").on("click", cream.nextPage);

  cream.bindFilters();

  let html = "";

  volunteers.forEach((i, j) => {

    if (j % 2 === 0) {
      html += "<div class='row'>";
    }

    html += `
      <div class="col">
        <img class="avatar" src="${i.avatar}"></img>
        <h3><a href="${i.profile}">${cream.p(i.name)}</a></h3>
      </div>
    `;


    if (j % 2 === 1 || j === volunteers.length - 1) {
      html += "</div>";
    }
  });

  html += "</div>";

  $("#contributors").append(html);
});

cream.sort = ["title", "asc"];
