// ==UserScript==
// @name         Bestbuy btS
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  try to take over the world!
// @author       You
// @match        *://*/*
// @require      https://bradlytamaki.github.io/btS/bestbuy.js
// @icon         https://archives.bulbagarden.net/media/upload/3/32/Pok%C3%A9mon_Center_stores_logo.png
// @grant        none
// ==/UserScript==

// ====================================================
// MAIN
// ====================================================
docReady(async function () {
    'use strict';
  
    if (!get_isBestBuyHost) return;
    if (!get_isBestBuyProductPage()) return;
  
    log('running best buy');
  
    // auto-refresher
    btRefreshFn();
  
    quicklyAddToCart();
  });
  // ========================================================================================================
  // ========================================================================================================
  
  // ====================================================
  // quicklyAddToCart
  // ====================================================
  async function quicklyAddToCart() {
    let count = 0;
  
    const hasPokemonInProductTitle = await getHasPokemonInProductTitle();
  
    if(!hasPokemonInProductTitle) {
      return logWarn('No pokemon in title. exiting...')
    }
  
    const placeInCartInterval = setInterval(() => {
      log(`started script interval(${count})`);
      count++
  
      // click preorder
      const preOrderBtn = get_preOrderButton();
      if (preOrderBtn) {
        log('found preOrderBtn clicking...');
        doClickAfterEventListener(preOrderBtn);
        clearInterval(placeInCartInterval);
      }
  
      // click add to cart
      const addToCartBtn = get_addToCartButton();
      if(addToCartBtn) {
        log('found addToCartBtn clicking...');
        doClickAfterEventListener(addToCartBtn);
        clearInterval(placeInCartInterval);
      }
  
      // exit
      if (count > 30) {
        logWarn('bt-placeInCartInterval qATC_bestBuy ran more than 30 times.')
        clearInterval(placeInCartInterval);
        createAlertBox();
      }
    }, 100);
  }
  // ====================================================
  // btRefreshFn
  // ====================================================
  async function btRefreshFn() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop) => searchParams.get(prop),
    });
    const btRefresh = params.btRefresh != null;
    const soldOutButton = get_soldOutButton();
    const comingSoonButton = get_comingSoonButton();
    const addToCartButton = get_addToCartButton();
  
    if (btRefresh && addToCartButton) {
      log('found add to cart click');
      doClickAfterEventListener(addToCartButton);
  
      return;
    }
  
    if (btRefresh && (soldOutButton || comingSoonButton)) {
      log('executing btRefresh');
      await sleep(4000);
  
      const soldOutButton2ndAttempt = get_soldOutButton();
      const comingSoonButton2ndAttempt = get_comingSoonButton();
      if (soldOutButton2ndAttempt || comingSoonButton2ndAttempt) {
        log('refreshing bt-btRefresh ');
        location.reload();
      }
    }
  }
  
  // ====================================================
  // Util
  // ====================================================
  function log(msg, ...moreMsg) {
    return typeof msg === 'string'
      ? console.log(`btS: ${msg}`, ...moreMsg)
      : console.log('btS:', msg, ...moreMsg)
  }
  function logWarn(msg, ...moreMsg) {
    return typeof msg === 'string'
      ? console.warn(`btS: ${msg}`, ...moreMsg)
      : console.warn('btS:', msg, ...moreMsg)
  }
  function logError(msg, ...moreMsg) {
    if (typeof msg === 'string') {
      console.error(`btS: ${msg}`, ...moreMsg)
    } else {
      console.error('btS:', msg, ...moreMsg)
    }
    createAlertBox();
  
    throw Error();
  }
  
  function docReady(fn) {
    // see if DOM is already available
    if (document.readyState === "complete" || document.readyState === "interactive") {
      // call on next available tick
      setTimeout(fn, 1);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }
  
  function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
  
  function doUntil(fn, count = 0) {
    const result = fn();
  
    if (count > 60) {
      logWarn('doUntil looped more than 60 times. could not render out results')
      return null;
    }
  
    if (result) {
      return result;
    } else {
      return sleep(100).then(() => doUntil(fn, count + 1));
    }
  }
  
  function doClickAfterEventListener(element, count = 0) {
    if (!element) {
      const e = 'doClickAfterEventListener did not get a clickable element'
      logError(e);
    };
  
    if (count > 60) {
      logWarn('doClickAfterEventListener looped more than 60 times. Did not detect event listener')
      return null;
    }
  
    const onClickAvailable = typeof element.onclick == 'function';
  
    if (onClickAvailable) {
      element.click();
    } else {
      return sleep(100).then(() => doClickAfterEventListener(element, count + 1));
    }
  }
  
  function convertMoneyToNumber(str) {
    const num = Number(str?.substring(1))
  
    if (isNaN(num)) {
      logError(`Failed to convert money into number. Param used = '${str}'`);
      throw Error();
    }
  
    return num;
  }
  
  function get_isBestBuyHost() {
    return location.host === 'www.bestbuy.com'
  }
  
  function get_isBestBuyProductPage() {
    const routeStructure = location.pathname.split('/');
  
    const hasProductPagePrefix = location.pathname.substring(0, 6) === '/site/';
    const hasCorrectStructure = routeStructure.length === 4;
    const hasProductPageSuffix = routeStructure[routeStructure.length - 1].substr(-2) >= '.p';
  
    return hasProductPagePrefix & hasCorrectStructure & hasProductPageSuffix
  }
  
  async function getHasPokemonInProductTitle() {
    const productTitle = (await doUntil(get_productTitle) ?? '').toLowerCase();
  
    return (
      productTitle.indexOf('pokemon') >= 0 ||
      productTitle.indexOf('pokémon') >= 0
    );
  }
  
  
  // ====================================================
  // UI
  // ====================================================
  function createAlertBox(str = 'btS Could not execute') {
    const alertBox = document.createElement('div')
    alertBox.style.display = 'flex';
    alertBox.style.justifyContent = 'center';
    alertBox.style.alignItems = 'center';
    alertBox.style.fontSize = '80px';
    alertBox.style.fontWeight = 'bold';
    alertBox.style.height = '300px';
    alertBox.style.position = 'absolute';
    alertBox.style.top = '65px';
    alertBox.style.left = '100px';
    alertBox.style.right = '100px';
    alertBox.style.background = 'red';
    alertBox.style.zIndex = '9999';
    alertBox.addEventListener('click', (e) => { e.target.remove() });
    alertBox.textContent = str
  
    document.querySelector('body').appendChild(alertBox);
  }
  // ====================================================
  // checkout page getters
  // ====================================================
  function get_soldOutButton() {
    return document.querySelector('.c-button-lg[data-button-state="SOLD_OUT"]');
  }
  
  function get_comingSoonButton() {
    return document.querySelector('[data-test-id="coming-soon"]');
  }
  
  function get_preOrderButton() {
    return document.querySelector('.c-button-lg[data-button-state="PRE_ORDER"]');
  }
  
  function get_addToCartButton() {
    return document.querySelector('.c-button-lg[data-button-state="ADD_TO_CART"]');
  }
  
  function get_productTitle() {
    return document.querySelector('[itemprop="name"]')?.textContent;
  }