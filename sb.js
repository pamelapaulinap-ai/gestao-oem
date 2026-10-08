/* Gestão O&M — ligação com o banco (Supabase) e tela de login.
   Ativa só quando config.js define window.GOM_CONFIG = {url, key}. Sem isso, o demo.js
   assume e os dados ficam no navegador. */
(function(){
const C=window.GOM_CONFIG;if(!C||!C.url||!C.key||!window.supabase)return;
window.GOM_TILES=true;
const sb=window.supabase.createClient(C.url,C.key,{auth:{persistSession:true,autoRefreshToken:true}});
const clone=o=>JSON.parse(JSON.stringify(o));
const collOf=p=>p.slice(0,p.lastIndexOf('/'));
const err=e=>{const m=String(e&&(e.message||e.code)||e);const o=new Error(m);
  o.code=/not_found/i.test(m)?'not_found':/row-level security|permission|JWT|not authorized/i.test(m)?'invalid_argument':/too large|payload/i.test(m)?'too_large':'unavailable';return o;};

/* ---------- login ---------- */
let session=null,resolveAuth;const authed=new Promise(r=>resolveAuth=r);
function loginUI(msg){let el=document.getElementById('gom-login');
  if(!el){el=document.createElement('div');el.id='gom-login';document.body.appendChild(el);
    const st=document.createElement('style');st.textContent=`#gom-login{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;background:var(--nav-bg,#0d1a14);padding:16px}
#gom-login form{background:var(--surface,#fff);color:var(--fg,#15202b);border-radius:12px;padding:28px 26px;width:min(380px,100%);display:grid;gap:12px;box-shadow:0 10px 40px rgba(0,0,0,.35)}
#gom-login h1{margin:0;font:700 24px/1.1 var(--f-display,sans-serif)}#gom-login p{margin:0;color:var(--fg-3,#76838f);font-size:13.5px}
#gom-login label{display:grid;gap:4px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-3,#76838f)}
#gom-login input{font:15px var(--f-body,sans-serif);padding:10px 12px;border:1px solid var(--line-2,#c3ccd3);border-radius:6px;text-transform:none;letter-spacing:0;color:var(--fg,#15202b)}
#gom-login button{font:600 15px var(--f-body,sans-serif);padding:11px;border:0;border-radius:6px;background:var(--ink,#b2d137);color:var(--ink-fg,#10201a);cursor:pointer}
#gom-login button:disabled{opacity:.6}#gom-login .e{color:var(--critical,#c42b2b);font-size:13.5px;min-height:1em}#gom-login .lg{background:var(--nav-bg,#0d1a14);border-radius:8px;padding:12px;display:grid;place-items:center}`;
    document.head.appendChild(st);}
  const logo=document.querySelector('.logo img');
  el.innerHTML=`<form novalidate>${logo?`<div class="lg"><img src="${logo.src}" alt="NetTurbo" style="max-width:170px;height:auto"></div>`:''}<h1>Gestão O&amp;M</h1><p>Entre com o e-mail e a senha cadastrados.</p>
    <label>E-mail<input type="email" name="email" autocomplete="username" required></label><label>Senha<input type="password" name="pw" autocomplete="current-password" required></label>
    <div class="e" role="alert">${msg||''}</div><button type="submit">Entrar</button><p>Sem acesso? Peça à administradora do painel para cadastrar seu e-mail.</p></form>`;
  el.hidden=false;const f=el.querySelector('form');f.email.focus();
  f.onsubmit=async e=>{e.preventDefault();const b=f.querySelector('button');b.disabled=true;f.querySelector('.e').textContent='';
    const {data,error}=await sb.auth.signInWithPassword({email:f.email.value.trim(),password:f.pw.value});b.disabled=false;
    if(error){f.querySelector('.e').textContent=/invalid/i.test(error.message)?'E-mail ou senha incorretos.':'Não foi possível entrar: '+error.message;return;}
    session=data.session;el.remove();resolveAuth();addLogout();};}
function addLogout(){if(document.getElementById('gom-out'))return;const u=document.getElementById('upd');const d=document.createElement('div');d.id='gom-out';d.style.cssText='padding:6px 18px 0;font-size:12px;color:var(--nav-fg)';
  d.innerHTML=`<span style="opacity:.8">${(session&&session.user&&session.user.email)||''}</span> · <a href="#" style="color:#fff">Sair</a>`;
  d.querySelector('a').onclick=async e=>{e.preventDefault();await sb.auth.signOut();location.reload();};if(u)u.after(d);}
(async()=>{const {data}=await sb.auth.getSession();const go=()=>{if(data.session){session=data.session;resolveAuth();addLogout();}else loginUI();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();})();
sb.auth.onAuthStateChange((ev,s)=>{if(ev==='SIGNED_OUT')location.reload();if(s)session=s;});

/* ---------- documentos ---------- */
const cache={};const listeners={doc:{},coll:{}};
function snap(path){const d=cache[path];return {id:path.split('/').pop(),exists:!!d,data:()=>d?clone(d):undefined,metadata:{}};}
function emitDoc(path){(listeners.doc[path]||[]).forEach(f=>f(snap(path)));}
function emitColl(c){const ds=Object.keys(cache).filter(k=>collOf(k)===c).sort().map(snap);(listeners.coll[c]||[]).forEach(f=>f({docs:ds,size:ds.length,empty:!ds.length,docChanges:()=>[]}));}
const loaded={};
async function loadColl(c){if(loaded[c])return loaded[c];loaded[c]=(async()=>{for(let a=0;;a+=500){const {data,error}=await sb.from('docs').select('path,data').eq('coll',c).order('path').range(a,a+499);if(error)throw err(error);
  data.forEach(r=>cache[r.path]=r.data);if(data.length<500)break;}})();return loaded[c];}
async function refetch(path){const {data,error}=await sb.from('docs').select('data').eq('path',path).maybeSingle();if(error){console.error(error);return;}
  if(data)cache[path]=data.data;else delete cache[path];emitDoc(path);emitColl(collOf(path));}
let chan=null;function realtime(){if(chan)return;chan=sb.channel('docs-'+Math.random().toString(36).slice(2)).on('postgres_changes',{event:'*',schema:'public',table:'docs'},p=>{const path=(p.new&&p.new.path)||(p.old&&p.old.path);if(!path)return;
  const c=collOf(path);if(!loaded[c]&&!listeners.doc[path])return;clearTimeout(refetch['t'+path]);refetch['t'+path]=setTimeout(()=>refetch(path),150);}).subscribe();}
async function after(path){emitDoc(path);emitColl(collOf(path));}
function docRef(path){return {path,id:path.split('/').pop(),
  get:async()=>{await authed;const {data,error}=await sb.from('docs').select('data').eq('path',path).maybeSingle();if(error)throw err(error);if(data)cache[path]=data.data;else delete cache[path];return snap(path);},
  set:async d=>{await authed;const {error}=await sb.from('docs').upsert({path,coll:collOf(path),data:d,updated_at:new Date().toISOString()},{onConflict:'path'});if(error)throw err(error);cache[path]=clone(d);after(path);},
  update:async d=>{await authed;const {error}=await sb.rpc('doc_update',{p_path:path,p_patch:d});if(error)throw err(error);await refetch(path);},
  delete:async()=>{await authed;const {error}=await sb.from('docs').delete().eq('path',path);if(error)throw err(error);delete cache[path];after(path);},
  onSnapshot:(n,onErr)=>{(listeners.doc[path]=listeners.doc[path]||[]).push(n);(async()=>{await authed;realtime();try{await docRef(path).get();n(snap(path));}catch(e){onErr&&onErr(e);}})();return()=>{};}};}
function colRef(c){return {path:c,doc:id=>docRef(c+'/'+id),
  get:async()=>{await authed;loaded[c]=null;await loadColl(c);return {docs:Object.keys(cache).filter(k=>collOf(k)===c).sort().map(snap)};},
  onSnapshot:(n,onErr)=>{(listeners.coll[c]=listeners.coll[c]||[]).push(n);(async()=>{await authed;realtime();try{await loadColl(c);emitColl(c);}catch(e){console.error(e);onErr&&onErr(e);}})();return()=>{};}};}
const db={doc:docRef,collection:colRef};

/* ---------- arquivos (rota KMZ convertida, KMZ de regularização) ---------- */
const blobCache={};const realFetch=window.fetch.bind(window);
window.fetch=async(u,o)=>{if(typeof u==='string'&&u.startsWith('/_blob/')){await authed;const id=u.slice(7);
  if(blobCache[id]==null){const {data,error}=await sb.from('blobs').select('content').eq('id',id).maybeSingle();if(error||!data)return new Response('',{status:404});blobCache[id]=data.content;}
  return new Response(blobCache[id],{status:200});}return realFetch(u,o);};
const assets={upload:async b=>{await authed;const id=Date.now().toString(16)+Math.random().toString(16).slice(2,10);const t=await b.text();const {error}=await sb.from('blobs').insert({id,content:t});if(error)throw err(error);blobCache[id]=t;return {id,url:'/_blob/'+id};}};
const user={id:async()=>{await authed;return session.user.id;},can:async()=>{await authed;return true;},
  profiles:async ids=>{await authed;const o={};(ids||[]).forEach(i=>{if(i===session.user.id)o[i]={name:session.user.email};});return o;}};
const downloads={save:async r=>{const a=document.createElement('a');a.href=URL.createObjectURL(r.data);a.download=r.filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);return {status:'saved'};}};
window.claude={use:async n=>{await authed;return ({db,assets,user,downloads})[n]||null;}};
window.GOM_ONLINE=true;
})();
