const P=[
  {id:1,n:'Atelier Leather Tote',c:'Bags',p:38900,o:45900,i:'1548036328-c9fa89d128fa'},
  {id:2,n:'Ivory Structured Bag',c:'Bags',p:42000,o:49000,i:'1584917865442-de89df76afd3',isNew:1},
  {id:3,n:'Saffron Leather Wallet',c:'Bags',p:12500,o:null,i:'1553062407-98eeb64c6a62'},
  {id:4,n:'Meridian Automatic',c:'Watches',p:48500,o:58000,i:'1523275335684-37898b6baf30'},
  {id:5,n:'Noir Chronograph',c:'Watches',p:62000,o:null,i:'1524592094714-0f0654e20314',isNew:1},
  {id:6,n:'Solace Tortoise Frames',c:'Sunglasses',p:14900,o:18500,i:'1572635196237-14b3f281503f'},
  {id:7,n:'Aurum Aviators',c:'Sunglasses',p:16500,o:null,i:'1511499767150-a48a237f0083',isNew:1},
  {id:8,n:'Serene Signet Ring',c:'Jewelry',p:18500,o:null,i:'1605100804763-247f67b3557e'},
  {id:9,n:'Gilded Chain Necklace',c:'Jewelry',p:24900,o:29000,i:'1599643478518-a784e5dc4c8f',isNew:1},
  {id:10,n:'No. 01 Eau de Parfum',c:'Fragrances',p:16800,o:null,i:'1547887538-e3a2f32cb1cc'},
  {id:11,n:'Velvet Oud Concentrate',c:'Fragrances',p:21500,o:null,i:'1594035910387-fea47794261f',isNew:1},
  {id:12,n:'Carré Cashmere Scarf',c:'Lifestyle',p:13900,o:null,i:'1520903920243-00d872a2d1c9'},
  {id:13,n:'Obsidian Desk Object',c:'Lifestyle',p:9800,o:12500,i:'1494438639946-1ebd1d20bf85',isNew:1}
];
const CATS=['All','Bags','Watches','Sunglasses','Jewelry','Fragrances','Lifestyle','Saved'];
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const img=(p,w=800)=>`https://images.unsplash.com/photo-${p.i}?auto=format&fit=crop&w=${w}&q=86`;
const tag=p=>`<img class="${p.id===13?'product-focus-center':''}" src="${img(p)}" alt="${p.n}" loading="lazy">`;
const money=n=>`PKR ${n.toLocaleString('en-US')}`;
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};

let cart=load('elvare_cart',{}),wish=load('elvare_wish',[]),cat='All',query='';
save('elvare_catalog',P);

function fillLoopTrack(selector,offsetProperty,viewportFactor=1){
  const track=$(selector),group=track?.firstElementChild;
  if(!track||!group)return;
  const groupWidth=group.getBoundingClientRect().width;
  if(!groupWidth)return;
  while(track.scrollWidth<innerWidth*viewportFactor+groupWidth){
    const copy=group.cloneNode(true);
    copy.setAttribute('aria-hidden','true');
    track.append(copy);
  }
  track.style.setProperty(offsetProperty,`${-100/track.children.length}%`);
}
const fillAnnouncementTrack=()=>fillLoopTrack('.marquee-track','--marquee-offset');
const fillStatementTrack=()=>fillLoopTrack('.statement-track','--ribbon-offset',1.08);

