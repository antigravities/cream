const fs = require("fs");
const bot = new (require("steam-user"))();
const MySQL = require("promise-mysql");
const config = JSON.parse(fs.readFileSync("./config.json"));

bot.on("loggedOn", async () => {
  console.log("Logged on!");
  
  var cxn = await MySQL.createConnection(config.mysql);
  
  var l = await cxn.query("SELECT * FROM apps WHERE developer IS NULL OR publisher IS NULL");
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
          
          await cxn.query("UPDATE apps SET developer = ?, publisher = ? WHERE appid = ?", [ developer, publisher, appid ]);
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
  
  fs.writeFileSync("database.json", JSON.stringify(obj));
  
  cxn.end();
  bot.disconnect();
  
  console.log("Done!");
});

console.log("Logging in to Steam...");
bot.logOn();