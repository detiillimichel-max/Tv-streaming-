// OIO TV - MODULO DE APIS PUBLICAS - EXTRACAO DIRETA .MP4
let PLAY_QUEUE=[],CURRENT_INDEX=0;
const toCard=o=>({id:o.id||Math.random().toString(36).slice(2),title:o.title||"Sem titulo",subtitle:o.subtitle||o.source||"HD",poster:o.poster||`https://picsum.photos/seed/${encodeURIComponent(o.title||'video')}/400/600`,url:o.url,type:o.type||(o.url?.includes('.mp4')||o.url?.includes('.webm')||o.url?.includes('.m4v')?'mp4':'embed'),source:o.source||'Public',desc:o.desc||o.subtitle||''});

// 1. NASA
async function getNasaVideos(){
 try{
  const q=["earth timelapse","black hole","james webb","mars rover"]; const query=q[Math.floor(Math.random()*q.length)];
  const res=await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=video`);
  const data=await res.json(); const items=(data.collection?.items||[]).slice(0,8); const videos=[];
  for(const it of items){
   const title=it.data?.[0]?.title||"NASA"; const nasa_id=it.data?.[0]?.nasa_id; if(!nasa_id) continue;
   try{
    const assetRes=await fetch(`https://images-api.nasa.gov/asset/${nasa_id}`);
    const assetData=await assetRes.json();
    const mp4=(assetData.collection?.items||[]).find(u=>u.href.endsWith('.mp4')&&u.href.includes('~orig'))||(assetData.collection?.items||[]).find(u=>u.href.endsWith('.mp4'))||(assetData.collection?.items||[])[0];
    if(mp4?.href) videos.push(toCard({title,subtitle:"NASA • 4K",poster:it.links?.[0]?.href||"https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400",url:mp4.href,source:"NASA SVS",desc:it.data?.[0]?.description?.slice(0,180)||"Video real NASA HD"}));
   }catch(e){}
  }
  return videos;
 }catch(e){console.warn(e);return[];}
}
// 2. BLENDER
async function getBlenderMovies(){
 const blender=[
  {title:"Big Buck Bunny",subtitle:"Blender • 2008 • 4K",poster:"https://peach.blender.org/wp-content/uploads/title_anouncement.jpg?x11217",url:"https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v",desc:"Open movie Blender"},
  {title:"Sintel",subtitle:"Blender • 2010 • HD",poster:"https://durian.blender.org/wp-content/uploads/2010/05/sintel_poster.jpg",url:"https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4",desc:"Open movie Sintel"},
  {title:"Tears of Steel",subtitle:"Blender • Sci-Fi • 4K",poster:"https://mango.blender.org/wp-content/uploads/2013/05/01_poster.jpg",url:"https://download.blender.org/mango/tears_of_steel_1080p.webm",desc:"Sci-fi open movie"},
  {title:"Caminandes Llamigos",subtitle:"Blender • Curta • HD",poster:"https://cloud.blender.org/p/caminandes-3/56bfa9b5e6d4a1c2f35b6f2e/thumbnail_1080.jpg",url:"https://download.blender.org/caminandes/caminandes3/caminandes3_1080p.mp4",desc:"Curta premiado"},
  {title:"Spring",subtitle:"Blender • 2019 • 4K",poster:"https://download.blender.org/spring/spring_poster.jpg",url:"https://download.blender.org/spring/spring_1080p.mp4",desc:"Open movie Spring"},
  {title:"Cosmos Laundromat",subtitle:"Blender • 2015",poster:"https://cloud.blender.org/p/gooseberry/thumbnail.jpg",url:"https://download.blender.org/gooseberry/gooseberry_1080p.mp4",desc:"Piloto Gooseberry"}
 ];
 return blender.map(toCard);
}
// 3. INTERNET ARCHIVE
async function getInternetArchiveVideos(){
 try{
  const res=await fetch(`https://archive.org/advancedsearch.php?q=mediatype:(movies)%20AND%20format:(h.264)&fl[]=identifier,title,description&sort[]=downloads+desc&rows=12&page=1&output=json`);
  const data=await res.json(); const docs=data.response?.docs||[]; const videos=[];
  for(const doc of docs){
   try{
    const metaRes=await fetch(`https://archive.org/metadata/${doc.identifier}`);
    const meta=await metaRes.json();
    const mp4File=(meta.files||[]).filter(f=>f.name.endsWith('.mp4')&&(f.source==='derivative'||f.format==='h.264')).sort((a,b)=>(b.size||0)-(a.size||0))[0]||(meta.files||[]).find(f=>f.name.endsWith('.mp4'));
    if(mp4File){const directUrl=`https://archive.org/download/${doc.identifier}/${encodeURIComponent(mp4File.name)}`; videos.push(toCard({title:doc.title?.slice(0,40)||doc.identifier,subtitle:"Internet Archive • Classico",poster:`https://archive.org/services/img/${doc.identifier}`,url:directUrl,source:"Archive.org",desc:doc.description?.slice(0,150)||"Dominio publico"}));}
   }catch(e){}
  }
  return videos;
 }catch(e){return[];}
}
// 4. PEERTUBE
async function getPeerTubeVideos(){
 try{
  const inst="https://framatube.org";
  const res=await fetch(`${inst}/api/v1/videos?count=8&sort=-publishedAt&nsfw=false&filter=local`);
  const data=await res.json(); const all=[];
  for(const v of data.data||[]){
   try{
    const detailRes=await fetch(`${inst}/api/v1/videos/${v.uuid}`);
    const detail=await detailRes.json();
    const mp4=detail.streamingPlaylists?.[0]?.files?.find(f=>f.fileUrl)?.fileUrl||detail.files?.[0]?.fileUrl;
    const embedFallback=`${inst}/videos/embed/${v.uuid}`;
    all.push(toCard({title:v.name,subtitle:`${v.channel?.displayName||'PeerTube'} • ${v.duration?Math.floor(v.duration/60)+'m':'HD'}`,poster:`${inst}${v.thumbnailPath}`,url:mp4||embedFallback,type:mp4?'mp4':'embed',source:"PeerTube",desc:v.description?.slice(0,150)||""}));
   }catch(e){}
  }
  return all.slice(0,8);
 }catch(e){return[];}
}
// 5. WIKIMEDIA
async function getWikimediaVideos(){
 try{
  const res=await fetch(`https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=filetype:video filemime:video/mp4&srlimit=12&srnamespace=6&format=json&origin=*`);
  const data=await res.json(); const items=data.query?.search||[]; const videos=[];
  for(const it of items.slice(0,6)){
   try{
    const title=it.title;
    const infoRes=await fetch(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size&format=json&origin=*`);
    const infoData=await infoRes.json(); const page=Object.values(infoData.query.pages)[0]; const url=page?.imageinfo?.[0]?.url;
    if(url) videos.push(toCard({title:title.replace('File:','').replace(/_/g,' ').slice(0,35),subtitle:"Wikimedia • Open",poster:page?.imageinfo?.[0]?.thumburl||`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title.replace('File:',''))}?width=400`,url,source:"Wikimedia",desc:"Video livre"}));
   }catch(e){}
  }
  return videos.length?videos:[toCard({title:"Aurora Boreal Timelapse",subtitle:"Wikimedia • 4K",poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Aurora_Borealis.jpg/400px-Aurora_Borealis.jpg",url:"https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/2019_Aurora_Borealis.ogv/2019_Aurora_Borealis.ogv.720p.vp9.webm",source:"Wikimedia"}),toCard({title:"Earth from ISS",subtitle:"NASA via Wikimedia",poster:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ISS-40_Earth_view.jpg/400px-ISS-40_Earth_view.jpg",url:"https://upload.wikimedia.org/wikipedia/commons/8/8d/Time-lapse_of_Earth_from_ISS.webm",source:"Wikimedia"})];
 }catch(e){return [];}
}
// 6. TED
async function getTedTalks(){
 return [toCard({title:"The Power of Vulnerability - Brené Brown",subtitle:"TED • 20M views",poster:"https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400",url:"https://download.ted.com/talks/BreneBrown_2010X-480p.mp4",source:"TED",desc:"TED Talk"}),toCard({title:"How Great Leaders Inspire - Simon Sinek",subtitle:"TED • 18M",poster:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400",url:"https://download.ted.com/talks/SimonSinek_2009X-480p.mp4",source:"TED"}),toCard({title:"Inside the Mind of a Master Procrastinator",subtitle:"TED • Tim Urban",poster:"https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400",url:"https://download.ted.com/talks/TimUrban_2016-480p.mp4",source:"TED"})];
}
async function fetchAllContent(){
 const status=document.getElementById("hero-status"); if(status) status.innerText="● EXTRACAO .MP4 EM ANDAMENTO";
 const [blender,nasa,archive,peertube,wikimedia,ted]=await Promise.all([getBlenderMovies(),getNasaVideos().catch(()=>[]),getInternetArchiveVideos().catch(()=>[]),getPeerTubeVideos().catch(()=>[]),getWikimediaVideos().catch(()=>[]),getTedTalks().catch(()=>[])]);
 if(status) status.innerText=`● ${blender.length+nasa.length+archive.length+peertube.length+wikimedia.length+ted.length} VIDEOS .MP4 DIRETOS`;
 return {hero:[...blender,...nasa].filter(v=>v.url)[0]||{title:"OIO TV Originals",desc:"Streaming modular com extracao direta",poster:"https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200",url:"https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v"},filmes:[...blender,...archive],series:[...nasa,...ted],infantil:[...peertube,...wikimedia,...blender.slice(3,5)]};
}
document.addEventListener("DOMContentLoaded", async()=>{
 const container=document.getElementById("content-container"); const data=await fetchAllContent();
 container.innerHTML=""; renderHero(data.hero); renderRow(container,"Filmes em Alta • Blender + Archive",data.filmes); renderRow(container,"Series & Documentarios • NASA + TED",data.series); renderRow(container,"Desenhos & Animacoes • PeerTube + Wikimedia",data.infantil); setupModal(); setupNavigation();
});
function renderHero(hero){
 if(!hero) return; const h=document.getElementById("hero"); document.getElementById("hero-title").innerText=hero.title||"OIO TV"; document.getElementById("hero-desc").innerText=hero.desc||hero.subtitle||"Assista agora em player nativo"; if(hero.poster) h.style.backgroundImage=`url('${hero.poster}')`; document.getElementById("hero-play").onclick=()=>openPlayerQueue([hero],0);
}
function renderRow(parent,title,items){
 if(!items||!items.length) return; const row=document.createElement("div"); row.className="row"; const cards=items.map((item,idx)=>`<div class="card" data-idx="${idx}"><img class="card-img" src="${item.poster}" alt="${item.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/111/fff?text=OIO'"><div class="card-body"><div class="card-title">${item.title}</div><div class="card-subtitle">${item.subtitle}</div><span class="card-badge">${item.source}</span></div></div>`).join(""); row.innerHTML=`<div class="row-title">${title} <span class="count">${items.length} • .MP4 DIRETO</span></div><div class="row-cards">${cards}</div>`; parent.appendChild(row); row.querySelectorAll(".card").forEach((card,i)=>{card.onclick=()=>openPlayerQueue(items,i);});
}
let currentQueue=[];
function openPlayerQueue(queue,startIdx){currentQueue=queue;CURRENT_INDEX=startIdx;openPlayer(currentQueue[CURRENT_INDEX]);}
function openPlayer(item){
 if(!item) return; const modal=document.getElementById("player-modal"); const container=document.getElementById("player-container");
 document.getElementById("modal-title").innerText=item.title; document.getElementById("modal-desc").innerText=item.desc||item.subtitle||""; document.getElementById("player-meta").innerHTML=`<span>${item.source}</span><span>${(item.type||'MP4').toUpperCase()}</span><span style="color:#4ade80">● URL DIRETA</span>`;
 if(item.type==='mp4'||item.url.endsWith('.mp4')||item.url.endsWith('.webm')||item.url.endsWith('.m4v')||item.url.includes('.webm')){
  container.innerHTML=`<video id="oio-video" controls autoplay playsinline class="w-full h-full object-contain" src="${item.url}" poster="${item.poster}"></video>`;
  const videoEl=document.getElementById("oio-video"); videoEl.onerror=()=>handleVideoError(); videoEl.addEventListener('error',handleVideoError);
 }else{container.innerHTML=`<iframe src="${item.url}?autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;}
 modal.classList.remove("hidden");
}
function handleVideoError(){
 const container=document.getElementById("player-container"); container.innerHTML=`<div class="player-fallback"><div><i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;margin-bottom:12px;color:#facc15"></i><p>Tentando proxima fonte...</p></div></div>`;
 setTimeout(()=>{CURRENT_INDEX++; if(CURRENT_INDEX<currentQueue.length){openPlayer(currentQueue[CURRENT_INDEX]);}else{container.innerHTML=`<div class="player-fallback"><p>Midia indisponivel em todas as fontes.</p></div>`;}},1200);
}
function setupModal(){const modal=document.getElementById("player-modal");const closeBtn=document.getElementById("modal-close");closeBtn.onclick=()=>{modal.classList.add("hidden");document.getElementById("player-container").innerHTML="";};modal.onclick=e=>{if(e.target===modal) closeBtn.click();};}
function setupNavigation(){const container=document.getElementById("content-container");document.querySelectorAll(".bottom-nav .nav-item").forEach(item=>{item.onclick=e=>{e.preventDefault();document.querySelectorAll(".bottom-nav .nav-item").forEach(i=>i.classList.remove("active"));item.classList.add("active");const tab=item.dataset.tab;const rows=container.querySelectorAll(".row");if(tab==='home')rows.forEach(r=>r.style.display='block');else if(tab==='filmes')rows.forEach((r,i)=>r.style.display=i===0?'block':'none');else if(tab==='series')rows.forEach((r,i)=>r.style.display=i===1?'block':'none');else if(tab==='infantil')rows.forEach((r,i)=>r.style.display=i===2?'block':'none');};});}

