// storage.js
import { LS_KEY } from './constants.js';
import { $, $$ } from './constants.js';

export function saveConfig(collectOrdersFromUI, collectHeroesFromUI){
  const data = {
    orders: collectOrdersFromUI(),
    heroes: collectHeroesFromUI(),
    strategy: $('#strategy').value,
    maxTeam: +$('#maxTeam').value,
    wasteLimit: +($('#wasteLimit').value||0.25)
  };
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function loadConfig(){
  const raw = localStorage.getItem(LS_KEY);
  if(!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
