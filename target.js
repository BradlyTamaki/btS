// ==UserScript==
// @name         Target btS
// @namespace    http://tampermonkey.net/
// @version      git
// @description  try to take over the world!
// @author       You
// @match        *://*/*
// @require      https://bradlytamaki.github.io/btS/target.js
// @icon         https://archives.bulbagarden.net/media/upload/3/32/Pok%C3%A9mon_Center_stores_logo.png
// @grant        none
// ==/UserScript==


// lvl 0:     Do nothing
// lvl 0+bts: Max Qty
// lvl 1:     Add to cart
// lvl 2:     Max Qty + Add to cart
// lvl 3:     Max Qty + Add to cart + Checkout page
// lvl 4:     Max Qty + Add to cart + Place Order
const max = 4;

const goToCheckoutDelay = 500;
const testing_delay_between_action = 350;
const somethingWrongWithAddToCart = false;
const EXECUTE_BUY = true;
const subTotalBuffer = 5;

const SKU_151 = {
  "a-88897904": {
    product: "151 Booster Bundle",
    minPurchase: 35,
    lvl: max,
  },
  "a-88897899": {
    product: "151 ETB",
    minPurchase: 80,
    lvl: max,
  },
  "a-88897898": {
    product: "151 Zaptos EX Box",
    minPurchase: 30,
    lvl: max,
  },
  "a-1001539738": {
    product: "151 Blooming Waters Box",
    minPurchase: 85,
    lvl: max,
  },
};
const SKU_SURGING_SPARKS = {
  "a-91619929": {
    product: "Surging Sparks Booster Bundle",
    minPurchase: 35,
    lvl: max,
  },
};
const SKU_PRISMATIC_EVOLUTIONS = {
  "a-93954446": {
    product: "Prismatic Evolutions Booster Bundle",
    minPurchase: 40,
    lvl: max,
  },
  "a-94300053": {
    product: "Prismatic Evolutions Pouch Box",
    minPurchase: 40,
    lvl: max,
  },
  "a-93954435": {
    product: "Prismatic Evolutions ETB",
    minPurchase: 80,
    lvl: max,
  },
  "a-94300066": {
    product: "Prismatic Evolutions Binder Box",
    minPurchase: 40,
    lvl: max,
  },
  "a-94336414": {
    product: "Prismatic Evolutions Surprise Box",
    minPurchase: 40,
    lvl: max,
  },
  "a-94300058": {
    product: "Prismatic Evolutions Sylveon Sticker pack",
    minPurchase: 20,
    lvl: max,
  },
  "a-94300080": {
    product: "Prismatic Evolutions Glaceon Sticker pack",
    minPurchase: 40,
    lvl: max,
  },
  "a-94300075": {
    product: "Prismatic Evolutions Leafeon Sticker pack",
    minPurchase: 40,
    lvl: max,
  },
  "a-93803457": {
    product: "Prismatic Evolutions Poster Box",
    minPurchase: 40,
    lvl: max,
  },
};
const SKU_JOURNEY_TOGETHER = {
  "a-93859728": {
    product: "Journey Together Scrafty 3Pack",
    minPurchase: 20,
    lvl: max,
    skipQty: true,
  },
  "a-94300074": {
    product: "Journey Together Booster Bundle",
    minPurchase: 30,
    lvl: max,
  },
};
const TRACKED_SKU = {
  ...SKU_151,
  ...SKU_SURGING_SPARKS,
  ...SKU_PRISMATIC_EVOLUTIONS,
  ...SKU_JOURNEY_TOGETHER,
  "a-87077756": {
    product: "Crown Zenith ETB",
    minPurchase: 55,
    lvl: 4,
    skipQty: true,
  },
  "a-89432659": {
    product: "Paldean Fates ETB",
    minPurchase: 55,
    lvl: 4,
    skipQty: true,
  },
  // ====================================
  DEFAULT: {
    product: "DEFAULT PRODUCT INFO",
    minPurchase: Number.MAX_SAFE_INTEGER,
    lvl: 0,
  },
  POKEMON: {
    product: "DEFAULT POKEMON INFO",
    minPurchase: Number.MAX_SAFE_INTEGER,
    lvl: 0,
  },
};

