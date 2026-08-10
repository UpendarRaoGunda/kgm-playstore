import http from "node:http";
import https from "node:https";
import { spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { Readable } from "node:stream";
import crypto from "node:crypto";
import { COSMIC_RHYMES_STEM_MOVIES } from "./cosmic-rhymes-youtube.mjs";

const PORT = Number(process.env.PORT || 10000);
const APP_PORT = Number(process.env.KGM_INTERNAL_PORT || 10001);
const STORAGE = process.env.KGM_CINEMA_STORAGE_DIR || "/var/data/kgm-cinema";
const MOVIES_DIR = join(STORAGE, "movies");
const CATALOG = join(STORAGE, "catalog.json");
const UPSTREAM = (process.env.KGM_UPSTREAM_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const MAX_UPLOAD = Number(process.env.KGM_CINEMA_MAX_UPLOAD_BYTES || 220 * 1024 * 1024);
const PINNED_STEM_MOVIES = [
  {
    id: "youtube-fXnpFvsiCNE",
    source: "youtube",
    youtube_id: "fXnpFvsiCNE",
    title: "The Ascent of Man — Jacob Bronowski",
    description: "A landmark exploration of science, human knowledge, discovery and the responsibility that comes with understanding the world.",
    category: "Scientists",
    age_rating: "13+",
    duration_label: "Documentary",
    language: "English",
    attribution: "Jacob Bronowski · YouTube",
    source_page: "https://www.youtube.com/watch?v=fXnpFvsiCNE",
    topics: ["history of science", "scientific thinking", "humanity", "ethics", "knowledge"],
    learn: [
      "How does scientific knowledge change human society?",
      "Why should scientific progress be connected with responsibility and integrity?",
      "What examples show the relationship between evidence, discovery and human values?"
    ],
    like_count: 0
  },
  ...COSMIC_RHYMES_STEM_MOVIES
];
mkdirSync(MOVIES_DIR, { recursive: true });

const readJson = (path, fallback) => { try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fallback; } };
const saveJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2));
const catalog = () => readJson(CATALOG, []);
const json = (res, status, value) => { const body = Buffer.from(JSON.stringify(value)); res.writeHead(status, {"content-type":"application/json","content-length":body.length,"cache-control":"no-store"}); res.end(body); };

