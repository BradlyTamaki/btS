const MINUTE = 1000 * 60;
const NEXT_20_MIN = new Date(+new Date() + 20 * MINUTE);

setInterval(() => {
    const a = document.querySelectorAll('a[href]');
    const rng = Math.floor(Math.random() * a.length);

    if(new Date() < NEXT_20_MIN)
        window.open(a[rng].href);
}, 29*1000);
