// ui.js
import { FIXED_ORDERS, HERO_DB, $, $$, round3 } from './constants.js';

export function renderOrdersFixed(arr = FIXED_ORDERS){
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
  wrap.querySelectorAll('.toggle').forEach(btn=>btn.addEventListener('click',()=>btn.classList.toggle('on')));
}

export function collectOrdersFromUI(){
  const rows = $$('#ordersList > div');
  return rows.map((row,idx)=>{
    const raw = String(row.querySelector('[data-field="limit"]').value||'').trim();
    let limitVal = null;
    if(raw!==''){ const n = Number(raw); limitVal = (isFinite(n)&&n>=0)? Math.floor(n): null; }
    return {
      id: FIXED_ORDERS[idx].id,
      points: FIXED_ORDERS[idx].points,
      enabled: row.querySelector('.toggle').classList.contains('on'),
      powerB: +row.querySelector('[data-field="powerB"]').value,
      limit: limitVal
    };
  });
}

function heroRowTemplate(idx, data={ ru:'', name:'', powerB:'', enabled:true, reserved:false }){
  const selected = (data.name || data.ru || '');
  const opts = HERO_DB.map(h=>`<option value="${h.ru}" ${h.ru===selected?'selected':''}>${h.ru}</option>`).join('');
  return `
  <div class="grid grid-cols-12 gap-2 items-center" data-row="${idx}">
    <div class="col-span-4"><select class="input" data-field="name">${opts}</select></div>
    <div class="col-span-3"><input type="number" step="0.001" class="input" data-field="powerB" value="${data.powerB||''}" placeholder="0"></div>
    <div class="col-span-2 text-center"><button class="toggle ${data.enabled?'on':''}" data-field="enabled"><span class="toggle-dot"></span></button></div>
    <div class="col-span-3 flex items-center gap-2">
      <button class="lock ${data.reserved?'on':''}" title="В резерв (исключить из расчёта)" data-field="reserved">🔒</button>
      <span class="text-xs text-gray-500">В резерве — не участвует в подборе</span>
    </div>
  </div>`;
}

export function renderHeroes(rows){
  const wrap = $('#heroesList'); wrap.innerHTML='';
  rows.forEach((r,idx)=>{ const div=document.createElement('div'); div.innerHTML=heroRowTemplate(idx,r); wrap.appendChild(div.firstElementChild); });
  wrap.querySelectorAll('.toggle').forEach(btn=>btn.addEventListener('click',()=>btn.classList.toggle('on')));
  wrap.querySelectorAll('.lock').forEach(btn=>btn.addEventListener('click',()=>btn.classList.toggle('on')));
}
export function collectHeroesFromUI(){
  return $$('#heroesList [data-row]').map(row=>{
    const ru = row.querySelector('[data-field="name"]').value;
    const powerB = +row.querySelector('[data-field="powerB"]').value;
    return {
      name: ru,
      powerB,
      enabled: row.querySelector('[data-field="enabled"]').classList.contains('on'),
      reserved: row.querySelector('[data-field="reserved"]').classList.contains('on')
    };
  }).filter(h=>!isNaN(h.powerB) && h.powerB>0);
}
export const addHeroRow = ()=>{ const cur=collectHeroesFromUI(); cur.push({ ru: HERO_DB[0]?.ru || '', powerB:'', enabled:true, reserved:false }); renderHeroes(cur); };
export const clearHeroRows = ()=>renderHeroes([]);

