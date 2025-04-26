// first go to pokedata.io and open the set you would like to gen
// something like "https://www.pokedata.io/set/Surging+Sparks?s=4"

// 1. grab card class (this will be the total # of cards)
//      Array should match the card count
// 2. grab cardNumber which will be the element that holds the card number
// 3. grab cardName which will be the element that holds the card name


const card = 'mui-style-dk0tj5'
const cardName = 'mui-style-1oo6r3y';
const cardNumber = 'mui-style-1w1vbxm';

const cards = Array.from(document.querySelectorAll(`.${card}`));

const masterSet = cards.map((card) => {
    const number = card?.querySelector?.(`.${cardNumber}`)?.textContent;
    const name = card?.querySelector?.(`.${cardName}`)?.textContent;
    const isValid = number != null && name != null;
    
    return isValid ? { name, number } : null;
});

console.log(masterSet);