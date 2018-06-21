module.exports = (database) => {
  let prevProgress = null;

  const ratings = {
    "Overwhelmingly Positive": 0,
    "Very Positive": 1,
    "Mostly Positive": 2,
    "Positive": 3,
    "Mixed": 4,
    "Negative": 5,
    "Mostly Negative": 6,
    "Overwhelmingly Negative": 7,
    "Not enough reviews": 8
  };

  function progressBar(dtext, percent) {
    let text = "\r[Builder] [";

    for (let i = 0; i < 20; i++) {
      if (i <= percent * 20) text += "=";
      else text += (" ");
    }

    text += "] " + Math.floor(percent * 100) + " % " + dtext;

    if (prevProgress != null && prevProgress.length >= dtext.length) {
      let w = "\r";

      process.stdout.write("\r");
      for (let i = 0; i <= prevProgress.length; i++) {
        w += " ";
      }

      process.stdout.write(w);
    }

    prevProgress = text;

    process.stdout.write(text);
  }

  return () => {
    return new Promise(async resolve => {
      const fs = require("fs");
      const bot = new(require("steam-user"))();
      const config = JSON.parse(fs.readFileSync("./config.json"));
      const request = require("request-promise");
      const cheerio = require("cheerio");
      const Fuse = require("fuse.js");

      bot.on("loggedOn", async() => {
        console.log("[Builder] Logged on!");

        //var cxn = await MySQL.createConnection(config.mysql);

        var finished = {};

        var tags = JSON.parse(fs.readFileSync("tags.json"));

        let all = await database.getTaggableApps();
        let l = all.slice(0).map(i => i.appid);

        let iapps = {};
        all.forEach(i => {
          iapps[i.appid] = i;
        });

        if (l.length > 0) {
          progressBar("Requesting information for " + l.length + " apps...", 0);

          try {
            await new Promise(resolve => {
              bot.getProductInfo(l, [], async apps => {
                for (let item = 0; item < Object.keys(apps).length; item++) {
                  progressBar("Determining metadata for AppID " + Object.keys(apps)[item], ((item + 1) / Object.keys(apps).length));

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
                    if (ci.appinfo.common && ci.appinfo.common.type) {
                      // are we a Game with a parent? if so, we're probably a demo, not a game
                      // (this shouldn't really matter anyway - Demos are usually free, and thus excluded - but would be nice for future accounting purposes)
                      if (ci.appinfo.common.type === "Game" && ci.appinfo.common.parent) atags.push("Demo");
                      else atags.push(ci.appinfo.common.type);
                    }
                  }
                  catch (e) {
                    console.log(e);
                    console.log(ci.appinfo.common.store_tags);
                  }

                  await database.tagApp(appid, developer, publisher, atags.join(", "));
                }

                resolve();
              });
            });
          }
          catch (e) { console.log(e); }
        }

        progressBar("Found metadata!\n", 1);

        progressBar("Finding tagged apps...", 0);
        l = await database.getTaggedApps();

        var obj = {};

        l.forEach((i, j) => {
          progressBar("Processing app " + i.appid, (j / l.length));

          Object.keys(i).forEach((j) => {
            // node-mysql returns Buffers for bit values
            // this turns them into ints
            if (Object.prototype.toString.call(i[j]).slice(8, -1) == "Uint8Array") i[j] = i[j].readInt8(0);
          });

          // skip non-discounted apps
          //if (i.discount === 0) return;
          // skip free apps
          //if (i.oprice === 0) return;

          // tags are stored comma separated in the DB
          let tags = i.tags !== null ? i.tags.split(", ") : [];

          // skip anything that isn't a software or a game
          // maybe include series or video in future, but the scraper doesn't know too much about those and fetching prices is hard
          // as a side effect, we'll also skip over apps we don't know enough about
          if (tags.indexOf("Game") < 0 && tags.indexOf("Software") < 0) return;

          // ok looks good!
          obj[i.appid] = i;
          obj[i.appid].tags = tags;

          // review scores
          obj[i.appid].reviews = ratings[obj[i.appid].reviews];
        });

        progressBar("The build looks good!\n", 1);

        finished.apps = obj;

        finished.featured = [];

        console.log("[Builder] Fetching top sellers");
        try {
          let rq = await request("https://store.steampowered.com/search/?filter=globaltopsellers");
          let $ = cheerio.load(rq);

          $(".search_result_row").each((i, j) => {
            if ($(j).attr("data-ds-appid") != null) finished.featured.push($(j).attr("data-ds-appid").split(",")[0]);
          });

          finished.featured = finished.featured.map(i => finished.apps[i]);
        }
        catch (e) {}

        finished.recommendations = (await database.getPicks()).map(i => finished.apps[i.appid]);

        let personas = (await database.getUserSteamids()).map(i => i.steamid);

        bot.setMaxListeners(100);

        console.log("[Builder] Requesting persona data...");
        try {
          let res = JSON.parse(await request("http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0001/?key=" + config.steam_api + "&steamids=" + personas.join(",")));
          res = res.response.players.player.map(i => ({ name: i.personaname, profile: i.profileurl, avatar: i.avatarfull }));
          finished.volunteers = res;
        }
        catch (e) {
          finished.volunteers = [];
        }

        bot.disconnect();

        finished.tags = {};

        let taginfo = {};

        Object.values(tags).forEach((i, j) => {
          progressBar("Building tag " + i, (j / Object.keys(tags).length));

          finished.tags[i.toLowerCase()] = [];

          Object.values(finished.apps).forEach(j => {
            if (j.tags.indexOf(i) > -1) finished.tags[i.toLowerCase()].push(j);
          });

          taginfo[i] = finished.tags[i.toLowerCase()].length;
        });

        finished.taginfo = {};

        Object.keys(taginfo).sort((a, b) => {
          if (taginfo[a] > taginfo[b]) return -1;
          if (taginfo[a] === taginfo[b]) return 0;
          return 1;
        }).forEach(i => finished.taginfo[i.toLowerCase()] = taginfo[i.toLowerCase()]);

        progressBar("Done building tags!\n", 1);

        console.log("Building views...", 0);
        finished.views = {};
        finished.views.all = () => Object.values(finished.apps);
        finished.views.recommended = () => Object.keys(finished.recommendations).map(i => { return finished.apps[i]; });
        finished.views.random = () => {
          let f = [];

          for (let i = 0; i < 100; i++) {
            f.push(finished.apps[Object.keys(finished.apps)[Math.floor(Math.random() * Object.keys(finished.apps).length)]]);
          }

          return f;
        }

        console.log("[Builder] Finished! Found " + Object.keys(finished.apps).length + " apps across " + Object.keys(tags).length + " tags");

        finished.cachedQueries = {};

        finished.fuse = new Fuse(Object.values(finished.apps), { keys: ["appid", "title", "developer", "publisher"], shouldSort: true });

        resolve(finished);
      });
      console.log("[Builder] Logging in to Steam...");
      bot.logOn();
    });
  };
};
