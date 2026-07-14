const fs = require('fs');
const path = require('path');
const db = require('./db');

(async()=>{
  try{
    const dir = path.join(__dirname);
    const targets = ['soap','necklace','coconut shell','terracotta'];
    const mains = fs.readdirSync(dir).filter(f=>f.startsWith('search_debug_main_')).map(f=>path.join(dir,f));
    const files = mains.sort((a,b)=>fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
    const matched = {};
    for(const t of targets){
      for(let i = files.length-1;i>=0;i--){
        const f = files[i];
        const content = fs.readFileSync(f,'utf8');
        if((content.indexOf('"params"')!==-1) && (content.indexOf('"'+t+'"')!==-1 || content.indexOf("POSITION('"+t+"' IN")!==-1)){
          matched[t]=JSON.parse(content);
          break;
        }
      }
      if(!matched[t]) console.log('No debug main file found for',t);
    }

    for(const t of targets){
      if(!matched[t]){console.log('Skipping',t); continue;}
      const q = matched[t].queryText;
      const p = matched[t].params || [];
      try{
        console.log('Running EXPLAIN for',t);
        const res = await db.query('EXPLAIN (ANALYZE, BUFFERS, VERBOSE) ' + q, p);
        const out = res.rows.map(r=>Object.values(r).join(' ')).join('\n');
        fs.writeFileSync(path.join(dir,'explain_'+t.replace(/\s+/g,'_')+'.txt'), out);
        console.log('Saved explain for',t);
      } catch(e){
        console.error('EXPLAIN failed for',t,e.message);
      }
      await new Promise(r=>setTimeout(r,200));
    }
  } catch(e){ console.error('Run explain script failed', e.message); process.exit(1);} 
  process.exit(0);
})();