// ====================================================
// MAIN
// ====================================================
docReady(async function () {
  "use strict";

  // exit case
  const isTargetRoute = location.host == "www.target.com";
  if (!isTargetRoute) return;

  // Verify required localStorage values
  const isMissingKeys = verifyLocalStoragePopulated();
  if (isMissingKeys) return;

  // We are on a PRODUCT page and we will execute:
  // 1. Max qty
  // 2. Add to cart
  // 3. Redirect to cart or checkout page
  if (get_pageType() === "PRODUCT") {
    const sku = get_productSKU();
    const productTitleIsPokemon =
      get_productTitle().toLowerCase()?.indexOf("pokemon") >= 0 ||
      get_productTitle().toLowerCase()?.indexOf("pokémon") >= 0;
    const productPrice = await doUntil(get_productPrice);
    let qty = 1;
    const isBtsTriggered = getUrlParams().bts === 'true'

    const PRODUCT_INFO = TRACKED_SKU[sku] ?? (productTitleIsPokemon ? TRACKED_SKU.POKEMON : TRACKED_SKU.DEFAULT);
    log("PRODUCT_INFO", PRODUCT_INFO);

    if (productPrice > PRODUCT_INFO.minPurchase)
      return logWarn(`Price detected is too high. Price is ${productPrice} and we are looking for ${PRODUCT_INFO?.minPurchase} or under.`);

    // Exit if lvl=0+!bts
    if (PRODUCT_INFO.lvl === 0 && !isBtsTriggered) return;

    // qty control has to be loaded in before adding to cart
    const qtyButton = await doUntil(get_qtyButton);

    if ((PRODUCT_INFO.lvl >= 2 || isBtsTriggered) && !PRODUCT_INFO.skipQty) {
      // clicks qty dropdown
      doClickAfterEventListener(qtyButton);

      await sleep(testing_delay_between_action);

      // clicks maximum allowed qty
      const maxQtyButton = await doUntil(get_maxQtyButton);
      doClickAfterEventListener(maxQtyButton);

      // update qty count for calculating safe checkout value
      qty = get_qtyCount(maxQtyButton);
    }

    // exit is lvl=0
    if (PRODUCT_INFO.lvl === 0) return;

    // store qty count for calculating safe checkout value
    sessionStorage.setItem("bts", JSON.stringify({ qty, productPrice }));

    // Flag to exit if something with wrong with ATC
    if (somethingWrongWithAddToCart) return;

    await sleep(testing_delay_between_action);
    // clicks add to cart
    const addToCartButton = await doUntil(get_addToCartOrPreorderButton);
    doClickAfterEventListener(addToCartButton);

    const modalHeaderText = await doUntil(get_modalHeaderTextContent);

    if (modalHeaderText.toLowerCase() != "added to cart") {
      return logError(`Failed to add cart? Modal header text = [${modalHeaderText}]`);
    }

    // Redirect to cart or checkout
    if (PRODUCT_INFO.lvl === 3) {
      setTimeout(() => (location.href = "/cart"), goToCheckoutDelay);
    } else if (PRODUCT_INFO.lvl === 4) {
      setTimeout(() => (location.href = "/checkout"), goToCheckoutDelay);
    }
  }

  if (get_pageType() === 'CART' && !get_cartIsEmpty()) {
    return location.href = '/checkout';
  }

  if (get_pageType() === "CHECKOUT") {
    // if prompted to login login
    makeSureToStayLoggedIn();

    // prompted to confirm address
    makeSureToConfirmShipping();

    // Perform calculation to make sure we have expected cart price before placing order
    const expectedSubtotal = get_expectedSubtotal();
    const actualSubTotal = await get_actualSubTotal();
    if (expectedSubtotal < actualSubTotal) {
      const styleOverrides = { fontSize: '40px' }
      return createAlertBox(`Calculation to the cart was different than expected. We might have unwanted items in the cart. expected ${expectedSubtotal} but actual was ${actualSubTotal}`, styleOverrides);
    }


    // Execute!!!!!
    repeatCheckoutClick();

    makeSureToConfirmCVV();
    makeSureToConfirmCC();
  }

  if (get_pageType() === "ORDER_CONFIRMATION") {
    clearBtsData();
  }
});

// ========================================================================================================
// ========================================================================================================

// ====================================================
// Util
// ====================================================
function log(msg, ...moreMsg) {
  return typeof msg === "string"
    ? console.log(`btS: ${msg}`, ...moreMsg)
    : console.log("btS:", msg, ...moreMsg);
}
function logWarn(msg, ...moreMsg) {
  return typeof msg === "string"
    ? console.warn(`btS: ${msg}`, ...moreMsg)
    : console.warn("btS:", msg, ...moreMsg);
}
function logError(msg, ...moreMsg) {
  if (typeof msg === "string") {
    console.error(`btS: ${msg}`, ...moreMsg);
  } else {
    console.error("btS:", msg, ...moreMsg);
  }
  clearBtsData();
  createAlertBox();
}

