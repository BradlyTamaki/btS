// ==UserScript==
// @name         Discord bts
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  try to take over the world!
// @author       You
// @match        https://discord.com/channels/1296182793407168614/*
// @icon         https://discord.com/assets/favicon.ico
// @grant        none
// ==/UserScript==

const P0 = 'P0', P1 = 'P1', P2 = 'P2', P3 = 'P3';
const tickRate = 1000;
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

  // Find new message and add to msgMap
  const newMessages = findNewMessages();
  newMessages.forEach((message, key) => {
    log(`New msg found @ ${(new Date()).toLocaleString()}`, message);

    addBtsQueue(message);

    window.msgMap.set(key, message);
  });

  // Re-generate bts item ui
  if(newMessages.size > 0) generateBtsItemsList();

  // Execute next item in btsQueue
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
      nextRun: `${secondsToNextRun}secs`
    });
  }

  // Cleanup after tickFn is complete
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
  
  return getIsPokeNotifyBot(username) && getFromMessage_url(element)
    ? {
      username,
      title: getFromMessage_title(element),
      url: addBtsParam(getFromMessage_url(element)),
      sku: getFromMessage_sku(element),
      img: getFromMessage_img(element),
      ts: getFromMessage_ts(element),
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

  return element?.querySelector?.(`.embedTitle__${classNameId}`)?.textContent
}

function getFromMessage_sku(element) {
  const classNameId = findMessageClassId(element);

  const embedFields = Array.from(element?.querySelectorAll?.(`.embedField__${classNameId}`));

  return getEmbedFieldValue(embedFields, 'SKU');
}

function getFromMessage_img(element) {
  return element.querySelector('article img')?.src;
}

function getFromMessage_ts(element) {
  return element.querySelector('time')?.ariaLabel;
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
// UI functions
// ================================

function generateBtsItemsList() {
  const listElement = document.getElementById('btsItemList');

  listElement.innerHTML = '';

  const items = removeUselessItems(window.msgMap)
  const last8Items = items.slice(items.length - 8);

  last8Items.forEach((msgObj, _key) => {
    if (msgObj?.url) {
      listElement.appendChild(uiBtsItem(msgObj));
    }
  });
}

function removeUselessItems(msgMap) {
  return Array.from(msgMap)
    .filter(([_key, msg]) => msg?.url != null)
    .map(([_key, msg]) => msg);
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
  enableBts.style.cursor = 'pointer';

  enableBts.textContent = 'enable btS';
  enableBts.addEventListener('click', () => {
    window.msgMap = initExistingMessages('');

    const intervald = setInterval(tickFn, tickRate);

    btsCreateBlocker(intervald);
    generateBtsItemsList();
  });

  return enableBts;
}

function uiChannelBlocker(intervald) {
  const channelBlocker = document.createElement('div');
  channelBlocker.style.display = 'flex';
  channelBlocker.style.justifyContent = 'center';
  channelBlocker.style.alignItems = 'center';
  channelBlocker.style.flexDirection = 'column';
  channelBlocker.style.color = '#CCC';
  channelBlocker.style.fontWeight = '600';
  channelBlocker.style.fontSize = '12px';
  channelBlocker.style.position = 'absolute';
  channelBlocker.style.top = 0;
  channelBlocker.style.right = 0;
  channelBlocker.style.bottom = 0;
  channelBlocker.style.left = 0;
  channelBlocker.style.zIndex = 9;
  channelBlocker.style.backdropFilter = 'blur(1.5px)';
  channelBlocker.classList.add('btsChannelBlocker');

  channelBlocker.appendChild(uiChannelBlockerTitle());
  channelBlocker.appendChild(uiBtsItemList());

  channelBlocker.addEventListener('click', () => {
    if (confirm('Do you want bts to stop?')) {
      btsRemoveBlocker();
      clearInterval(intervald);
    }
  });

  return channelBlocker;
}

function uiChannelBlockerTitle() {
  const channelBlockerTitle = document.createElement('h1');
  channelBlockerTitle.style.display = 'flex';
  channelBlockerTitle.style.justifyContent = 'center';
  channelBlockerTitle.style.fontSize = '30px';
  channelBlockerTitle.style.padding = '60px 0 20px 0';
  channelBlockerTitle.classList.add('btsChannelBlocker');
  channelBlockerTitle.textContent = 'btS running';

  return channelBlockerTitle
}

function uiBtsItem(msgObj) {
  const item = document.createElement('a');
  item.style.display = 'flex';
  item.style.alignItems = 'center';
  item.style.width = '100%';
  item.style.gap = '7px';
  item.classList.add('btsItem');
  item.href = msgObj?.url;
  item.target = '_blank'

  // img
  const itemImg = document.createElement('img');
  itemImg.style.height = '45px';
  itemImg.src = msgObj?.img;

  // title
  const itemTitle = uiBtsItemRight(msgObj);

  item.appendChild(itemImg);
  item.appendChild(itemTitle);

  item.addEventListener('click', (e) => e?.stopPropagation())

  return item;
}

function uiBtsItemRight(msgObj) {
  const itemListRight = document.createElement('div');
  itemListRight.style.display = 'flex';
  itemListRight.style.flexDirection = 'column';

  // top
  const top = document.createElement('span');
  top.textContent = msgObj?.ts;

  // bottom
  const bottom = document.createElement('h4');
  bottom.style.flexGrow = '1';
  bottom.style.color = '#FFF';
  bottom.textContent = msgObj?.title;

  itemListRight.appendChild(top);
  itemListRight.appendChild(bottom);

  return itemListRight;
}

function uiBtsItemList() {
  const itemList = document.createElement('div');
  itemList.style.display = 'flex';
  itemList.style.alignItems = 'center';
  itemList.style.justifyContent = 'center';
  itemList.style.flexDirection = 'column';
  itemList.style.gap = '7px';
  itemList.style.paddingLeft = '7px';
  itemList.style.height = '100%';

  itemList.id = 'btsItemList';

  return itemList
}