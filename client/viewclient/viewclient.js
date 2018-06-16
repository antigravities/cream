/* global $, fetch, cream, Fuse */

cream = {};

cream.buildFeaturedWidget = (element, appid, app) => {
  console.log(element);
  var discount = "???";
  if( app != undefined ){
    if( app.discount < 1 ) discount = "$" + app.price;
    else discount = `<b>-${app.discount}%</b> $${app.price}`;
  }
  
  console.log(app);
  
  $(element).html(`
    <a href="https://store.steampowered.com/app/${appid}" target="_blank">
      <img src="https://steamcdn-a.akamaihd.net/steam/apps/${appid}/header.jpg?t=${Date.now()}" style="width: 100%;"></img>
      <div class='discount'>
        ${discount}
      </div>
    </a>
  `);
};

cream.buildFeatured = () => {
  let chosenFeaturedApps = [];
  
  $(".appshowcase").each((i, j) => {
    let app = null;
    while( app === null ){
      app = cream.build.featured[Math.floor(Math.random()*cream.build.featured.length)];
      if( chosenFeaturedApps.indexOf(app) > 0 ) app = null;
    }
    
    chosenFeaturedApps.push(app);
    
    cream.buildFeaturedWidget(j, app, cream.build.apps[app]);
  });
};

cream.buildQueryResult = (apps, view) => {
  var html = "";
  apps.forEach((i, j) => {
    
    if( j%2 === 0 ){
      html += "<div class='row'>";
    }
    
    let title = (cream.build.apps[i] && cream.build.apps[i].title) ? cream.build.apps[i].title : "???";
    let dev = (cream.build.apps[i] && cream.build.apps[i].developer ) ? cream.build.apps[i].developer : "???";
    let pub = (cream.build.apps[i] && cream.build.apps[i].publisher ) ? cream.build.apps[i].publisher : "???";
    let tags = (cream.build.apps[i] && cream.build.apps[i].tags ) ? cream.build.apps[i].tags : "...";
    
    let discount = "???";
    
    if( cream.build.apps[i] ){
      discount = "";
      if( cream.build.apps[i].price <= 0 ) discount = "<b>Free</b>";
      else {
        if( cream.build.apps[i].discount > 0 ) discount = `<b>-${cream.build.apps[i].discount}%</b><br>`;
        discount += `$${cream.build.apps[i].price}`;
      }
    }
    
    html+=`
      <div class="col-sm">
        <a href="https://store.steampowered.com/app/${i}" target="_blank">
          <div class='price'>
            ${discount}
          </div>
          <img class="item-img" src="https://steamcdn-a.akamaihd.net/steam/apps/${i}/header.jpg?t=${cream.lt}"></img>
          <div class='title'><b>${title}</b></div>
          <div class='devpub'>${dev} / ${pub}</div>
          <div class='tags'>${tags}</div>
        </a>
      </div>
    `;
    
    if( j%2 === 1 || j == apps.length-1 ){
      html += "</div>";
    }
  });
  
  $("#list").html(html);
  
  $("#view").text(view);
};

cream.search = query => {
  if( query.trim() !== "" ){
    let res = cream.fuse.search(query);
    cream.buildQueryResult(res.map(i => i.appid), "Search: " + query);
  } else {
    cream.buildQueryResult(cream.build.recommendations ? cream.build.recommendations : [], "Recommended");
  }
};

$(document).ready(async () => {
  let build = await fetch("build.json");
  cream.build = await build.json();
  
  cream.lt = Date.now();
  
  cream.fuzzy = Object.values(cream.build.apps);
  
  cream.fuse = new Fuse(cream.fuzzy,
    {
      shouldSort: true,
      threshold: 0.4,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      keys: [
        "appid",
        "title",
        "developer",
        "publisher",
        "tags"
      ]
    }
  );
  
  cream.buildFeatured(cream.build);
  cream.buildQueryResult(cream.build.recommendations ? cream.build.recommendations : [], "Recommended");
  //cream.buildQueryResult(Object.keys(cream.build.apps), "All Apps");
  
  $("#q").on("keyup", () => {
    cream.search($("#q").val());
  });
  
  $(".filter[data-q]").on("click", e => {
    $("#q").val($(e.currentTarget).data("q"));
    cream.search($("#q").val());
  });
  
  cream.views = {};
  cream.views.all = Object.keys(cream.build.apps);
  cream.views.recommended = cream.build.recommendations;
  
  $(".filter[data-view]").on("click", e => {
    let view = $(e.currentTarget).data("view");
    cream.buildQueryResult(cream.views[view], "View: " + view);
  });
});