function priceHTML(p){
  return `<div class="price"><span>${money(p.p)}${p.o?`<del>${money(p.o)}</del>`:''}</span></div>`;
}
function card(p){
  const saved=wish.includes(p.id);
  const off=p.o?`<span class="badge-d">-${Math.round((1-p.p/p.o)*100)}%</span>`:'';
  return `<div class="col-6 col-lg-4 reveal"><article class="pcard">
    <div class="pimg">${off}<button class="wish-btn ${saved?'on':''}" data-wish="${p.id}" aria-label="Toggle wishlist"><i class="bi bi-heart${saved?'-fill':''}"></i></button>${tag(p)}<button class="quick-btn" data-view="${p.id}"><i class="bi bi-eye me-2"></i>Quick view</button></div>
    <div class="pbody"><small>${p.c}</small><h3>${p.n}</h3>${priceHTML(p)}<button class="btn btn-dark" data-add="${p.id}"><i class="bi bi-bag-plus me-2"></i>Add to bag</button></div>
  </article></div>`;
}
function renderFilters(){
  $('#filters').innerHTML=CATS.map(c=>`<button class="${c===cat?'active':''}" data-filter="${c}">${c==='Saved'?`Saved (${wish.length})`:c}</button>`).join('');
}
function renderGrid(){
  const list=P.filter(p=>(cat==='All'||(cat==='Saved'?wish.includes(p.id):p.c===cat))&&(`${p.n} ${p.c}`).toLowerCase().includes(query));
  $('#grid').innerHTML=list.length?list.map(card).join(''):'<div class="col-12"><p class="text-center py-5">No pieces match your selection.</p></div>';
  observeReveals();
  bindDepthMotion();
}
function renderNew(){
  $('#newGrid').innerHTML=P.filter(p=>p.isNew).map(p=>`<div class="nitem"><article class="ncard">
    <div class="nimg">${tag(p)}</div><div class="ntxt"><span class="tag">New arrival</span><h3>${p.n}</h3><span class="muted">${p.c}</span>${priceHTML(p)}<button class="btn btn-dark" data-add="${p.id}">Add to bag</button></div>
  </article></div>`).join('');
}
function setCat(c){
  cat=c;renderFilters();renderGrid();$('#shop').scrollIntoView({behavior:'smooth'});
}
function renderCart(){
  let subtotal=0,count=0;
  const ids=Object.keys(cart);
  $('#cartPieceCount').textContent=`${Object.values(cart).reduce((a,b)=>a+b,0)} pieces`;
  $('#cartItems').innerHTML=ids.length?ids.map(id=>{
    const p=P.find(x=>x.id==id),n=cart[id];subtotal+=p.p*n;count+=n;
    return `<div class="citem"><div class="cimage">${tag(p)}</div><div><h6>${p.n}</h6><small>${money(p.p)}</small>
      <div class="qty-row"><div class="qty"><button data-qty="${id}" data-d="-1" aria-label="Decrease">−</button><span>${n}</span><button data-qty="${id}" data-d="1" aria-label="Increase">+</button></div><button class="remove-btn" data-remove="${id}" aria-label="Remove"><i class="bi bi-trash3"></i></button></div></div></div>`;
  }).join(''):'<div class="cart-empty"><i class="bi bi-bag fs-1"></i><h3 class="mt-3">Your bag is empty</h3><p>Explore the collection and add a considered piece.</p></div>';
  $('#subtotal').textContent=money(subtotal);
  $('#cartCount').textContent=count;
  save('elvare_cart',cart);
}
function addToCart(id){
  cart[id]=(cart[id]||0)+1;renderCart();
  const off=bootstrap.Offcanvas.getOrCreateInstance($('#cart'));off.show();
  const c=$('#cartCount');c.classList.remove('bump');void c.offsetWidth;c.classList.add('bump');
}
function toggleWish(id){
  wish=wish.includes(id)?wish.filter(x=>x!==id):[...wish,id];
  save('elvare_wish',wish);$('#wishCount').textContent=wish.length;
  $$(`[data-wish="${id}"]`).forEach(b=>{
    const on=wish.includes(id);b.classList.toggle('on',on);b.innerHTML=`<i class="bi bi-heart${on?'-fill':''}"></i>`;
  });
  renderFilters();if(cat==='Saved')renderGrid();
}
function quickView(id){
  const p=P.find(x=>x.id===id);
  $('#qvBody').innerHTML=`<div class="qv-grid"><div class="qv-img">${tag(p)}</div><div class="qv-copy"><small class="eyebrow">${p.c}</small><h2>${p.n}</h2>${priceHTML(p)}<p>Considered proportions, honest materials and a restrained finish designed to age beautifully. Complimentary delivery and a two-year warranty are included.</p><button class="btn btn-dark w-100" data-add="${p.id}" data-bs-dismiss="modal">Add to bag <i class="bi bi-arrow-right ms-2"></i></button></div></div>`;
  bootstrap.Modal.getOrCreateInstance($('#quickView')).show();
}

