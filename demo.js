/* Gestão O&M — modo local: os dados ficam guardados só neste navegador (IndexedDB),
   até a ligação com o banco de dados e o login da empresa. */
(function(){
window.GOM_TILES=true;
const DBN='gestao-oem',ST='kv';let store={},blobs={};const subs=[];
const clone=o=>JSON.parse(JSON.stringify(o));
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(DBN,1);r.onupgradeneeded=()=>r.result.createObjectStore(ST);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function idbGet(k){const d=await idb();return new Promise((res,rej)=>{const q=d.transaction(ST).objectStore(ST).get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}
async function idbPut(k,v){const d=await idb();return new Promise((res,rej)=>{const t=d.transaction(ST,'readwrite');t.objectStore(ST).put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);});}
let saveT=null,saving=Promise.resolve();
function persist(){clearTimeout(saveT);saveT=setTimeout(()=>{saving=saving.then(()=>idbPut('state',store)).catch(e=>{console.error(e);alertSave();});},250);}
function alertSave(){const b=document.getElementById('banner');if(b){b.hidden=false;b.textContent='Não foi possível salvar neste navegador (espaço cheio ou modo anônimo). As últimas alterações podem se perder ao recarregar.';}}
function merge(a,b){for(const k in b){if(b[k]===null){delete a[k];continue;}if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))merge(a[k],b[k]);else a[k]=b[k];}return a;}
function notify(){persist();subs.forEach(s=>{try{s();}catch(e){console.error(e);}});}
function snapDoc(path){const d=store[path];return {id:path.split('/').pop(),exists:!!d,data:()=>d?clone(d):undefined,metadata:{}};}
function docRef(path){return {path,id:path.split('/').pop(),get:async()=>snapDoc(path),set:async d=>{store[path]=clone(d);notify();},
  update:async d=>{if(!store[path])throw {code:'not_found'};merge(store[path],clone(d));notify();},delete:async()=>{delete store[path];notify();},
  onSnapshot:n=>{const f=()=>n(snapDoc(path));subs.push(f);setTimeout(f,10);return()=>{};}};}
function colRef(path){const depth=path.split('/').length+1;const docs=()=>Object.keys(store).filter(k=>k.startsWith(path+'/')&&k.split('/').length===depth).sort().map(snapDoc);
  return {path,doc:id=>docRef(path+'/'+id),get:async()=>({docs:docs()}),onSnapshot:n=>{const f=()=>{const d=docs();n({docs:d,size:d.length,empty:!d.length,docChanges:()=>[]});};subs.push(f);setTimeout(f,10);return()=>{};}};}
const db={doc:docRef,collection:colRef};
const realFetch=window.fetch.bind(window);
window.fetch=async(u,o)=>{if(typeof u==='string'&&u.startsWith('/_blob/')){await ready;const id=u.slice(7);let t=blobs[id];if(t==null){t=await idbGet('blob:'+id);if(t!=null)blobs[id]=t;}return new Response(t||'',{status:t!=null?200:404});}return realFetch(u,o);};
const assets={upload:async b=>{const id=Date.now().toString(16)+Math.random().toString(16).slice(2,10);const t=await b.text();blobs[id]=t;await idbPut('blob:'+id,t);return {id,url:'/_blob/'+id};}};
const user={id:async()=>'local',can:async()=>true,profiles:async()=>({local:{name:'Você'}})};
const downloads={save:async r=>{const a=document.createElement('a');a.href=URL.createObjectURL(r.data);a.download=r.filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);return {status:'saved'};}};
const ready=(async()=>{try{store=(await idbGet('state'))||{};}catch(e){store={};}try{localStorage.removeItem('gestao-oem-demo-v1');localStorage.removeItem('gestao-oem-demo-v2');}catch(e){}})();
window.claude={use:async n=>{await ready;return ({db,assets,user,downloads})[n]||null;}};
function bar(){const b=document.getElementById('banner');if(!b)return;b.className='banner demo-bar';b.hidden=false;
  b.innerHTML='Versão de teste: o que você importar e editar fica salvo só neste navegador e computador (ainda não é compartilhado com o time). A leitura automática de e-mails entra quando o login estiver ligado. <a href="#" id="demo-reset">Apagar todos os dados deste navegador</a>';
  const r=document.getElementById('demo-reset');r.onclick=async e=>{e.preventDefault();if(r.dataset.ok!=='1'){r.dataset.ok='1';r.textContent='Clique de novo para confirmar: apaga tudo';setTimeout(()=>{r.dataset.ok='';r.textContent='Apagar todos os dados deste navegador';},5000);return;}
    await saving;await new Promise(res=>{const q=indexedDB.deleteDatabase(DBN);q.onsuccess=q.onerror=q.onblocked=()=>res();});location.reload();};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bar);else bar();
})();
