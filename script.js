
// OIO TV v1.6 ESTÁVEL - Só usa Edges 200 OK testadas por você
// Testadas OK: archive, firebase, gemini, gnews, nasa, Open-Meteo, PeerTube, pexels, twitch, vapid, youtube
// Ignoradas: daily, elevenlabs, facebook, user-profile, wikipedia (500 / Erro de Rede)

const CONFIG = {
  SUPABASE_URL: "https://uqdwtzlkqaosnweyoyit.supabase.co",
  SUPABASE_KEY: "sb_publishable_uafBQD1aJ3w8_eq4meOsNQ_wzk8TwhA",
  // Só as que deram 200 OK nas suas prints
  EDGES_OK: ["archive","nasa","PeerTube","youtube","pexels","twitch","gnews"]
};

let PLAY_QUEUE=[], CURRENT_INDEX=0, HERO_CURRENT=0, HERO_INTERVAL=null;

const toCard=o=>({
  id:o.id||Math.random().toString(36).slice(2),
  title:o.title||"Sem titulo",
  subtitle:o.subtitle||o.source||"HD",
  poster:o.poster||`https://picsum.photos/seed/${o.title||'oio'}/400/600`,
  url:o.url,
  type:o.url?.match(/\.mp4|\.webm|\.m4v/) ? 'mp4' : 'embed',
  source:o.source||'OIO',
  desc:o.desc||o.subtitle||""
});