document.addEventListener('click',e=>{
  const t=e.target.closest('[data-add],[data-wish],[data-view],[data-filter],[data-category],[data-qty],[data-remove]');
  if(!t)return;
  const d=t.dataset;
  if(d.add)addToCart(+d.add);
  else if(d.wish)toggleWish(+d.wish);
  else if(d.view)quickView(+d.view);
  else if(d.filter)setCat(d.filter);
  else if(d.category){cat=d.category;renderFilters();renderGrid()}
  else if(d.qty){cart[d.qty]+=+d.d;if(cart[d.qty]<=0)delete cart[d.qty];renderCart()}
  else if(d.remove){delete cart[d.remove];renderCart()}
});

$('#wishNav').addEventListener('click',()=>setCat('Saved'));
$('#searchInput').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();cat='All';renderFilters();renderGrid();$('#shop').scrollIntoView({behavior:'smooth'})});
$('#searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('#searchInput').blur()});
$('#searchBar').addEventListener('shown.bs.collapse',()=>$('#searchInput').focus());

$('#newsForm').addEventListener('submit',e=>{
  e.preventDefault();
  const f=$('#newsEmail'),m=$('#newsMsg'),ok=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim());
  m.className=ok?'ok':'err';m.textContent=ok?'Welcome to the ÉLVARÉ private edit.':'Please enter a valid email address.';
  if(ok)f.value='';
});
$('#contactForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,button=form.querySelector('button[type="submit"]'),message=$('#contactMessage');
  if(!form.reportValidity())return;
  button.disabled=true;
  button.setAttribute('aria-busy','true');
  message.className='contact-form-message';
  message.textContent='Sending your message...';
  try{
    const fields=new URLSearchParams();
    new FormData(form).forEach((value,key)=>fields.append(key,String(value)));
    const response=await fetch(form.action,{method:'POST',headers:{Accept:'application/json'},body:fields});
    const result=await response.json();
    if(!response.ok||!result.success)throw new Error(result.message||'Your message could not be sent. Please try again.');
    form.reset();
    message.className='contact-form-message ok';
    message.textContent='Thank you. Your message has been received; we’ll be in touch soon.';
  }catch(error){
    message.className='contact-form-message err';
    message.textContent=error instanceof Error?error.message:'Your message could not be sent. Please try again.';
  }finally{
    button.disabled=false;
    button.removeAttribute('aria-busy');
  }
});
$('#checkout').addEventListener('click',()=>{
  if(!Object.keys(cart).length)return;
  window.location.href='checkout.html';
});

let revealObserver;
function observeReveals(){
  if(!revealObserver)revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('show');revealObserver.unobserve(entry.target)}});
  },{threshold:.11});
  $$('.reveal:not(.show)').forEach(el=>revealObserver.observe(el));
}

const slides=$$('.hero-slide'),bars=$$('.hero-bar');
let hi=0,heroTimer;
function goHero(n){
  hi=(n+slides.length)%slides.length;
  slides.forEach((el,i)=>el.classList.toggle('active',i===hi));
  bars.forEach((el,i)=>{el.classList.remove('active');if(i===hi){void el.offsetWidth;el.classList.add('active')}});
  $('#heroNumber').textContent=`0${hi+1}`;
  clearTimeout(heroTimer);heroTimer=setTimeout(()=>goHero(hi+1),7000);
}
bars.forEach((b,i)=>b.addEventListener('click',()=>goHero(i)));

