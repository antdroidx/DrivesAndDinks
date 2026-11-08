import {C} from './core.js?v=193';

export const CM_PER_FOOT=30.48;
export const NEUTRAL_PLAYER_HEIGHT_CM=177;
export const ANIME_CANONICAL_BODY_UNITS=64;
export const ANIME_VISUAL_BODY_UNITS=53;
export const PROFILE_CANONICAL_BODY_UNITS=63;
export const PROFILE_VISUAL_BODY_UNITS=56.5;

export function playerHeightFeet(heightCm=NEUTRAL_PLAYER_HEIGHT_CM){
 const value=Number.isFinite(Number(heightCm))?Number(heightCm):NEUTRAL_PLAYER_HEIGHT_CM;
 return Math.max(145,Math.min(210,value))/CM_PER_FOOT;
}

export function playerBoxHeight(heightCm,pixelsPerFoot,visualBodyUnits,canonicalBodyUnits){
 return playerHeightFeet(heightCm)*pixelsPerFoot*canonicalBodyUnits/visualBodyUnits;
}

export function netTopHeight(x){
 const edge=Math.max(0,Math.min(1,Math.abs(x/C.width*2-1)));
 return C.netCenterHeight+(C.netPostHeight-C.netCenterHeight)*edge*edge;
}
