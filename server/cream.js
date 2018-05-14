/* global config, db */

Array.prototype.isArray = true;

const serverless = require("serverless-http");
const express = require("express");
const a = express();
const h = require("express-async-handler");

global.config = JSON.parse(require("fs").readFileSync("./config.json"));
global.db = new (require("./database.js"))();

function isInt(item){
  return ! isNaN(parseInt(item));
}

function isString(item){
  return item.length < 255;
}

function isFloat(item){
  return ! isNaN(parseFloat(item));
}

function isBoolean(item){
  return typeof(item) == typeof(true);
}

function isDate(item){
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

function respond(res, ok, data){
  if( ! ok ) res.writeHead(400);
  
  res.end(JSON.stringify(data));
}

// Make sure we're connected to MySQL
a.use(h(async (req, res, next) => {
  if( ! db.isConnected ) await db.connect();
  next();
}));

a.use(express.json());

// Redirect weirdos to steamsal.es
a.get("/", (req, res) => {
  res.writeHead(302, { "Location": "https://steamsal.es/" });
  res.end();
});

a.post("/submit", h(async (req, res) => {
  if( ! req.body || ! req.body.key ) return respond(res, false, "Missing API key");
  
  let u = await db.getUserByApiKey(req.body.key);
  if( u === null ) return respond(res, false, "Invalid API key");
  
  if( ! req.body.payload || ! req.body.payload.isArray ) return respond(res, false, "Missing payload");
  
  try {
    req.body.payload.forEach((item) => {
      Object.keys(fields).forEach((field) => {
        if( item[field] == undefined || item[field] == null || ! fields[field](item[field]) ) throw "Invalid or missing field " + field;
      });
    });
    
    for( var i=0; i<req.body.payload.length; i++ ){
      let item = req.body.payload[i];
      
      var response = "";
      
      let row = await db.getUnverifiedApp(item.appid);
      
      if( row === null ){
        await db.addApp("_unverified", item.appid, item.title, item.oprice, item.price, item.discount, item.windows, item.macos, item.linux, item.htcvive, item.oculusrift, item.windowsmr, item.reviews, new Date(item.releasedate).getTime()/1000, u.id);
        response+="Success: Thank you for adding data for app " + item.appid + "!\n";
      } else {
        if( row.submitter == u.id ){
          response += "Warning: Already submitted data for " + row.appid + ". Skipping...\n";
          continue;
        }
        
        Object.keys(row).forEach((i) => {
          if( fields[i] === isBoolean ) row[i] = !(!row[i]); // lol
          if( fields[i] === isDate ){
            item[i] = new Date(item[i]).getTime();
            row[i] = row[i].getTime();
          }
        });
        
        let wasUnverified = false;
        let keys = Object.keys(row);
        
        for( let i=0; i<keys.length; i++ ){
          if( keys[i] !== "submitter" && row[keys[i]] !== item[keys[i]]){
            response += "Warning: Verification failed for appid " + item.appid + ", field " + keys[i] + " (expected: " + row[keys[i]] + ", got: " + item[keys[i]] + "). Using your changes...\n";
            await db.deleteApp("_unverified", item.appid);
            await db.addApp("_unverified", item.appid, item.title, item.oprice, item.price, item.discount, item.windows, item.macos, item.linux, item.htcvive, item.oculusrift, item.windowsmr, item.reviews, new Date(item.releasedate).getTime()/1000, u.id);
            wasUnverified = true;
          }
        }
        
        if( ! wasUnverified ){
          response += "Success: Thank you for verifying data for app " + item.appid + "!\n";
          await db.deleteApp("_unverified", item.appid);
          await db.deleteApp("", item.appid);
          await db.addApp("", item.appid, item.title, item.oprice, item.price, item.discount, item.windows, item.macos, item.linux, item.htcvive, item.oculusrift, item.windowsmr, item.reviews, new Date(item.releasedate).getTime()/1000, u.id);
        }
      }
    }
  } catch(e){
    return respond(res, false, response + "\n\n" + "O nooooes! " + e);
  }
  
  return respond(res, true, response + "\n\nGreat Success!");
  
}));

module.exports.handler = serverless(a);