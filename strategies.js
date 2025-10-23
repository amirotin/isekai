// strategies.js
import { round3 } from './constants.js';

/* === Тонкая настройка эвристик === */
// «значительный» перелив до апгрейда (B)
const AUG_UP_WASTE_MIN = 0.60;
// «маленький» перелив после апгрейда (B)
const AUG_TARGET_WASTE_MAX = 0.30;
// кап команды (в max-режимах игнорируем UI и берём 6)
const HARD_CAP = 6;

/* ---------- Подбор минимального перелива (meet-in-the-middle) ---------- */
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

  // одиночные половины
  for(let s=1;s<=cap;s++){ for(const x of SA[s]) consider(x); for(const x of SB[s]) consider(x); }
  // комбинации половин
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

/** Список более высоких заказов от текущего (по возрастанию порога) */
function higherOrders(ordAll, o, limits) {
  return ordAll
    .filter(x => x.points > o.points && (limits[x.id] ?? Infinity) > 0)
    .sort((a,b)=> a.powerB - b.powerB);
}

/** Соло-доминанта: исключаем героев, которые в одиночку тянут любой «выше» */
function filterSoloDominants(pool, ordAll, o, limits) {
  const higher = higherOrders(ordAll, o, limits);
  if (!higher.length) return pool;
  const minHigherThr = Math.min(...higher.map(x => x.powerB));
  return pool.filter(h => h.powerB < minHigherThr - 1e-9);
}

