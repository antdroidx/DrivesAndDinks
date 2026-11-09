// Simple career finance.
//
// Money is an access and support resource, not a second energy meter. The
// ledger keeps the few decisions that matter: salary, prizes, event entries,
// travel, coaching and equipment.

export const FINANCE_VERSION=1;
export const FINANCE_LEDGER_LIMIT=240;
export const OPENING_BALANCE=250;
export const COACHING_FEE=40;
export const DOMESTIC_MOVE_COST=75;
export const INTERNATIONAL_MOVE_COST=300;

export const FINANCE_CATEGORIES=Object.freeze([
  'salary','prize','entry','travel','coaching','equipment'
]);

export const SALARY_BY_CONTRACT=Object.freeze({
  none:0,
  futures:100,
  standard:250,
  gold:600
});

export const ENTRY_FEES=Object.freeze({
  'club-night':0,
  'local-league':10,
  'city-open':25,
  'regional-open':60,
  'mlp-amateur':40,
  'semi-pro':100,
  national:180,
  international:350,
  'pro-league':600,
  mlp:350,
  'world-championship':700,
  'ppa-finals':500
});

const TRAVEL_FEES=Object.freeze({
  club:0,
  city:0,
  area:25,
  region:60,
  nation:150,
  world:350
});

const CAREER_EPOCH_MS=Date.UTC(2026,0,5);

function integer(value,fallback=0){
  const number=Number(value);
  return Number.isFinite(number)?Math.round(number):fallback;
}

function financeDate(week){
  return new Date(CAREER_EPOCH_MS+Math.max(0,integer(week))*7*86400000).toISOString().slice(0,10);
}

export function emptyFinance(openingBalance=OPENING_BALANCE){
  return {version:FINANCE_VERSION,openingBalance:integer(openingBalance,OPENING_BALANCE),ledger:[]};
}

export function normalizeFinance(value,openingBalance=OPENING_BALANCE){
  if(!value||typeof value!=='object')return emptyFinance(openingBalance);
  return {
    version:FINANCE_VERSION,
    openingBalance:integer(value.openingBalance,integer(openingBalance,OPENING_BALANCE)),
    ledger:Array.isArray(value.ledger)?value.ledger.slice(-FINANCE_LEDGER_LIMIT):[]
  };
}

export function moneyBalance(state){
  const value=Number(state?.money);
  return Number.isFinite(value)?value:OPENING_BALANCE;
}

export function entryFeeForEvent(event){
  const eventId=event?.eventId??event?.id;
  return Math.max(0,ENTRY_FEES[eventId]??({
    local:0,challenger:35,open:100,cup:225,major:450,world:600
  }[event?.tier]??0));
}

export function travelFeeForEvent(event){
  return Math.max(0,TRAVEL_FEES[event?.scope]??0);
}

export function eventFinancialCost(state,event){
  const week=Number(state?.week)||0;
  const eventId=String(event?.eventId??event?.id??'');
  const alreadyEntered=(state?.eventEntries??[]).some(entry=>entry.week===week&&entry.eventId===eventId);
  if(alreadyEntered)return {entry:0,travel:0,total:0,alreadyPaid:true};
  const entry=entryFeeForEvent(event);
  const travel=travelFeeForEvent(event);
  return {entry,travel,total:entry+travel,alreadyPaid:false};
}

export function coachingCost(enabled=false){
  return enabled?COACHING_FEE:0;
}

export function moveTravelCost(international=false){
  return international?INTERNATIONAL_MOVE_COST:DOMESTIC_MOVE_COST;
}

export function salaryForContract(state){
  return Math.max(0,SALARY_BY_CONTRACT[state?.contract??'none']??0);
}

function transactionId(week,category,reference){
  return `${Math.max(0,integer(week))}:${category}:${String(reference??'entry')}`;
}

export function recordFinance(state,transaction){
  const amount=integer(transaction?.amount);
  if(!amount)return {ok:true,state,entry:null,duplicate:false};
  const category=FINANCE_CATEGORIES.includes(transaction?.category)?transaction.category:null;
  if(!category)return {ok:false,state,entry:null,duplicate:false,message:`Unknown finance category "${transaction?.category}"`};
  const week=Math.max(0,integer(transaction?.week??state?.week));
  const reference=String(transaction?.reference??category);
  const id=transactionId(week,category,reference);
  const finance=normalizeFinance(state?.finance,moneyBalance(state));
  const existing=finance.ledger.find(entry=>entry.id===id);
  if(existing)return {ok:true,state,entry:existing,duplicate:true};
  const before=moneyBalance(state);
  const balanceAfter=before+amount;
  if(balanceAfter<0){
    return {ok:false,state,entry:null,duplicate:false,message:`That costs $${Math.abs(amount).toLocaleString('en-US')}. You have $${before.toLocaleString('en-US')}.`};
  }
  const entry={
    id,
    week,
    date:financeDate(transaction?.date??week),
    category,
    type:amount>0?'income':'expense',
    label:String(transaction?.label??category),
    amount,
    balanceAfter,
    reference
  };
  return {
    ok:true,
    duplicate:false,
    entry,
    state:{
      ...state,
      money:balanceAfter,
      finance:{...finance,ledger:[...finance.ledger,entry].slice(-FINANCE_LEDGER_LIMIT)}
    }
  };
}

