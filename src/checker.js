const SOLD = [
  /SOLD\s*OUT/i,/품절/i,/일시\s*품절/i,/재고\s*0\s*개/i,/한정수량\s*0\s*개/i,
  /판매\s*종료/i,/예약\s*판매\s*종료/i,/재입고\s*알림/i,/예약\s*마감/i
];
const AVAILABLE = [
  /재고\s*[1-9][0-9]*\s*개/i,/잔여\s*수량\s*[1-9][0-9]*/i,/구매\s*가능/i,
  /주문\s*가능/i,/예약\s*접수\s*중/i,/판매\s*중/i
];

export function classify(html, httpStatus=200){
  if (httpStatus < 200 || httpStatus >= 400) return {status:'unknown',reason:`HTTP ${httpStatus}`};
  const text = String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
  const sold = SOLD.find(r=>r.test(text));
  if (sold) return {status:'soldout',reason:'명시적 품절 신호 확인'};
  const avail = AVAILABLE.find(r=>r.test(text));
  if (avail) return {status:'available',reason:'명시적 구매/재고 신호 확인'};
  return {status:'unknown',reason:'명시적 재고 수량/구매 가능 근거 없음'};
}

function cleanError(e){
  const msg=String(e?.message||e||'알 수 없는 오류');
  if (/too many redirects|redirect/i.test(msg)) return '조회 실패 · 리다이렉트 차단';
  if (/timeout|timed out|abort/i.test(msg)) return '조회 실패 · 응답 시간 초과';
  if (/403|forbidden/i.test(msg)) return '조회 실패 · 판매처 접근 차단';
  return '조회 실패 · 판매처 응답 오류';
}
function norm(u){try{const x=new URL(u);x.hash='';return x.toString()}catch{return String(u)}}

async function fetchWithRedirectGuard(url, fetcher, options, maxRedirects=4){
  let current=url, seen=new Set();
  for(let i=0;i<=maxRedirects;i++){
    const key=norm(current);
    if(seen.has(key)) throw new Error('redirect loop');
    seen.add(key);
    const r=await fetcher(current,{...options,redirect:'manual'});
    if(![301,302,303,307,308].includes(r.status)) return r;
    const loc=r.headers.get('location');
    if(!loc) return r;
    current=new URL(loc,current).toString();
  }
  throw new Error('too many redirects');
}

export async function checkStore(store, fetcher=fetch){
  const started=Date.now();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const r=await fetchWithRedirectGuard(store.url,fetcher,{
      signal:controller.signal,
      headers:{
        'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36',
        'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language':'ko-KR,ko;q=0.9,en;q=0.5'
      }
    });
    const html=await r.text();
    const c=classify(html,r.status);
    return {...store,...c,httpStatus:r.status,checkedAt:new Date().toISOString(),elapsedMs:Date.now()-started,finalUrl:r.url||store.url};
  }catch(e){
    return {...store,status:'unknown',reason:cleanError(e),checkedAt:new Date().toISOString(),elapsedMs:Date.now()-started};
  }finally{clearTimeout(timer)}
}
