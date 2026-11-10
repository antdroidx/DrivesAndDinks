// Career player directory filtering and pagination.

import {divisionFor} from './rating.js?v=213';

export const DIRECTORY_PAGE_SIZE=40;

export function filterPlayers(athletes,filters={}){
  const query=String(filters.query??'').trim().toLowerCase();
  const minRaw=String(filters.minAge??'').trim();
  const maxRaw=String(filters.maxAge??'').trim();
  const minAge=minRaw!==''&&Number.isFinite(Number(minRaw))?Number(minRaw):null;
  const maxAge=maxRaw!==''&&Number.isFinite(Number(maxRaw))?Number(maxRaw):null;
  return (athletes??[]).filter(athlete=>{
    if(query&&!athlete.name.toLowerCase().includes(query))return false;
    if(filters.areaId&&athlete.areaId!==filters.areaId)return false;
    if(filters.cityId&&athlete.cityId!==filters.cityId)return false;
    if(filters.gender&&athlete.gender!==filters.gender)return false;
    if(filters.bracket&&divisionFor(athlete.formats?.doubles??0).id!==filters.bracket)return false;
    if(minAge!=null&&athlete.age<minAge)return false;
    if(maxAge!=null&&athlete.age>maxAge)return false;
    return true;
  }).sort((a,b)=>{
    if(filters.sort==='name')return a.name.localeCompare(b.name);
    if(filters.sort==='age-asc')return a.age-b.age||b.formats.doubles-a.formats.doubles;
    if(filters.sort==='age-desc')return b.age-a.age||b.formats.doubles-a.formats.doubles;
    if(filters.sort==='rating-asc')return a.formats.doubles-b.formats.doubles||a.name.localeCompare(b.name);
    return b.formats.doubles-a.formats.doubles||a.name.localeCompare(b.name);
  });
}

export function directoryPage(athletes,filters={},page=0,pageSize=DIRECTORY_PAGE_SIZE){
  const filtered=filterPlayers(athletes,filters);
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const current=Math.max(0,Math.min(pages-1,Number(page)||0));
  return {
    all:filtered,
    rows:filtered.slice(current*pageSize,(current+1)*pageSize),
    page:current,
    pages,
    pageSize,
    total:filtered.length
  };
}