(function(){
	try {
    var payload = Array.prototype.slice.call(document.querySelectorAll("a.search_result_row")).map((i) => {
      let g = {};
      g.appid = parseInt(i.getAttribute("data-ds-appid"));
      g.title = i.querySelector(".title").innerText.trim();

      let price;
      if( i.querySelector(".search_price.discounted") === null ) price = i.querySelector(".search_price").innerText.trim();
      else price = i.querySelector(".search_price.discounted").innerText.split("\n")[1].trim();
      
      if( price.indexOf("Free") > -1 ) price = 0.00;
      else if( price === "" ) price = -1;
      else if( price[0] != "$" ) throw price;
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
      if( sum === null ) g.reviews = "Not enough reviews";
      else g.reviews = sum.getAttribute("data-tooltip-html").split("<br>")[0];

      g.releasedate = i.querySelector(".search_released").innerText;

      g.price = price;

      return g;
    });
  } catch(e){ console.log(e); }
})();
