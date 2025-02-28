// ==UserScript==
// @name         Discord bts
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  try to take over the world!
// @author       You
// @match        *://*/*
// @icon         https://discord.com/assets/favicon.ico
// @grant        none
// ==/UserScript==
// https://discord.com/channels/1296182793407168614/*

const P0 = 'P0', P1 = 'P1', P2 = 'P2', P3 = 'P3';
const tickRate = 3000;
const garbageCollectionTrigger = 100
const executeOffsetValue = 15 * 1000
window.btsExecuteOffsetDateTime = new Date();
window.msgMap = null;
window.btsPrevUsername = '';
window.btsQueue = {
  P0: new Map(),
  P1: new Map(),
  P2: new Map(),
  P3: new Map(),
}

const SKU = {
  93954446: P0,   // Prismatic 6pk
  94300053: P0,   // Prismatic Pouch Box
  93954435: P0,   // Prismatic ETB
  94300066: P0,   // Prismatic Binder Box 5pk
  94336414: P0,   // Prismatic Supprise Box 4pk
  94300058: P0,   // Prismatic Sylveon 3pk
  94300080: P0,   // Prismatic Glaceon 3pk
  94300075: P0,   // Prismatic Leafeon 3pk
  93803457: P0,   // Prismatic poster box 3pk
  88897904: P1,   // 151 6pk
  88897899: P1,   // 151 ETB
  1001539738: P1, // 151 Blooming Waters Box 12pk
  88897898: P2,   // 151 Zaptos EX Box 4pk
}

init();
async function init() {
  await sleep(4 * 1000);
  log('initializing bts')

  const enableBts = uiEnableBts();
  const nav = getNav();

  nav.appendChild(enableBts);
}

function tickFn() {
  log(`tickFn() @ ${tickRate}ms [${window.msgMap.size}/${garbageCollectionTrigger}]`);

  const newMessages = findNewMessages();

  newMessages.forEach((message, key) => {
    log(`New msg found @ ${(new Date()).toLocaleString()}`, message);

    addBtsQueue(message);

    window.msgMap.set(key, message);
  });

  const isWithinExecuteOffset = new Date() >= window.btsExecuteOffsetDateTime;
  if (isWithinExecuteOffset) {
    const next = getBtsNextQueue();
    if (next) {
      log(`executing for: ${next.url}`);

      window.open(next.url);
      window.btsExecuteOffsetDateTime = new Date(+new Date() + executeOffsetValue);
    }
  } else if (getItemsInBtsQueue() > 0) {
    const secondsToNextRun = Math.ceil((+window.btsExecuteOffsetDateTime - +new Date()) / 1000);
    log(`holding off executing.`, {
      queueCount: getItemsInBtsQueue(),
      nextRun:`${secondsToNextRun}secs`
    });
  }

  maybeGarbageCollection();
}

// ================================
// Channel Util
// ================================
function initExistingMessages() {
  const msgElements = getMessagesFromAnyChannel();

  const msgData = msgElements.map((msgElement) => {
    const key = msgElement?.id;

    return [key, parseMessage(msgElement)];
  });

  return new Map(msgData)
}

function getMessagesFromAnyChannel() {
  return Array.from(document?.querySelectorAll?.('[data-list-id="chat-messages"] > li') ?? []);
}
function getMessagesFromTargetChannel() {
  return Array.from(document?.querySelectorAll?.('[aria-label="Messages in target"] > li') ?? []);
}

function maybeGarbageCollection() {
  if (window.msgMap.size > garbageCollectionTrigger) {
    const deleteCount = new Array(window.msgMap.size - garbageCollectionTrigger).fill(0);

    deleteCount.forEach(() => {
      const fifo_key = window.msgMap.keys().next().value;

      window.msgMap.delete(fifo_key);
    });
  }
}

function addBtsParam(url) {
  const newUrl = new URL(url);
  newUrl.searchParams.append('bts', true);

  return newUrl.href;
}

// ================================
// Msg Util
// ================================
function findNewMessages() {
  const newMessagesArray = [];
  const newMessagesMap = new Map();
  const msgElements = getMessagesFromAnyChannel();

  for (let i = msgElements.length - 1; i >= 0; i--) {
    const msgElement = msgElements[i];

    if (window.msgMap.has(msgElement?.id)) break;

    newMessagesArray.push([msgElement?.id, msgElement])
  }

  while (newMessagesArray.length != 0) {
    const [key, msgElement] = newMessagesArray.pop();

    newMessagesMap.set(key, parseMessage(msgElement));
  }

  return newMessagesMap;
}

function parseMessage(element) {
  const username = getFromMessage_username(element) ?? window.btsPrevUsername;
  window.btsPrevUsername = username;

  return getIsPokeNotifyBot(username)
    ? {
      username,
      title: getFromMessage_title(element),
      url: addBtsParam(getFromMessage_url(element)),
      sku: getFromMessage_sku(element)
    }
    : { username }
}

