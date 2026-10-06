import { STORES } from './stores.js';
import { checkStore } from './checker.js';

const json=(v,status=200)=>new Response(JSON.stringify(v,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function checkAll(){
  const results=await Promise.all(STORES.map(s=>checkStore(s)));
  return results.sort((a,b)=>({available:0,unknown:1,soldout:2}[a.status]-{available:0,unknown:1,soldout:2}[b.status] || a.priority-b.priority));
}
export default {
  async fetch(request,env){
    const u=new URL(request.url);
    if(u.pathname==='/api/stores') return json(STORES);
    if(u.pathname==='/api/check') return json({generatedAt:new Date().toISOString(),results:await checkAll()});
    if(u.pathname.startsWith('/api/check/')){
      const id=decodeURIComponent(u.pathname.split('/').pop()); const s=STORES.find(x=>x.id===id);
      return s?json(await checkStore(s)):json({error:'not found'},404);
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(){
    // Cron warms/checks endpoints. Persistent history/notifications can be added with KV/D1 later.
    await checkAll();
  }
};
