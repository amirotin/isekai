// main.js (entry)
import { FIXED_ORDERS, HERO_DB, $, $$ } from './constants.js';
import { saveConfig, loadConfig } from './storage.js';
import { renderOrdersFixed, collectOrdersFromUI, renderHeroes, collectHeroesFromUI,
         addHeroRow, clearHeroRows, parseBulkText, renderResults, SentStore } from './ui.js';
import { planAssignment } from './strategies.js';

function runPlanner(){
  const orders = collectOrdersFromUI();
  const heroes = collectHeroesFromUI();
  const strategy = $('#strategy').value;
  const maxTeam = Math.max(1, Math.min(6, +$('#maxTeam').value || 4));
  const wasteLimit = +($('#wasteLimit').value||0.25);
  const out = planAssignment({orders, heroes, strategy, maxTeam, wasteLimit});
  renderResults(out, collectOrdersFromUI);
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

  // Sorting / filtering controls re-render
  $('#sortBy')?.addEventListener('change', runPlanner);
  $('#hideSent')?.addEventListener('change', runPlanner);

  // Bulk import (как было)
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

  // Save/Load/Import/Export
  $('#saveConfig').addEventListener('click', ()=>{
    saveConfig(collectOrdersFromUI, collectHeroesFromUI, ()=>SentStore.toJSON());
    alert('Сохранено');
  });

  $('#loadConfig').addEventListener('click', ()=>{
    const cfg=loadConfig(); if(!cfg){alert('Нет сохранённых данных');return;}
    renderOrdersFixed(FIXED_ORDERS.map((o,i)=>({ ...o, ...((cfg.orders||[])[i]||{}) })));
    renderHeroes(cfg.heroes||[]);
    $('#strategy').value=cfg.strategy||'max_points';
    $('#maxTeam').value=cfg.maxTeam||4;
    $('#wasteLimit').value = (typeof cfg.wasteLimit==='number'? cfg.wasteLimit : 0.25);
    // восстановить отметки «отправлен»
    SentStore.fromJSON(cfg.sentMarks || []);
    syncStrategyUI();
  });

  $('#exportJson').addEventListener('click', ()=>{
    const data={ 
      orders: collectOrdersFromUI(),
      heroes: collectHeroesFromUI(),
      strategy: $('#strategy').value,
      maxTeam:+$('#maxTeam').value,
      wasteLimit:+($('#wasteLimit').value||0.25),
      sentMarks: SentStore.toJSON()
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
      // отметки «отправлен»
      SentStore.fromJSON(cfg.sentMarks || []);
      syncStrategyUI();
    }catch{ alert('Ошибка импорта'); } };
    r.readAsText(f);
  });

  window.addEventListener('beforeunload', ()=>saveConfig(collectOrdersFromUI, collectHeroesFromUI, ()=>SentStore.toJSON()));

  $('#strategy').addEventListener('change', syncStrategyUI);
  syncStrategyUI();
}
init();
