/* АвтоРейка46 · новые публичные функции и защищённая панель; без демо-заявок. */
(()=>{
'use strict';
const API=(window.AR46_API_BASE||'').replace(/\/$/,'');
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>d?new Date(d).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}):'—';
const money=n=>n===null||n===undefined?'Цена уточняется':Number(n).toLocaleString('ru-RU')+' ₽';
const state={brands:[],models:[],generations:[],brand:null,model:null,generation:null,estimate:null,
  reviews:[],reviewIndex:0,autoplay:null,paused:false,catalog:[],settings:{},authorized:false,role:'',
  currentTab:'orders',token:sessionStorage.getItem('ar46.admin.token')||''};
const help='Не удалось связаться с сервером техцентра. Запись через сайт сейчас недоступна. Позвоните по телефону в шапке.';
async function api(path,options={}){
  if(window.AR46_DEMO_MODE){
    throw Error('Демонстрационный режим: сервер ещё не подключён. Действие не отправлено и данные не сохранены.');
  }
  const headers={'Accept':'application/json',...options.body?{'Content-Type':'application/json'}:{},...options.headers};
  const response=await fetch(API+'/api'+path,{...options,headers,mode:'cors',cache:'no-store'});
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw Error(typeof result?.detail==='string'?result.detail:`Ошибка сервера (${response.status})`);
  if(!result)throw Error('Ответ сервера не в формате JSON');
  return result;
}
function showInfo(id,message){const node=$(id);if(node)node.innerHTML=`<p class="ar-empty">${esc(message)}</p>`;}
function urlFor(kind,token){
  const u=new URL(location.href);u.searchParams.delete('review');u.searchParams.delete('track');
  u.searchParams.set(kind,token);u.hash='#'+kind;return u.href;
}
function errText(error){return error?.message||'Ошибка, попробуйте позже';}
function popup(title,html,bind){
 const dlg=$('modal');dlg.innerHTML=`<button type="button" class="close" aria-label="Закрыть">×</button><h2 id="dialogTitle">${esc(title)}</h2>${html}`;
 dlg.querySelector('.close').onclick=()=>dlg.close();if(!dlg.open)dlg.showModal();
 bind?.(dlg);
}
function formatVehicle(){
 return [state.brand?.name,state.model?.name,state.generation?.label].filter(Boolean).join(' ')||'';
}
function openRequest(subject='',productId=null,vehicleOverride=null){
 const product=state.catalog.find(p=>String(p.id)===String(productId));
 if(productId!==null&&!product){popup('Товар недоступен','<p>Позиция не найдена в актуальном каталоге. Уточните наличие по телефону.</p>');return;}
 const vehicle=vehicleOverride||formatVehicle()||product?.vehicle||'';
 popup(product?'Запрос на покупку агрегата':'Запись на диагностику',`
 <p class="ar-form-lead">После отправки заявка поступит сотрудникам. Время визита и окончательная цена подтверждаются при обратной связи.</p>
 <form id="arOrderForm" class="ar-form-grid">
  <label>Ваше имя<input name="full_name" maxlength="100" required autocomplete="name" placeholder="Как к вам обращаться"></label>
  <label>Телефон<input name="phone" maxlength="24" type="tel" required autocomplete="tel" placeholder="+7 999 123-45-67"></label>
  <label>Автомобиль<input name="vehicle" maxlength="140" required value="${esc(vehicle)}" placeholder="Марка, модель, поколение, год"></label>
  ${product?`<p class="ar-form-static"><strong>Товар:</strong> ${esc(product.name)} · ${esc(product.sku)}</p>`:
    `<label>Услуга<input name="subject" maxlength="140" required value="${esc(subject||'Диагностика рулевого управления')}"></label>`}
  <label class="ar-full">Описание проблемы<textarea name="notes" rows="3" maxlength="1200" placeholder="Что происходит с рулевым управлением, когда проявляется неисправность"></textarea></label>
  <label class="ar-consent ar-full"><input type="checkbox" name="consent" required><span>Согласен на обработку имени, телефона и сведений об обращении для связи по заявке. <a href="#doc-privacy">Политика конфиденциальности</a></span></label>
  <p role="alert" class="ar-alert ar-full" id="arOrderError"></p>
  <button class="button primary ar-full" type="submit">Отправить заявку</button>
 </form>`,dlg=>{
  dlg.querySelector('#arOrderForm').onsubmit=async e=>{
   e.preventDefault();const form=e.currentTarget;const submit=form.querySelector('[type=submit]');submit.disabled=true;
   const data=new FormData(form);
   const body={kind:product?'product':'service',subject:product?.name||String(data.get('subject')||''),
    product_id:product?.id||null,vehicle:String(data.get('vehicle')||'').trim(),notes:String(data.get('notes')||'').trim(),
    full_name:String(data.get('full_name')||'').trim(),phone:String(data.get('phone')||'').trim(),consent:data.has('consent')};
   try{
    const result=await api('/requests',{method:'POST',body:JSON.stringify(body)});
    const tracking=urlFor('track',result.tracking_token);
    popup('Заявка получена',`<p>Номер заявки <strong>${esc(result.id)}</strong>. Сотрудник свяжется с вами для согласования.</p><p class="hint">Сохраните персональную ссылку отслеживания. Она не публикуется и не должна передаваться посторонним.</p><div class="ar-copy-row"><input aria-label="Ссылка для отслеживания" readonly value="${esc(tracking)}"><button class="button subtle" id="arCopyTrack" type="button">Копировать ссылку</button></div>`,d=>d.querySelector('#arCopyTrack').onclick=async()=>{try{await navigator.clipboard.writeText(tracking);d.querySelector('#arCopyTrack').textContent='Скопировано';}catch{d.querySelector('input').select();}});
   }catch(error){dlg.querySelector('#arOrderError').textContent=errText(error);submit.disabled=false;}
  };
 });
}
function brandButtons(items){return items.map(x=>`<button type="button" class="ar-choice" data-brand-id="${x.id}">${esc(x.name)}</button>`).join('');}
function renderWizard(){
 const heading=$('arSelectionHeading'),opts=$('arChoices'),search=$('arBrandSearch'),crumb=$('arBreadcrumb');
 if(!opts)return;
 const steps=[...document.querySelectorAll('.ar-wizard-steps span')];
 steps.forEach((x,i)=>x.classList.toggle('active',i===(state.generation?2:state.model?2:state.brand?1:0)));
 const links=[];
 if(state.brand)links.push(`<button type="button" data-reset="brand">${esc(state.brand.name)} ×</button>`);
 if(state.model)links.push(`<button type="button" data-reset="model">${esc(state.model.name)} ×</button>`);
 if(state.generation)links.push(`<button type="button" data-reset="generation">${esc(state.generation.label)} ×</button>`);
 crumb.innerHTML=links.join('<span>›</span>');
 if(state.generation){heading.textContent='Результат подбора';opts.innerHTML='';search.closest('label').hidden=true;return;}
 if(state.model){
  heading.textContent='Выберите поколение';search.closest('label').hidden=true;
  opts.innerHTML=state.generations.map(x=>`<button type="button" class="ar-choice" data-generation-id="${x.id}">${esc(x.label)}${x.year_from?' · '+x.year_from+'–'+(x.year_to||'н.в.') : ''}</button>`).join('')||'<p class="hint">Поколения этой модели пока не внесены специалистами. Вы можете отправить запрос для уточнения.</p>';
  opts.innerHTML+='<button type="button" class="ar-choice ar-unknown" data-inquire>Не знаю поколение / уточнить у мастера ↗</button>';
  return;
 }
 if(state.brand){
  heading.textContent='Выберите модель';search.closest('label').hidden=true;
  opts.innerHTML=state.models.map(x=>`<button type="button" class="ar-choice" data-model-id="${x.id}">${esc(x.name)}</button>`).join('')||'<p class="hint">Для этой марки пока нет моделей.</p>';
  opts.innerHTML+='<button type="button" class="ar-choice ar-unknown" data-inquire>Моей модели нет в списке ↗</button>';
  return;
 }
 heading.textContent='Выберите марку автомобиля';search.closest('label').hidden=false;
 const q=search.value.trim().toLocaleLowerCase('ru');
 const matches=state.brands.filter(x=>x.name.toLocaleLowerCase('ru').includes(q));
 opts.innerHTML=brandButtons(matches)||'<p class="hint">Марки не найдены.</p>';
}
function renderEstimate(){
 const box=$('arEstimate');if(!box)return;const x=state.estimate;
 box.hidden=!state.generation;
 if(!state.generation)return;
 if(!x){box.innerHTML='<p>Получаем сведения из справочника…</p>';return;}
 const confirmed=Boolean(x.confirmed);
 const cost=confirmed && x.price_min!=null ?(x.price_max!=null&&x.price_max!==x.price_min?`${money(x.price_min)} – ${money(x.price_max)}`:money(x.price_min)):'Стоимость уточняется после диагностики';
 box.innerHTML=`<div class="section-kicker">Выбранный автомобиль</div><h3>${esc(formatVehicle())}</h3>
 <p>${x.year_from||'Год не указан'}${x.year_to?' – '+x.year_to:''}</p>
 <div class="ar-facts"><div><small>Рулевой механизм</small><strong>${esc(confirmed&&x.steering_type||'Уточняется по модификации')}</strong></div>
 <div><small>Ориентировочная стоимость</small><strong>${esc(cost)}</strong></div>
 <div><small>Услуги</small><strong>${esc(confirmed&&x.services||'Определяются специалистом')}</strong></div>
 <div><small>Срок выполнения</small><strong>${esc(confirmed&&x.timeframe||'Уточняется')}</strong></div></div>
 ${confirmed&&x.description?`<p>${esc(x.description)}</p>`:''}
 <p class="hint">Окончательная стоимость устанавливается после диагностики и согласования работ. Данные неподтверждённых поколений не выдаются за предложения сервиса.</p>
 <button class="button primary" id="arEstimateRequest" type="button">Записаться на диагностику ↗</button>`;
 $('arEstimateRequest').onclick=()=>openRequest('Диагностика рулевого управления',null,formatVehicle());
}
async function selectBrand(item){
 state.brand=item;state.model=null;state.generation=null;state.estimate=null;
 $('arEstimate').hidden=true;state.models=[];renderWizard();
 try{state.models=await api('/vehicles/models?brand_id='+item.id);renderWizard();}
 catch(error){showInfo('arChoices',errText(error));}
}
async function selectModel(item){
 state.model=item;state.generation=null;state.estimate=null;state.generations=[];renderWizard();
 try{state.generations=await api('/vehicles/generations?model_id='+item.id);renderWizard();}
 catch(error){showInfo('arChoices',errText(error));}
}
async function selectGeneration(item){
 state.generation=item;state.estimate=null;renderWizard();renderEstimate();
 try{state.estimate=await api('/vehicles/estimate?generation_id='+item.id);renderEstimate();}
 catch(error){showInfo('arEstimate',errText(error));}
}
$('arChoices')?.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-inquire')){openRequest('Уточнение совместимости и стоимости',null,formatVehicle());return;}
 if(b.dataset.brandId){const x=state.brands.find(v=>v.id===Number(b.dataset.brandId));if(x)await selectBrand(x);}
 else if(b.dataset.modelId){const x=state.models.find(v=>v.id===Number(b.dataset.modelId));if(x)await selectModel(x);}
 else if(b.dataset.generationId){const x=state.generations.find(v=>v.id===Number(b.dataset.generationId));if(x)await selectGeneration(x);}
});
$('arBrandSearch')?.addEventListener('input',renderWizard);
$('arBreadcrumb')?.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.reset==='brand'){state.brand=null;state.model=null;state.generation=null;}
 else if(b.dataset.reset==='model'){state.model=null;state.generation=null;}
 else state.generation=null;
 state.estimate=null;$('arEstimate').hidden=true;renderWizard();
});
document.addEventListener('click',e=>{
 const link=e.target.closest('a[data-brand]');if(!link)return;
 const name=link.dataset.brand==='Škoda'?'Skoda':link.dataset.brand;
 const match=state.brands.find(x=>x.name.toLocaleLowerCase()===name.toLocaleLowerCase());
 if(match)selectBrand(match);
});
function renderCatalog(){
 const root=$('catalogProducts');if(!root)return;
 const q=($('catalogSearch')?.value||'').trim().toLocaleLowerCase('ru');
 const type=$('catalogType')?.value||'';
 const matches=state.catalog.filter(p=>(!type||type===p.steering_type)&&[p.name,p.vehicle,p.sku].join(' ').toLocaleLowerCase('ru').includes(q));
 root.innerHTML=matches.map(p=>`<article class="product-card ar-real-product"><div class="ar-product-glyph" aria-hidden="true">⚙</div><div class="product-body"><span class="tag">Агрегат · ${esc(p.sku)}${p.steering_type?' · '+esc(p.steering_type):''}</span><h3>${esc(p.name)}</h3><p>${esc(p.vehicle)}</p><div class="product-meta"><strong>${esc(money(p.price))}</strong><span class="stock-badge in-stock">Наличие: ${Number(p.quantity)}</span></div><button class="button service-action" type="button" data-real-product="${p.id}">Запросить резерв ↗</button></div></article>`).join('')||'<p class="ar-empty">Опубликованных товаров с такими параметрами сейчас нет. Уточните наличие в техцентре.</p>';
}
$('catalogSearch')?.addEventListener('input',renderCatalog);
$('catalogType')?.addEventListener('change',renderCatalog);
document.addEventListener('click',e=>{
 const b=e.target.closest('button[data-real-product]');if(b)openRequest('',b.dataset.realProduct);
});
function renderReviews(){
 const viewport=$('arReviewViewport');if(!viewport)return;
 if(!state.reviews.length){showInfo('arReviewViewport','Пока нет опубликованных подтверждённых отзывов.');$('arReviewPrev').disabled=true;$('arReviewNext').disabled=true;return;}
 state.reviewIndex=(state.reviewIndex+state.reviews.length)%state.reviews.length;
 const r=state.reviews[state.reviewIndex];
 viewport.innerHTML=`<article class="ar-review-card"><div class="ar-review-card-head"><strong>${esc(r.author)}</strong><span class="ar-verified">✓ Подтверждённый клиент</span></div><div class="ar-review-rating" aria-label="Оценка ${r.rating} из 5">${'★'.repeat(r.rating)}<span>${'☆'.repeat(5-r.rating)}</span></div><p>${esc(r.body)}</p><div class="ar-review-meta">${esc(r.vehicle||r.subject)} · ${fmt(r.published_at||r.created_at)}</div>${r.company_reply?`<div class="ar-company-reply"><strong>Ответ АвтоРейка46</strong><p>${esc(r.company_reply)}</p></div>`:''}</article>`;
 $('arReviewPrev').disabled=state.reviews.length<2;$('arReviewNext').disabled=state.reviews.length<2;
}
function changeReview(step){state.reviewIndex=(state.reviewIndex+step+state.reviews.length)%state.reviews.length;renderReviews();}
$('arReviewPrev')?.addEventListener('click',()=>changeReview(-1));
$('arReviewNext')?.addEventListener('click',()=>changeReview(1));
const viewport=$('arReviewViewport');let touchStart=null;
viewport?.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')touchStart=e.clientX;});
viewport?.addEventListener('pointerup',e=>{if(touchStart!=null&&Math.abs(e.clientX-touchStart)>50)changeReview(e.clientX<touchStart?1:-1);touchStart=null;});
viewport?.addEventListener('mouseenter',()=>state.paused=true);
viewport?.addEventListener('mouseleave',()=>state.paused=false);
viewport?.addEventListener('focusin',()=>state.paused=true);
viewport?.addEventListener('focusout',()=>state.paused=false);
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
 state.autoplay=setInterval(()=>{if(!state.paused&&!document.hidden&&(!location.hash||location.hash==='#home')&&state.reviews.length>1)changeReview(1);},7500);
}
function injectNetworks(){
 const existing=document.querySelector('#services .social-cards');const target=$('arSocialHome');
 if(existing&&target){target.innerHTML=existing.innerHTML;}
 const links={'vk_url':'vk.ru','avito_url':'avito.ru','yandex_url':'yandex.ru'};
 document.querySelectorAll('.social-card').forEach(a=>{
  const name=a.classList.contains('ar-yandex-card')?'yandex_url':a.href.includes('avito.ru')?'avito_url':'vk_url';
  const url=state.settings[name];
  if(url&&url.startsWith('https://'))a.href=url;
 });
 // Keep platform composition consistent between both pages.
}
function renderTrack(){
 const params=new URL(location.href).searchParams,token=params.get('track');
 if(!token){showInfo('arTrackRoot','Откройте персональную ссылку, полученную после отправки заявки.');return;}
 api('/track/'+encodeURIComponent(token)).then(row=>{
   $('arTrackRoot').innerHTML=`<div class="ar-facts"><div><small>Номер</small><strong>${esc(row.id)}</strong></div><div><small>Статус</small><strong>${esc(row.status)}</strong></div><div><small>Создана</small><strong>${fmt(row.created_at)}</strong></div><div><small>Завершена</small><strong>${fmt(row.completed_at||row.issued_at)}</strong></div></div><p class="hint">Данные других клиентов недоступны. Для уточнения деталей свяжитесь с техцентром.</p>`;
 }).catch(error=>showInfo('arTrackRoot',errText(error)));
}
function renderReviewInvite(){
 const token=new URL(location.href).searchParams.get('review');
 if(!token){showInfo('arReviewFormRoot','Для отзыва необходима персональная ссылка после завершённого заказа.');return;}
 api('/review-invites/'+encodeURIComponent(token)).then(order=>{
  $('arReviewFormRoot').innerHTML=`<h3>${esc(order.subject)}</h3><p>${esc(order.vehicle)}</p><form id="arSendReview" class="ar-form-grid"><label>Публичное имя<input name="author" required minlength="2" maxlength="70" autocomplete="nickname"></label><label>Оценка<select name="rating" required><option value="5">★★★★★ · 5</option><option value="4">★★★★☆ · 4</option><option value="3">★★★☆☆ · 3</option><option value="2">★★☆☆☆ · 2</option><option value="1">★☆☆☆☆ · 1</option></select></label><label class="ar-full">Ваш отзыв<textarea name="body" required minlength="10" maxlength="2500" rows="5"></textarea></label><p class="hint ar-full">Отзыв доступен только по ссылке завершённого заказа. Публикация — после модерации, независимо от оценки.</p><p class="ar-alert ar-full" role="alert"></p><button type="submit" class="button primary ar-full">Отправить отзыв</button></form>`;
  $('arSendReview').onsubmit=async e=>{
   e.preventDefault();const form=e.currentTarget;const button=form.querySelector('[type=submit]');button.disabled=true;
   const data=new FormData(form);
   try{
    await api('/review-invites/'+encodeURIComponent(token),{method:'POST',body:JSON.stringify({author:String(data.get('author')),rating:Number(data.get('rating')),body:String(data.get('body'))})});
    const y=state.settings.yandex_review_url,v=state.settings.vk_review_url;
    $('arReviewFormRoot').innerHTML=`<h2>Спасибо за ваш отзыв!</h2><p>Ваше мнение помогает улучшать качество обслуживания. Будем признательны, если вы поделитесь впечатлениями на других площадках.</p><div class="actions">${y?`<a class="button subtle" href="${esc(y)}" target="_blank" rel="noopener noreferrer">Оставить отзыв в Яндексе ↗</a>`:''}${v?`<a class="button subtle" href="${esc(v)}" target="_blank" rel="noopener noreferrer">Оставить отзыв во ВКонтакте ↗</a>`:''}</div>`;
   }catch(error){form.querySelector('[role=alert]').textContent=errText(error);button.disabled=false;}
  };
 }).catch(error=>showInfo('arReviewFormRoot',errText(error)));
}
// ----------------------------- Административная панель -----------------------------
const authHeaders=()=>({'Authorization':'Bearer '+state.token});
async function adminApi(path,options={}){return api('/admin'+path,{...options,headers:{...authHeaders(),...options.headers}});}
function clearSession(){state.token='';state.role='';state.authorized=false;sessionStorage.removeItem('ar46.admin.token');}
function renderLogin(message=''){
 $('arAdminRoot').innerHTML=`<div class="ar-panel ar-login-panel"><h2>Вход сотрудника</h2><form id="arLoginForm" class="ar-form-grid"><label>Логин<input name="login" required autocomplete="username"></label><label>Пароль<input name="password" type="password" required autocomplete="current-password"></label><p role="alert" class="ar-alert ar-full">${esc(message)}</p><button class="button primary ar-full" type="submit">Войти</button></form></div>`;
 $('arLoginForm').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget;const data=new FormData(form);const btn=form.querySelector('[type=submit]');btn.disabled=true;
  try{
   const result=await api('/admin/login',{method:'POST',body:JSON.stringify({login:data.get('login'),password:data.get('password')})});
   state.token=result.access_token;state.role=result.role;state.authorized=true;
   sessionStorage.setItem('ar46.admin.token',state.token);await loadAdmin();
  }catch(error){form.querySelector('[role=alert]').textContent=errText(error);btn.disabled=false;}
 };
}
async function validateLogin(){
 if(!state.token){renderLogin();return;}
 try{const me=await adminApi('/me');state.role=me.role;state.authorized=true;await loadAdmin();}
 catch{clearSession();renderLogin('Сессия истекла. Войдите снова.');}
}
function adminShell(){
 const isAdmin=state.role==='owner'||state.role==='admin';
 const labels=[['orders','Заявки'],['reviews','Отзывы'],['vehicles','Автомобили'],['products','Каталог'],['settings','Настройки'],['audit','История изменений']];
 $('arAdminRoot').innerHTML=`<div class="ar-admin-layout"><nav class="ar-admin-tabs" aria-label="Разделы управления">${labels.filter(([k])=>isAdmin||k==='orders').map(([k,v])=>`<button type="button" data-tab="${k}" class="${state.currentTab===k?'is-active':''}">${v}</button>`).join('')}<button type="button" id="arLogout">Выйти</button></nav><div class="ar-admin-content" id="arAdminContent"></div></div>`;
 $('arAdminRoot').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.currentTab=b.dataset.tab;loadAdmin();});
 $('arLogout').onclick=async()=>{try{await adminApi('/logout',{method:'POST'});}catch{}clearSession();renderLogin();};
}
async function loadAdmin(){
 if(!state.authorized)return renderLogin();
 if(state.role==='staff'&&state.currentTab!=='orders')state.currentTab='orders';
 adminShell();const root=$('arAdminContent');root.innerHTML='<p class="hint">Загрузка данных…</p>';
 try{
  if(state.currentTab==='orders')await adminOrders(root);
  if(state.currentTab==='reviews')await adminReviews(root);
  if(state.currentTab==='vehicles')await adminVehicles(root);
  if(state.currentTab==='products')await adminProducts(root);
  if(state.currentTab==='settings')await adminSettings(root);
  if(state.currentTab==='audit')await adminAudit(root);
 }catch(error){showInfo('arAdminContent',errText(error));}
}
function nextStatuses(order){
 const stages=order.kind==='service'?['Новая заявка','Принята','Записан','В работе','Работы выполнены']:
  ['Новая заявка','Принят в обработку','Подготовлен к выдаче','Выдан клиенту','Завершён'];
 const i=stages.indexOf(order.status);
 return i<0||i===stages.length-1?[]:[stages[i+1],'Отменён'];
}
async function adminOrders(root){
 const list=await adminApi('/orders');
 root.innerHTML=`<h2>Заявки клиентов</h2><p class="hint">Смена статуса фиксируется в истории. После выполнения работ или выдачи товара создаётся одноразовая ссылка отзыва для передачи клиенту через согласованный канал связи.</p><div class="ar-table-scroll"><table class="ar-table"><thead><tr><th>Номер и дата</th><th>Клиент</th><th>Автомобиль / услуга</th><th>Статус</th><th>Действие</th></tr></thead><tbody>${list.map(o=>`<tr><td><strong>${esc(o.id)}</strong><br><small>${fmt(o.created_at)}</small></td><td>${esc(o.full_name)}<br><a href="tel:${esc(o.phone.replace(/[^+\d]/g,''))}">${esc(o.phone)}</a></td><td>${esc(o.vehicle)}<br><small>${esc(o.subject)}</small>${o.notes?`<details><summary>Комментарий</summary><p>${esc(o.notes)}</p></details>`:''}</td><td>${esc(o.status)}</td><td>${nextStatuses(o).length?`<select data-status="${esc(o.id)}" aria-label="Новый статус ${esc(o.id)}">${nextStatuses(o).map(s=>`<option>${esc(s)}</option>`).join('')}</select>${o.kind==='service'?`<label class="ar-small-label">Дата записи (при выборе «Записан»)<input type="datetime-local" data-planned="${esc(o.id)}"></label>`:''}<button type="button" class="button subtle small" data-update="${esc(o.id)}">Применить</button>`:'Завершён'}${!o.review_id&&['Работы выполнены','Выдан клиенту','Завершён'].includes(o.status)?`<button class="button subtle small" type="button" data-review-link="${esc(o.id)}">Ссылка отзыва</button>`:''}</td></tr>`).join('')}</tbody></table></div>${list.length?'':'<p class="ar-empty">Реальных заявок пока нет.</p>'}`;
 root.querySelectorAll('[data-update]').forEach(b=>b.onclick=async()=>{
  const id=b.dataset.update,status=root.querySelector(`[data-status="${id}"]`).value;
  const date=root.querySelector(`[data-planned="${id}"]`)?.value;
  const planned_at=status==='Записан'&&date?new Date(date).toISOString():null;
  if(!confirm(`Изменить статус ${id} на «${status}»?`))return;
  b.disabled=true;
  try{
   const result=await adminApi('/orders/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status,planned_at})});
   if(result.review_token){
    const link=urlFor('review',result.review_token);
    popup('Персональная ссылка на отзыв',`<p>Отзыв доступен только для заказа <strong>${esc(id)}</strong>. Передайте ссылку клиенту вручную через согласованный канал связи. Автоматическая SMS/email-рассылка не настроена.</p><div class="ar-copy-row"><input readonly aria-label="Ссылка отзыва" value="${esc(link)}"><button type="button" class="button subtle" id="arCopyReview">Копировать</button></div>`,d=>d.querySelector('#arCopyReview').onclick=async()=>{await navigator.clipboard.writeText(link);d.querySelector('#arCopyReview').textContent='Скопировано';});
   }
   await loadAdmin();
  }catch(error){alert(errText(error));b.disabled=false;}
 });
 root.querySelectorAll('[data-review-link]').forEach(b=>b.onclick=async()=>{
  b.disabled=true;
  try{
   const result=await adminApi('/orders/'+encodeURIComponent(b.dataset.reviewLink)+'/review-link',{method:'POST'});
   const link=urlFor('review',result.review_token);
   popup('Персональная ссылка на отзыв',`<p>Ссылка для заказа <strong>${esc(result.id)}</strong>. Предыдущая ссылка, если была, становится недействительной.</p><div class="ar-copy-row"><input readonly aria-label="Ссылка отзыва" value="${esc(link)}"><button class="button subtle" type="button" id="arCopyLinkAgain">Копировать</button></div>`,d=>d.querySelector('#arCopyLinkAgain').onclick=async()=>{await navigator.clipboard.writeText(link);d.querySelector('#arCopyLinkAgain').textContent='Скопировано';});
  }catch(error){alert(errText(error));}finally{b.disabled=false;}
 });
}
async function adminReviews(root){
 const rows=await adminApi('/reviews');
 root.innerHTML=`<h2>Модерация подтверждённых отзывов</h2><p class="hint">Сотрудники не могут менять оценки и текст клиента. Публикация возможна при любой оценке.</p>${rows.map(r=>`<article class="ar-admin-review" data-review="${r.id}"><div><strong>${esc(r.author)}</strong> · ${'★'.repeat(r.rating)} · ${esc(r.order_id)}</div><p>${esc(r.body)}</p><small>${esc(r.subject)} · ${fmt(r.created_at)}</small><div class="ar-form-grid"><label>Публикация<select name="status"><option value="pending"${r.status==='pending'?' selected':''}>Ожидает модерации</option><option value="published"${r.status==='published'?' selected':''}>Опубликовать</option><option value="hidden"${r.status==='hidden'?' selected':''}>Скрыть по правилам модерации</option></select></label><label>Ответ компании<textarea name="reply" rows="2" maxlength="1500">${esc(r.company_reply||'')}</textarea></label><button class="button subtle ar-full" type="button" data-save-review="${r.id}">Сохранить</button></div></article>`).join('')||'<p class="ar-empty">Отзывов ещё нет.</p>'}`;
 root.querySelectorAll('[data-save-review]').forEach(b=>b.onclick=async()=>{
  const card=b.closest('[data-review]');b.disabled=true;
  try{await adminApi('/reviews/'+b.dataset.saveReview,{method:'PATCH',body:JSON.stringify({status:card.querySelector('[name=status]').value,company_reply:card.querySelector('[name=reply]').value})});await loadAdmin();}
  catch(error){alert(errText(error));b.disabled=false;}
 });
}
const opt=(rows,key='name')=>rows.map(r=>`<option value="${r.id}">${esc(r[key])} (#${r.id})</option>`).join('');
async function adminVehicles(root){
 const data=await adminApi('/vehicles');
 const brands=data.brands,models=data.models,gens=data.generations;
 root.innerHTML=`<h2>Справочник автомобилей и цены</h2><p class="hint">База централизована. Пока поколение не подтверждено, публично отображается «Стоимость уточняется после диагностики».</p>
 <div class="ar-admin-forms">
 <form data-vehicle-form="brands" class="ar-panel"><h3>Добавить марку</h3><label>Название<input name="name" required maxlength="90"></label><button class="button subtle" type="submit">Добавить марку</button></form>
 <form data-vehicle-form="models" class="ar-panel"><h3>Добавить модель</h3><label>Марка<select name="brand_id" required>${opt(brands)}</select></label><label>Модель<input name="name" required maxlength="110"></label><button class="button subtle" type="submit">Добавить модель</button></form>
 <form data-vehicle-form="generations" class="ar-panel" id="arGenerationForm"><h3>Поколение, тип и цена</h3><label>Модель<select name="model_id" required>${models.map(m=>`<option value="${m.id}">${esc(brands.find(b=>b.id===m.brand_id)?.name||'')} / ${esc(m.name)} (#${m.id})</option>`).join('')}</select></label><label>Поколение<input name="label" maxlength="120" required placeholder="Например, Focus II"></label><div class="ar-duo"><label>Год начала<input name="year_from" type="number" min="1900" max="2100"></label><label>Год окончания<input name="year_to" type="number" min="1900" max="2100"></label></div><label>Тип механизма<input name="steering_type" placeholder="ГУР, ЭУР, механическая"></label><label>Доступные услуги<input name="services" placeholder="Диагностика, ремонт"></label><div class="ar-duo"><label>Цена от, ₽<input name="price_min" type="number" min="0"></label><label>Цена до, ₽<input name="price_max" type="number" min="0"></label></div><label>Срок<input name="timeframe" placeholder="По согласованию"></label><label>Описание<textarea name="description" rows="2"></textarea></label><label class="ar-check"><input name="confirmed" type="checkbox"> Данные подтверждены техцентром</label><label class="ar-check"><input name="visible" type="checkbox" checked> Поколение отображается на сайте</label><button class="button subtle" type="submit">Добавить поколение</button></form></div>
 <details class="ar-panel ar-vehicle-manager"><summary>Изменить или скрыть марку / модель</summary>
 <div class="ar-duo"><form id="arEditBrandForm"><h3>Марка</h3><label>Выберите<select name="id">${opt(brands)}</select></label><label>Название<input name="name" required maxlength="90"></label><label class="ar-check"><input type="checkbox" name="visible"> Показать в подборе</label><button type="submit" class="button subtle small">Сохранить марку</button></form>
 <form id="arEditModelForm"><h3>Модель</h3><label>Выберите<select name="id">${models.map(m=>`<option value="${m.id}">${esc(brands.find(b=>b.id===m.brand_id)?.name||'?')} ${esc(m.name)}</option>`).join('')}</select></label><label>Марка<select name="brand_id">${opt(brands)}</select></label><label>Название<input name="name" required maxlength="110"></label><label class="ar-check"><input type="checkbox" name="visible"> Показать в подборе</label><button type="submit" class="button subtle small">Сохранить модель</button></form></div>
 </details>
 <h3>Редактирование поколений</h3><label class="ar-admin-search">Поиск <input type="search" id="arGenSearch" placeholder="Марка, модель, поколение"></label><div id="arGenList" class="ar-compact-list"></div>`;
 const form=root.querySelector('#arGenerationForm');
 root.querySelectorAll('[data-vehicle-form]').forEach(f=>f.onsubmit=async e=>{
  e.preventDefault();const type=f.dataset.vehicleForm,d=new FormData(f),record=Object.fromEntries(d);
  if(type==='models')record.brand_id=Number(record.brand_id);
  if(type==='generations'){
   record.model_id=Number(record.model_id);record.year_from=record.year_from?Number(record.year_from):null;record.year_to=record.year_to?Number(record.year_to):null;
   record.price_min=record.price_min?Number(record.price_min):null;record.price_max=record.price_max?Number(record.price_max):null;
   record.confirmed=d.has('confirmed');record.visible=d.has('visible');
  }
  try{await adminApi('/'+type,{method:'POST',body:JSON.stringify(record)});await loadAdmin();}
  catch(error){alert(errText(error));}
 });
 function editCatalogForm(id,items,endpoint){
   const f=root.querySelector('#'+id);if(!f)return;
   const load=()=>{
    const row=items.find(x=>x.id===Number(f.elements.namedItem('id').value));if(!row)return;
    f.elements.namedItem('name').value=row.name;
    f.elements.namedItem('visible').checked=Boolean(row.visible);
    if(endpoint==='models')f.elements.namedItem('brand_id').value=row.brand_id;
   };
   f.elements.namedItem('id').addEventListener('change',load);load();
   f.onsubmit=async e=>{e.preventDefault();const id=f.elements.namedItem('id').value;
    const body={name:f.elements.namedItem('name').value.trim(),visible:f.elements.namedItem('visible').checked};
    if(endpoint==='models')body.brand_id=Number(f.elements.namedItem('brand_id').value);
    try{await adminApi('/'+endpoint+'/'+id,{method:'PATCH',body:JSON.stringify(body)});await loadAdmin();}
    catch(error){alert(errText(error));}
   };
 }
 editCatalogForm('arEditBrandForm',brands,'brands');
 editCatalogForm('arEditModelForm',models,'models');
 const genName=g=>{const m=models.find(m=>m.id===g.model_id),b=brands.find(b=>b.id===m?.brand_id);return `${b?.name||'?'} ${m?.name||'?'} ${g.label}`;};
 function genList(){
  const q=(root.querySelector('#arGenSearch')?.value||'').toLowerCase();
  root.querySelector('#arGenList').innerHTML=gens.filter(g=>genName(g).toLowerCase().includes(q)).slice(0,100).map(g=>`<div><span>${esc(genName(g))} · ${g.confirmed?'Подтверждено':'Не подтверждено'} · ${esc(money(g.price_min))}</span><button type="button" class="button subtle small" data-edit-gen="${g.id}">Изменить</button></div>`).join('')||'<p class="hint">Пока нет поколений по этому запросу.</p>';
  root.querySelectorAll('[data-edit-gen]').forEach(b=>b.onclick=()=>{
   const g=gens.find(g=>g.id===Number(b.dataset.editGen));
   if(!g)return;
   const d={...g};for(const key of ['model_id','label','year_from','year_to','steering_type','services','price_min','price_max','timeframe','description']){
    const field=form.elements.namedItem(key);if(field)field.value=d[key]??'';
   }
   form.elements.namedItem('confirmed').checked=Boolean(g.confirmed);
   form.elements.namedItem('visible').checked=Boolean(g.visible);
   form.querySelector('h3').textContent='Изменение поколения #'+g.id;
   form.querySelector('[type=submit]').textContent='Сохранить изменения';
   form.onsubmit=async e=>{
    e.preventDefault();const raw=new FormData(form),record=Object.fromEntries(raw);
    for(const key of ['model_id','year_from','year_to','price_min','price_max'])record[key]=record[key]?Number(record[key]):null;
    record.confirmed=raw.has('confirmed');record.visible=raw.has('visible');
    try{await adminApi('/generations/'+g.id,{method:'PATCH',body:JSON.stringify(record)});await loadAdmin();}
    catch(error){alert(errText(error));}
   };
   form.scrollIntoView({behavior:'smooth',block:'center'});
  });
 }
 root.querySelector('#arGenSearch').oninput=genList;genList();
}
async function adminProducts(root){
 const list=await adminApi('/products');
 root.innerHTML=`<h2>Каталог восстановленных агрегатов</h2><p class="hint">Товар появляется на сайте только при включённой публикации и положительном остатке. Никаких демонстрационных товаров в реальную базу не перенесено.</p>
 <form id="arProductForm" class="ar-panel ar-form-grid"><h3 class="ar-full">Добавить товар</h3><label>Артикул<input name="sku" required maxlength="80"></label><label>Название<input name="name" required maxlength="150"></label><label>Совместимость<input name="vehicle" required maxlength="150"></label><label>Тип рейки<select name="steering_type"><option>Механическая</option><option>ГУР</option><option>ЭУР</option><option>Другое</option></select></label><label>Цена, ₽ (если подтверждена)<input type="number" name="price" min="0"></label><label>Количество на складе<input type="number" name="quantity" min="0" value="0" required></label><label class="ar-full">Описание<textarea name="description" maxlength="1000" rows="2"></textarea></label><label class="ar-check ar-full"><input type="checkbox" name="visible"> Опубликовать товар на сайте</label><button type="submit" class="button subtle ar-full">Добавить товар</button></form>
 <h3>Позиции на складе</h3><div class="ar-compact-list">${list.map(p=>`<div><span><strong>${esc(p.sku)}</strong> · ${esc(p.name)} · ${esc(p.vehicle)} · ${esc(money(p.price))} · ${p.quantity} шт. · ${p.visible?'Опубликовано':'Скрыто'}</span><button type="button" class="button subtle small" data-edit-product="${p.id}">Изменить</button></div>`).join('')||'<p class="hint">Товаров пока нет.</p>'}</div>`;
 const form=root.querySelector('#arProductForm');
 const collect=()=>{const d=new FormData(form),body=Object.fromEntries(d);body.price=body.price?Number(body.price):null;body.quantity=Number(body.quantity);body.visible=d.has('visible');return body;};
 form.onsubmit=async e=>{e.preventDefault();try{await adminApi('/products',{method:'POST',body:JSON.stringify(collect())});await loadAdmin();}catch(error){alert(errText(error));}};
 root.querySelectorAll('[data-edit-product]').forEach(b=>b.onclick=()=>{
  const p=list.find(p=>p.id===Number(b.dataset.editProduct));if(!p)return;
  for(const key of ['sku','name','vehicle','steering_type','price','quantity','description'])form.elements.namedItem(key).value=p[key]??'';
  form.elements.namedItem('visible').checked=Boolean(p.visible);
  form.querySelector('h3').textContent='Редактирование · '+p.sku;
  form.querySelector('[type=submit]').textContent='Сохранить';
  form.onsubmit=async e=>{e.preventDefault();try{await adminApi('/products/'+p.id,{method:'PATCH',body:JSON.stringify(collect())});await loadAdmin();}catch(error){alert(errText(error));}};
  form.scrollIntoView({behavior:'smooth'});
 });
}
async function adminSettings(root){
 const data=await api('/settings');
 const fields=[['phone','Телефон'],['vk_url','ВКонтакте'],['avito_url','Авито'],['yandex_url','Яндекс Карты'],['yandex_review_url','Отзывы на Яндекс Картах'],['vk_review_url','Раздел отзывов во ВКонтакте (если включён)']];
 root.innerHTML=`<h2>Контакты и площадки</h2><p class="hint">URL для отзывов не подставляется, если он не подтверждён. Переходы доступны всем клиентам независимо от оценки.</p><form id="arSettingsForm" class="ar-panel ar-form-grid">${fields.map(([k,v])=>`<label class="ar-full">${v}<input name="${k}" value="${esc(data[k])}" ${k==='phone'?'type="tel"':'type="url"'}></label>`).join('')}<button class="button primary ar-full" type="submit">Сохранить настройки</button></form>`;
 root.querySelector('form').onsubmit=async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget));try{await adminApi('/settings',{method:'PATCH',body:JSON.stringify(body)});state.settings=await api('/settings');injectNetworks();alert('Настройки сохранены');}catch(error){alert(errText(error));}};
}
async function adminAudit(root){
 const rows=await adminApi('/audit');root.innerHTML=`<h2>История изменений</h2><div class="ar-table-scroll"><table class="ar-table"><thead><tr><th>Дата</th><th>Сотрудник</th><th>Действие</th><th>Объект</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${fmt(x.created_at)}</td><td>${esc(x.login)}</td><td>${esc(x.action)}</td><td>${esc(x.target)}</td></tr>`).join('')}</tbody></table></div>`;
}
// Page activation runs after the existing hash-based navigation.
window.addEventListener('hashchange',()=>{
 const h=location.hash.slice(1);
 if(h==='admin')validateLogin();
 if(h==='review')renderReviewInvite();
 if(h==='track')renderTrack();
});
window.AR46={openRequest,renderCatalog};
// Parallel initialization: errors shown transparently, never substitute demo reviews, prices or orders.
(async()=>{
 try{state.settings=await api('/settings');injectNetworks();
 const phone=state.settings.phone;
 if(phone){document.querySelectorAll('.header-phone').forEach(a=>{a.textContent=phone;a.href='tel:'+phone.replace(/[^\d+]/g,'');});}
 }catch{injectNetworks();}
})();
(async()=>{
 try{state.brands=await api('/vehicles/brands');renderWizard();}
 catch{showInfo('arChoices',help);}
})();
(async()=>{
 try{state.catalog=await api('/catalog');renderCatalog();}
 catch{showInfo('catalogProducts',help);}
})();
(async()=>{
 try{state.reviews=await api('/reviews');renderReviews();}
 catch{showInfo('arReviewViewport',help);}
})();
const h=location.hash.slice(1);
if(h==='admin')validateLogin();
if(h==='track')renderTrack();
if(h==='review')renderReviewInvite();
})();
