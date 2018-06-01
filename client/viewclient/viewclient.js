/* global $, fetch, cream */

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

cream.buildFeatured = (build) => {
  let chosenFeaturedApps = [];
  
  $(".appshowcase").each((i, j) => {
    let app = null;
    while( app === null ){
      app = build.featured[Math.floor(Math.random()*build.featured.length)];
      if( chosenFeaturedApps.indexOf(app) > 0 ) app = null;
    }
    
    chosenFeaturedApps.push(app);
    
    cream.buildFeaturedWidget(j, app, build.apps[app]);
  });
};

cream.buildQueryResult = (build, apps, view) => {
  var html = "";
  apps.forEach((i, j) => {
    
    if( j%2 === 0 ){
      html += "<div class='row'>";
    }
    
    let title = (build.apps[i] && build.apps[i].title) ? build.apps[i].title : "???";
    let dev = (build.apps[i] && build.apps[i].developer ) ? build.apps[i].developer : "???";
    let pub = (build.apps[i] && build.apps[i].publisher ) ? build.apps[i].publisher : "???";
    let tags = (build.apps[i] && build.apps[i].tags ) ? build.apps[i].tags : "...";
    
    let discount = "???";
    
    if( build.apps[i] ){
      discount = "";
      if( build.apps[i].price <= 0 ) discount = "<b>Free</b>";
      else {
        if( build.apps[i].discount > 0 ) discount = `<b>-${build.apps[i].discount}%</b><br>`;
        discount += `$${build.apps[i].price}`;
      }
    }
    
    html+=`
      <div class="col-sm">
        <a href="https://store.steampowered.com/app/${i}" target="_blank">
          <div class='price'>
            ${discount}
          </div>
          <img class="item-img" src="https://steamcdn-a.akamaihd.net/steam/apps/${i}/header.jpg?t=${Date.now()}"></img>
          <div class='title'><b>${title}</b></div>
          <div class='devpub'>${dev} / ${pub}</div>
          <span class='tags'>${tags}</span>
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

$(document).ready(async () => {
  let build = await fetch("build.json");
  build = await build.json();
  
  cream.buildFeatured(build);
  //cream.buildQueryResult(build, build.recommendations ? build.recommendations : []);
  cream.buildQueryResult(build, Object.keys(build.apps), "All Apps");
});