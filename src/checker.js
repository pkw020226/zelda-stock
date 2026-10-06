const SOLD = [
  /SOLD\s*OUT/i,/품절/i,/일시\s*품절/i,/재고\s*0\s*개/i,/한정수량\s*0\s*개/i,
  /판매\s*종료/i,/예약\s*판매\s*종료/i,/재입고\s*알림/i,/예약\s*마감/i
];
// Conservative: a page is never marked available from a cart/buy button alone.
const AVAILABLE = [
  /재고\s*[1-9][0-9]*\s*개/i,/잔여\s*수량\s*[1-9][0-9]*/i,/구매\s*가능/i,
  /주문\s*가능/i,/예약\s*접수\s*중/i,/판매\s*중/i
];
export function classify(html, httpStatus=200){
  if (httpStatus < 200 || httpStatus >= 400) return {status:'unknown',reason:`HTTP ${httpStatus}`};
  const text = String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
  const sold = SOLD.find(r=>r.test(text));
  if (sold) return {status:'soldout',reason:`품절 신호 확인: ${sold}`};
  const avail = AVAILABLE.find(r=>r.test(text));
  if (avail) return {status:'available',reason:`명시적 구매/재고 신호 확인: ${avail}`};
  return {status:'unknown',reason:'명시적 재고 수량/구매 가능 근거 없음'};
}
export async function checkStore(store, fetcher=fetch){
  const started=Date.now();
  try{
    const r=await fetcher(store.url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (compatible; Zelda40StockWatch/2.0; +stock-check)','accept-language':'ko-KR,ko;q=0.9,en;q=0.5'}});
    const html=await r.text();
    const c=classify(html,r.status);
    return {...store,...c,httpStatus:r.status,checkedAt:new Date().toISOString(),elapsedMs:Date.now()-started,finalUrl:r.url||store.url};
  }catch(e){return {...store,status:'unknown',reason:`조회 실패: ${e?.message||e}`,checkedAt:new Date().toISOString(),elapsedMs:Date.now()-started};}
}
