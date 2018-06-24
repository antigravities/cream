/* global config, db */

(async() => {
  Array.prototype.isArray = true;

  const express = require("express");
  const a = express();
  const h = require("express-async-handler");
  const request = require("request-promise");

  const fs = require("fs");
  const babel = require("babel-core");

  var jsc = null;

  global.config = JSON.parse(require("fs").readFileSync("./config.json"));
  global.db = new(require("./database.js"))();

  await db.connect();

  console.log("Building database cache...");
  const builder = require("./builder.js")(db);
  let build = await builder();

  function isInt(item) {
    return !isNaN(parseInt(item));
  }

  function isString(item) {
    return item.length < 255;
  }

  function isFloat(item) {
    return !isNaN(parseFloat(item));
  }

  function isBoolean(item) {
    return typeof (item) == typeof (true);
  }

  function isDate(item) {
    return new Date(item) != "Invalid Date";
  }

  var fields = {
    "appid": isInt,
    "title": isString,
    "oprice": isFloat,
    "price": isFloat,
    "discount": isInt,
    "windows": isBoolean,
    "macos": isBoolean,
    "linux": isBoolean,
    "htcvive": isBoolean,
    "oculusrift": isBoolean,
    "windowsmr": isBoolean,
    "reviews": isString,
    "releasedate": isDate
  };

  function respond(res, ok, data) {
    if (!ok) res.writeHead(400);

    res.end(JSON.stringify(data));
  }

  a.use(express.json());

  a.get("/", (req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });

    if (Date.now() > config.launch) {
      res.end(fs.readFileSync("../client/viewclient/index.html"));
    }
    else {
      res.end(fs.readFileSync("../client/viewclient/hello.html"));
    }
  });

  a.get("/assets/:asset", (req, res) => {
    let type = "text/plain";
    let code = 404;
    let content = "Cannot GET that";

    if (req.params.asset === "js.now") {
      req.params.asset = "js";
      jsc = null;
    }

    switch (req.params.asset) {
    case "js":
      type = "text/javascript";
      code = 200;

      if (!jsc) {
        jsc = babel.transform(fs.readFileSync("../client/viewclient/viewclient.js"), {
          presets: [
            ["babel-preset-env"]
          ]
        }).code;
      }

      content = jsc;
      break;
    case "css":
      type = "text/css";
      code = 200;

      content = fs.readFileSync("../client/viewclient/viewclient.css");
    }

    res.writeHead(code, { "Content-Type": type });
    res.end(content);
  });

  a.post("/submit", h(async(req, res) => {
    if (!req.body || !req.body.key) return respond(res, false, "Missing API key");

    let u = await db.getUserByApiKey(req.body.key);
    if (u === null) return respond(res, false, "Invalid API key");

    if (!req.body.payload || !req.body.payload.isArray) return respond(res, false, "Missing payload");

    let discoveredAppCount = 0;
    let verifiedAppCount = 0;
    let warnings = 0;

    try {
      req.body.payload.forEach((item) => {
        Object.keys(fields).forEach((field) => {
          if (item[field] == undefined || item[field] == null || !fields[field](item[field])) throw "Invalid or missing field " + field;
        });
      });

      var response = "";

      for (var i = 0; i < req.body.payload.length; i++) {
        let item = req.body.payload[i];

        let row = await db.getUnverifiedApp(item.appid);

        if (row === null) {
          await db.addApp("_unverified", item.appid, item.title, item.oprice, item.price, item.discount, item.windows, item.macos, item.linux, item.htcvive, item.oculusrift, item.windowsmr, item.reviews, new Date(item.releasedate).getTime() / 1000, u.id);
          //response += "Success: Thank you for adding data for app " + item.appid + "!\n";
          discoveredAppCount++;
        }
        else {
          if (row.submitter == u.id) {
            response += "Warning: Already submitted data for " + row.appid + ". Skipping...\n";
            warnings++;
            continue;
          }

          Object.keys(row).forEach((i) => {
            if (fields[i] === isBoolean) row[i] = !(!row[i]); // lol
            if (fields[i] === isDate) {
              item[i] = new Date(item[i]).getTime();
              row[i] = row[i].getTime();
            }
          });

          let wasUnverified = false;
          let keys = Object.keys(row);

          for (let i = 0; i < keys.length; i++) {
            if (keys[i] !== "submitter" && keys[i] !== "releasedate" && row[keys[i]] !== item[keys[i]]) {
              response += "Warning: Verification failed for appid " + item.appid + ", field " + keys[i] + " (expected: " + row[keys[i]] + ", got: " + item[keys[i]] + "). Using your changes...\n";
              warnings++;
              await db.deleteApp("_unverified", item.appid);
              await db.addApp("_unverified", item.appid, item.title, item.oprice, item.price, item.discount, item.windows, item.macos, item.linux, item.htcvive, item.oculusrift, item.windowsmr, item.reviews, new Date(item.releasedate).getTime() / 1000, u.id);
              wasUnverified = true;
            }
          }

          if (!wasUnverified) {
            await db.deleteApp("_unverified", item.appid);
            await db.deleteApp("", item.appid);
            await db.addApp("", item.appid, item.title, item.oprice, item.price, item.discount, item.windows, item.macos, item.linux, item.htcvive, item.oculusrift, item.windowsmr, item.reviews, new Date(item.releasedate).getTime() / 1000, row.submitter, u.id);
            //response += "Success: Thank you for verifying data for app " + item.appid + "!\n";

            verifiedAppCount++;
          }
        }
      }
    }
    catch (e) {
      return respond(res, false, response + "\n\n" + "O nooooes! " + e);
    }

    return respond(res, true, response + "\n\nGreat Success!\n" + discoveredAppCount + " discovered apps, " + verifiedAppCount + " verifications, " + warnings + " warnings");

  }));

  a.post("/pick", h(async(req, res) => {
    if (!req.body || !req.body.key) return respond(res, false, "Missing API key");

    let u = await db.getUserByApiKey(req.body.key);
    if (u === null) return respond(res, false, "Invalid API key");

    //if (!u.pick_override) return respond(res, false, "You must have a Pick Override API key to do that");

    if (!req.body.appId || isNaN(req.body.appId)) return respond(res, false, "Invalid appId to pick given.");

    let appId = Number(req.body.appId);

    try {
      // Check if app exists
      if (!build.apps[appId]) return respond(res, false, "Oops, that app isn't on sale or is invalid.");

      if (!u.pick_override) {
        // Check if user picked too much
        let userPicks = await db.getPicksByUser(u.id);
        if (userPicks.length >= global.config.maxPicks) {
          return respond(res, false, "You already picked too many times.");
        }
      }

      if (await db.hasPicked(u.id, appId)) return respond(res, false, "You've already picked that app.");

      await db.addPick(u.id, appId);

      if (config.webhooks) {
        let persona = null;

        for (let i = 0; i < build.volunteers.length; i++) {
          if (build.volunteers[i].steamid === u.steamid) {
            persona = build.volunteers[i];
            break;
          }
        }

        if (persona === null) return;

        for (let f = 0; f < config.webhooks.length; f++) {
          await request.post(config.webhooks[f], {
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              content: "I recommend **" + build.apps[appId].title + "**!\n\n" + (build.apps[appId].discount > 0 ? "~~$" + build.apps[appId].oprice + "~~ **-" + build.apps[appId].discount + "%** " : "") + "**$" + build.apps[appId].price + "**\n*" + build.apps[appId].tags + "*\nhttps://store.steampowered.com/app/" + appId,
              username: persona.name,
              avatar_url: persona.avatar
            })
          });
        }


      }
    }
    catch (e) {
      return respond(res, false, "O nooooes! " + e);
    }

    return respond(res, true, "Okay, added your pick.");

  }));

  a.get("/search/:what", h(async(req, res) => {
    if (req.params.what === "") return respond(res, false, "Missing search query");
    req.params.what = req.params.what.toLowerCase();

    if (build.tags[req.params.what]) return respond(res, true, { query: req.params.what, result: build.tags[req.params.what], is_tag: true });
    if (build.views[req.params.what]) return respond(res, true, { query: req.params.what, result: build.views[req.params.what](), is_tag: true });
    if (build.cachedQueries[req.params.what]) return respond(res, true, { query: req.params.what, result: build.cachedQueries[req.params.what], is_tag: false });
    else {
      build.cachedQueries[req.params.what] = build.search(req.params.what);
      return respond(res, true, { query: req.params.what, result: build.cachedQueries[req.params.what], is_tag: false });
    }
  }));

  a.get("/tags", h(async(req, res) => {
    return respond(res, true, build.taginfo);
  }));

  a.get("/homebuild", h(async(req, res) => {
    return respond(res, true, {
      volunteers: build.volunteers,
      featured: build.featured,
      recommendations: build.recommendations
    });
  }));

  a.listen(3000);

  setInterval(async() => {
    build = await builder();
  }, config.launch < Date.now() ? 300000 : 120000);
})();