export function chargeEventCosts(state,event,label=event?.label??'Event'){
  const cost=eventFinancialCost(state,event);
  if(!cost.total)return {ok:true,state,cost,message:null};
  if(moneyBalance(state)<cost.total){
    return {
      ok:false,
      state,
      cost,
      message:`${label} needs $${cost.total.toLocaleString('en-US')} for entry and travel. You have $${moneyBalance(state).toLocaleString('en-US')}.`
    };
  }
  const week=Number(state?.week)||0;
  const eventId=String(event?.eventId??event?.id??'event');
  let next=state;
  if(cost.travel){
    const charged=recordFinance(next,{
      week,
      category:'travel',
      label:`Travel · ${label}`,
      amount:-cost.travel,
      reference:`event:${eventId}`
    });
    if(!charged.ok)return {...charged,cost};
    next=charged.state;
  }
  if(cost.entry){
    const charged=recordFinance(next,{
      week,
      category:'entry',
      label:`Entry · ${label}`,
      amount:-cost.entry,
      reference:`event:${eventId}`
    });
    if(!charged.ok)return {...charged,cost};
    next=charged.state;
  }
  return {ok:true,state:next,cost,message:null};
}

export function chargeMove(state,{international=false,cityLabel='new city',reference='move'}={}){
  const amount=moveTravelCost(international);
  return recordFinance(state,{
    week:state?.week??0,
    category:'travel',
    label:`Travel · ${cityLabel}`,
    amount:-amount,
    reference
  });
}

export function chargeCoaching(state,{focus='training',reference='coaching'}={}){
  return recordFinance(state,{
    week:state?.week??0,
    category:'coaching',
    label:`Coaching · ${focus}`,
    amount:-COACHING_FEE,
    reference
  });
}

export function paySalary(state,{week=state?.week??0,contract=state?.contract??'none'}={}){
  const amount=SALARY_BY_CONTRACT[contract]??0;
  if(!amount)return {ok:true,state,entry:null,duplicate:false};
  return recordFinance(state,{
    week,
    category:'salary',
    label:`${contract[0].toUpperCase()+contract.slice(1)} salary`,
    amount,
    reference:`salary:${contract}`
  });
}

export function creditPrize(state,{week=state?.week??0,label='Prize',amount=0,reference='prize'}){
  const prize=Math.max(0,integer(amount));
  if(!prize)return {ok:true,state,entry:null,duplicate:false};
  return recordFinance(state,{
    week,
    category:'prize',
    label,
    amount:prize,
    reference
  });
}

export function financeSummary(state){
  const finance=normalizeFinance(state?.finance,moneyBalance(state));
  const totals=finance.ledger.reduce((summary,entry)=>{
    if(entry.amount>0)summary.income+=entry.amount;
    else summary.expenses+=Math.abs(entry.amount);
    summary[entry.category]=(summary[entry.category]??0)+entry.amount;
    return summary;
  },{income:0,expenses:0});
  return {
    balance:moneyBalance(state),
    income:totals.income,
    expenses:totals.expenses,
    byCategory:totals,
    ledger:finance.ledger
  };
}

export function validateFinance(state){
  const finance=state?.finance;
  if(!finance||typeof finance!=='object')return {ok:false,reason:'Finance ledger is missing'};
  if(finance.version!==FINANCE_VERSION)return {ok:false,reason:'Finance ledger version is invalid'};
  if(!Number.isFinite(finance.openingBalance)||finance.openingBalance<0)return {ok:false,reason:'Opening balance is invalid'};
  if(!Array.isArray(finance.ledger))return {ok:false,reason:'Finance ledger is invalid'};
  if(finance.ledger.length>FINANCE_LEDGER_LIMIT)return {ok:false,reason:'Finance ledger is unbounded'};
  const ids=new Set();
  for(const entry of finance.ledger){
    if(!entry||typeof entry!=='object')return {ok:false,reason:'Finance entry is invalid'};
    if(typeof entry.id!=='string'||!entry.id||ids.has(entry.id))return {ok:false,reason:'Finance entry id is invalid'};
    ids.add(entry.id);
    if(!Number.isInteger(entry.week)||entry.week<0)return {ok:false,reason:'Finance entry week is invalid'};
    if(typeof entry.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(entry.date))return {ok:false,reason:'Finance entry date is invalid'};
    if(!FINANCE_CATEGORIES.includes(entry.category))return {ok:false,reason:'Finance entry category is invalid'};
    if(!['income','expense'].includes(entry.type))return {ok:false,reason:'Finance entry type is invalid'};
    if(typeof entry.label!=='string'||!entry.label.trim())return {ok:false,reason:'Finance entry label is invalid'};
    if(!Number.isInteger(entry.amount)||!entry.amount)return {ok:false,reason:'Finance entry amount is invalid'};
    if((entry.amount>0?'income':'expense')!==entry.type)return {ok:false,reason:'Finance entry direction is invalid'};
    if(!Number.isFinite(entry.balanceAfter)||entry.balanceAfter<0)return {ok:false,reason:'Finance entry balance is invalid'};
  }
  const last=finance.ledger.at(-1);
  if(last&&Math.abs(last.balanceAfter-moneyBalance(state))>.001)return {ok:false,reason:'Finance balance does not match the career'};
  return {ok:true};
}
