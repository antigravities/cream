/* global $, fetch */

$(document).ready(async () => {
  let build = await fetch("build.json");
  build = await build.json();
  
  let chosenFeaturedApps = [];
  
  $(".appshowcase").each((i, j) => {
    let app = null;
    
    while( app === null ){
      app = build.featured[Math.floor(Math.random()*build.featured.length)];
      if( chosenFeaturedApps.indexOf(app) > 0 ) app = null;
    }
    
    chosenFeaturedApps.push(app);
    
    console.log(build.featured);
    
    var discount = "???";
    if( build.apps[app] ){
      let meta = build.apps[app];
      if( meta.discount < 1 ) discount = "$" + meta.price;
      else discount = `<b>-${meta.discount}%</b> $${meta.price}`;
    }
    
    $(j).html(`
      <a href="https://store.steampowered.com/app/${app}" target="_blank">
        <img src="https://steamcdn-a.akamaihd.net/steam/apps/${app}/header.jpg?t=${Date.now()}" style="width: 100%;"></img>
        <div class='discount'>
          ${discount}
        </div>
      </a>
    `);
  });
  
  let html = "";
  
  build.recommendations.forEach((i, j) => {
    if( j%2 === 0 ){
      html += "<div class='row'>";
    }
    
    let title = (build.apps[i] && build.apps[i].title) ? build.apps[i].title : "???";
    let dev = (build.apps[i] && build.apps[i].developer ) ? build.apps[i].developer : "???";
    let pub = (build.apps[i] && build.apps[i].publisher ) ? build.apps[i].developer : "???";
    let tags = (build.apps[i] && build.apps[i].tags ) ? build.apps[i].tags : "...";
    
    let discount = "???";
    
    if( build.apps[i] ){
      discount = "";
      if( build.apps[i].discount > 0 ) discount = `<b>-${build.apps[i].discount}%</b><br>`;
      discount += `$${build.apps[i].price}`;
    }
    
    html+=`
      <div class="col-sm">
        <div class='price'>
          <b>${discount}</b>  
        </div>
        <img class="item-img" src="https://steamcdn-a.akamaihd.net/steam/apps/${i}/capsule_sm_120.jpg?t=${Date.now()}"></img>
        <b class='title'>${title}</b><br>
        <span class='devpub'>${dev} / ${pub}</span><br>
        <span class='tags'>${tags}</span>
      </div>
    `;
    
    if( j%2 === 1 || j == build.recommendations.length-1 ){
      html += "</div>";
    }
  });
  
  $("#list").html(html);
  
  console.log(build);
});