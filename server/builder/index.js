const fs = require("fs");
const bot = new(require("steam-user"))();
const MySQL = require("promise-mysql");
const config = JSON.parse(fs.readFileSync("./config.json"));
const request = require("request-promise");
const cheerio = require("cheerio");

bot.on("loggedOn", async() => {
  console.log("Logged on!");

  var cxn = await MySQL.createConnection(config.mysql);

  var finished = {};

  var tags = JSON.parse(fs.readFileSync("tags.json"));

  let all = await cxn.query("SELECT * FROM apps WHERE developer IS NULL OR publisher OR tags IS NULL");
  let l = all.slice(0).map(i => i.appid);

  let iapps = {};
  all.forEach(i => {
    iapps[i.appid] = i;
  });

  if (l.length > 0) {
    console.log("Requesting information for " + l.length + " newly-discovered apps...");

    await new Promise(resolve => {
      bot.getProductInfo(l, [], async apps => {
        for (let item = 0; item < Object.keys(apps).length; item++) {
          console.log("Determining metadata for AppID " + Object.keys(apps)[item] + " (" + (item + 1) + "/" + Object.keys(apps).length + ")");

          let appid = Object.keys(apps)[item];
          let ci = apps[appid];

          let developer;
          let publisher;

          if (!ci.appinfo || !ci.appinfo.extended) {
            developer = "unknown";
            publisher = "unknown";
          }
          else {
            developer = ci.appinfo.extended.developer ? ci.appinfo.extended.developer : "unknown";
            publisher = ci.appinfo.extended.publisher ? ci.appinfo.extended.publisher : "unknown";
          }

          let atags;

          try {

            if (!ci.appinfo || !ci.appinfo.common || !ci.appinfo.common.store_tags) {
              atags = [];
            }
            else {
              atags = Object.values(ci.appinfo.common.store_tags).map(tag => tags[tag] ? tags[tag] : "unknown tag");
            }

            let dbapp = iapps[appid];

            // OS
            if (dbapp.windows) atags.push("Windows");
            if (dbapp.macos) atags.push("macOS");
            if (dbapp.linux) atags.push("Linux") && atags.push("SteamOS");

            // VR
            if (dbapp.htcvive) atags.push("Vive");
            if (dbapp.oculusrift) atags.push("Oculus");
            if (dbapp.windowsmr) atags.push("Windows MR");

            // Price and discounts
            if (dbapp.price < 0) atags.push("No Price");
            else if (dbapp.price === 0) atags.push("Free");
            else {
              if (dbapp.price === 0) atags.push("Free");
              if (dbapp.price < 1 && dbapp.price !== 0) atags.push("$1");
              if (dbapp.price < 5) atags.push("$5");
              if (dbapp.price < 10) atags.push("$10");
            }

            if (dbapp.discount >= 50) atags.push("50%");
            if (dbapp.discount >= 75) atags.push("75%");
            if (dbapp.discount >= 90) atags.push("90%");

            if (dbapp.discount > 0) atags.push("Sale");

            // game, dlc, tool, software, media?
            if (ci.appinfo.common && ci.appinfo.common.type) atags.push(ci.appinfo.common.type);

          }
          catch (e) {
            console.log(e);
            console.log(ci.appinfo.common.store_tags);
          }

          await cxn.query("UPDATE apps SET developer = ?, publisher = ?, tags = ? WHERE appid = ?", [developer, publisher, atags.join(", "), appid]);
        }

        resolve();
      });
    });
  }

  l = await cxn.query("SELECT appid, title, tags, oprice, price, discount, tags, developer, publisher FROM apps");

  var obj = {};

  l.forEach((i) => {
    Object.keys(i).forEach((j) => {
      // node-mysql returns Buffers for bit values
      // this turns them into ints
      if (Object.prototype.toString.call(i[j]).slice(8, -1) == "Uint8Array") i[j] = i[j].readInt8(0);
    });

    // skip non-discounted apps
    if (i.discount === 0) return;
    // skip free apps
    if (i.oprice === 0) return;

    // tags are stored comma separated in the DB
    let tags = i.tags !== null ? i.tags.split(", ") : [];

    // skip anything that isn't a software or a game
    // maybe include series or video in future, but the scraper doesn't know too much about those and fetching prices is hard
    // as a side effect, we'll also skip over apps we don't know enough about
    if (tags.indexOf("Game") < 0 && tags.indexOf("Software") < 0) return;

    // ok looks good!
    obj[i.appid] = i;
    obj[i.appid].tags = tags;
  });

  finished.apps = obj;

  finished.featured = [];

  try {
    let rq = await request("https://store.steampowered.com/search/?filter=globaltopsellers");
    let $ = cheerio.load(rq);

    $(".search_result_row").each((i, j) => {
      if ($(j).attr("data-ds-appid") != null) finished.featured.push($(j).attr("data-ds-appid").split(",")[0]);
    });
  }
  catch (e) {}

  finished.recommendations = (await cxn.query("SELECT DISTINCT appid FROM user_pick")).map(i => i.appid);

  let personas = (await cxn.query("SELECT DISTINCT steamid FROM users")).map(i => i.steamid);

  bot.setMaxListeners(100);

  console.log("Requesting persona data...");

  try {
    let res = JSON.parse(await request("http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0001/?key=" + config.steam_api + "&steamids=" + personas.join(",")));
    res = res.response.players.player.map(i => ({ name: i.personaname, profileurl: i.profileurl, avatar: i.avatarfull }));
    finished.volunteers = res;
  }
  catch (e) {
    console.log(e);
    finished.volunteers = [];
  }

  bot.disconnect();
  cxn.end();

  console.log("Writing database to file...");
  fs.writeFileSync("build.json", JSON.stringify(finished));

  console.log("Done! Wrote " + Object.keys(finished.apps).length + " apps");
});
console.log("Logging in to Steam...");
bot.logOn();