function getIsPokeNotifyBot(username) {
  return username === 'PokeNotify Bot' || username === 'PokeNotify Monitors'
}

function getFromMessage_username(element) {
  return element?.querySelector?.('h3 [role="button"]')?.textContent;
}

function getFromMessage_title(element) {
  const classNameId = findMessageClassId(element);

  return element?.querySelector?.(`.embedTitle__${classNameId}`).textContent
}

function getFromMessage_sku(element) {
  const classNameId = findMessageClassId(element);

  const embedFields = Array.from(element?.querySelectorAll?.(`.embedField__${classNameId}`));

  return getEmbedFieldValue(embedFields, 'SKU');
}

function getFromMessage_url(element) {
  return element?.querySelector('a')?.href;
}

function getEmbedFieldValue(embedFields, name) {
  return embedFields?.find((embedField) =>
    embedField?.firstChild?.textContent === name)?.lastChild?.textContent
}

function findMessageClassId(element) {
  const prefix = 'embedFull__';

  const articleClassNames = Array.from(element?.querySelector?.('article')?.classList ?? []);
  const embedFullClassName = articleClassNames.find((className) => className.substring(0, prefix.length) === prefix) ?? '';

  return embedFullClassName.split('_')[embedFullClassName.split('_').length - 1]
}

function getNav() {
  return document?.querySelector('nav[aria-label="PokeNotify (server)"]');
}

// ================================
// Queue
// ================================
function addBtsQueue(message) {
  const priority = SKU[message.sku] ?? P3;

  if (message.url) {
    log('adding to queue!');
    window.btsQueue[priority].set(message.url, message);
  }
}

function getItemsInBtsQueue() {
  const queueSize =
    window.btsQueue.P0.size +
    window.btsQueue.P1.size +
    window.btsQueue.P2.size +
    window.btsQueue.P3.size;

  return queueSize
}

function getBtsNextQueue() {
  if (window.btsQueue.P0.size > 0) return grabFromQueue(window.btsQueue.P0);
  if (window.btsQueue.P1.size > 0) return grabFromQueue(window.btsQueue.P1);
  if (window.btsQueue.P2.size > 0) return grabFromQueue(window.btsQueue.P2);
  if (window.btsQueue.P3.size > 0) return grabFromQueue(window.btsQueue.P3);
  return null;

  function grabFromQueue(map) {
    const [key, value] = map.entries().next().value;
    map.delete(key);

    return value
  }
}


// ================================
// Util
// ================================
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

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// ================================
// UI
// ================================
function btsCreateBlocker(intervald) {
  const channelBlocker = uiChannelBlocker(intervald);
  const nav = document.querySelector('nav[aria-label="PokeNotify (server)"]');

  nav.appendChild(channelBlocker);
}

function btsRemoveBlocker() {
  document.querySelector('.btsChannelBlocker').remove();
}

function uiEnableBts() {
  const enableBts = document.createElement('div');
  enableBts.classList.add('btsEnableBts');
  enableBts.style.display = 'flex';
  enableBts.style.justifyContent = 'center';
  enableBts.style.alignItems = 'center';
  enableBts.style.background = '#555'
  enableBts.style.color = '#DDD'
  enableBts.style.fontWeight = '500'
  enableBts.style.position = 'absolute';
  enableBts.style.top = '48px';
  enableBts.style.left = '8px';
  enableBts.style.right = '8px';
  enableBts.style.height = '24px';
  enableBts.style.border = '2px solid #222';
  enableBts.style.borderRadius = '8px'
  enableBts.style.zIndex = 8;

  enableBts.textContent = 'enable btS';
  enableBts.addEventListener('click', () => {
    window.msgMap = initExistingMessages('');

    const intervald = setInterval(tickFn, tickRate);

    btsCreateBlocker(intervald);
  });

  return enableBts;
}

function uiChannelBlocker(intervald) {
  const channelBlocker = document.createElement('div');
  channelBlocker.classList.add('btsChannelBlocker');
  channelBlocker.style.display = 'flex';
  channelBlocker.style.justifyContent = 'center';
  channelBlocker.style.alignItems = 'center';
  channelBlocker.style.color = '#CCC';
  channelBlocker.style.fontSize = '36px';
  channelBlocker.style.fontWeight = '600';
  channelBlocker.style.position = 'absolute';
  channelBlocker.style.top = 0;
  channelBlocker.style.right = 0;
  channelBlocker.style.bottom = 0;
  channelBlocker.style.left = 0;
  channelBlocker.style.zIndex = 9;
  channelBlocker.style.backdropFilter = 'blur(1.5px)';

  channelBlocker.textContent = 'btS running';
  channelBlocker.addEventListener('click', () => {
    if(confirm('Do you want bts to stop?')){
      btsRemoveBlocker();
      clearInterval(intervald);
    }
  });

  return channelBlocker;
}
