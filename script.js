// OIO TV v1.5 MOBILE - Swipe + Preview no toque igual Netflix mobile
const CONFIG = {
  TMDB_URL: "https://uqdwtzlkqaosnweyoyit.supabase.co/functions/v1/tmdb",
  YOUTUBE_URL: "https://uqdwtzlkqaosnweyoyit.supabase.co/functions/v1/youtube",
  SUPABASE_KEY: "sb_publishable_uafBQD1aJ3w8_eq4meOsNQ_wzk8TwhA"
};

let PLAY_QUEUE=[], CURRENT_INDEX=0, HERO_CURRENT=0, HERO_INTERVAL=null;
let touchStartX=0, touchEndX=0;
let previewTimeout=null;
let expandedCard=null;

const toCard=o=>({
  id:o.id||Math.random().toString(36).slice(2),
  title:o.title||"Sem titulo",
  subtitle:o.subtitle||o.source||"HD",
  poster:o.poster||`https://picsum.photos/seed/${encodeURIComponent(o.title||'oio')}/400/600`,
  url:o.url,
  previewUrl:o.previewUrl||o.url,
  type:o.url?.match(/\.mp4|\.webm|\.m4v/) ? 'mp4' : (o.url?.includes('youtube')||o.url?.includes('youtu.be') ? 'embed' : 'mp4'),
  source:o.source||'OIO',
  desc:o.desc||o.subtitle||o.title
});

