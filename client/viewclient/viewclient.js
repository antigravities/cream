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

    tags = tags.map(i => `<a href="#" class="filter" data-q="${i}" data-tag="${i}" colorable>${i}</a>`);

    html += `
      <div class="col-sm">
        <a href="https://store.steampowered.com/app/${i.appid}" target="_blank">
          <div class='price'>
            ${discount}
          </div>
          <img class="item-img" src="https://steamcdn-a.akamaihd.net/steam/apps/${i.appid}/header.jpg?t=${cream.lt}"></img>
          <div class='title ${rating}' title='${rating}'><b>${cream.p(title)}</b></div>
          <div class='devpub'>${cream.p(attr)}</div>
          <div class='tags'>${tags.slice(0,4).join(" ")}</div>
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
  cream.applyTagColors();

  if (page === 0) $(".back").css("display", "none");
  else $(".back").css("display", "block");

  if ((page + 1) === cream.cqmaxpages) $(".next").css("display", "none");
  else $(".next").css("display", "block");

  $(".pagecontrols").css("display", "block");
};

cream.tagColors = {};

cream.hex = "01234567890ABCDEF"
cream.getRandomColor = () => {
  let res = "";

  for (let i = 0; i < 6; i++) {
    res += cream.hex[Math.floor(Math.random() * cream.hex.length)];
  }

  return "#" + res;
}

cream.applyTagColors = () => {
  $("[colorable]").each((i, v) => {

    if (!cream.tagColors[$(v).data("q")]) {
      cream.tagColors[$(v).data("q")] = cream.getRandomColor();
    }

    $(v).css("border", "1px solid " + cream.tagColors[$(v).data("q")]);
    //$(v).css("color", cream.contrast(cream.tagColors[$(v).data("q")], "#FFFFFF", "#000000"));
  });
};

// https://stackoverflow.com/a/41491220
cream.contrast = (bgColor, lightColor, darkColor) => {
  var color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
  var r = parseInt(color.substring(0, 2), 16); // hexToR
  var g = parseInt(color.substring(2, 4), 16); // hexToG
  var b = parseInt(color.substring(4, 6), 16); // hexToB
  var uicolors = [r / 255, g / 255, b / 255];
  var c = uicolors.map((col) => {
    if (col <= 0.03928) {
      return col / 12.92;
    }
    return Math.pow((col + 0.055) / 1.055, 2.4);
  });
  var L = (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2]);
  return (L > 0.179) ? darkColor : lightColor;
}

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

cream.dtags = "Action,Adventure,Casual,Singleplayer,Simulation,Strategy,RPG,Great Soundtrack,Multiplayer,2D,Atmospheric,Puzzle,VR,Story Rich,Difficult,Racing,Rogue-like,Card Game,Anime,Metroidvania,Stealth,Co-op,Platformer,Indie,Survival,Visual Novel,Point & Click,Dating Sim,MOBA,MMORPG,Tower Defense".split(",").sort();

$(document).ready(async() => {
  $(".pagecontrols").css("display", "none");

  cream.dtags.forEach(i => {
    $("#tags").append(`<a href="#" class="filter" data-q="${i}" colorable>${i}</a> `);
  });

  let homebuild = await (await fetch("/homebuild")).json();
  let volunteers = homebuild.volunteers;
  cream.recommendations = homebuild.recommendations;

  if( homebuild.featured.length > 0 ) cream.buildFeatured(homebuild.featured);

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

  cream.applyTagColors();
});

cream.sort = ["title", "asc"];