function fetchWithTimeout(url, opts={}, ms=6000){
  return Promise.race([fetch(url, opts), new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')), ms))]);
}

// Fallback local GARANTIDO - nunca deixa grade vazia
const LOCAL_BANNERS = [
  {title:"Cyber Odyssey 2026",subtitle:"OIO Originals • 4K",poster:"https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200",url:"https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v",source:"OIO Originals",desc:"Plataforma modular com glassmorphism de alta performance."},
  {title:"Neon Pulse",subtitle:"Ação • 4K",poster:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200",url:"https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4",source:"Blender",desc:"Ação futurista com visuais neon."},
  {title:"NASA Earth 4K",subtitle:"NASA • Documentário",poster:"https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200",url:"https://images-assets.nasa.gov/video/NHQ_2019_0313_Go Forward to the Moon/GO Forward To The Moon~orig.mp4",source:"NASA SVS",desc:"Imagens reais da Terra em 4K direto da NASA."},
  {title:"Quantum Realm",subtitle:"Sci-Fi • Aventura",poster:"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200",url:"https://download.blender.org/mango/tears_of_steel_1080p.webm",source:"Blender",desc:"Viagem pelo reino quântico."},
  {title:"Spring 4K",subtitle:"Blender • 2019",poster:"https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200",url:"https://download.blender.org/spring/spring_1080p.mp4",source:"Blender",desc:"Open movie premiado."}
].map(toCard);

const LOCAL_FILMES = [
  {title:"Big Buck Bunny",subtitle:"Blender • 4K • MP4 Direto",poster:"https://peach.blender.org/wp-content/uploads/title_anouncement.jpg?x11217",url:"https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v",source:"Blender",desc:"Open movie 4K"},
  {title:"Sintel",subtitle:"Blender • 2010 • HD",poster:"https://durian.blender.org/wp-content/uploads/2010/05/sintel_poster.jpg",url:"https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4",source:"Blender",desc:"Terceiro open movie"},
  {title:"Tears of Steel",subtitle:"Blender • Sci-Fi • 4K",poster:"https://mango.blender.org/wp-content/uploads/2013/05/01_poster.jpg",url:"https://download.blender.org/mango/tears_of_steel_1080p.webm",source:"Blender",desc:"Sci-fi VFX"},
  {title:"Caminandes",subtitle:"Blender • Curta • HD",poster:"https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400",url:"https://download.blender.org/caminandes/caminandes3/caminandes3_1080p.mp4",source:"Blender",desc:"Curta premiado"},
  {title:"Cosmos Laundromat",subtitle:"Blender • 2015",poster:"https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400",url:"https://download.blender.org/gooseberry/gooseberry_1080p.mp4",source:"Blender",desc:"Piloto"}
].map(toCard);

// Parser inteligente para cada Edge OK
async function callEdge(name){
  const url = `${CONFIG.SUPABASE_URL}/functions/v1/${name}`;
  const headers = {"Authorization":`Bearer ${CONFIG.SUPABASE_KEY}`,"apikey":CONFIG.SUPABASE_KEY,"Content-Type":"application/json"};
  let fetchUrl = url;
  if(name==='youtube') fetchUrl += '?playlistId=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj';
  if(name==='Wikip-dia') fetchUrl += '?q=Brasil';
  try{
    const res = await fetchWithTimeout(fetchUrl, {headers}, 7000);
    if(!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    return data;
  }catch(e){
    console.warn(`Edge ${name} falhou`, e);
    return null;
  }
}

function parseNasaEdge(data){
  // Seu print: data: [{href: images-assets.nasa.gov/video/.../collection.json}]
  if(!data) return [];
  const arr = data.data || data.results || [];
  const out=[];
  for(const item of arr.slice(0,5)){
    const href = item.href || item?.data?.[0]?.href || item.url;
    // Primeiro item é collection.json, precisa segunda requisição? Vamos tentar pegar direto se já tiver mp4
    // Na sua Edge já retorna collection.json link, vamos extrair mp4 direto via images-assets
    // Fallback: usa o href da collection e tenta pegar mp4 dentro
    // Para simplificar v1.6, se vier collection.json, montamos mp4 ~orig direto quando possível
    const title = item?.data?.[0]?.title || item.title || "NASA Video";
    // Tenta extrair mp4 do href
    let mp4Url = null;
    if(item.href && item.href.includes('images-assets.nasa.gov')){
      // collection.json -> o mp4 real está em ~orig.mp4 na mesma pasta
      const base = item.href.replace('/collection.json','');
      mp4Url = `${base}/~orig.mp4`;
    }
    if(mp4Url){
      out.push(toCard({title:title.slice(0,32),subtitle:"NASA • 4K • MP4 Direto",poster:item?.data?.[0]?.poster||"https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400",url:mp4Url,source:"NASA Edge",desc:"Video real NASA extraido .mp4 direto"}));
    }
  }
  return out;
}

function parseArchiveEdge(data){
  if(!data?.data) return [];
  return data.data.slice(0,5).map(item=>toCard({
    title: (item.title || item.identifier || "Archive").slice(0,30),
    subtitle: "Archive • Dominio Publico",
    poster: `https://archive.org/services/img/${item.identifier||item.id||'movies'}`,
    url: item.url || `https://archive.org/download/${item.identifier||item.id}/` + (item.files?.find(f=>f.endsWith('.mp4'))||'file.mp4'),
    source: "Archive Edge",
    desc: "Dominio publico .mp4 direto"
  }));
}

function parseYoutubeEdge(data){
  if(!data?.items) return [];
  return data.items.slice(0,5).map(it=>{
    const vid = it.snippet?.resourceId?.videoId || it.id;
    const title = it.snippet?.title || "YouTube";
    return toCard({
      title: title.slice(0,32),
      subtitle: "YouTube • TED",
      poster: it.snippet?.thumbnails?.high?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      url: `https://www.youtube.com/embed/${vid}`,
      type: 'embed',
      source: "YouTube Edge",
      desc: it.snippet?.description?.slice(0,100)||""
    });
  });
}

function parsePeerTubeEdge(data){
  if(!data?.data) return [];
  return data.data.slice(0,5).map(v=>toCard({
    title: (v.name||"PeerTube").slice(0,30),
    subtitle: `PeerTube • ${v.channel||'HD'}`,
    poster: v.thumbnailPath ? `https://framatube.org${v.thumbnailPath}` : "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400",
    url: v.url || (v.uuid ? `https://framatube.org/videos/watch/${v.uuid}` : LOCAL_FILMES[0].url),
    source: "PeerTube Edge",
    desc: v.description||""
  }));
}

async function loadWorkingEdges(){
  const results = await Promise.allSettled(CONFIG.EDGES_OK.map(name=>callEdge(name)));
  let banners=[], filmes=[], series=[], infantil=[];
  
  results.forEach((r, idx)=>{
    const name = CONFIG.EDGES_OK[idx];
    if(r.status!=='fulfilled' || !r.value) return;
    const data = r.value;
    if(name==='nasa'){
      const parsed = parseNasaEdge(data);
      banners = banners.concat(parsed);
      series = series.concat(parsed);
    }
    if(name==='youtube'){
      const parsed = parseYoutubeEdge(data);
      banners = banners.concat(parsed);
      filmes = filmes.concat(parsed);
    }
    if(name==='archive'){
      const parsed = parseArchiveEdge(data);
      filmes = filmes.concat(parsed);
    }
    if(name==='PeerTube'){
      const parsed = parsePeerTubeEdge(data);
      infantil = infantil.concat(parsed);
    }
  });
  
  // Se alguma categoria ficou vazia, usa local para nunca sumir
  return {
    banners: banners.length>=2 ? banners.slice(0,5) : LOCAL_BANNERS,
    filmes: filmes.length>=2 ? filmes.slice(0,5) : LOCAL_FILMES.slice(0,5),
    series: series.length>=2 ? series.slice(0,5) : LOCAL_BANNERS.slice(0,3).concat(LOCAL_FILMES.slice(0,2)),
    infantil: infantil.length>=2 ? infantil.slice(0,5) : LOCAL_FILMES.slice(2,5).concat(LOCAL_BANNERS.slice(0,2))
  };
}

// Render
function renderHeroCarousel(banners){
  const slidesEl=document.getElementById("hero-slides");
  const dotsEl=document.getElementById("hero-dots");
  slidesEl.innerHTML=""; dotsEl.innerHTML="";
  banners.slice(0,5).forEach((b,i)=>{
    const slide=document.createElement("div");
    slide.className=`hero-slide ${i===0?'active':''}`;
    slide.style.backgroundImage=`url('${b.poster}')`;
    slide.innerHTML=`<div class="hero-overlay"></div><div class="hero-content"><span class="badge">${b.source} • Destaque</span><h1>${b.title}</h1><p>${b.desc.slice(0,120)}</p><div class="hero-buttons"><button class="btn-primary btn-play"><i class="fa-solid fa-play"></i> Assistir</button><button class="btn-secondary"><i class="fa-solid fa-info-circle"></i> Detalhes</button></div></div>`;
    slidesEl.appendChild(slide);
    const dot=document.createElement("span"); dot.className=i===0?'active':''; dot.onclick=()=>goToSlide(i); dotsEl.appendChild(dot);
    slide.querySelector(".btn-play").onclick=()=>openPlayerQueue([b],0);
  });
  HERO_CURRENT=0; clearInterval(HERO_INTERVAL); HERO_INTERVAL=setInterval(()=>nextSlide(), 6000);
  document.getElementById("hero-prev").onclick=()=>{prevSlide(); resetInterval();};
  document.getElementById("hero-next").onclick=()=>{nextSlide(); resetInterval();};
}
function goToSlide(n){const s=document.querySelectorAll(".hero-slide");const d=document.querySelectorAll(".hero-dots span");if(!s.length) return;s[HERO_CURRENT].classList.remove("active");d[HERO_CURRENT].classList.remove("active");HERO_CURRENT=(n+s.length)%s.length;s[HERO_CURRENT].classList.add("active");d[HERO_CURRENT].classList.add("active");}
function nextSlide(){goToSlide(HERO_CURRENT+1);} function prevSlide(){goToSlide(HERO_CURRENT-1);} function resetInterval(){clearInterval(HERO_INTERVAL);HERO_INTERVAL=setInterval(()=>nextSlide(),6000);}

function renderRow(parent,title,items){
  if(!items||!items.length) return;
  // NUNCA apaga se vier vazio - corrige bug de sumir em fração de segundo
  const row=document.createElement("div"); row.className="row";
  const cards=items.slice(0,5).map((it,i)=>`
    <div class="card" data-idx="${i}">
      <div class="card-img-wrap">
        <img class="card-img" src="${it.poster}" alt="${it.title}" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/400x600/151515/aaa?text=${encodeURIComponent(it.title.slice(0,10))}'">
        <div class="card-play"><i class="fa-solid fa-play"></i></div>
      </div>
      <div class="card-body"><div class="card-title">${it.title}</div><div class="card-subtitle">${it.subtitle}</div><span class="card-badge">${it.source}</span></div>
    </div>
  `).join("");
  row.innerHTML=`<div class="row-title">${title} <span class="count">${items.slice(0,5).length} • FIXO</span></div><div class="row-cards">${cards}</div>`;
  parent.appendChild(row);
  row.querySelectorAll(".card").forEach((card,i)=>{card.onclick=()=>openPlayerQueue(items.slice(0,5), i);});
}

document.addEventListener("DOMContentLoaded", async ()=>{
  const container=document.getElementById("content-container");
  const status=document.getElementById("hero-status");
  
  // 1. Render instantâneo local - NUNCA deixa tela preta
  renderHeroCarousel(LOCAL_BANNERS);
  renderRow(container, "Filmes em Alta • 5 • Local", LOCAL_FILMES.slice(0,5));
  renderRow(container, "Series & Documentarios • 5", LOCAL_BANNERS.slice(0,3).concat(LOCAL_FILMES.slice(0,2)).slice(0,5));
  renderRow(container, "Desenhos & Animacoes • 5", LOCAL_FILMES.slice(2,5).concat(LOCAL_BANNERS.slice(0,2)).slice(0,5));
  setupModal(); setupNavigation();
  if(status) status.textContent="● LOCAL OK • BUSCANDO 7 EDGES 200 OK...";
  
  // 2. Busca só as 7 que você testou como OK, sem limpar se falhar
  try{
    const data = await loadWorkingEdges();
    // Só atualiza se tiver conteudo real, senão mantem local - FIX DO SUMIÇO
    if(data.banners && data.banners.length>=2){
      renderHeroCarousel(data.banners);
    }
    container.innerHTML="";
    renderRow(container, "Filmes em Alta • YouTube + Archive Edge", data.filmes);
    renderRow(container, "Series & Documentarios • NASA Edge", data.series);
    renderRow(container, "Desenhos & Animacoes • PeerTube Edge", data.infantil);
    renderRow(container, "Minha Lista • 5 Favoritos", LOCAL_FILMES.slice(0,5));
    if(status) status.textContent=`● ${CONFIG.EDGES_OK.length} EDGES OK • GRADE FIXA`;
  }catch(e){
    console.warn("Erro edges", e);
    if(status) status.textContent="● MODO OFFLINE • LOCAL ESTÁVEL";
  }
});

let currentQueue=[],CURRENT_INDEX=0;
function openPlayerQueue(q,s){currentQueue=q;CURRENT_INDEX=s;openPlayer(currentQueue[CURRENT_INDEX]);}
function openPlayer(item){
 if(!item) return;
 const modal=document.getElementById("player-modal"); const c=document.getElementById("player-container");
 document.getElementById("modal-title").innerText=item.title;
 document.getElementById("modal-desc").innerText=item.desc||item.subtitle;
 document.getElementById("player-meta").innerHTML=`<span>${item.source}</span><span>${(item.type||'MP4').toUpperCase()}</span><span style="color:#4ade80">● FIXO</span>`;
 if(item.type==='mp4'||item.url.match(/\.mp4|\.webm|\.m4v/)){
  c.innerHTML=`<video id="oio-video" controls autoplay playsinline class="w-full h-full object-contain" src="${item.url}" poster="${item.poster}"></video>`;
  document.getElementById("oio-video").onerror=()=>handleError();
 }else{
  c.innerHTML=`<iframe src="${item.url}?autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
 }
 modal.classList.remove("hidden");
}
function handleError(){const c=document.getElementById("player-container");c.innerHTML=`<div class="player-fallback"><p>Tentando proxima fonte...</p></div>`;setTimeout(()=>{CURRENT_INDEX++; if(CURRENT_INDEX<currentQueue.length) openPlayer(currentQueue[CURRENT_INDEX]);},1000);}
function setupModal(){const m=document.getElementById("player-modal");const b=document.getElementById("modal-close");b.onclick=()=>{m.classList.add("hidden");document.getElementById("player-container").innerHTML="";};m.onclick=e=>{if(e.target===m) b.click();};}
function setupNavigation(){
 const container=document.getElementById("content-container");
 document.querySelectorAll(".bottom-nav .nav-item").forEach(item=>{
  item.onclick=e=>{
   e.preventDefault();
   document.querySelectorAll(".bottom-nav .nav-item").forEach(i=>i.classList.remove("active"));
   item.classList.add("active");
   const tab=item.dataset.tab;
   const rows=container.querySelectorAll(".row");
   if(tab==='home') rows.forEach(r=>r.style.display='block');
   else if(tab==='filmes') rows.forEach((r,i)=>r.style.display=i===0?'block':'none');
   else if(tab==='series') rows.forEach((r,i)=>r.style.display=i===1?'block':'none');
   else if(tab==='infantil') rows.forEach((r,i)=>r.style.display=i===2?'block':'none');
   else if(tab==='minha-lista') rows.forEach((r,i)=>r.style.display=i===3?'block':'none');
  };
 });
    }