function fetchWithTimeout(url, opts={}, ms=5000){
  return Promise.race([fetch(url, opts), new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')), ms))]);
}

const LOCAL_BANNERS = [
  {title:"Cyber Odyssey 2026",subtitle:"OIO Originals • 4K",poster:"https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200",url:"https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v",previewUrl:"https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v",source:"OIO Originals",desc:"Sua plataforma modular com glassmorphism de alta performance e zero crash."},
  {title:"Neon Pulse",subtitle:"Ação • 4K • HDR",poster:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200",url:"https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4",previewUrl:"https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4",source:"Blender",desc:"Ação futurista com visuais neon e som Dolby Atmos."},
  {title:"Quantum Realm",subtitle:"Aventura • Sci-Fi",poster:"https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200",url:"https://download.blender.org/mango/tears_of_steel_1080p.webm",previewUrl:"https://download.blender.org/mango/tears_of_steel_1080p.webm",source:"Blender",desc:"Uma viagem pelo reino quantico em WebM sem marca d'agua."},
  {title:"NASA: Earth 4K",subtitle:"NASA SVS • Documentario",poster:"https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200",url:"https://images-assets.nasa.gov/video/NHQ_2019_0313_Go Forward to the Moon/GO Forward To The Moon~orig.mp4",previewUrl:"https://images-assets.nasa.gov/video/NHQ_2019_0313_Go Forward to the Moon/GO Forward To The Moon~orig.mp4",source:"NASA SVS",desc:"Imagens reais da Terra em 4K extraidas direto da NASA."},
  {title:"Spring 4K",subtitle:"Blender • 2019 • 4K",poster:"https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200",url:"https://download.blender.org/spring/spring_1080p.mp4",previewUrl:"https://download.blender.org/spring/spring_1080p.mp4",source:"Blender",desc:"Open movie premiado da Blender Foundation."}
].map(toCard);

const LOCAL_FILMES = [
  {title:"Big Buck Bunny",subtitle:"Blender • 2008 • 4K",poster:"https://peach.blender.org/wp-content/uploads/title_anouncement.jpg?x11217",url:"https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v",previewUrl:"https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v",source:"Blender"},
  {title:"Sintel",subtitle:"Blender • 2010 • HD",poster:"https://durian.blender.org/wp-content/uploads/2010/05/sintel_poster.jpg",url:"https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4",previewUrl:"https://download.blender.org/durian/trailer/sintel_trailer-1080p.mp4",source:"Blender"},
  {title:"Tears of Steel",subtitle:"Blender • Sci-Fi",poster:"https://mango.blender.org/wp-content/uploads/2013/05/01_poster.jpg",url:"https://download.blender.org/mango/tears_of_steel_1080p.webm",previewUrl:"https://download.blender.org/mango/tears_of_steel_1080p.webm",source:"Blender"},
  {title:"Caminandes",subtitle:"Blender • Curta",poster:"https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400",url:"https://download.blender.org/caminandes/caminandes3/caminandes3_1080p.mp4",previewUrl:"https://download.blender.org/caminandes/caminandes3/caminandes3_1080p.mp4",source:"Blender"},
  {title:"Cosmos Laundromat",subtitle:"Blender • 2015",poster:"https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400",url:"https://download.blender.org/gooseberry/gooseberry_1080p.mp4",previewUrl:"https://download.blender.org/gooseberry/gooseberry_1080p.mp4",source:"Blender"}
].map(toCard);

async function getEdgeBanners(){
  try{
    const headers = {"Authorization": `Bearer ${CONFIG.SUPABASE_KEY}`, "Content-Type":"application/json"};
    const [tmdbRes, ytRes] = await Promise.allSettled([
      fetchWithTimeout(CONFIG.TMDB_URL, {method:"GET", headers}, 6000).then(r=>r.ok?r.json():null),
      fetchWithTimeout(CONFIG.YOUTUBE_URL, {method:"GET", headers}, 6000).then(r=>r.ok?r.json():null)
    ]);
    let combined=[];
    if(tmdbRes.status==='fulfilled' && tmdbRes.value){
      const list = tmdbRes.value.hero ? [tmdbRes.value.hero] : (tmdbRes.value.filmes||tmdbRes.value.results||[]);
      combined = combined.concat(list.slice(0,5).map(x=>toCard({title:x.title||x.name,subtitle:x.subtitle||"TMDB • HD",poster:x.poster?.startsWith('http')?x.poster:(x.backdrop_path?`https://image.tmdb.org/t/p/w780${x.backdrop_path}`:x.poster),url:x.url||"https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v",source:"TMDB Edge",desc:x.desc||x.overview||""})));
    }
    if(ytRes.status==='fulfilled' && ytRes.value){
      const list = ytRes.value.videos||ytRes.value.data||[];
      combined = combined.concat(list.slice(0,5).map(x=>toCard({title:x.title,subtitle:x.subtitle||"YouTube • HD",poster:x.poster||x.thumbnail,url:x.url||`https://www.youtube.com/embed/${x.videoId}`,source:"YouTube Edge",desc:x.desc||""})));
    }
    return combined.length>=3 ? combined.slice(0,5) : [...combined, ...LOCAL_BANNERS].slice(0,5);
  }catch(e){ return LOCAL_BANNERS; }
}

async function getAllContent(){
  const banners = await getEdgeBanners();
  return {banners, filmes: [...LOCAL_FILMES, ...banners].slice(0,5), series: banners.slice(0,3).concat(LOCAL_FILMES.slice(0,2)).slice(0,5), infantil: LOCAL_FILMES.slice(2,5).concat(banners.slice(0,2)).slice(0,5), lista: LOCAL_FILMES.slice(0,5)};
}

// HERO CARROSSEL COM SWIPE MOBILE
function renderHeroCarousel(banners){
  const slidesEl=document.getElementById("hero-slides");
  const dotsEl=document.getElementById("hero-dots");
  slidesEl.innerHTML=""; dotsEl.innerHTML="";
  banners.slice(0,5).forEach((b,i)=>{
    const slide=document.createElement("div");
    slide.className=`hero-slide ${i===0?'active':''}`;
    slide.style.backgroundImage=`url('${b.poster}')`;
    slide.innerHTML=`<div class="hero-overlay"></div><div class="hero-content"><span class="badge">${b.source} • Destaque</span><h1>${b.title}</h1><p>${b.desc.slice(0,120)}</p><div class="hero-buttons"><button class="btn-primary btn-play-hero"><i class="fa-solid fa-play"></i> Assistir</button><button class="btn-secondary"><i class="fa-solid fa-info-circle"></i> Detalhes</button></div></div>`;
    slidesEl.appendChild(slide);
    const dot=document.createElement("span"); dot.className=i===0?'active':''; dot.onclick=()=>goToSlide(i); dotsEl.appendChild(dot);
    slide.querySelector(".btn-play-hero").onclick=()=>openPlayerQueue([b],0);
  });
  HERO_CURRENT=0; clearInterval(HERO_INTERVAL); HERO_INTERVAL=setInterval(()=>nextSlide(), 5000);
  document.getElementById("hero-prev").onclick=()=>{prevSlide(); resetInterval();};
  document.getElementById("hero-next").onclick=()=>{nextSlide(); resetInterval();};
  enableHeroSwipe();
}
function goToSlide(n){const slides=document.querySelectorAll(".hero-slide");const dots=document.querySelectorAll(".hero-dots span");if(!slides.length) return;slides[HERO_CURRENT].classList.remove("active");dots[HERO_CURRENT].classList.remove("active");HERO_CURRENT=(n+slides.length)%slides.length;slides[HERO_CURRENT].classList.add("active");dots[HERO_CURRENT].classList.add("active");}
function nextSlide(){goToSlide(HERO_CURRENT+1);}
function prevSlide(){goToSlide(HERO_CURRENT-1);}
function resetInterval(){clearInterval(HERO_INTERVAL);HERO_INTERVAL=setInterval(()=>nextSlide(),5000);}
function enableHeroSwipe(){
  const hero=document.getElementById("hero");
  hero.addEventListener('touchstart', e=>{touchStartX=e.changedTouches[0].screenX;}, {passive:true});
  hero.addEventListener('touchend', e=>{touchEndX=e.changedTouches[0].screenX; handleHeroSwipe();}, {passive:true});
}
function handleHeroSwipe(){
  const diff = touchEndX - touchStartX;
  if(Math.abs(diff) > 50){
    if(diff < 0) nextSlide(); else prevSlide();
    resetInterval();
  }
}

// CARDS COM PREVIEW MOBILE - SEGURA PARA PREVIEW
function renderRow(parent,title,items){
 if(!items||!items.length) return;
 const row=document.createElement("div"); row.className="row";
 const cards=items.slice(0,5).map((it,i)=>`
  <div class="card" data-idx="${i}">
    <div class="card-img-wrap">
      <img class="card-img" src="${it.poster}" alt="${it.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/111/fff?text=OIO'">
      <video class="card-preview-video" muted loop playsinline preload="none" poster="${it.poster}" src="${it.previewUrl}"></video>
      <div class="card-play-icon"><i class="fa-solid fa-play"></i></div>
    </div>
    <div class="card-body"><div class="card-title">${it.title}</div><div class="card-subtitle">${it.subtitle}</div><span class="card-badge">${it.source}</span></div>
  </div>
 `).join("");
 row.innerHTML=`<div class="row-title">${title} <span class="count">${items.slice(0,5).length} • PREVIEW MOBILE</span></div><div class="row-cards">${cards}</div>`;
 parent.appendChild(row);
 
 row.querySelectorAll(".card").forEach((card,i)=>{
   const video = card.querySelector(".card-preview-video");
   const item = items[i];
   
   // Desktop: hover preview
   card.addEventListener('mouseenter', ()=>{
     if(window.innerWidth>768 && video && video.src){
       card.classList.add('previewing');
       video.currentTime=0;
       video.play().catch(()=>{});
     }
   });
   card.addEventListener('mouseleave', ()=>{
     card.classList.remove('previewing');
     if(video){ video.pause(); video.currentTime=0; }
   });
   
   // Mobile: segura 400ms para preview, toque curto abre expandido
   let pressTimer=null;
   let isLongPress=false;
   
   card.addEventListener('touchstart', (e)=>{
     isLongPress=false;
     pressTimer = setTimeout(()=>{
       isLongPress=true;
       if(video && video.src){
         card.classList.add('previewing');
         video.currentTime=0;
         video.play().catch(()=>{});
         if(navigator.vibrate) navigator.vibrate(30);
       }
     }, 400);
   }, {passive:true});
   
   card.addEventListener('touchend', (e)=>{
     clearTimeout(pressTimer);
     if(isLongPress){
       e.preventDefault();
       setTimeout(()=>{
         card.classList.remove('previewing');
         if(video){ video.pause(); }
         showExpandedCard(item, items, i);
       }, 300);
     } else {
       // toque curto = abre card expandido estilo Netflix mobile
       e.preventDefault();
       showExpandedCard(item, items, i);
     }
   }, {passive:false});
   
   card.addEventListener('touchmove', ()=>{
     clearTimeout(pressTimer);
     card.classList.remove('previewing');
     if(video) video.pause();
   }, {passive:true});
 });
}

function showExpandedCard(item, queue, idx){
  closeExpandedCard();
  const expanded=document.createElement("div");
  expanded.className="card-expanded";
  expanded.innerHTML=`
    <video muted autoplay loop playsinline src="${item.previewUrl}" poster="${item.poster}"></video>
    <div class="card-expanded-info">
      <h3>${item.title}</h3>
      <p>${item.subtitle} • ${item.desc.slice(0,80)}</p>
      <div class="card-expanded-actions">
        <button class="btn-watch"><i class="fa-solid fa-play"></i> Assistir</button>
        <button class="btn-close"><i class="fa-solid fa-times"></i> Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(expanded);
  expandedCard=expanded;
  requestAnimationFrame(()=>expanded.classList.add("show"));
  expanded.querySelector(".btn-watch").onclick=()=>{closeExpandedCard(); openPlayerQueue(queue, idx);};
  expanded.querySelector(".btn-close").onclick=()=>closeExpandedCard();
  expanded.onclick=e=>{if(e.target===expanded) closeExpandedCard();};
  setTimeout(()=>{if(expandedCard) expanded.addEventListener('click', (e)=>{if(e.target===expanded) closeExpandedCard();});},100);
}
function closeExpandedCard(){
  if(expandedCard){
    expandedCard.classList.remove("show");
    setTimeout(()=>{if(expandedCard){expandedCard.remove(); expandedCard=null;}},300);
  }
}

document.addEventListener("DOMContentLoaded", async ()=>{
  const container=document.getElementById("content-container");
  const status=document.getElementById("hero-status");
  renderHeroCarousel(LOCAL_BANNERS);
  renderRow(container, "Filmes em Alta • Preview Mobile", LOCAL_FILMES.slice(0,5));
  renderRow(container, "Series & Docs • Segura para preview", LOCAL_FILMES.slice(0,5));
  renderRow(container, "Desenhos • Toque para expandir", LOCAL_FILMES.slice(2,5).concat(LOCAL_BANNERS.slice(0,2)).slice(0,5));
  setupModal(); setupNavigation();
  if(status) status.textContent="● MOBILE PREVIEW ATIVO";
  try{
    const data=await getAllContent();
    renderHeroCarousel(data.banners);
    container.innerHTML="";
    renderRow(container, "Filmes em Alta • Edge + Preview", data.filmes);
    renderRow(container, "Series & Documentarios • 5", data.series);
    renderRow(container, "Desenhos & Animacoes • Mobile", data.infantil);
    renderRow(container, "Minha Lista • 5 Favoritos", data.lista);
    if(status) status.textContent=`● ${data.banners.length} BANNERS • PREVIEW MOBILE OK`;
  }catch(e){}
});

let currentQueue=[],CURRENT_INDEX=0;
function openPlayerQueue(queue,start){currentQueue=queue;CURRENT_INDEX=start;openPlayer(currentQueue[CURRENT_INDEX]);}
function openPlayer(item){
 if(!item) return;
 const modal=document.getElementById("player-modal"); const container=document.getElementById("player-container");
 document.getElementById("modal-title").innerText=item.title;
 document.getElementById("modal-desc").innerText=item.desc||item.subtitle;
 document.getElementById("player-meta").innerHTML=`<span>${item.source}</span><span>${(item.type||'MP4').toUpperCase()}</span><span style="color:#4ade80">● URL DIRETA</span>`;
 if(item.type==='mp4'||item.url.match(/\.mp4|\.webm|\.m4v/)){
  container.innerHTML=`<video id="oio-video" controls autoplay playsinline class="w-full h-full object-contain" src="${item.url}" poster="${item.poster}"></video>`;
  const v=document.getElementById("oio-video"); v.onerror=handleVideoError;
 }else{
  container.innerHTML=`<iframe src="${item.url}?autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
 }
 modal.classList.remove("hidden");
 closeExpandedCard();
}
function handleVideoError(){
 const c=document.getElementById("player-container");
 c.innerHTML=`<div class="player-fallback"><p>Tentando proxima fonte...</p></div>`;
 setTimeout(()=>{CURRENT_INDEX++; if(CURRENT_INDEX<currentQueue.length) openPlayer(currentQueue[CURRENT_INDEX]);},1200);
}
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
 document.addEventListener('click', (e)=>{ if(expandedCard && !expandedCard.contains(e.target) && !e.target.closest('.card')) closeExpandedCard(); }); 
}
