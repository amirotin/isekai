// strategies.js
import { round3 } from './constants.js';

/* === Настройки эвристик === */
const AUG_UP_WASTE_MIN = 0.60;
const AUG_TARGET_WASTE_MAX = 0.30;
const SAME_EFF_REL_TOL = 0.01;
const HARD_CAP = 6;

/* ---------- Подбор минимального перелива ---------- */
function bestPackMinWaste(pool, thr, cap, preferFewest = false) {
  cap = Math.max(1, Math.min(6, cap || 4));
  const top = pool.slice().sort((a, b) => b.powerB - a.powerB).slice(0, 22);
  if (top.reduce((s, h) => s + h.powerB, 0) < thr) return null;

  const mid = Math.floor(top.length / 2);
  const A = top.slice(0, mid), B = top.slice(mid);

  function enumSub(arr){
    const m=arr.length, out=Array.from({length:cap+1}, ()=>[]), lim=1<<m;
    for(let mask=1; mask<lim; mask++){
      let sum=0,size=0, members=[];
      for(let i=0;i<m;i++) if(mask & (1<<i)){
        size++; const h=arr[i]; sum+=h.powerB; members.push(h);
        if(size>cap) break;
      }
      if(size>=1 && size<=cap) out[size].push({sum, members});
    }
    for(let s=1;s<=cap;s++) out[s].sort((u,v)=>u.sum - v.sum);
    return out;
  }

  const SA=enumSub(A), SB=enumSub(B);
  let best=null;
  const consider=(pack)=>{
    if(!pack) return;
    const size=pack.members.length, waste=pack.sum - thr;
    if(waste<0) return;
    if(!best){ best={members:pack.members, sum:pack.sum, waste, size}; return; }
    if(preferFewest){
      if(size<best.size-1e-9 || (size===best.size && waste<best.waste-1e-9)) best={members:pack.members, sum:pack.sum, waste, size};
    }else{
      if(waste<best.waste-1e-9 || (Math.abs(waste-best.waste)<1e-9 && size<best.size)) best={members:pack.members, sum:pack.sum, waste, size};
    }
  };

  for(let s=1;s<=cap;s++){ for(const x of SA[s]) consider(x); for(const x of SB[s]) consider(x); }
  for(let i=1;i<=cap;i++){
    const Ai=SA[i]; if(!Ai.length) continue;
    for(let j=1;j<=cap-i;j++){
      const Bj=SB[j]; if(!Bj.length) continue;
      for(const a of Ai){
        const need=thr - a.sum;
        if(need<=0){ consider(a); continue; }
        let lo=0,hi=Bj.length-1,idx=-1;
        while(lo<=hi){ const md=(lo+hi)>>1; if(Bj[md].sum>=need){ idx=md; hi=md-1; } else lo=md+1; }
        if(idx!==-1){ const b=Bj[idx]; consider({ sum:a.sum+b.sum, members:[...a.members, ...b.members] }); }
      }
    }
  }
  return best;
}

/* ---------- Вспомогательное ---------- */
const eff = (o) => o.points / o.powerB;

function higherOrders(ordAll, o, limits) {
  return ordAll
    .filter(x => x.points > o.points && (limits[x.id] ?? Infinity) > 0)
    .sort((a,b)=> a.powerB - b.powerB);
}

function isSameEfficiency(curOrder, nextOrder){
  const e1 = curOrder.points / curOrder.powerB;
  const e2 = nextOrder.points / nextOrder.powerB;
  const rel = Math.abs(e1 - e2) / Math.max(e1, e2);
  return rel <= SAME_EFF_REL_TOL;
}

function filterSoloDominants(pool, ordAll, o, limits) {
  const higher = higherOrders(ordAll, o, limits);
  if (!higher.length) return pool;
  const minHigherThr = Math.min(...higher.map(x => x.powerB));
  return pool.filter(h => h.powerB < minHigherThr - 1e-9);
}

