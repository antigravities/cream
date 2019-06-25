//// ==UserScript==
// @name         Submit to Cream
// @namespace    https://steamsal.es/
// @version      0.3.16
// @description  Submit Steam Store searches to a Cream API server
// @author       Cutie Cafe
// @match        *://store.steampowered.com/search*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

// 0.2.6
// - oops

/* eslint radix: "as-needed" */
/* global ShowConfirmDialog, GM_getValue, GM_setValue, GM_deleteValue, GM_xmlhttpRequest, history, ShowBlockingWaitDialog, ShowAlertDialog, ShowPromptDialog, jQuery, Logout */

(function () {
  var lambda;
  var key;
  var auto;

  function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split('=');
      if (decodeURIComponent(pair[0]) == variable) {
        return decodeURIComponent(pair[1]);
      }
    }
    console.log('Query variable %s not found', variable);
    return null;
  }

  function error(info) {
    if (info === undefined) info = "Cream experienced an internal error.";

    ShowConfirmDialog("Cream Error", info, "Close", "Reconfigure").fail(function () {
      GM_deleteValue("lambda");
      GM_deleteValue("apikey");
      location.reload();
    });
  }

  function scrape(callback) {
    try {
      var dialog = ShowBlockingWaitDialog("Cream", "<p id='cream_status'></p>");
      var logdiv = document.getElementById("cream_status");

      logdiv.innerText = "Gathering data...";

      var payload;

      try {
        payload = Array.prototype.slice.call(document.querySelectorAll("a.search_result_row[data-ds-appid]:not([data-ds-packageid])")).map((i) => {
          let g = {};
          g.appid = parseInt(i.getAttribute("data-ds-appid"));
          g.title = i.querySelector(".title").innerText.trim().replace(" SubmitPick", "");

          let price;

          if (i.querySelector(".search_price.discounted") === null) price = i.querySelector(".search_price").innerText.trim();
          else price = i.querySelector(".search_price.discounted").innerText.split("\n")[1].trim();

          if (price.indexOf("Free") > -1) price = 0.00;
          else if (price === "") price = -1;
          else if (price.indexOf("Season") > -1) price = -1; // temporary workaround for Series apps
          else if (price[0] != "$" && price[price.length-1] != "€") {
            dialog.Dismiss();
            ShowConfirmDialog("Cream Error", "Your Steam Store prices are not in USD or EUR. Please log out and append ?cc=us&l=english or ?cc=be&l=english to search URLs.", "Log out for me", "Close").done(function () {
              Logout();
              return;
            });
            throw price;
          }
          else {
            g.currency = price[0] == "$" ? "usd" : "eur";
            g.price = price[0] == "$" ? parseFloat(price.substring(1)) : parseFloat(price.replace(",", ".").substring(0, price.length-1));

            g.oprice = i.querySelector(".search_price").innerText.trim().split("\n")[0];

            if( g.currency == "usd" ) g.oprice = isNaN(parseFloat(g.oprice.substring(1))) ? 0 : parseFloat(g.oprice.substring(1));
            else g.oprice = isNaN(parseFloat(g.oprice.replace(",", ".").substring(0, g.oprice.length-1))) ? 0 : parseFloat(g.oprice.replace(",", ".").substring(0, g.oprice.length-1));
          }

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

          // failsafes
          if( ! g.currency ) g.currency = "usd";
          if( ! g.oprice ) g.oprice = 0;
          if( ! g.price ) g.price = 0;

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
          console.log(data);
          try {
            var rt = JSON.parse(data.responseText);
            if (rt === "Invalid API key") error(rt);
            else ShowAlertDialog("Cream", rt.split("\n").join("<br>"));
            if (callback !== undefined && rt.includes("0 warning")) {
              try {
                callback();
              } catch (e) {
                console.log(e);
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

  setTimeout(function () {
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
      if (getQueryVariable("autoScrap") === "true") {
        if (typeof jQuery == 'undefined') { // Reload if Steam broke
          setTimeout(location.reload, 1000);
          return;
        }
      }
      lambda = GM_getValue("lambda");
      key = GM_getValue("apikey");

      // checkbox
      var chkbox = document.createElement("div");
      chkbox.classList.add("block");
      chkbox.innerHTML = "<a class='btnv6_blue_hoverfade btn_medium'><span><span style='position: relative; top: -5px;'>Auto-scrape</span></span></a>";
      var autoScrap = (e) => {
        setTimeout(() => {
          jQuery = unsafeWindow.jQuery;
          jQuery(".newmodal_buttons").children().first().click();
          scrape(() => {
            var current_url = document.location;
            var current_page = parseInt(getQueryVariable("page"));
            var new_url = current_url.toString().replace("page=" + current_page, "page=" + (current_page + 1));
            console.log(current_url, current_page, new_url);
            if (!new_url.includes("autoScrap=true")) {
              new_url = new_url + "&autoScrap=true";
            }
            console.log(new_url);
            location.replace(new_url);
          });
        }, 2000);
      };
      chkbox.addEventListener("click", autoScrap);
      if (getQueryVariable("autoScrap") === "true") {
        autoScrap(null);
      }

      jQuery(chkbox).insertBefore(jQuery(".rightcol").children()[0]);



      // base elem
      var elem = document.createElement("div");
      elem.setAttribute("class", "block");

      elem.innerHTML = "<a class='btnv6_blue_hoverfade btn_medium'><span><span style='position: relative; top: -5px;'>Submit to " + lambda.replace("https://", "").replace("http://", "") + "</span> <img src='https://s3.cutie.cafe/gaben.png' height=23 style='padding-top: 10px;'></img></span></a>";
      elem.addEventListener("click", scrape);
      jQuery(elem).insertBefore(jQuery(".rightcol").children()[0]);

      var resetButton = document.createElement("div");
      resetButton.setAttribute("style", "display: inline");
      resetButton.innerHTML = "<a href='#' id='reset_cream_button'>Reset Cream</a> &nbsp;|&nbsp; ";
      jQuery(resetButton).insertBefore(jQuery(".valve_links").children()[0]);

      document.getElementById("reset_cream_button").addEventListener("click", function (e) {
        e.preventDefault();
        GM_deleteValue("lambda");
        GM_deleteValue("apikey");
        history.go(0);
      });

      jQuery("a.search_result_row[data-ds-appid]:not([data-ds-packageid]) > .responsive_search_name_combined > .search_name > .title").append(" <a class='pick-submit' title='Submit as a SteamSal.es pick'>SubmitPick</a>").parent().removeClass("ellipsis");

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


    }
  }, 2000);
})();
