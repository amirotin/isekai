// app.js
import { FIXED_ORDERS, HERO_DB, $, $$ } from './constants.js';
import { saveConfig, loadConfig } from './storage.js';
import { renderOrdersFixed, collectOrdersFromUI, renderHeroes, collectHeroesFromUI,
         addHeroRow, clearHeroRows, parseBulkText, renderResults, SentStore } from './ui.js';
import { planAssignment } from './strategies.js';

let lastPlanOut = null;

function groupsToCSV(out){
  const rows = [['points','thresholdB','sumB','wasteB','size','members']];
  for(const g of (out?.groups||[])){
    rows.push([
      g.points,
      g.thr,
      g.sumB,
      g.wasteB,
      g.members.length,
      g.members.map(m=>`${m.name}(${m.powerB.toFixed(3)}B)`).join(' + ')
    ]);
  }
  return rows.map(r=>r.map(x=>{
    const s = String(x ?? '');
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  }).join(';')).join('\n');
}
function downloadText(filename, text){
  const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  a.click();
}

function runPlanner(){
  // Сбрасываем отметки «отправлен» при каждом новом перерасчёте
  SentStore.clear();

  const orders = collectOrdersFromUI();
  const heroes = collectHeroesFromUI();
  const strategy = $('#strategy').value;
  const maxTeam = Math.max(1, Math.min(6, +$('#maxTeam').value || 4));
  const wasteLimit = +($('#wasteLimit').value||0.25);
  lastPlanOut = planAssignment({orders, heroes, strategy, maxTeam, wasteLimit});
  renderResults(lastPlanOut, collectOrdersFromUI);
}

function syncStrategyUI(){
  const val = $('#strategy')?.value;
  const maxTeamEl = $('#maxTeam');
  const wasteEl   = $('#wasteLimit');
  const disableMW = (val==='max_points' || val==='max_points_reroll');
  const disableMaxTeam = disableMW || (val==='min_clicks');
  if (maxTeamEl){ maxTeamEl.disabled = disableMaxTeam; maxTeamEl.classList.toggle('opacity-50', disableMaxTeam); maxTeamEl.classList.toggle('cursor-not-allowed', disableMaxTeam); }
  if (wasteEl){  const dis = disableMW || (val==='min_clicks'); wasteEl.disabled = dis; wasteEl.classList.toggle('opacity-50', dis); wasteEl.classList.toggle('cursor-not-allowed', dis); }
}

function init(){
  renderOrdersFixed(FIXED_ORDERS);
  renderHeroes([]);

  $('#addHeroRow').addEventListener('click', addHeroRow);
  $('#clearHeroRows').addEventListener('click', clearHeroRows);
  $('#run').addEventListener('click', runPlanner);

  $('#sortBy')?.addEventListener('change', ()=> renderResults(lastPlanOut || {groups:[], unused:[], totals:{points:0,orders:0,wasteB:0}}, collectOrdersFromUI));
  $('#hideSent')?.addEventListener('change', ()=> renderResults(lastPlanOut || {groups:[], unused:[], totals:{points:0,orders:0,wasteB:0}}, collectOrdersFromUI));

  $('#parseBulk').addEventListener('click', ()=>{
    const ta=$('#bulkText');
    const { parsed, skipped } = parseBulkText(ta?.value || '');
    if(!parsed.length){ alert('Не распознано ни одной строки'); return; }
    const cur=collectHeroesFromUI();
    const rows=parsed.map(p=>({ ru:p.ru, powerB:p.powerB, enabled:true, reserved:false }));
    renderHeroes([...cur, ...rows]);
    if(skipped){ alert(`Импортировано: ${parsed.length}\nПропущено: ${skipped}`); }
  });
  $('#clearBulk').addEventListener('click', ()=>{ const t=$('#bulkText'); if(t) t.value=''; });
  $('#copyHeroList').addEventListener('click', async ()=>{
    const text = HERO_DB.map(h=>h.ru).slice().sort((a,b)=>a.localeCompare(b,'ru')).map(n=>`${n} - 0B`).join('\n');
    try { await navigator.clipboard.writeText(text); alert('Список имён скопирован в буфер обмена'); }
    catch {
      const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select();
      try{ document.execCommand('copy'); alert('Список имён скопирован'); }catch{ alert('Не удалось скопировать. Сохраните вручную.'); }
      finally{ document.body.removeChild(ta); }
    }
  });

  $('#saveConfig').addEventListener('click', ()=>{
    // сохраняем без отметок «отправлен» — они теперь временные на сессию расчёта
    localStorage.removeItem('isl_sp_planner_v17');
    import('./storage.js').then(({saveConfig})=>{
      saveConfig(collectOrdersFromUI, collectHeroesFromUI, ()=>[]);
      alert('Сохранено');
    });
  });

  $('#loadConfig').addEventListener('click', ()=>{
    import('./storage.js').then(({loadConfig})=>{
      const cfg=loadConfig(); if(!cfg){alert('Нет сохранённых данных');return;}
      renderOrdersFixed(FIXED_ORDERS.map((o,i)=>({ ...o, ...((cfg.orders||[])[i]||{}) })));
      renderHeroes(cfg.heroes||[]);
      $('#strategy').value=cfg.strategy||'max_points';
      $('#maxTeam').value=cfg.maxTeam||4;
      $('#wasteLimit').value = (typeof cfg.wasteLimit==='number'? cfg.wasteLimit : 0.25);
      SentStore.clear(); // после загрузки тоже сбрасываем прошлые отметки
      syncStrategyUI();
    });
  });

  $('#exportJson').addEventListener('click', ()=>{
    const data={ 
      orders: collectOrdersFromUI(),
      heroes: collectHeroesFromUI(),
      strategy: $('#strategy').value,
      maxTeam:+$('#maxTeam').value,
      wasteLimit:+($('#wasteLimit').value||0.25)
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='isl_sp_planner_config.json'; a.click();
  });

  $('#importJson').addEventListener('change', (e)=>{
    const f=e.target.files?.[0]; if(!f) return; const r=new FileReader();
    r.onload=()=>{ try{
      const cfg=JSON.parse(r.result);
      renderOrdersFixed(FIXED_ORDERS.map((o,i)=>({ ...o, ...((cfg.orders||[])[i]||{}) })));
      renderHeroes(cfg.heroes||[]);
      if(cfg.strategy) $('#strategy').value=cfg.strategy;
      if(cfg.maxTeam) $('#maxTeam').value=cfg.maxTeam;
      if(typeof cfg.wasteLimit==='number') $('#wasteLimit').value=cfg.wasteLimit;
      SentStore.clear();
      syncStrategyUI();
    }catch{ alert('Ошибка импорта'); } };
    r.readAsText(f);
  });

  window.addEventListener('beforeunload', ()=>{/* не сохраняем отметки sent */});

  $('#strategy').addEventListener('change', syncStrategyUI);
  syncStrategyUI();
}
init();