async function userFrom(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  const r = await fetch(`${UPSTREAM}/api/kgm-chat/auth/me`, { headers: { authorization: auth } });
  return r.ok ? await r.json() : null;
}
async function curator(req) {
  const auth = req.headers.authorization || "";
  if (!auth) return null;
  const r = await fetch(`${UPSTREAM}/api/kgm-cinema/me`, { headers: { authorization: auth } });
  if (!r.ok) return null;
  const me = await r.json();
  return me.can_curate ? await userFrom(req) : null;
}
function driveId(input="") {
  const raw = String(input).trim();
  const m = raw.match(/\/d\/([a-zA-Z0-9_-]+)/) || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m?.[1] || (/^[a-zA-Z0-9_-]{10,}$/.test(raw) ? raw : "");
}
function safeName(name="movie.mp4") { return basename(name).replace(/[^a-zA-Z0-9._-]+/g,"-").slice(-120) || "movie.mp4"; }
function localMovie(item) { return { ...item, stream_url: `/api/kgm-media/render/${item.id}/stream`, download_url: item.download_allowed ? `/api/kgm-media/render/${item.id}/download` : null }; }
function proxyHeaders(req, host) {
  const headers = { ...req.headers };
  for (const key of ["connection","keep-alive","proxy-authenticate","proxy-authorization","te","trailer","transfer-encoding","upgrade"]) delete headers[key];
  headers.host = host;
  headers["x-forwarded-host"] = req.headers.host || host;
  headers["x-forwarded-proto"] = "https";
  headers["x-forwarded-port"] = "443";
  return headers;
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/api/kgm-media/health") return json(res, 200, {status:"ok", storage:STORAGE, disk:existsSync(STORAGE)});
  if (url.pathname === "/api/kgm-media/drive" && req.method === "GET") return json(res, 200, {items:catalog().filter(x=>x.source==="google_drive")});
  if (url.pathname === "/api/kgm-media/drive" && req.method === "POST") {
    const who = await curator(req); if (!who) return json(res,403,{detail:"KGM curator access required"});
    const body = await new Response(Readable.toWeb(req)).json().catch(()=>({}));
    const id = driveId(body.drive_url || body.drive_id); if (!id) return json(res,400,{detail:"Paste a valid Google Drive file link or file ID"});
    if (!body.stem_confirmed || !body.rights_confirmed) return json(res,400,{detail:"Confirm STEM relevance and viewing rights"});
    const item = {id:`drive-${crypto.randomUUID()}`,source:"google_drive",drive_id:id,title:String(body.title||"STEM film").slice(0,120),description:String(body.description||"").slice(0,600),category:String(body.category||"Science").slice(0,40),language:String(body.language||"English").slice(0,40),age_rating:String(body.age_rating||"All ages").slice(0,30),attribution:String(body.attribution||"Google Drive").slice(0,120),topics:Array.isArray(body.topics)?body.topics.slice(0,12):[],created_at:new Date().toISOString(),curator_id:who.id};
    const items=catalog(); items.unshift(item); saveJson(CATALOG,items); return json(res,201,item);
  }
  if (url.pathname === "/api/kgm-cinema/admin/upload" && req.method === "POST") {
    const who = await curator(req); if (!who) return json(res,403,{detail:"KGM curator access required"});
    const contentLength=Number(req.headers["content-length"]||0); if (contentLength>MAX_UPLOAD+2_000_000) return json(res,413,{detail:`Render movie uploads are limited to ${Math.round(MAX_UPLOAD/1024/1024)} MB; use Google Drive for larger films.`});
    const request = new Request(`http://localhost${req.url}`, {method:"POST",headers:req.headers,body:Readable.toWeb(req),duplex:"half"});
    const form=await request.formData(); const file=form.get("file");
    if (!(file instanceof File)) return json(res,400,{detail:"Choose an MP4 or WebM movie"});
    if (file.size>MAX_UPLOAD) return json(res,413,{detail:`Movie must be ${Math.round(MAX_UPLOAD/1024/1024)} MB or smaller`});
    if (!["video/mp4","video/webm"].includes(file.type)) return json(res,415,{detail:"Use MP4 or WebM for Render-hosted movies"});
    if (!["true","on","1"].includes(String(form.get("stem_confirmed")))) return json(res,400,{detail:"Confirm this is STEM content"});
    if (!["true","on","1"].includes(String(form.get("rights_confirmed")))) return json(res,400,{detail:"Confirm you have rights to host this movie"});
    const id=`render-${crypto.randomUUID()}`; const filename=`${id}-${safeName(file.name)}`; const path=join(MOVIES_DIR,filename); writeFileSync(path,Buffer.from(await file.arrayBuffer()));
    const item={id,source:"render",title:String(form.get("title")||file.name).slice(0,120),description:String(form.get("description")||"").slice(0,600),category:String(form.get("category")||"Science").slice(0,40),age_rating:String(form.get("age_rating")||"All ages").slice(0,30),duration_label:String(form.get("duration_label")||"").slice(0,40),language:String(form.get("language")||"English").slice(0,40),attribution:String(form.get("attribution")||"KGM Science Cinema").slice(0,120),topics:String(form.get("topics")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,12),learn:String(form.get("learn")||"").split("\n").map(x=>x.trim()).filter(Boolean).slice(0,8),download_allowed:["true","on","1"].includes(String(form.get("download_allowed"))),filename,content_type:file.type,size:file.size,created_at:new Date().toISOString(),curator_id:who.id};
    const items=catalog(); items.unshift(item); saveJson(CATALOG,items); return json(res,201,localMovie(item));
  }
  const mediaMatch=url.pathname.match(/^\/api\/kgm-media\/render\/([^/]+)\/(stream|download)$/);
  if (mediaMatch) {
    const item=catalog().find(x=>x.id===mediaMatch[1]&&x.source==="render"); if(!item)return json(res,404,{detail:"Movie not found"});
    if(mediaMatch[2]==="download"&&!item.download_allowed)return json(res,403,{detail:"Download is not permitted"});
    const path=join(MOVIES_DIR,item.filename); if(!existsSync(path))return json(res,404,{detail:"Movie file missing"});
    const total=item.size; const range=req.headers.range;
    if(range){const [s,e]=range.replace(/bytes=/,"").split("-");const start=Number(s||0),end=Math.min(Number(e||total-1),total-1);res.writeHead(206,{"content-type":item.content_type,"accept-ranges":"bytes","content-range":`bytes ${start}-${end}/${total}`,"content-length":end-start+1,"content-disposition":mediaMatch[2]==="download"?`attachment; filename="${safeName(item.title)}.${item.content_type==="video/webm"?"webm":"mp4"}`:"inline"});return createReadStream(path,{start,end}).pipe(res);} 
    res.writeHead(200,{"content-type":item.content_type,"content-length":total,"accept-ranges":"bytes","content-disposition":mediaMatch[2]==="download"?`attachment; filename="${safeName(item.title)}.${item.content_type==="video/webm"?"webm":"mp4"}`:"inline"}); return createReadStream(path).pipe(res);
  }
  if (url.pathname === "/api/kgm-cinema/movies" && req.method === "GET") {
    const upstream=await fetch(`${UPSTREAM}${url.pathname}${url.search}`,{headers:{authorization:req.headers.authorization||""}}); const data=await upstream.json().catch(()=>({items:[],categories:[]}));
    const local=catalog().filter(x=>x.source==="render").map(localMovie); const q=(url.searchParams.get("q")||"").toLowerCase(); const cat=url.searchParams.get("category")||"";
    const matches=(x)=>(!cat||cat==="All"||x.category===cat)&&(!q||`${x.title} ${x.description} ${x.category} ${(x.topics||[]).join(" ")}`.toLowerCase().includes(q));
    const filtered=local.filter(matches);
    const pinned=PINNED_STEM_MOVIES.filter(matches).filter(x=>!(data.items||[]).some(item=>item.youtube_id===x.youtube_id||item.id===x.id));
    const featuredPinned=pinned.filter(x=>x.id==="youtube-fXnpFvsiCNE");
    const collectionPinned=pinned.filter(x=>x.id!=="youtube-fXnpFvsiCNE");
    return json(res,200,{...data,items:[...featuredPinned,...filtered,...(data.items||[]),...collectionPinned],categories:[...new Set([...(data.categories||[]),...PINNED_STEM_MOVIES.map(x=>x.category),...local.map(x=>x.category)])]});
  }
  if (url.pathname.startsWith("/api/kgm-")) return upstreamProxy(req,res);
  return appProxy(req,res);
}
function appProxy(req,res){
  const host=req.headers.host || "kgm-playstore.onrender.com";
  const target=http.request({hostname:"127.0.0.1",port:APP_PORT,path:req.url,method:req.method,headers:proxyHeaders(req,host)},r=>{
    console.log(`[vinext-proxy] ${req.method} ${req.url} -> ${r.statusCode}`);
    res.writeHead(r.statusCode||502,r.headers);r.pipe(res);
  });
  target.on("error",e=>{console.error("[vinext-proxy:error]",e.message);json(res,502,{detail:`KGM app unavailable: ${e.message}`});});
  req.pipe(target);
}
function upstreamProxy(req,res){const u=new URL(UPSTREAM);const client=u.protocol==="https:"?https:http;const target=client.request({hostname:u.hostname,port:u.port||undefined,path:req.url,method:req.method,headers:proxyHeaders(req,u.host)},r=>{res.writeHead(r.statusCode||502,r.headers);r.pipe(res);});target.on("error",e=>json(res,502,{detail:`KGM API unavailable: ${e.message}`}));req.pipe(target);}

const vinextBin=join(process.cwd(),"node_modules",".bin","vinext");
const child=spawn(vinextBin,["start"],{stdio:"inherit",env:{...process.env,PORT:String(APP_PORT),HOST:"127.0.0.1",WRANGLER_LOG_PATH:".wrangler/wrangler.log"}});
child.on("exit",code=>{console.error("Vinext exited",code);process.exit(code||1);});
http.createServer((req,res)=>handle(req,res).catch(err=>{console.error(err);json(res,500,{detail:"KGM media gateway error"});})).listen(PORT,"0.0.0.0",()=>console.log(`KGM gateway :${PORT}; Vinext :${APP_PORT}; storage ${STORAGE}`));
