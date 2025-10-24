// ui.js — версия без «резерва»
import { FIXED_ORDERS, HERO_DB, $, $$, round3 } from './constants.js';

/* ===== отметки «отправлен» ===== */
export const SentStore = {
  _set: new Set(),
  keyOf(group){
    const names = group.members.map(m=>m.name).slice().sort().join(',');
    return `${group.points}|${group.thr}|${names}`;
  },
  isMarked(group){ return this._set.has(this.keyOf(group)); },
  toggle(group){
    const k = this.keyOf(group);
    if (this._set.has(k)) this._set.delete(k);
    else this._set.add(k);
  },
  clear(){ this._set.clear(); }
};

/* ===== Заказы UI ===== */
export function renderOrdersFixed(arr = FIXED_ORDERS){
  const wrap = $('#ordersList'); if (!wrap) return;
  wrap.innerHTML='';
  arr.forEach((o,idx)=>{
    const row = document.createElement('div');
    row.className='grid-rows-orders';
    row.innerHTML = `
      <div>
        <button class="toggle ${o.enabled?'on':''}" data-idx="${idx}">
          <span class="toggle-dot"></span>
        </button>
      </div>
      <div><div class="input bg-slate-50 text-center">${o.points}</div></div>
      <div><input type="number" inputmode="decimal" step="0.001" min="0" max="999.999"
                  class="input" value="${o.powerB}" data-idx="${idx}" data-field="powerB"></div>
      <div><input type="number" inputmode="numeric" min="0" max="99" step="1"
                  class="input" value="${o.limit??''}" placeholder="∞" data-idx="${idx}" data-field="limit"></div>`;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('.toggle').forEach(btn=>btn.addEventListener('click',()=>btn.classList.toggle('on')));
}

export function collectOrdersFromUI(){
  return $$('#ordersList > div').map((row,idx)=>{
    const rawLimit = String(row.querySelector('[data-field="limit"]').value||'').trim();
    let limitVal = null;
    if(rawLimit!==''){
      const n = Number(rawLimit);
      limitVal = (isFinite(n) && n>=0) ? Math.min(99, Math.floor(n)) : null;
    }
    let powerB = +row.querySelector('[data-field="powerB"]').value;
    if (isNaN(powerB) || powerB < 0) powerB = 0;
    if (powerB > 999.999) powerB = 999.999;
    powerB = Math.round(powerB * 1000) / 1000;
    return {
      id: FIXED_ORDERS[idx].id,
      points: FIXED_ORDERS[idx].points,
      enabled: row.querySelector('.toggle').classList.contains('on'),
      powerB, limit: limitVal
    };
  });
}

/* ===== Соратники UI (без «резерва») ===== */
function heroRowTemplate(idx, data={ ru:'', name:'', powerB:'', enabled:true }){
  const selected = (data.name || data.ru || '');
  const opts = HERO_DB.map(h=>`<option value="${h.ru}" ${h.ru===selected?'selected':''}>${h.ru}</option>`).join('');
  return `
  <div class="grid-rows-heroes hero-row" data-row="${idx}">
    <div><select class="input" data-field="name">${opts}</select></div>
    <div><input type="number" inputmode="decimal" step="0.001" min="0" max="999.999"
                class="input" data-field="powerB" value="${data.powerB||''}" placeholder="0"></div>
    <div class="flex items-center justify-center">
      <button class="toggle ${data.enabled?'on':''}" data-field="enabled">
        <span class="toggle-dot"></span>
      </button>
    </div>
  </div>`;
}

export function renderHeroes(rows){
  const wrap = $('#heroesList'); if (!wrap) return;
  wrap.innerHTML='';
  rows.forEach((r,idx)=>{
    const div=document.createElement('div');
    div.innerHTML=heroRowTemplate(idx,r);
    wrap.appendChild(div.firstElementChild);
  });
  wrap.querySelectorAll('.toggle').forEach(btn=>btn.addEventListener('click',()=>btn.classList.toggle('on')));
}

export function collectHeroesFromUI(){
  return $$('#heroesList [data-row]').map(row=>{
    const ru = row.querySelector('[data-field="name"]').value;
    let powerB = +row.querySelector('[data-field="powerB"]').value;
    if (isNaN(powerB) || powerB < 0) powerB = 0;
    if (powerB > 999.999) powerB = 999.999;
    powerB = Math.round(powerB * 1000) / 1000;
    return {
      name: ru,
      powerB,
      enabled: row.querySelector('[data-field="enabled"]').classList.contains('on')
    };
  }).filter(h=>h.powerB>0);
}

export const addHeroRow = ()=>{
  const cur=collectHeroesFromUI();
  cur.push({ ru: HERO_DB[0]?.ru || '', powerB:'', enabled:true });
  renderHeroes(cur);
};
export const clearHeroRows = ()=>renderHeroes([]);

/* ===== Импорт из текста ===== */
export function parseBulkText(text){
  const lines = (text||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const parsed = []; let skipped=0;
  for(const line of lines){
    const m = line.match(/^(.+?)\s*-\s*([\d\.]+)\s*([BM])$/i);
    if(!m){ skipped++; continue; }
    const name = m[1].trim();
    const num = parseFloat(m[2]);
    const unit = (m[3]||'B').toUpperCase();
    let powerB = unit==='B'? num : num/1000;
    if (powerB > 999.999) powerB = 999.999;
    powerB = Math.round(powerB * 1000) / 1000;
    parsed.push({ ru:name, powerB, enabled:true });
  }
  return { parsed, skipped };
}

/* ===== Подсказки/результаты (без изменений функционала) ===== */
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

function sortGroups(groups, sortBy){
  const arr = groups.slice();
  switch (sortBy) {
    case 'wasteAsc':   return arr.sort((a,b)=> a.wasteB - b.wasteB || a.points - b.points);
    case 'wasteDesc':  return arr.sort((a,b)=> b.wasteB - a.wasteB || b.points - a.points);
    case 'sizeAsc':    return arr.sort((a,b)=> a.members.length - b.members.length || a.points - b.points);
    case 'sizeDesc':   return arr.sort((a,b)=> b.members.length - a.members.length || b.points - a.points);
    case 'pointsDesc': return arr.sort((a,b)=> b.points - a.points || a.wasteB - b.wasteB);
    case 'thrAsc':     return arr.sort((a,b)=> a.thr - b.thr || b.points - a.points);
    default: return arr;
  }
}

export function renderResults(out, collectOrdersFromUI){
  const $tot=$('#totals'), $res=$('#result'), $un=$('#unusedWrap');
  if (!$tot || !$res || !$un) return;
  $res.innerHTML='';

  const sortBy = ($('#sortBy')?.value) || 'none';
  const hideSent = !!$('#hideSent')?.checked;

  let shownGroups = out.groups;
  if (hideSent) shownGroups = shownGroups.filter(g=> !SentStore.isMarked(g));
  shownGroups = sortGroups(shownGroups, sortBy);

  $tot.classList.remove('hidden');
  $tot.innerHTML = `<div class="flex flex-wrap gap-4 items-center">
    <span class="tag">Всего заказов: <b>${out.totals.orders}</b></span>
    <span class="tag">Очки: <b>${out.totals.points}</b></span>
    <span class="tag">Перелив силы: <b>${round3(out.totals.wasteB)} B</b></span>
    <span class="tag">Неисп.: <b>${out.unused.length}</b></span>
  </div>` + renderHints(buildHints({
    orders: collectOrdersFromUI(),
    strategy: $('#strategy')?.value,
    maxTeam: Math.max(1, Math.min(6, +$('#maxTeam')?.value || 4)),
    wasteLimit: +(($('#wasteLimit')?.value)||0.25)
  }, out));

  if(!shownGroups.length){
    $res.innerHTML = `<div class='card'>Нет карточек к показу.</div>`;
  } else {
    const frag=document.createDocumentFragment();
    shownGroups.forEach(g=>{
      const sent = SentStore.isMarked(g);
      const card=document.createElement('div');
      card.className='card';
      card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="text-xs text-slate-500">Заказ</div>
          <div class="text-lg"><b>${g.order}</b> очков</div>
          <div class="text-sm text-slate-500">Порог: ${g.thr} B • Команда: ${g.members.length}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500">Сумма силы</div>
          <div class="text-lg"><b>${g.sumB} B</b></div>
          <div class="text-sm text-slate-500">Перелив: ${g.wasteB} B</div>
        </div>
      </div>
      <div class="mt-3 grid" style="grid-template-columns:1fr 1fr; gap:8px">
        ${g.members.map(h=>`<div class='p-2 rounded-xl bg-slate-50 flex items-center justify-between'>
          <div class='text-sm'><div class='font-medium'>${h.name}</div>
          <div class='text-slate-500'>${h.powerB.toFixed(3)} B</div></div>
          ${g.reroll?'<span class="px-2 py-0.5 rounded-md text-xs bg-violet-100 text-violet-800">REROLL</span>':''}
        </div>`).join('')}
      </div>
      <div class="mt-3 flex items-center justify-between">
        <button class="btn btn-soft btn-sent ${sent?'sent':''}" data-key="${SentStore.keyOf(g)}">${sent?'Отправлен':'Пометить «отправлен»'}</button>
        <div class="text-xs text-slate-500">Ключ: ${g.points} / ${g.thr} / ${g.members.length} чл.</div>
      </div>`;
      frag.appendChild(card);
    });
    $res.appendChild(frag);

    $$('#result .btn-sent').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const key = btn.getAttribute('data-key');
        const grp = out.groups.find(g=> SentStore.keyOf(g) === key);
        if (!grp) return;
        SentStore.toggle(grp);
        const isNow = SentStore.isMarked(grp);
        btn.textContent = isNow ? 'Отправлен' : 'Пометить «отправлен»';
        btn.classList.toggle('sent', isNow);
        if ($('#hideSent')?.checked) renderResults(out, collectOrdersFromUI);
      });
    });
  }

  $un.classList.remove('hidden');
  $un.innerHTML = `<div class='text-sm font-semibold mb-2'>Неиспользованные (${out.unused.length})</div>
  <div class='grid' style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
    ${out.unused.map(h=>`<div class='p-2 rounded-xl bg-slate-50'>${h.name} <span class='text-slate-500'>(${h.powerB.toFixed(3)} B)</span></div>`).join('')}
  </div>`;
}
