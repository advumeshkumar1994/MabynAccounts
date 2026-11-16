import http from 'node:http';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {safeEqual,validateDraft,propose,approve,reject,metrics} from './lib.mjs';
const dir=dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3100);
const token=process.env.ADMIN_TOKEN;
if(!token||token.length<24){console.error('Set ADMIN_TOKEN to a random value of at least 24 characters');process.exit(1);}
const dataPath=resolve(dir,process.env.DATA_FILE||'data.json');
let db={campaigns:[],audit:[]};
try{db=JSON.parse(await readFile(dataPath,'utf8'));if(!Array.isArray(db.campaigns)||!Array.isArray(db.audit))throw Error('Invalid data');}catch(e){if(e.code!=='ENOENT')throw e;}
async function save(){const temp=dataPath+'.tmp';await writeFile(temp,JSON.stringify(db,null,2),{mode:0o600});await rename(temp,dataPath);}
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));}
function audit(action,id){db.audit.unshift({action,id,at:new Date().toISOString()});db.audit=db.audit.slice(0,500);}
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>20000)throw Error('Payload too large');}return JSON.parse(s||'{}');}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true,mode:'mock'});
 if(req.method==='GET'&&url.pathname==='/'){
  const html=await readFile(join(dir,'index.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'});return res.end(html);
 }
 if(req.method==='GET'&&url.pathname==='/app.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});return res.end(await readFile(join(dir,'app.js')));}
 if(!url.pathname.startsWith('/api/'))return send(res,404,{error:'Not found'});
 if(!safeEqual(req.headers.authorization?.replace(/^Bearer /,''),token))return send(res,401,{error:'Unauthorized'});
 try{
  if(req.method==='GET'&&url.pathname==='/api/state')return send(res,200,{...db,mode:'mock',integrations:{meta:'not-connected',google:'not-connected'}});
  if(req.method==='POST'&&url.pathname==='/api/campaigns'){
   const c=validateDraft(await body(req));db.campaigns.unshift(c);audit('created',c.id);await save();return send(res,201,c);
  }
  const m=url.pathname.match(/^\/api\/campaigns\/([a-f0-9-]+)\/(submit|approve|reject|insights)$/);
  if(req.method==='POST'&&m){
   const c=db.campaigns.find(x=>x.id===m[1]);if(!c)return send(res,404,{error:'Campaign not found'});
   if(m[2]==='insights')return send(res,200,{demo:true,...metrics(c)});
   const next=m[2]==='submit'?propose(c):m[2]==='approve'?approve(c):reject(c);
   Object.assign(c,next);audit(m[2],c.id);await save();return send(res,200,c);
  }
  return send(res,404,{error:'Not found'});
 }catch(e){return send(res,400,{error:e.message});}
});
server.listen(port,'127.0.0.1',()=>console.log('Marketing bot mock dashboard: http://127.0.0.1:'+port));
