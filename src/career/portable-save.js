// Portable career files.
//
// The portable envelope is independent from localStorage. It records the
// career schema, is gzip-compressed when the platform provides CompressionStream,
// and always passes through the same migration and validation chain on import.

import {CAREER_SAVE_VERSION,migrateCareer,validateCareer} from './save.js?v=207';

export const PORTABLE_VERSION=1;
export const PORTABLE_PREFIX='DDC1.';

function bytesToBase64(bytes){
  let binary='';
  for(let index=0;index<bytes.length;index+=8192)binary+=String.fromCharCode(...bytes.slice(index,index+8192));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function base64ToBytes(value){
  const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((value.length+3)%4);
  const binary=atob(padded);const bytes=new Uint8Array(binary.length);
  for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
  return bytes;
}
async function streamBytes(bytes,Stream,direction){
  if(typeof Stream!=='function')return null;
  try{
    const stream=new Stream(direction);
    const responsePromise=new Response(stream.readable).arrayBuffer();
    const writer=stream.writable.getWriter();
    await writer.write(bytes);await writer.close();
    return new Uint8Array(await responsePromise);
  }catch{return null;}
}

export async function exportCareerPortable(state,{exportedAt=new Date().toISOString()}={}){
  const check=validateCareer(state);
  if(!check.ok)throw new Error(check.reason);
  const payload={format:'drives-and-dinks-career',portableVersion:PORTABLE_VERSION,schemaVersion:CAREER_SAVE_VERSION,exportedAt,state};
  const raw=new TextEncoder().encode(JSON.stringify(payload));
  const gzip=await streamBytes(raw,globalThis.CompressionStream,'gzip');
  return `${PORTABLE_PREFIX}${gzip?'g':'j'}.${bytesToBase64(gzip??raw)}`;
}

export async function importCareerPortable(text){
  const value=String(text??'').trim();
  if(!value.startsWith(PORTABLE_PREFIX))return {ok:false,reason:'This is not a Drives & Dinks portable career file.'};
  const match=value.match(/^DDC1\.([gj])\.([A-Za-z0-9_-]+)$/);
  if(!match)return {ok:false,reason:'Portable career file is malformed.'};
  let bytes;
  try{bytes=base64ToBytes(match[2])}catch{return {ok:false,reason:'Portable career data is unreadable.'}}
  if(match[1]==='g'){
    const inflated=await streamBytes(bytes,globalThis.DecompressionStream,'gzip');
    if(!inflated)return {ok:false,reason:'This browser cannot decompress this career file.'};
    bytes=inflated;
  }
  let payload;
  try{payload=JSON.parse(new TextDecoder().decode(bytes))}catch{return {ok:false,reason:'Portable career data is not valid JSON.'}}
  if(payload.format!=='drives-and-dinks-career'||payload.portableVersion!==PORTABLE_VERSION)return {ok:false,reason:'Portable career format is unsupported.'};
  if(!Number.isInteger(payload.schemaVersion)||payload.schemaVersion>CAREER_SAVE_VERSION)return {ok:false,reason:'Portable career schema is newer than this build.'};
  const migrated=migrateCareer({version:payload.schemaVersion,state:payload.state});
  if(!migrated.ok)return migrated;
  const check=validateCareer(migrated.state);
  if(!check.ok)return {ok:false,reason:check.reason};
  return {ok:true,state:migrated.state,exportedAt:payload.exportedAt,version:migrated.version};
}