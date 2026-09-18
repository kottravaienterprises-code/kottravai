const fetch = require('node-fetch') || global.fetch;
async function run() {
    try {
        const url = 'https://script.google.com/macros/s/AKfycbzppVr73fwe1yspAfDMnQvW3Dm4wTWda_ABJiwdsxyq1gp9-Z4_Qb_EYbBqiYxYsyJ7/exec';
        const actions = ['debug', 'info', 'config', 'status', 'ping', 'test'];
        for (const act of actions) {
            const r = await fetch(url + '?action=' + act);
            const t = await r.text();
            console.log("action=" + act + ":", t.slice(0, 150));
        }
    } catch(e) { console.error(e); }
}
run();
