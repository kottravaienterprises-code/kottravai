const fetch = require('node-fetch') || global.fetch;
async function run() {
    try {
        const url = 'https://script.google.com/macros/s/AKfycbzppVr73fwe1yspAfDMnQvW3Dm4wTWda_ABJiwdsxyq1gp9-Z4_Qb_EYbBqiYxYsyJ7/exec';
        const r1 = await fetch(url);
        const t1 = await r1.text();
        console.log("GET output:", t1.slice(0, 500));
        
        const r2 = await fetch(url + '?action=export');
        const t2 = await r2.text();
        console.log("GET ?action=export output:", t2.slice(0, 500));
        
        const r3 = await fetch(url + '?action=get_data');
        const t3 = await r3.text();
        console.log("GET ?action=get_data output:", t3.slice(0, 500));

    } catch(e) { console.error(e); }
}
run();
