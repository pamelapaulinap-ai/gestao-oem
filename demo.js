/* Gestão O&M — modo demonstração: dados fictícios guardados só neste navegador (localStorage).
   Substitui o banco do protótipo até a ligação com o banco de dados e o login da empresa. */
(function(){
const KEY='gestao-oem-demo-v2';window.GOM_TILES=true;
let store={};const subs=[];let ready;
const clone=o=>JSON.parse(JSON.stringify(o));
function merge(a,b){for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))merge(a[k],b[k]);else a[k]=b[k];}return a;}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(store));}catch(e){}}
function notify(){persist();subs.forEach(s=>{try{s();}catch(e){console.error(e);}});}
function snapDoc(path){const d=store[path];return {id:path.split('/').pop(),exists:!!d,data:()=>d?clone(d):undefined,metadata:{}};}
function docRef(path){return {path,id:path.split('/').pop(),get:async()=>snapDoc(path),set:async d=>{store[path]=clone(d);notify();},
  update:async d=>{if(!store[path])throw {code:'not_found'};merge(store[path],clone(d));notify();},delete:async()=>{delete store[path];notify();},
  onSnapshot:n=>{const f=()=>n(snapDoc(path));subs.push(f);setTimeout(f,10);return()=>{};}};}
function colRef(path){const depth=path.split('/').length+1;const docs=()=>Object.keys(store).filter(k=>k.startsWith(path+'/')&&k.split('/').length===depth).sort().map(snapDoc);
  return {path,doc:id=>docRef(path+'/'+id),get:async()=>({docs:docs()}),onSnapshot:n=>{const f=()=>{const d=docs();n({docs:d,size:d.length,empty:!d.length,docChanges:()=>[]});};subs.push(f);setTimeout(f,10);return()=>{};}};}
const db={doc:docRef,collection:colRef};
const blobs={};const realFetch=window.fetch.bind(window);
window.fetch=(u,o)=>{if(typeof u==='string'&&u.startsWith('/_blob/')){const t=blobs[u.slice(7)];return Promise.resolve(new Response(t||'',{status:t?200:404}));}return realFetch(u,o);};
const assets={upload:async b=>{const id=Math.random().toString(16).slice(2).padEnd(32,'0');blobs[id]=await b.text();return {id,url:'/_blob/'+id};}};
const user={id:async()=>'demo',can:async()=>true,profiles:async()=>({demo:{name:'Demonstração'}})};
const downloads={save:async r=>{const a=document.createElement('a');a.href=URL.createObjectURL(r.data);a.download=r.filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);return {status:'saved'};}};
async function load(reset){let s=null;if(!reset){try{s=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}}
  if(!s){try{s=await (await realFetch('dados-exemplo.json')).json();}catch(e){s={};}}store=s;persist();}
ready=load(false);
window.claude={use:async n=>{await ready;return ({db,assets,user,downloads})[n]||null;}};
const st=document.createElement('style');st.textContent='.demo-bar a{color:inherit;font-weight:600}';document.head.appendChild(st);
function bar(){const b=document.getElementById('banner');if(!b)return;b.className='banner demo-bar';b.hidden=false;
  b.innerHTML='Versão de demonstração: cabos, notificações, financeiro e combustível são fictícios, e o que você alterar ou importar fica salvo só neste navegador. A leitura automática de e-mails entra quando o login estiver ligado. <a href="#" id="demo-reset">Restaurar dados de exemplo</a>';
  document.getElementById('demo-reset').onclick=async e=>{e.preventDefault();await load(true);location.reload();};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bar);else bar();
})();
