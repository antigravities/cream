// ==UserScript==
// @name         Submit to Cream
// @namespace    https://steamsal.es/
// @version      0.2.5
// @description  Submit Steam Store searches to a Cream API server
// @author       Cutie Cafe
// @match        *://store.steampowered.com/search*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

// 0.2.5
// - submit picks by clicking ⁂ in search results

/* eslint radix: "as-needed" */
/* global ShowConfirmDialog, GM_getValue, GM_setValue, GM_deleteValue, GM_xmlhttpRequest, history, ShowBlockingWaitDialog, ShowAlertDialog, ShowPromptDialog, jQuery, Logout */

(function () {
  var lambda;
  var key;
  var automate = localStorage.getItem('automate');
  var notUsd = localStorage.getItem('notUsd');
  const DELAY = 3000;

  if(localStorage.getItem('automate') === null) localStorage.setItem('automate', 'false');

  if(localStorage.getItem('notUsd') === null) notUsd = localStorage.setItem('notUsd', 'false');

  console.log("automate: "+automate);
  console.log("notUsd: "+notUsd);

  function error(info) {
    var autoMsgTime;
    var autoMsgBtn;

    if(automate == 'true') {
        autoMsgTime = "Retrying in "+DELAY+"ms.";
        autoMsgBtn = "Stop retrying";
    }
    else autoMsgTime = "";

    if (info === undefined) info = "Cream experienced an internal error.<br>"+autoMsgTime;


    var dialog = ShowConfirmDialog("Cream Error", info, "Reconfigure", "Close", autoMsgBtn).done(function (choice) {
        if(choice == 'SECONDARY'){
            automate = localStorage.setItem('automate', 'false');
            location.reload();
        } else {
            GM_deleteValue("lambda");
            GM_deleteValue("apikey");
            localStorage.setItem('automate', 'false');
            history.go(0);
        }
    });

    if(automate == 'true') {
      setTimeout(function(){
            dialog.Dismiss();
            scrape();
          },DELAY);
    }
  }



  function next() {
    if((notUsd == 'true') && (window.location.search.indexOf('&cc=us&l=english') == -1)) window.location.search += '&cc=us&l=english';
    else scrape();
  }

  function pressbtn(){ //next page
        var classes = document.getElementsByClassName('pagebtn');
        var rightbtn;
        if(window.location.search.indexOf('page') == -1) rightbtn = classes[0];
        else rightbtn = classes[1];
        rightbtn.click();
        //SearchLinkClick(rightbtn); also works
        next();
    }

  function scrape() {
    try {
      var dialog = ShowBlockingWaitDialog("Cream", "<p id='cream_status'></p>");
      var logdiv = document.getElementById("cream_status");



      logdiv.innerText = "Gathering data...";

      var payload;

      try {
        payload = Array.prototype.slice.call(document.querySelectorAll("a.search_result_row[data-ds-appid]:not([data-ds-packageid])")).map((i) => {
          let g = {};
          g.appid = parseInt(i.getAttribute("data-ds-appid"));
          g.title = i.querySelector(".title").innerText.trim();

          let price;

          g.oprice = i.querySelector(".search_price").innerText.trim().split("\n")[0];
          g.oprice = isNaN(parseFloat(g.oprice.substring(1))) ? 0 : parseFloat(g.oprice.substring(1));

          if (i.querySelector(".search_price.discounted") === null) price = i.querySelector(".search_price").innerText.trim();
          else price = i.querySelector(".search_price.discounted").innerText.split("\n")[1].trim();

          if (price.indexOf("Free") > -1) price = 0.00;
          else if (price === "") price = -1;
          else if (price.indexOf("Season") > -1) price = -1; // temporary workaround for Series apps
          else if (price[0] != "$") {
            localStorage.setItem('notUsd', 'true');
            localStorage.setItem('automate', 'false');
            dialog.Dismiss();
            if(automate == 'true') location.reload();
            ShowConfirmDialog("Cream Error", "Your Steam Store prices are not in USD. Please log out and append ?cc=us&l=english to search URLs.", "Log out for me", "Close").done(function () {
              Logout();
              return;
            });
            throw price;
          }
          else price = parseFloat(price.substring(1));

          g.discount = parseInt(i.querySelector(".search_discount").innerText.replace("-", "").replace("%", ""));
          g.discount = isNaN(g.discount) ? 0 : g.discount;

          g.windows = i.querySelector(".win") === null ? false : true;
          g.macos = i.querySelector(".mac") === null ? false : true;
          g.linux = i.querySelector(".linux") === null ? false : true;

          g.htcvive = i.querySelector(".htcvive") === null ? false : true;
          g.oculusrift = i.querySelector(".oculusrift") === null ? false : true;
          g.windowsmr = i.querySelector(".windowsmr") === null ? false : true;

          let sum = i.querySelector(".search_review_summary");
          if (sum === null) g.reviews = "Not enough reviews";
          else g.reviews = sum.getAttribute("data-tooltip-html").split("<br>")[0];

          g.releasedate = i.querySelector(".search_released").innerText;

          g.releasedate = isNaN(new Date(g.releasedate).getDate()) ? "January 1, 2030" : g.releasedate; // handle unreleased apps without a release date.

          g.price = price;

          return g;
        });
      }
      catch (e) {
        return;
      }

      logdiv.innerText = "Submitting data for " + payload.length + " apps...";

      var pl = {
        key: key,
        payload: payload
      };

      console.log(pl);
      console.log(lambda);

      GM_xmlhttpRequest({
        method: "POST",
        url: lambda + "/submit",
        data: JSON.stringify(pl),
        headers: {
          "Content-Type": "application/json"
        },
        onload: function (data) {
          dialog.Dismiss();
          try {
            var rt = JSON.parse(data.responseText);
            if (rt === "Invalid API key") error(rt);
            else {
                var alert = ShowAlertDialog("Cream", rt.split("\n").join("<br>"));
                if(automate == 'true') {
                    setTimeout(function() {
                        alert.Dismiss();
                        pressbtn();
                    }, DELAY);
                }
            }
          }
          catch (e) {
            error();
          }
        }
      });
    }
    catch (e) { console.log(e); }
  }

  window.addEventListener("load", function () {
    if (GM_getValue("lambda") === undefined) {
      ShowPromptDialog("Cream", "Please enter the URL of the Cream Lambda.", "Save", "Cancel").done(function (result) {
        GM_setValue("lambda", result);
        history.go(0);
      });
    }
    else if (GM_getValue("apikey") === undefined) {
      ShowPromptDialog("Cream", "Please enter your Cream API key.", "Save", "Cancel").done(function (result) {
        GM_setValue("apikey", result);
        history.go(0);
      });
    }
    else {
      lambda = GM_getValue("lambda");
      key = GM_getValue("apikey");
      var elem = document.createElement("div");
      elem.setAttribute("class", "block");
      elem.innerHTML = "<a class='btnv6_blue_hoverfade btn_medium'><span><span style='position: relative; top: -5px;'>Submit to " + lambda.replace("https://", "").replace("http://", "") + "</span> <img src='https://s3.cutie.cafe/gaben.png' height=23 style='padding-top: 10px;'></img></span></a>";
      elem.addEventListener("click", scrape);
      jQuery(elem).insertBefore(jQuery(".rightcol").children()[0]);

      var auto = document.createElement("div");
      auto.setAttribute("class", "block");
      var autoBtnMsg;
      if(automate == 'true') autoBtnMsg = "Stop";
      else autoBtnMsg = "Automate";
      auto.innerHTML = "<a class='btnv6_blue_hoverfade btn_medium'><span>"+autoBtnMsg+"</span></a>";
      jQuery(auto).insertBefore(jQuery(".rightcol").children()[1]);
      auto.addEventListener("click", function () {
        if(automate == 'true') localStorage.setItem('automate', 'false');
        else localStorage.setItem('automate', 'true');
        history.go(0);
      });

      var resetButton = document.createElement("div");
      resetButton.setAttribute("style", "display: inline");
      resetButton.innerHTML = "<a href='#' id='reset_cream_button'>Reset Cream</a> &nbsp;|&nbsp; ";
      jQuery(resetButton).insertBefore(jQuery(".valve_links").children()[0]);

      document.getElementById("reset_cream_button").addEventListener("click", function (e) {
        e.preventDefault();
        GM_deleteValue("lambda");
        GM_deleteValue("apikey");
        localStorage.setItem('automate', 'false');
        history.go(0);
      });

      jQuery("a.search_result_row[data-ds-appid]:not([data-ds-packageid]) > .responsive_search_name_combined > .search_name > .title").append(" <a class='pick-submit' title='Submit as a SteamSal.es pick'>&#x2042;</a>").parent().removeClass("ellipsis");

      jQuery(".pick-submit").on("click", function (e) {
        e.preventDefault();
        var dialog = ShowBlockingWaitDialog("Cream", "Submitting pick, please wait...");

        GM_xmlhttpRequest({
          method: "POST",
          url: lambda + "/pick",
          data: JSON.stringify({ key: key, appId: e.currentTarget.parentElement.parentElement.parentElement.parentElement.getAttribute("data-ds-appid") }),
          headers: {
            "Content-Type": "application/json"
          },
          onload: function (data) {
            dialog.Dismiss();
            try {
              var rt = JSON.parse(data.responseText);
              if (rt === "Invalid API key") error(rt);
              else ShowAlertDialog("Cream", rt.split("\n").join("<br>"));
            }
            catch (e) {
              error();
            }
          }
        });
      });
      if(automate == 'true') next();
    }
  });
})();