/* Хвостовой профиль */
function tailProfile(pool){
  if (!pool.length) return { median: 0, p75: 0, mean: 0, max: 0 };
  const powers = pool.map(h=>h.powerB).sort((a,b)=>a-b);
  const n = powers.length;
  const k = Math.max(5, Math.min(25, Math.floor(n * 0.35)));
  const tail = powers.slice(0, Math.max(1, Math.min(k, n)));
  const mid = Math.floor(tail.length/2);
  const median = tail[mid];
  const p75 = tail[Math.floor(tail.length*0.75)];
  const mean = tail.reduce((s,x)=>s+x,0) / tail.length;
  const max  = tail[tail.length-1];
  return { median, p75, mean, max };
}
function typicalTailB(pool){
  const { p75 } = tailProfile(pool);
  return p75 || 0;
}

/* ---------- Главный планировщик ---------- */
export function planAssignment({ orders, heroes, strategy, maxTeam, wasteLimit }) {
  const enabledOrders = orders.filter(o => o.enabled && o.powerB > 0);
  if (!enabledOrders.length)
    return { groups: [], unused: heroes, totals: { points: 0, orders: 0, wasteB: 0 }, diag: { anyLimits: false, limitsLeft: null, enabledOrdersCount: 0 } };

  let remaining = heroes.filter(h => h.enabled && !h.reserved).sort((a,b)=>b.powerB-a.powerB);
  const ordAll = [...enabledOrders];
  const anyLimits = ordAll.some(o => o.limit != null);
  const limits = Object.fromEntries(ordAll.map(o => [o.id, (o.limit == null ? Infinity : o.limit)]));
  const groups = [];

  const addGroup = (o, pack, extra={})=>{
    groups.push({
      order:String(o.points), thr:o.powerB, points:o.points,
      members:pack.members, sumB:round3(pack.sum), wasteB:round3(pack.waste), ...extra
    });
    if (anyLimits) limits[o.id]--;
  };

  function sortByEfficiencyThenThreshold(orderList){
    const buckets = new Map();
    for(const o of orderList){
      const key = eff(o).toFixed(6);
      if(!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(o);
    }
    const effKeys = Array.from(buckets.keys()).sort((a,b)=> +b - +a);
    const out = [];
    for(const k of effKeys){
      const arr = buckets.get(k).slice().sort((a,b)=> a.powerB - b.powerB);
      out.push(...arr);
    }
    return out;
  }

  function nextOrderFor(points){
    const candidates = ordAll.filter(x=> x.points > points && (limits[x.id] ?? Infinity) > 0)
                             .sort((a,b)=> a.powerB - b.powerB);
    return candidates[0] || null;
  }

  function assignMaxPoints(orderList, {allowProtect}) {
    const queue = sortByEfficiencyThenThreshold(orderList);
    const TAIL_FUDGE = 1.10;
    const TARGET_WASTE_MAX = AUG_TARGET_WASTE_MAX;

    const nextOrderForBase = (base) => {
      const candidates = orderList
        .filter(x => x.points > base.points && (limits[x.id] ?? Infinity) > 0)
        .sort((a,b)=> a.powerB - b.powerB);
      return candidates[0] || null;
    };

    for (let oi = 0; oi < queue.length; oi++) {
      const base = queue[oi];

      while ((limits[base.id] ?? Infinity) > 0) {
        const pool = allowProtect ? filterSoloDominants(remaining, ordAll, base, limits) : remaining;

        let pack = bestPackMinWaste(pool, base.powerB, HARD_CAP);
        if (!pack) break;

        const next = nextOrderForBase(base);
        if (next) {
          if (pack.sum + 1e-9 >= next.powerB) {
            const pack2 = bestPackMinWaste(pool, next.powerB, HARD_CAP);
            if (pack2) {
              const used = new Set(pack2.members.map(h=>h.name));
              remaining = remaining.filter(h=>!used.has(h.name));
              addGroup(next, pack2);
              continue;
            }
          }

          const gap = next.powerB - pack.sum;
          if (gap > 1e-9) {
            const tailB = typicalTailB(pool);
            if (tailB > 0 && gap <= tailB * TAIL_FUDGE) {
              const usedNames = new Set(pack.members.map(h=>h.name));
              const tails = pool.filter(h=>!usedNames.has(h.name))
                                .filter(h=> h.powerB + 1e-9 >= gap)
                                .sort((a,b)=> a.powerB - b.powerB);
              const cand = tails[0];
              if (cand) {
                const newWaste = pack.sum + cand.powerB - next.powerB;
                if (newWaste <= TARGET_WASTE_MAX + 1e-9) {
                  const mergedPool = [...pack.members, cand];
                  const pack3 = bestPackMinWaste(mergedPool, next.powerB, HARD_CAP);
                  const final = pack3 || { members:[...pack.members, cand], sum: pack.sum + cand.powerB, waste: newWaste };
                  const used2 = new Set(final.members.map(h=>h.name));
                  remaining = remaining.filter(h=>!used2.has(h.name));
                  addGroup(next, final);
                  continue;
                }
              }
            }
          }
        }

        const used = new Set(pack.members.map(h=>h.name));
        remaining = remaining.filter(h=>!used.has(h.name));
        addGroup(base, pack);
      }
    }
  }

  if (strategy === 'max_points') {
    assignMaxPoints(ordAll, {allowProtect:true});
  }
  else if (strategy === 'max_points_reroll') {
    const o300 = ordAll.find(o=>o.points===300);
    if (o300 && (limits[o300.id]??Infinity) > 0){
      const pack = bestPackMinWaste(remaining, o300.powerB, HARD_CAP, true);
      if (pack){
        const used = new Set(pack.members.map(h=>h.name));
        remaining = remaining.filter(h=>!used.has(h.name));
        addGroup(o300, pack, {reroll:true});
        limits[o300.id] = 0;
      }
    }
    const rest = ordAll.filter(o=>o.points!==300);
    assignMaxPoints(rest, {allowProtect:true});
  }
  else if (strategy === 'lazy_limits') {
    const limited = ordAll.filter(o=>o.limit!=null && o.limit>0);
    assignMaxPoints(limited, {allowProtect:true});
  }
  else if (strategy === 'min_clicks') {
    const list = [...ordAll].sort((a,b)=> b.points - a.points);
    const takeStrongestUntil = (thr)=>{
      const mem=[]; let sum=0;
      for(let i=0;i<remaining.length && sum<thr;i++){ mem.push(remaining[i]); sum+=remaining[i].powerB; }
      if(sum<thr) return null;
      const used = new Set(mem.map(h=>h.name));
      remaining = remaining.filter(h=>!used.has(h.name));
      return {members:mem, sum, waste:sum-thr};
    };
    for(const o of list){
      while((limits[o.id]??Infinity)>0){
        const pack = takeStrongestUntil(o.powerB);
        if(!pack) break;
        addGroup(o, pack);
      }
    }
  }
  else if (strategy === 'max_orders') {
    const list = [...ordAll].sort((a,b)=> a.powerB - b.powerB || a.points - b.points);
    const takeStrongestUntil = (thr)=>{
      const mem=[]; let sum=0;
      for(let i=0;i<remaining.length && sum<thr;i++){ mem.push(remaining[i]); sum+=remaining[i].powerB; }
      if(sum<thr) return null;
      const used = new Set(mem.map(h=>h.name));
      remaining = remaining.filter(h=>!used.has(h.name));
      return {members:mem, sum, waste:sum-thr};
    };
    for(const o of list){
      while((limits[o.id]??Infinity)>0){
        const pack = takeStrongestUntil(o.powerB);
        if(!pack) break;
        addGroup(o, pack);
      }
    }
  }
  else {
    assignMaxPoints(ordAll, {allowProtect:true});
  }

  const totals = groups.reduce((a,g)=>{a.points+=g.points; a.orders++; a.wasteB+=g.wasteB; return a;},{points:0,orders:0,wasteB:0});
  const usedNames = new Set(groups.flatMap(g=>g.members.map(m=>m.name)));
  const unused = heroes.filter(h=>h.enabled && !h.reserved && !usedNames.has(h.name));
  return {groups, unused, totals, diag:{anyLimits, limitsLeft: anyLimits? limits : null, enabledOrdersCount: enabledOrders.length}};
}
