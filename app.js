const $ = (s)=>document.querySelector(s); const $$=(s)=>Array.from(document.querySelectorAll(s));

// === ФИКСИРОВАННЫЕ ЗАКАЗЫ (7 штук, очки нельзя менять) ===
const FIXED_ORDERS = [
  { id: 'p300', points:300, powerB:38.51, enabled:true,  limit:null },
  { id: 'p100', points:100, powerB:12.83, enabled:true,  limit:null },
  { id: 'p75',  points:75,  powerB:6.419, enabled:true,  limit:null },
  { id: 'p60',  points:60,  powerB:4.012, enabled:true,  limit:null },
  { id: 'p50',  points:50,  powerB:2.674, enabled:true,  limit:null },
  { id: 'p40',  points:40,  powerB:2.139, enabled:true,  limit:null },
  { id: 'p10',  points:10,  powerB:1.000, enabled:false, limit:null },
];

// === ФИКСИРОВАННЫЙ СПРАВОЧНИК СОТРАТНИКОВ (RU) ===
const HERO_DB = [
  { ru:'Габраэль' },{ ru:'Берил' },{ ru:'Тор' },{ ru:'Сурена' },{ ru:'Аллюсия' },{ ru:'Милим Нава' },{ ru:'Канна' },{ ru:'Фафнир' },
  { ru:'Эльма' },{ ru:'Гермес' },{ ru:'Неметона' },{ ru:'Андрас' },{ ru:'Ао Ли' },{ ru:'Фанес' },{ ru:'Нептун' },{ ru:'Афина' },
  { ru:'Ньяр' },{ ru:'Тамамо' },{ ru:'Геракл' },{ ru:'Мастер Тунсюань' },{ ru:'Финфинкс' },{ ru:'Фрезия' },{ ru:'Анпу' },{ ru:'Вельзевула' },
  { ru:'Сунна' },{ ru:'Аматэрасу' },{ ru:'Нирус' },{ ru:'Керр, Бел и Росс' },{ ru:'Леон' },{ ru:'Малберри' },{ ru:'Лула' },{ ru:'Шломо' },
  { ru:'Мескал' },{ ru:'Трэди' },{ ru:'Стено' },{ ru:'Тигрис' },{ ru:'Лягушелла' },{ ru:'Магеллан' },{ ru:'Блэк' },{ ru:'Талия' },
  { ru:'Оникири' },{ ru:'Флос' },{ ru:'Шики' },{ ru:'Мио' },{ ru:'Томоэ' },{ ru:'Этер и Налл' },{ ru:'Тиги' },{ ru:'Эрос' },
  { ru:'Оривита' },{ ru:'Эгла' },{ ru:'Криста' },{ ru:'Римуру Темпест' },{ ru:'Аседия' },{ ru:'Джуэлри' },{ ru:'Энн' },{ ru:'Ида' },
  { ru:'Сальво' },{ ru:'Лакс' },{ ru:'Августин' },{ ru:'Лоя' },{ ru:'Кая' },{ ru:'Хакурен' },{ ru:'Эмонсен' },{ ru:'Авар' },
  { ru:'Нип' },{ ru:'Стефани' },{ ru:'Майнер' },{ ru:'Ира' },{ ru:'Йори' },{ ru:'Супер' },{ ru:'Авриль' },{ ru:'Маммон' },
  { ru:'Буба' },{ ru:'Паат' },{ ru:'Хилора' },{ ru:'Бенимару' },{ ru:'Мушими' },{ ru:'Лиз' },{ ru:'Каротта' },{ ru:'Спипи' },
  { ru:'Эмма' },{ ru:'Сирин' },{ ru:'Дениса' },{ ru:'Симитир' },{ ru:'Аделина' },{ ru:'Налу' },{ ru:'Витти' },{ ru:'Мурк' },
  { ru:'Грейс' },{ ru:'Элис' },{ ru:'Лекор' },{ ru:'Рани' },{ ru:'Квенчи' },{ ru:'Анджи' },{ ru:'Флоти' },{ ru:'Хован Даде' },
  { ru:'Барбара' },{ ru:'Бротейн' },{ ru:'Скорпион' },{ ru:'Гист' },{ ru:'Прим' },{ ru:'Белль' },{ ru:'Араке' },{ ru:'Кэти' },
  { ru:'Боаттер' },{ ru:'Вулф' },{ ru:'Мирак' },{ ru:'Мидэн' },{ ru:'Доктор Дотор' },{ ru:'Линкаль' },{ ru:'Роджил' },{ ru:'Гуарг' },
  { ru:'Хокер' },{ ru:'Бьернсон' },{ ru:'Фифи' },{ ru:'Максим' },{ ru:'Памп' },{ ru:'Рейр' },{ ru:'Книви' }
];