function enterSite(){
  if(document.body.classList.contains('loaded'))return;
  document.body.classList.add('loaded');
  $('#home').classList.add('loaded');
  goHero(0);
}
window.addEventListener('load',()=>setTimeout(enterSite,1200));
setTimeout(enterSite,3000);

$$('.category-door').forEach(door=>{
  door.addEventListener('mouseenter',()=>{
    $$('.category-door').forEach(d=>d.classList.remove('active'));door.classList.add('active');
  });
});

const newSlider=$('#newGrid');
$('#newPrev').addEventListener('click',()=>newSlider.scrollBy({left:-650,behavior:'smooth'}));
$('#newNext').addEventListener('click',()=>newSlider.scrollBy({left:650,behavior:'smooth'}));

const reviewTrack=$('#reviewTrack'),reviewSlides=$$('.review-track figure'),reviewDots=$('#reviewDots');
let reviewIndex=0,reviewTimer;
reviewDots.innerHTML=reviewSlides.map((_,i)=>`<button class="${i===0?'active':''}" aria-label="Review ${i+1}"></button>`).join('');
function goReview(n){
  reviewIndex=(n+reviewSlides.length)%reviewSlides.length;
  reviewTrack.style.transform=`translateX(${-reviewIndex*100}%)`;
  $$('#reviewDots button').forEach((d,i)=>d.classList.toggle('active',i===reviewIndex));
  clearInterval(reviewTimer);reviewTimer=setInterval(()=>goReview(reviewIndex+1),5500);
}
$('#reviewPrev').addEventListener('click',()=>goReview(reviewIndex-1));
$('#reviewNext').addEventListener('click',()=>goReview(reviewIndex+1));
reviewDots.addEventListener('click',e=>{
  const i=$$('#reviewDots button').indexOf(e.target.closest('button'));if(i>-1)goReview(i);
});
goReview(0);

let reviewStart=null;
$('.review-window')?.addEventListener('pointerdown',e=>reviewStart=e.clientX);
$('.review-window')?.addEventListener('pointerup',e=>{
  if(reviewStart===null)return;const d=e.clientX-reviewStart;reviewStart=null;if(Math.abs(d)>50)goReview(reviewIndex+(d<0?1:-1));
});

const progress=document.createElement('div');progress.id='scrollProgress';document.body.append(progress);
let lastY=0;
window.addEventListener('scroll',()=>{
  const y=scrollY,h=document.documentElement.scrollHeight-innerHeight;
  progress.style.transform=`scaleX(${h>0?y/h:0})`;
  $('#mainNav').classList.toggle('hide',y>lastY&&y>350);
  lastY=y;
  if(!reduce){
    $$('.editorial-media').forEach(el=>{
      const r=el.parentElement.getBoundingClientRect();
      if(r.bottom>0&&r.top<innerHeight)el.style.transform=`translate3d(0,${(r.top*-.06).toFixed(1)}px,0)`;
    });
    $$('.editorial-copy').forEach(el=>{
      const r=el.getBoundingClientRect();
      if(r.bottom>0&&r.top<innerHeight){
        const depth=(r.top-innerHeight*.5)/innerHeight;
        el.style.transform=`translate3d(0,${(-depth*18).toFixed(1)}px,20px)`;
      }
    });
  }
},{passive:true});

const countObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    const el=entry.target,target=+el.dataset.count,suffix=el.dataset.suffix,start=performance.now();
    countObserver.unobserve(el);
    function tick(t){
      const p=Math.min((t-start)/1500,1),v=Math.round(target*(1-Math.pow(1-p,3)));
      el.textContent=v+suffix;if(p<1)requestAnimationFrame(tick);
    }requestAnimationFrame(tick);
  });
},{threshold:.7});
$$('[data-count]').forEach(el=>countObserver.observe(el));

