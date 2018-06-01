const fs = require("fs");
const bot = new (require("steam-user"))();
const MySQL = require("promise-mysql");
const config = JSON.parse(fs.readFileSync("./config.json"));
const request = require("request-promise");
const cheerio = require("cheerio");

bot.on("loggedOn", async () => {
  console.log("Logged on!");
  
  var cxn = await MySQL.createConnection(config.mysql);
  
  var finished = {};
  
  var tags = JSON.parse(fs.readFileSync("tags.json"));
  
  var l = await cxn.query("SELECT * FROM apps WHERE developer IS NULL OR publisher OR tags IS NULL");
  l = l.map(i => i.appid);
  
  if( l.length > 0 ){
    console.log("Requesting information for " + l.length + " apps...");
    
    await new Promise((resolve, reject) => {
      bot.getProductInfo(l, [], async (apps, packages, unknownApps, unknownPackages) => {
        for( let item=0; item<Object.keys(apps).length; item++ ){
          let appid = Object.keys(apps)[item];
          let ci = apps[appid];
          
          let developer;
          let publisher;
          
          if( ! ci.appinfo || ! ci.appinfo.extended ){
            developer = "unknown";
            publisher = "unknown";
          } else {
            developer = ci.appinfo.extended.developer ? ci.appinfo.extended.developer : "unknown";
            publisher = ci.appinfo.extended.publisher ? ci.appinfo.extended.publisher : "unknown";
          }
          
          let atags;
          
          try {
            if( ! ci.appinfo || ! ci.appinfo.common || ! ci.appinfo.common.store_tags ){
              atags = "no tags";
            } else {
              atags = Object.values(ci.appinfo.common.store_tags).map(tag => tags[tag] ? tags[tag] : "unknown tag").join(", ");
            }
          } catch(e){
            console.log(e);
            console.log(ci.appinfo.common.store_tags);
          }
          
          await cxn.query("UPDATE apps SET developer = ?, publisher = ?, tags = ? WHERE appid = ?", [ developer, publisher, atags, appid ]);
        }
      
        resolve();
      });
    });
  }
  
  console.log("Writing database to file...");
  l = await cxn.query("SELECT * FROM apps");
  
  var obj = {};
  
  l.forEach((i) => {
    Object.keys(i).forEach((j) => {
      if( Object.prototype.toString.call(i[j]).slice(8, -1) == "Uint8Array" ) i[j] = i[j].readInt8(0);
    });
    
    obj[i.appid] = i;
  });
  
  finished.apps = obj;
  
  finished.featured = [];
  
  try {
    let rq = await request("https://store.steampowered.com/search/?filter=globaltopsellers");
    let $ = cheerio.load(rq);
    
    $(".search_result_row").each((i, j) => {
      if( $(j).attr("data-ds-appid") != null ) finished.featured.push($(j).attr("data-ds-appid").split(",")[0]);
    });
  } catch(e){
    
  }
  
  finished.recommendations = (await cxn.query("SELECT DISTINCT appid FROM user_pick")).map(i => i.appid);
  
  fs.writeFileSync("build.json", JSON.stringify(finished));
  
  cxn.end();
  bot.disconnect();
  
  console.log("Done!");
});

console.log("Logging in to Steam...");
bot.logOn();