// === LocalStorage ===
const LS_KEY = 'isl_sp_planner_v16';
function saveConfig(){
  const data = { orders: collectOrdersFromUI(), heroes: collectHeroesFromUI(), strategy: $('#strategy').value, maxTeam:+$('#maxTeam').value, wasteLimit:+($('#wasteLimit').value||0.25) };
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}
function loadConfig(){ const raw = localStorage.getItem(LS_KEY); if(!raw) return null; try{return JSON.parse(raw)}catch{ return null } }

// === Orders UI (fixed) ===
function renderOrdersFixed(arr){
  const wrap = $('#ordersList'); wrap.innerHTML='';
  arr.forEach((o,idx)=>{
    const row = document.createElement('div'); row.className='grid grid-cols-12 gap-2 items-center';
    row.innerHTML = `
      <div class="col-span-2"><button class="toggle ${o.enabled?'on':''}" data-idx="${idx}" aria-label="toggle"><span class="toggle-dot"></span></button></div>
      <div class="col-span-3"><div class="input bg-gray-50 text-gray-700">${o.points}</div></div>
      <div class="col-span-5"><input type="number" step="0.001" class="input" value="${o.powerB}" data-idx="${idx}" data-field="powerB"></div>
      <div class="col-span-2"><input type="number" min="0" step="1" class="input" value="${o.limit??''}" placeholder="∞" data-idx="${idx}" data-field="limit"></div>`;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('.toggle').forEach(btn=>btn.addEventListener('click',()=>{ btn.classList.toggle('on'); }));
}
function collectOrdersFromUI(){
  const rows = $$('#ordersList > div');
  return rows.map((row,idx)=>{
    const raw = String(row.querySelector('[data-field="limit"]').value||'').trim();
    let limitVal = null; if(raw!==''){ const n = Number(raw); limitVal = (isFinite(n)&&n>=0)? Math.floor(n): null; }
    return {
      id: FIXED_ORDERS[idx].id,
      points: FIXED_ORDERS[idx].points,
      enabled: row.querySelector('.toggle').classList.contains('on'),
      powerB: +row.querySelector('[data-field="powerB"]').value,
      limit: limitVal
    };
  });
}

// === Heroes UI (dropdown + сила + вкл + замок) ===
function heroRowTemplate(idx, data={ ru:'', powerB:'', enabled:true, reserved:false }){
  const opts = HERO_DB.map(h=>`<option value="${h.ru}" ${h.ru===data.ru?'selected':''}>${h.ru}</option>`).join('');
  return `
  <div class="grid grid-cols-12 gap-2 items-center" data-row="${idx}">
    <div class="col-span-4">
      <select class="input" data-field="name">${opts}</select>
    </div>
    <div class="col-span-3"><input type="number" step="0.001" class="input" data-field="powerB" value="${data.powerB||''}" placeholder="0"></div>
    <div class="col-span-2 text-center"><button class="toggle ${data.enabled?'on':''}" data-field="enabled"><span class="toggle-dot"></span></button></div>
    <div class="col-span-3 flex items-center gap-2">
      <button class="lock ${data.reserved?'on':''}" title="В резерв (исключить из расчёта)" data-field="reserved">🔒</button>
      <span class="text-xs text-gray-500">В резерве — не участвует в подборе</span>
    </div>
  </div>`;
}

function renderHeroes(rows){
  const wrap = $('#heroesList'); wrap.innerHTML='';
  rows.forEach((r,idx)=>{ const div = document.createElement('div'); div.innerHTML = heroRowTemplate(idx, r); wrap.appendChild(div.firstElementChild); });
  wrap.querySelectorAll('.toggle').forEach(btn=>btn.addEventListener('click',()=>btn.classList.toggle('on')));
  wrap.querySelectorAll('.lock').forEach(btn=>btn.addEventListener('click',()=>btn.classList.toggle('on')));
}
function collectHeroesFromUI(){
  return $$('#heroesList [data-row]').map(row=>{
    const ru = row.querySelector('[data-field="name"]').value;
    const ref = HERO_DB.find(h=>h.ru===ru) || {ru};
    return {
      name: ref.ru,
      powerB: +row.querySelector('[data-field="powerB"]').value,
      enabled: row.querySelector('[data-field="enabled"]').classList.contains('on'),
      reserved: row.querySelector('[data-field="reserved"]').classList.contains('on')
    };
  }).filter(h=>!isNaN(h.powerB) && h.powerB>0);
}

// Добавление/очистка строк соратников
function addHeroRow(){
  const cur = collectHeroesFromUI();
  cur.push({ ru: HERO_DB[0]?.ru || '', powerB:'', enabled:true, reserved:false });
  renderHeroes(cur);
}
function clearHeroRows(){ renderHeroes([]); }

// === Массовый импорт: поиск в справочнике и парсинг ===
function parseBulkText(text){
  const lines = (text||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const parsed = []; let skipped = 0;
  for(const line of lines){
    const m = line.match(/^(.+?)\s*-\s*([\d\.]+)\s*([BM])$/i);
    if(!m){ skipped++; continue; }
    const name = m[1].trim();
    const num = parseFloat(m[2]);
    const unit = (m[3]||'B').toUpperCase();
    const ref = HERO_DB.find(h=>h.ru === name);
    if(!ref){ skipped++; continue; }
    const powerB = unit==='B' ? num : num/1000;
    parsed.push({ ru: ref.ru, powerB, enabled:true, reserved:false });
  }
  return { parsed, skipped };
}

// === Алгоритм подбора ===
function planAssignment({orders, heroes, strategy, maxTeam, wasteLimit}){
  const enabledOrders = orders.filter(o=>o.enabled && o.powerB>0);
  if(!enabledOrders.length) return {groups:[], unused:heroes, totals:{points:0,orders:0,wasteB:0}};
  let remaining = heroes.filter(h=>h.enabled && !h.reserved);
  remaining.sort((a,b)=>b.powerB-a.powerB);

  let ord = [...enabledOrders];
  // Strategy-specific filtering and ordering
  if (strategy==='lazy_limits') {
    ord = ord.filter(o=>o.limit!=null && o.limit>0);
  }
  if (strategy==='max_points') {
    // sort by efficiency points per B desc
    ord.sort((a,b)=> (b.points/b.powerB) - (a.points/a.powerB));
  } else if (strategy==='max_points_reroll') {
    const order = [300,100,75,60,50,40,10];
    ord.sort((a,b)=> order.indexOf(b.points)-order.indexOf(a.points));
  } else if (strategy==='min_orders') {
    ord.sort((a,b)=> b.powerB-a.powerB || b.points-a.points);
  } else if (strategy==='max_orders') {
    ord.sort((a,b)=> a.powerB-b.powerB || a.points-b.points);
  } else if (strategy==='min_clicks') {
    const order = [300,100,75,60,50,40,10];
    ord.sort((a,b)=> order.indexOf(b.points)-order.indexOf(a.points));
  }

  const anyLimits = ord.some(o=>o.limit!=null);
  const limits = Object.fromEntries(ord.map(o=>[o.id, (o.limit==null? Infinity : o.limit)]));
  const preferLarger = (strategy==='min_clicks');
  const groups = [];

  function better(cur, cand){
    if(!cur) return cand;
    if(cand.waste < cur.waste - 1e-9) return cand;
    if(Math.abs(cand.waste - cur.waste) < 1e-9){
      if(preferLarger){ if(cand.members.length > cur.members.length) return cand; }
      else { if(cand.members.length < cur.members.length) return cand; }
      if(cand.members.length === cur.members.length && cand.sum < cur.sum) return cand;
    }
    return cur;
  }
  function tryForm(thr,label,points){
    let best=null;
    for(let i=0;i<remaining.length;i++){
      const a=remaining[i];
      let mem=[a], sum=a.powerB;
      if(sum>=thr){ best=better(best,{members:mem,sum,waste:sum-thr}); }
      else {
        const idxs=[]; for(let j=remaining.length-1;j>=0;j--) if(j!==i) idxs.push(j);
        for(let k=0;k<idxs.length && mem.length<maxTeam && sum<thr;k++){ const h=remaining[idxs[k]]; mem.push(h); sum+=h.powerB; }
        if(sum>=thr) best=better(best,{members:mem,sum,waste:sum-thr});
      }
      for(let j=0;j<remaining.length;j++){
        if(j===i) continue; const h2=remaining[j]; const s2=a.powerB+h2.powerB;
        if(s2>=thr && 2<=maxTeam) best=better(best,{members:[a,h2],sum:s2,waste:s2-thr});
      }
      if(maxTeam>=3){
        for(let j=remaining.length-1;j>=0;j--){ if(j===i) continue; const h2=remaining[j];
          for(let k=j-1;k>=0;k--){ if(k===i) continue; const h3=remaining[k];
            const s3=a.powerB+h2.powerB+h3.powerB; if(s3>=thr) best=better(best,{members:[a,h2,h3],sum:s3,waste:s3-thr});
          }
        }
      }
    }
    if(!best) return false;
    const acceptable = best.waste <= (wasteLimit ?? 0.25); if(!acceptable) return false;
    const used=new Set(best.members.map(h=>h.name));
    remaining=remaining.filter(h=>!used.has(h.name));
    groups.push({order:label,thr,points,members:best.members,sumB:round3(best.sum),wasteB:round3(best.waste)});
    if(anyLimits){ const match = ord.find(x=>String(x.points)===label); if(match) limits[match.id]--; }
    return true;
  }

  let progress=true;
  while(progress){
    progress=false;
    for(const o of ord){
      if(anyLimits && limits[o.id] <= 0) continue;
      if(tryForm(o.powerB, String(o.points), o.points)){ progress=true; break; }
    }
    if(anyLimits && Object.values(limits).every(v=>v<=0)) break;
    if(!remaining.length) break;
  }

  const totals = groups.reduce((a,g)=>{a.points+=g.points; a.orders++; a.wasteB+=g.wasteB; return a;},{points:0,orders:0,wasteB:0});
  const usedNames = new Set(groups.flatMap(g=>g.members.map(m=>m.name)));
  const unused = heroes.filter(h=>h.enabled && !h.reserved && !usedNames.has(h.name));
  return {groups, unused, totals};
}

const round3 = x=>Math.round(x*1000)/1000;

// === Рендер результатов ===
function renderResults(out){
  const $tot=$('#totals'), $res=$('#result'), $un=$('#unusedWrap'); $res.innerHTML='';
  if(!out.groups.length){ $tot.classList.add('hidden'); $un.classList.add('hidden'); $res.innerHTML = `<div class='card'>Не удалось сформировать ни одного заказа с текущими настройками.</div>`; return; }
  $tot.classList.remove('hidden');
  $tot.innerHTML = `<div class="flex flex-wrap gap-4 items-center">
    <div class="tag">Всего заказов: <b>${out.totals.orders}</b></div>
    <div class="tag">Очки: <b>${out.totals.points}</b></div>
    <div class="tag">Перелив силы: <b>${round3(out.totals.wasteB)} B</b></div>
    <div class="tag">Неисп.: <b>${out.unused.length}</b></div>
  </div>`;
  const frag=document.createDocumentFragment();
  out.groups.forEach(g=>{
    const card=document.createElement('div'); card.className='card';
    card.innerHTML = `<div class="flex items-start justify-between gap-2">
      <div>
        <div class="text-xs uppercase text-gray-500">Заказ</div>
        <div class="text-lg font-semibold">${g.order} очков</div>
        <div class="text-sm text-gray-600">Порог: ${g.thr} B</div>
      </div>
      <div class="text-right">
        <div class="text-xs text-gray-500">Сумма силы</div>
        <div class="text-lg font-semibold">${g.sumB} B</div>
        <div class="text-sm text-gray-600">Перелив: ${g.wasteB} B</div>
      </div>
    </div>
    <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
      ${g.members.map(h=>`<div class='flex items-center justify-between p-2 rounded-xl bg-gray-50'><div class='text-sm'><div class='font-medium'>${h.name}</div><div class='text-gray-500'>${h.powerB.toFixed(3)} B</div></div></div>`).join('')}
    </div>`;
    frag.appendChild(card);
  });
  $res.appendChild(frag);
  $un.classList.remove('hidden');
  $un.innerHTML = `<div class='text-sm font-semibold mb-2'>Неиспользованные (${out.unused.length})</div>
  <div class='grid sm:grid-cols-2 md:grid-cols-3 gap-2'>${out.unused.map(h=>`<div class='p-2 rounded-xl bg-gray-50 text-sm'>${h.name} <span class='text-gray-500'>(${h.powerB.toFixed(3)} B)</span></div>`).join('')}</div>`;
}

// === Тесты ===
function runUnitTests(){
  const logs = [];
  function ok(cond, msg){ logs.push(`${cond? '✅':'❌'} ${msg}`); return cond; }

  // Test 1: Orders render 7 rows
  renderOrdersFixed(FIXED_ORDERS);
  ok($$('#ordersList > div').length === 7, 'Должно быть 7 строк заказов');

  // Test 2: Simple plan builds at least one order (max_points)
  const testHeroes = [
    { name:'Габраэль', powerB:3.8, enabled:true, reserved:false },
    { name:'Керр, Бел и Росс', powerB:2.85, enabled:true, reserved:false },
    { name:'Кая', powerB:0.96, enabled:true, reserved:false },
  ];
  const testOrders = [
    { id:'p60',points:60,powerB:4.012,enabled:true, limit:null },
    { id:'p50',points:50,powerB:2.674,enabled:true, limit:null },
    { id:'p40',points:40,powerB:2.139,enabled:true, limit:null },
  ];
  const plan = planAssignment({orders:testOrders, heroes:testHeroes, strategy:'max_points', maxTeam:3, wasteLimit:0.25});
  ok(plan.groups.length >= 1, 'План должен сформировать хотя бы один заказ');
  ok(plan.groups.every(g=>g.sumB>=g.thr && g.wasteB>=0), 'Все группы пересекают порог и дают неотрицательный перелив');

  // Test 3: Reserved hero is excluded
  const testHeroes2 = [
    { name:'Габраэль', powerB:3.8, enabled:true, reserved:true },
    { name:'Керр, Бел и Росс', powerB:2.85, enabled:true, reserved:false },
  ];
  const plan2 = planAssignment({orders:testOrders, heroes:testHeroes2, strategy:'max_points', maxTeam:2, wasteLimit:0.25});
  ok(plan2.groups.every(g=>!g.members.some(m=>m.name==='Габраэль')), 'Резерв исключает героя из подбора');

  // Test 4: Bulk import parsing (B and M)
  const sampleBulk = 'Габраэль - 3.777B\nКая - 958M\nНеизвестный - 1.0B';
  const parsedRes = parseBulkText(sampleBulk);
  ok(parsedRes.parsed.length === 2, 'Импорт: распознаны 2 строки из 3');
  const kaya = parsedRes.parsed.find(h=>h.ru==='Кая');
  ok(kaya && Math.abs(kaya.powerB - 0.958) < 1e-6, 'Импорт: 958M → 0.958B корректно');

  // Test 5: Order limits respected
  const limitedOrders = [
    { id:'p50', points:50, powerB:2.674, enabled:true, limit:1 },
    { id:'p40', points:40, powerB:2.139, enabled:true, limit:0 },
  ];
  const heroesForLimit = [
    { name:'Габраэль', powerB:3.0, enabled:true, reserved:false },
    { name:'Кая', powerB:1.0, enabled:true, reserved:false },
  ];
  const planL = planAssignment({orders:limitedOrders, heroes:heroesForLimit, strategy:'lazy_limits', maxTeam:2, wasteLimit:0.5});
  ok(planL.groups.length === 1 && planL.groups[0].order==='50', 'Лимит: сформирован только один заказ на 50 очков');

  // Test 6: Blank limits in UI act as unlimited
  renderOrdersFixed(FIXED_ORDERS);
  const uiOrders = collectOrdersFromUI();
  ok(uiOrders.every(o=>o.limit===null), 'UI: пустые лимиты распознаются как безлимитные');
  const planUI = planAssignment({orders:uiOrders.map(o=>({ ...o, enabled: (o.id==='p50'||o.id==='p40') })), heroes:testHeroes, strategy:'max_points', maxTeam:3, wasteLimit:0.5});
  ok(planUI.groups.length >= 1, 'UI: при пустых лимитах можно сформировать хотя бы один заказ');

  const out = logs.join('\n');
  const box = $('#testResults');
  box.classList.remove('hidden');
  box.textContent = out;
  const badge = $('#testBadge');
  if (logs.every(l=>l.startsWith('✅'))) { badge.classList.remove('hidden'); badge.textContent = 'OK'; badge.classList.add('bg-green-100','text-green-700'); }
  else { badge.classList.remove('hidden'); badge.textContent = 'Есть ошибки'; badge.classList.add('bg-yellow-100','text-yellow-700'); }
}

// === Wireup ===
function runPlanner(){
  const orders = collectOrdersFromUI();
  const heroes = collectHeroesFromUI();
  const strategy = $('#strategy').value; const maxTeam=Math.max(1,Math.min(6,+$('#maxTeam').value||4)); const wasteLimit=+($('#wasteLimit').value||0.25);
  const out = planAssignment({orders, heroes, strategy, maxTeam, wasteLimit});
  renderResults(out);
}

function init(){
  renderOrdersFixed(FIXED_ORDERS);
  renderHeroes([]);
  $('#addHeroRow').addEventListener('click', addHeroRow);
  $('#clearHeroRows').addEventListener('click', clearHeroRows);
  $('#run').addEventListener('click', runPlanner);
  $('#runTests').addEventListener('click', runUnitTests);
  // Bulk import
  const bulkBtn = document.getElementById('parseBulk');
  const clearBtn = document.getElementById('clearBulk');
  if (bulkBtn) bulkBtn.addEventListener('click', ()=>{
    const ta = document.getElementById('bulkText');
    const { parsed, skipped } = parseBulkText(ta?.value || '');
    if(!parsed.length){ alert('Не распознано ни одной строки'); return; }
    const cur = collectHeroesFromUI();
    const rows = parsed.map(p=>({ ru:p.ru, powerB:p.powerB, enabled:true, reserved:false }));
    renderHeroes([...cur, ...rows]);
    if(skipped){ alert(`Импортировано: ${parsed.length}\nПропущено: ${skipped}`); }
  });
  if (clearBtn) clearBtn.addEventListener('click', ()=>{ const t=document.getElementById('bulkText'); if(t) t.value=''; });
  // Save/Load/Import/Export
  $('#saveConfig').addEventListener('click', ()=>{ saveConfig(); alert('Сохранено'); });
  $('#loadConfig').addEventListener('click', ()=>{ const cfg=loadConfig(); if(!cfg){alert('Нет сохранённых данных');return;} renderOrdersFixed(FIXED_ORDERS.map((o,i)=>({ ...o, ...((cfg.orders||[])[i]||{}) }))); renderHeroes(cfg.heroes||[]); $('#strategy').value=cfg.strategy||'max_points'; $('#maxTeam').value=cfg.maxTeam||4; $('#wasteLimit').value = (typeof cfg.wasteLimit==='number'? cfg.wasteLimit : 0.25); });
  $('#exportJson').addEventListener('click', ()=>{ const data={ orders: collectOrdersFromUI(), heroes: collectHeroesFromUI(), strategy: $('#strategy').value, maxTeam:+$('#maxTeam').value, wasteLimit:+($('#wasteLimit').value||0.25) }; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='isl_sp_planner_config.json'; a.click(); });
  $('#importJson').addEventListener('change', (e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const cfg=JSON.parse(r.result); renderOrdersFixed(FIXED_ORDERS.map((o,i)=>({ ...o, ...((cfg.orders||[])[i]||{}) }))); renderHeroes(cfg.heroes||[]); if(cfg.strategy) $('#strategy').value=cfg.strategy; if(cfg.maxTeam) $('#maxTeam').value=cfg.maxTeam; if(typeof cfg.wasteLimit==='number') $('#wasteLimit').value=cfg.wasteLimit; }catch{ alert('Ошибка импорта'); } }; r.readAsText(f); });
  window.addEventListener('beforeunload', saveConfig);
}
init();