function bindDepthMotion(){
  if(reduce)return;
  $$('.pimg:not([data-depth-bound]),.ncard:not([data-depth-bound]),.story-image:not([data-depth-bound]),.hero-feature:not([data-depth-bound]),.category-door:not([data-depth-bound])').forEach(el=>{
    el.dataset.depthBound='true';
    el.addEventListener('pointermove',e=>{
      const r=el.getBoundingClientRect();
      const px=(e.clientX-r.left)/r.width-.5;
      const py=(e.clientY-r.top)/r.height-.5;
      el.classList.add('tilt-active');
      el.style.setProperty('--tilt-x',`${(-py*20).toFixed(2)}deg`);
      el.style.setProperty('--tilt-y',`${(px*24).toFixed(2)}deg`);
      if(el.classList.contains('pimg')){
        el.style.transform=`rotateX(${-py*20}deg) rotateY(${px*24}deg) translateZ(18px)`;
        const img=el.querySelector('img');
        if(img)img.style.transform=`scale(1.12) translate(${px*14}px,${py*14}px)`;
      }else{
        el.style.transform=`perspective(1000px) rotateX(${-py*20}deg) rotateY(${px*24}deg) translateZ(20px)`;
      }
    });
    el.addEventListener('pointerleave',()=>{
      el.classList.remove('tilt-active');
      el.style.removeProperty('--tilt-x');
      el.style.removeProperty('--tilt-y');
      el.style.transform='';
      const img=el.querySelector('img');
      if(img)img.style.transform='';
    });
  });
}

const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
if(fine){
  document.body.classList.add('has-cursor');
  const cursor=document.createElement('div'),ring=document.createElement('div');
  cursor.id='cursor';ring.id='cursor-ring';ring.innerHTML='<span aria-hidden="true"></span>';
  cursor.setAttribute('aria-hidden','true');ring.setAttribute('aria-hidden','true');
  document.body.append(cursor,ring);
  let mx=0,my=0,rx=0,ry=0;
  window.addEventListener('mousemove',e=>{
    mx=e.clientX;my=e.clientY;
    cursor.style.transform=`translate3d(${mx-3}px,${my-3}px,0)`;
    document.body.classList.add('cursor-on');
    if(reduce){
      rx=mx;ry=my;
      ring.style.transform=`translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
    }
  });
  if(!reduce)(function follow(){
    rx+=(mx-rx)*.16;ry+=(my-ry)*.16;
    ring.style.transform=`translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
    requestAnimationFrame(follow);
  })();
  document.addEventListener('mouseover',e=>{
    const target=e.target;
    const product=target.closest('.pimg,.hero-feature');
    const category=target.closest('.category-door');
    const slider=target.closest('.new-slider');
    const linked=target.closest('a,button,input');
    const label=ring.querySelector('span');
    ring.classList.toggle('big',!!(product||category||slider));
    ring.classList.toggle('link',!!linked&&!product&&!category&&!slider);
    label.textContent=product?'VIEW':category?'DISCOVER':slider?'DRAG':'';
  });
  document.addEventListener('pointerdown',()=>ring.classList.add('down'));
  window.addEventListener('pointerup',()=>ring.classList.remove('down'));
  window.addEventListener('blur',()=>document.body.classList.remove('cursor-on'));
}

document.querySelectorAll('#menu .nav-link').forEach(link=>link.addEventListener('click',()=>{
  const collapse=bootstrap.Collapse.getInstance($('#menu'));if(collapse)collapse.hide();
}));

renderFilters();renderGrid();renderNew();renderCart();
$('#wishCount').textContent=wish.length;
bindDepthMotion();
fillAnnouncementTrack();
fillStatementTrack();
let marqueeResizeTimer;
window.addEventListener('resize',()=>{
  clearTimeout(marqueeResizeTimer);
  marqueeResizeTimer=setTimeout(()=>{fillAnnouncementTrack();fillStatementTrack()},120);
},{passive:true});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{fillAnnouncementTrack();fillStatementTrack()});