/** Быстрый «одним героем» апгрейд группы на следующий тип */
function tryOneHeroUpgrade(group, nextOrder, leftovers){
  const capLeft = HARD_CAP - group.members.length;
  if (capLeft <= 0) return false;
  const need = nextOrder.powerB - group.sumB;
  if (need <= 1e-9) return false;
  // берём одного самого подходящего (>= need) с минимальным хвостом
  const cand = leftovers
    .filter(h => h.powerB + 1e-9 >= need)
    .sort((a,b)=> (a.powerB - b.powerB))[0];
  if (!cand) return false;
  const newWaste = group.sumB + cand.powerB - nextOrder.powerB;
  if (group.wasteB >= AUG_UP_WASTE_MIN && newWaste <= AUG_TARGET_WASTE_MAX){
    group.members.push(cand);
    group.sumB = round3(group.sumB + cand.powerB);
    group.wasteB = round3(newWaste);
    group.order = String(nextOrder.points);
    group.points = nextOrder.points;
    group.thr = nextOrder.powerB;
    // выкидываем из leftovers
    const idx = leftovers.findIndex(h=>h.name===cand.name);
    if (idx>-1) leftovers.splice(idx,1);
    return true;
  }
  return false;
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

  /* === 1) Формируем порядок типов: по эффективности ↓, внутри — по порогу ↑ === */
  function sortByEfficiencyThenThreshold(orderList){
    const buckets = new Map(); // eff -> [orders]
    for(const o of orderList){
      const key = eff(o).toFixed(6);
      if(!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(o);
    }
    const effKeys = Array.from(buckets.keys()).sort((a,b)=> +b - +a); // эффективность убыв
    const out = [];
    for(const k of effKeys){
      const arr = buckets.get(k).slice().sort((a,b)=> a.powerB - b.powerB); // порог возр.
      out.push(...arr);
    }
    return out;
  }

  /* === 2) Распределение по стратегиям === */
  function assignMaxPoints(orderList, {allowProtect}) {
    const queue = sortByEfficiencyThenThreshold(orderList);
    for(let oi=0; oi<queue.length; oi++){
      const base = queue[oi];
      while ((limits[base.id] ?? Infinity) > 0){
        // пул: либо с соло-доминантой (allowProtect=true), либо без
        const pool = allowProtect ? filterSoloDominants(remaining, ordAll, base, limits) : remaining;
        const pack = bestPackMinWaste(pool, base.powerB, HARD_CAP);
        if(!pack) break;
        const used = new Set(pack.members.map(h=>h.name));
        remaining = remaining.filter(h=>!used.has(h.name));
        addGroup(base, pack);
      }
    }
  }

  if (strategy === 'max_points') {
    // Солидная версия: защищаем соло-тащеров от «слива» на 40/50, остальное как описано
    assignMaxPoints(ordAll, {allowProtect:true});
  }
  else if (strategy === 'max_points_reroll') {
    // Ровно одна группа на 300 — минимум героев
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
    // Остальное — как «максимум очков»
    const rest = ordAll.filter(o=>o.points!==300);
    assignMaxPoints(rest, {allowProtect:true});
  }
  else if (strategy === 'lazy_limits') {
    const limited = ordAll.filter(o=>o.limit!=null && o.limit>0);
    assignMaxPoints(limited, {allowProtect:true});
  }
  else if (strategy === 'min_clicks') {
    // Простой: от больших очков к меньшим, пачки «сверху»
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
    // Максимум заказов: от самых дешёвых порогов
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

  /* === 3) Локальные апгрейды групп на «следующий» тип одним героем === */
  let leftovers = remaining.slice();
  // строим карту следующего типа для каждого очкового типа
  const byPoints = Object.fromEntries(ordAll.map(o=>[o.points,o]));
  function nextOrderFor(points){
    // среди типов с большей эффективностью — нет «следующего», берем ближайший больший порог того же или менее эффективного уровня
    const candidates = ordAll.filter(x=> x.points > points).sort((a,b)=> a.powerB - b.powerB);
    return candidates[0] || null;
  }

  for(let i=0;i<groups.length;i++){
    const g = groups[i];
    const current = byPoints[+g.order];
    const next = nextOrderFor(+g.order);
    if(!current || !next) continue;
    // есть ли лимит на следующий
    const limLeft = (limits[next.id] ?? Infinity);
    if (limLeft <= 0) continue;
    if (tryOneHeroUpgrade(g, next, leftovers)) {
      if (anyLimits) { limits[next.id]--; limits[current.id] = (limits[current.id]??Infinity) + 1; }
    }
  }

  /* === 4) Из «хвостов» добираем новые 40/50, затем 60 === */
  function fillFromLeftovers(pointsList){
    for(const pts of pointsList){
      const o = byPoints[pts];
      if(!o) continue;
      while ((limits[o.id] ?? Infinity) > 0){
        const pack = bestPackMinWaste(leftovers, o.powerB, HARD_CAP);
        if(!pack) break;
        const used = new Set(pack.members.map(h=>h.name));
        leftovers = leftovers.filter(h=>!used.has(h.name));
        addGroup(o, pack);
      }
    }
  }
  // отсортируем по эффективности, но возьмём блоки: сначала 50,40 (эффективные), потом 60
  const effSorted = sortByEfficiencyThenThreshold(ordAll).map(o=>o.points);
  const uniqPts = [...new Set(effSorted)];
  fillFromLeftovers(uniqPts);

  /* === 5) Соло-фоллбек: один сильный герой закрывает заказ с большим переливом (в самом конце) === */
  function soloFallback(){
    // идём по порядку эффективности/порогов
    const ordSeq = sortByEfficiencyThenThreshold(ordAll);
    for(const o of ordSeq){
      while ((limits[o.id] ?? Infinity) > 0){
        // найдём героя, который один >= порога
        const idx = leftovers.findIndex(h=>h.powerB + 1e-9 >= o.powerB);
        if (idx === -1) break;
        const h = leftovers[idx];
        leftovers.splice(idx,1);
        addGroup(o, {members:[h], sum:h.powerB, waste:h.powerB - o.powerB});
      }
    }
  }
  soloFallback();

  /* === Итоги === */
  const totals = groups.reduce((a,g)=>{a.points+=g.points; a.orders++; a.wasteB+=g.wasteB; return a;},{points:0,orders:0,wasteB:0});
  const usedNames = new Set(groups.flatMap(g=>g.members.map(m=>m.name)));
  const unused = heroes.filter(h=>h.enabled && !h.reserved && !usedNames.has(h.name));
  return {groups, unused, totals, diag:{anyLimits, limitsLeft: anyLimits? limits : null, enabledOrdersCount: enabledOrders.length}};
}