function docReady(fn) {
  // see if DOM is already available
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    // call on next available tick
    setTimeout(fn, 1);
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function doUntil(fn, count = 0) {
  const result = fn();

  if (count > 60) {
    logWarn("doUntil looped more than 60 times. could not render out results");
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
    const e = "doClickAfterEventListener did not get a clickable element";
    logError(e);
  }

  if (count > 60) {
    logWarn("doClickAfterEventListener looped more than 60 times. Did not detect event listener");
    return null;
  }

  const onClickAvailable = typeof element.onclick == "function";

  if (onClickAvailable) {
    element.click();
  } else {
    return sleep(100).then(() => doClickAfterEventListener(element, count + 1));
  }
}

function convertMoneyToNumber(str) {
  const num = Number(str?.substring(1));

  if (isNaN(num)) {
    logError(`Failed to convert money into number. Param used = '${str}'`);
    return Number.MAX_SAFE_INTEGER;
  }

  return num;
}

function clearBtsData() {
  log("clearing bts storage");
  sessionStorage.removeItem("bts");
}

function setNativeValueAndDispatchEvent(element, value) {
  if (!element) return;

  const valueSetter = Object.getOwnPropertyDescriptor(element, "value").set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value").set;

  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    valueSetter.call(element, value);
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function verifyLocalStoragePopulated() {
  const missingKeys = [
    'bts_cred_un',
    'bts_cred_pw',
    'bts_cvv',
    'bts_cc'
  ].filter((key) => localStorage.getItem(key) == null);

  if (missingKeys.length > 0) {
    createAlertBox(`Missing localStorage keys [${[missingKeys].join(',')}]`);
    return true;
  } else {
    return false;
  }
}

function getUrlParams() {
  return new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
}

// ====================================================
// UI
// ====================================================
function createAlertBox(str = "btS Could not execute", styleOverrides = {}) {
  const alertBox = document.createElement("div");
  alertBox.style.display = "flex";
  alertBox.style.justifyContent = "center";
  alertBox.style.alignItems = "center";
  alertBox.style.fontSize = "80px";
  alertBox.style.fontWeight = "bold";
  alertBox.style.height = "300px";
  alertBox.style.position = "absolute";
  alertBox.style.top = "65px";
  alertBox.style.left = "100px";
  alertBox.style.right = "100px";
  alertBox.style.padding = "10px";
  alertBox.style.background = "red";
  alertBox.style.zIndex = "9999";
  alertBox.addEventListener("click", (e) => {
    e.target.remove();
  });
  alertBox.textContent = str;

  Object.keys(styleOverrides).forEach((key) => alertBox.style[key] = styleOverrides[key]);

  document.querySelector("body").appendChild(alertBox);
}

// ====================================================
// Basic page getters
// ====================================================
function get_pageType() {
  const pathname = location.pathname.toLowerCase();

  if (pathname.substring(0, 3) === "/p/") {
    return "PRODUCT";
  } else if (pathname.substring(0, 9) === "/checkout") {
    return "CHECKOUT";
  } else if (pathname === "/cart") {
    return "CART";
  } else if (pathname === "/order-confirmation") {
    return "ORDER_CONFIRMATION";
  }
}

// ====================================================
// Product page fn
// ====================================================
function get_productTitle() {
  return (
    document.querySelector('[data-module-type="ProductDetailTitle"]')
      ?.textContent ?? ""
  );
}

function get_productPrice() {
  const productPriceElement = document.querySelector(
    '[data-test="product-price"]'
  );
  if (productPriceElement == null) return productPriceElement;

  const currency = productPriceElement.textContent.substring(0, 1);
  const productPrice = convertMoneyToNumber(productPriceElement.textContent);

  if (currency != "$") return Number.MAX_SAFE_INTEGER;

  return !isNaN(productPrice) ? productPrice : Number.MAX_SAFE_INTEGER;
}

function get_productSKU() {
  const pathname = location.pathname.toLowerCase();
  const pathnameArray = pathname.split("/");

  return pathnameArray[pathnameArray.length - 1];
}

function get_qtyButton() {
  return Array.from(
    document.querySelectorAll('[aria-label="Fulfillment"] button') ?? []
  ).filter((b) => {
    const text = b.textContent.toLowerCase().substring(0, 3);
    return text == "qty";
  })[0];
}

function get_maxQtyButton() {
  return document.querySelector(
    "[data-floating-ui-portal] li:nth-last-child(2) a"
  );
}

function get_qtyCount(maxQtyButton) {
  const qty = parseInt(maxQtyButton.textContent);

  if (isNaN(qty)) logError("Failed to parseInt on qty.");

  return qty;
}

function get_addToCartOrPreorderButton() {
  return Array.from(
    document.querySelectorAll('[aria-label="Fulfillment"] button') ?? []
  ).filter((b) => {
    const text = b.textContent.toLowerCase();
    return text === "add to cart" || text === "preorder";
  })[0];
}

function get_modalHeaderTextContent() {
  return document.querySelector('[data-test="modal-drawer-heading"]')?.textContent;
}

// ====================================================
// cart page fn
// ====================================================
function get_cartIsEmpty() {
  return document.querySelector('[data-test="boxEmptyMsg"]')?.textContent === 'Your cart is empty'
}

// ====================================================
// checkout page fn
// ====================================================
function get_placeYourOrder() {
  return document.querySelector('[data-test="placeOrderButton"]');
}

function get_checkoutSubTotal() {
  return document.querySelector(
    '[data-test="cart-summary-subTotal"] > *:last-child'
  );
}

function get_saveAndContinueShippingButton() {
  return document.querySelector(
    'button[data-test="save_and_continue_button_step_SHIPPING"]'
  );
}

function get_loginKeepMeSignedInButton() {
  return document.querySelector("input#keepMeSignedIn");
}

function get_loginUsernameInput() {
  return document.querySelector("input#username");
}

function get_loginPasswordInput() {
  return document.querySelector("input#password");
}

function get_loginSubmitButton() {
  return document.querySelector("button#login");
}

function get_CVVInput() {
  return document.getElementById("enter-cvv");
}

function get_cvvConfirmButton() {
  return document.querySelector('[data-test="confirm-button"]');
}

function get_creditCardInput() {
  return document.getElementById("credit-card-number-input");
}

function get_ccConfirmButton() {
  return document.querySelector('[data-test="verify-card-button"]');
}

function get_expectedSubtotal() {
  const defaultBtsValue = `{"qty":1,"productPrice":-${subTotalBuffer}}`;

  const { qty, productPrice } = JSON.parse(
    sessionStorage?.getItem("bts") ?? defaultBtsValue
  );

  return qty * productPrice + subTotalBuffer; // With subTotalBuffer
}

async function get_actualSubTotal() {
  const actualSubTotalElement = await doUntil(get_checkoutSubTotal);

  return convertMoneyToNumber(
    actualSubTotalElement?.textContent
  );
}

async function repeatCheckoutClick(count = 1) {
  if (count > 10) {
    createAlertBox("Failed to Checkout");
    return clearBtsData();
  }

  if (get_pageType() === "CHECKOUT") {
    const placeYourOrderButton = await doUntil(get_placeYourOrder);
    log(`[${count}] execute place your order!!!!!!!!!!!!!!!!!!!`);

    if (EXECUTE_BUY) doClickAfterEventListener(placeYourOrderButton);

    await sleep(1500).then(() => repeatCheckoutClick(count + 1));
  }
}

function makeSureToConfirmShipping(count = 1) {
  // make sure to confirm shipping if prompted for 3 seconds
  if (count > 30) return;

  const saveAndContinueButton = get_saveAndContinueShippingButton();

  if (saveAndContinueButton) {
    log("auto-confirming shipping");
    saveAndContinueButton.click();
  }

  sleep(100).then(() => makeSureToConfirmShipping(count + 1));
}

async function makeSureToStayLoggedIn(count = 1) {
  // make sure to stay logged in if prompted for 3 seconds
  if (count > 30) return;

  const loginPromptFound = get_loginSubmitButton();
  log(`loginPromptFound[${count}]`, loginPromptFound);
  const usernameInput = get_loginUsernameInput();
  const passwordInput = get_loginPasswordInput();
  if (loginPromptFound) {
    if (!passwordInput?.value) {
      const un = localStorage.getItem("bts_cred_un");
      const pw = localStorage.getItem("bts_cred_pw");

      setNativeValueAndDispatchEvent(usernameInput, un);
      setNativeValueAndDispatchEvent(passwordInput, pw);
    }
    const loginSubmitButton = await doUntil(get_loginSubmitButton);
    loginSubmitButton.click();
  }

  sleep(100).then(() => makeSureToStayLoggedIn(count + 1));
}

async function makeSureToConfirmCVV(count = 1) {
  // make sure to confirm CVV in if prompted for 10 seconds
  if (count > 100) return;

  const cvvInput = get_CVVInput();
  log(`cvvInput[${count}]`, cvvInput);

  if (cvvInput) {
    if (!cvvInput?.value) {
      const cvv = localStorage.getItem("bts_cvv");

      setNativeValueAndDispatchEvent(cvvInput, cvv);
    }
    const confirmCVVButton = await doUntil(get_cvvConfirmButton);
    confirmCVVButton.click();
  }

  sleep(100).then(() => makeSureToConfirmCVV(count + 1));
}

async function makeSureToConfirmCC(count = 1) {
  // make sure to confirm credit card in if prompted for 12 seconds
  if (count > 120) return;

  const creditCardInput = get_creditCardInput();
  log(`creditCardInput[${count}]`, creditCardInput);

  if (creditCardInput) {
    if (!creditCardInput?.value) {
      const creditCardNumber = localStorage.getItem("bts_cc");

      setNativeValueAndDispatchEvent(creditCardInput, creditCardNumber);
    }
    const confirmCCButton = await doUntil(get_ccConfirmButton);
    confirmCCButton.click();
  }

  sleep(100).then(() => makeSureToConfirmCC(count + 1));
}