export function parseBulkText(text){
  const lines = (text||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const parsed = []; let skipped=0;
  for(const line of lines){
    const m = line.match(/^(.+?)\s*-\s*([\d\.]+)\s*([BM])$/i);
    if(!m){ skipped++; continue; }
    const name = m[1].trim(); const num=parseFloat(m[2]); const unit=(m[3]||'B').toUpperCase();
    const powerB = unit==='B'? num : num/1000;
    parsed.push({ ru:name, powerB, enabled:true, reserved:false });
  }
  return { parsed, skipped };
}

export function buildHints(ctx, out){
  const { orders, strategy, maxTeam, wasteLimit } = ctx;
  const hints = [];
  if (strategy === 'lazy_limits') {
    const enabled = orders.filter(o => o.enabled);
    const enabledWithLimits = enabled.filter(o => o.limit != null && o.limit > 0);
    if (enabled.length > 0 && enabledWithLimits.length === 0) {
      hints.push('Стратегия «По лимитам» учитывает только типы с заполненным полем «Доступно». Укажите количество заказов по нужным типам.');
    } else if (enabled.length === 0) {
      hints.push('Для стратегии «По лимитам» включите хотя бы один тип заказа и задайте поле «Доступно».');
    }
  }
  if (strategy === 'max_points_reroll') {
    const rerollGroup = out.groups.find(g=>g.points===300 && g.reroll);
    if (rerollGroup) hints.push(`Реролл (300 очков): выделены — ${rerollGroup.members.map(m=>m.name).join(', ')}`);
  }
  if (out.groups.length === 0) {
    hints.push(`Не удалось сформировать ни одного заказа. Увеличьте «Лимит перелива» (сейчас ${wasteLimit} B) и/или «Макс. размер команды» (сейчас ${maxTeam}).`);
  }
  if (out.unused.length > 0 && out.diag?.anyLimits && out.diag?.limitsLeft) {
    const vals = Object.values(out.diag.limitsLeft);
    const allZero = vals.length && vals.every(v => v <= 0);
    const someZero = vals.some(v => v <= 0);
    if (allZero) hints.push('Лимиты по всем включённым типам исчерпаны — оставшиеся соратники не использованы из-за лимитов «Доступно».');
    else if (someZero) hints.push('Часть типов заказов исчерпана по лимиту «Доступно», поэтому некоторые соратники остались неиспользованными.');
  }
  return hints;
}
export const renderHints = (hints)=> !hints?.length ? '' :
`<div class="mt-3 p-3 rounded-xl bg-amber-50 text-amber-900 text-sm space-y-1">
  ${hints.map(h=>`<div>• ${h}</div>`).join('')}
</div>`;

export function renderResults(out, collectOrdersFromUI){
  const $tot=$('#totals'), $res=$('#result'), $un=$('#unusedWrap'); $res.innerHTML='';
  if(!out.groups.length){
    $tot.classList.add('hidden'); $un.classList.add('hidden');
    $res.innerHTML = `<div class='card'>Не удалось сформировать ни одного заказа с текущими настройками.</div>`;
    return;
  }
  $tot.classList.remove('hidden');
  $tot.innerHTML = `<div class="flex flex-wrap gap-4 items-center">
    <div class="tag">Всего заказов: <b>${out.totals.orders}</b></div>
    <div class="tag">Очки: <b>${out.totals.points}</b></div>
    <div class="tag">Перелив силы: <b>${round3(out.totals.wasteB)} B</b></div>
    <div class="tag">Неисп.: <b>${out.unused.length}</b></div>
  </div>`;
  try{
    const orders = collectOrdersFromUI();
    const strategy = $('#strategy').value;
    const maxTeam = Math.max(1, Math.min(6, +$('#maxTeam').value || 4));
    const wasteLimit = +(($('#wasteLimit').value)||0.25);
    const hints = buildHints({ orders, strategy, maxTeam, wasteLimit }, out);
    $tot.innerHTML += renderHints(hints);
  }catch{}

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
      ${g.members.map(h=>`<div class='flex items-center justify-between p-2 rounded-xl bg-gray-50'>
        <div class='text-sm'><div class='font-medium'>${h.name}</div>
        <div class='text-gray-500'>${h.powerB.toFixed(3)} B</div></div>
        ${g.reroll?'<span class="badge bg-purple-100 text-purple-700">REROLL</span>':''}
      </div>`).join('')}
    </div>`;
    frag.appendChild(card);
  });
  $res.appendChild(frag);

  $un.classList.remove('hidden');
  $un.innerHTML = `<div class='text-sm font-semibold mb-2'>Неиспользованные (${out.unused.length})</div>
  <div class='grid sm:grid-cols-2 md:grid-cols-3 gap-2'>${out.unused.map(h=>`<div class='p-2 rounded-xl bg-gray-50 text-sm'>${h.name} <span class='text-gray-500'>(${h.powerB.toFixed(3)} B)</span></div>`).join('')}</div>`;
}
