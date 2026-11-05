/* Per-request reward transactions. Anonymous limits are stored in this browser,
 * not represented as account-level entitlements or server-enforced quotas. */
export const WEB_REWARD_SETTINGS=Object.freeze({enabled:false,publisher:'ca-pub-2987859449523053',reason:'H5_GAMES_ACCESS_AND_WEB_CONSENT_NOT_VERIFIED'});
const dateKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export async function freshWebConnection(signal){
 if(typeof navigator!=='undefined'&&navigator.onLine===false)return false;
 try{const u=new URL('/robots.txt',location.origin);u.searchParams.set('reward_check',`${Date.now()}-${Math.random()}`);const r=await fetch(u,{cache:'no-store',credentials:'omit',signal});return r.ok;}catch{return false;}
}
export function createWebRewards({storage,day=dateKey,online=freshWebConnection,provider={enabled:false},timeoutMs=45000}={}){
 if(!storage){try{storage=globalThis.localStorage}catch{storage=null}}
 const key='smartpuzzles:web:sudoku:daily:v1';let cached=null,active=null;
 function usage(){let read;try{read=JSON.parse(storage?.getItem(key));}catch{}read=read||cached;return read?.day===day()?{day:day(),freeHints:Math.max(0,Math.min(3,Number(read.freeHints)||0)),coach:Math.max(0,Math.min(3,Number(read.coach)||0))}:{day:day(),freeHints:0,coach:0};}
 function save(data){cached=data;try{storage?.setItem(key,JSON.stringify(data));}catch{}}
 function cancel(){if(active){active.abort();active=null;}}
 async function acquire(kind,{onProgress=()=>{},onPrompt=()=>Promise.resolve(false)}={}){
  if(active)return {status:'busy'};
  if(!['hint','coach'].includes(kind))return {status:'invalid'};
  const initial=usage();if(kind==='coach'&&initial.coach>=3)return {status:'limit'};
  const controller=new AbortController();active=controller;let fallback=false,settled=false;
  const release=()=>{if(active===controller)active=null;};
  const ticket=()=>({status:'granted',fallback,commit(){if(settled)return false;settled=true;release();if(controller.signal.aborted||day()!==initial.day)return false;const current=usage();if(kind==='coach'){if(current.coach>=3)return false;current.coach++;}else if(initial.freeHints<3)current.freeHints=Math.min(3,current.freeHints+1);save(current);return true;},cancel(){if(!settled){settled=true;controller.abort();release();}}});
  let timer;
  try{
   if(kind==='hint'&&initial.freeHints<3)return ticket();
   timer=setTimeout(()=>controller.abort('timeout'),timeoutMs);
   const aborted=new Promise(resolve=>controller.signal.addEventListener('abort',()=>resolve({status:controller.signal.reason==='timeout'?'retry':'cancelled'}),{once:true}));
   const operation=(async()=>{
    if(!await online(controller.signal))return {status:controller.signal.aborted?'cancelled':'offline'};
    if(controller.signal.aborted)return {status:'cancelled'};
    if(!provider.enabled||typeof provider.show!=='function')return {status:'unavailable'};
    const total=kind==='coach'?2:1;
    for(let n=1;n<=total;n++){
     if(controller.signal.aborted)return {status:'cancelled'};
     // A new request AND connectivity check for every advertised video.
     if(n>1&&!await online(controller.signal))return {status:'offline'};
     onProgress({n,total});
     const result=await provider.show({kind,n,total,signal:controller.signal,onPrompt});
     if(controller.signal.aborted)return {status:'cancelled'};
     if(result.status==='dismissed'||result.status==='cancelled')return {status:'cancelled'};
     if(result.status==='failed'&&result.attempted===true){fallback=true;return {status:'ready'};}
     if(result.status!=='viewed')return {status:result.status==='unavailable'?'unavailable':'retry'};
    }
    return {status:'ready'};
   })();
   const result=await Promise.race([operation,aborted]);
   if(result.status==='ready'&&!controller.signal.aborted)return ticket();
   release();return result;
  }catch{release();return {status:controller.signal.aborted?'cancelled':'retry'};}
  finally{clearTimeout(timer);}
 }
 return {usage,acquire,cancel,get busy(){return Boolean(active)}};
}

/* Enable only after the publisher has H5 Games Ads access and a verified web
 * consent flow. iOS AdMob readiness is not H5 Games Ads access. */
export function createGoogleWebRewardProvider({settings=WEB_REWARD_SETTINGS,consentReady=()=>false,adBreak=globalThis.adBreak}={}){
 return {enabled:Boolean(settings.enabled),async show({onPrompt,signal,n,total}){
  if(!settings.enabled||!await consentReady()||typeof adBreak!=='function')return {status:'unavailable',attempted:false};
  return new Promise(resolve=>{
   let done=false,viewed=false,dismissed=false;const finish=result=>{if(!done){done=true;resolve(result)}};
   signal.addEventListener('abort',()=>finish({status:'cancelled'}),{once:true});
   try{adBreak({type:'reward',name:`sudoku-${Date.now()}-${n}`,beforeReward:show=>{Promise.resolve(onPrompt({n,total})).then(accept=>{if(accept&&!signal.aborted&&!done)show();else finish({status:'cancelled'});}).catch(()=>finish({status:'cancelled'}));},adViewed:()=>{viewed=true},adDismissed:()=>{dismissed=true},adBreakDone:info=>{
    if(signal.aborted)return finish({status:'cancelled'});
    if(viewed||info?.breakStatus==='viewed')finish({status:'viewed'});
    else if(dismissed||['dismissed','ignored'].includes(info?.breakStatus))finish({status:'dismissed'});
    else if(['noAdPreloaded','timeout','error'].includes(info?.breakStatus))finish({status:'failed',attempted:true});
    else finish({status:'unavailable',attempted:true});
   }});}catch{finish({status:'retry',attempted:true});}
  });
 }};
}
