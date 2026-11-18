const $=selector=>document.querySelector(selector);
const money=value=>`PKR ${value.toLocaleString('en-US')}`;
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));

function readStorage(key,fallback){
  const raw=localStorage.getItem(key);
  return raw===null?fallback:JSON.parse(raw);
}

function showCheckoutError(message){
  $('#checkoutContent').hidden=true;
  $('#checkoutEmpty').hidden=true;
  const error=$('#checkoutError');
  error.textContent=message;
  error.hidden=false;
}

function getOrderLines(){
  let cart,catalog;
  try{
    cart=readStorage('elvare_cart',{});
    catalog=readStorage('elvare_catalog',[]);
  }catch{
    showCheckoutError('We could not read your saved bag. Return to the collection and try again.');
    return null;
  }
  if(!cart||typeof cart!=='object'||Array.isArray(cart)||!Array.isArray(catalog)){
    showCheckoutError('Your saved bag is unavailable. Return to the collection and try again.');
    return null;
  }
  const entries=Object.entries(cart);
  if(!entries.length){
    $('#checkoutContent').hidden=true;
    $('#checkoutEmpty').hidden=false;
    return [];
  }
  const lines=[];
  for(const [id,quantity] of entries){
    const product=catalog.find(item=>String(item.id)===id);
    if(!product||!Number.isInteger(quantity)||quantity<1||!Number.isFinite(product.p)||product.p<0){
      showCheckoutError('A piece in your bag could not be loaded. Return to the collection and refresh your bag.');
      return null;
    }
    lines.push({product,quantity});
  }
  return lines;
}

function renderOrderLines(lines,container,withTotals){
  container.innerHTML=lines.map(({product,quantity})=>{
    const name=escapeHTML(product.n);
    const category=escapeHTML(product.c);
    const photo=escapeHTML(product.i);
    const total=product.p*quantity;
    return `<article class="checkout-item">
      <div class="checkout-item-image"><img src="https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=240&q=80" alt="${name}"></div>
      <div class="checkout-item-copy"><h3>${name}</h3><span>${category}</span><small>Quantity: ${quantity}</small></div>
      <strong>${money(withTotals?total:product.p)}</strong>
    </article>`;
  }).join('');
}

const lines=getOrderLines();
if(lines&&lines.length){
  const subtotal=lines.reduce((sum,line)=>sum+line.product.p*line.quantity,0);
  renderOrderLines(lines,$('#checkoutItems'),true);
  $('#checkoutSubtotal').textContent=money(subtotal);
  $('#checkoutTotal').textContent=money(subtotal);
}

const form=$('#checkoutForm');
const paymentChoices=form.querySelectorAll('input[name="payment"]');
const easypaisaDetails=$('#easypaisaDetails');
function updatePaymentChoice(){
  paymentChoices.forEach(input=>{
    const choice=input.closest('.payment-choice');
    const selected=input.checked;
    choice.classList.toggle('is-selected',selected);
    if(selected&&input.value==='easypaisa'){
      easypaisaDetails.hidden=false;
    }
  });
  if(!form.querySelector('input[name="payment"][value="easypaisa"]').checked){
    easypaisaDetails.hidden=true;
  }
}
paymentChoices.forEach(input=>input.addEventListener('change',updatePaymentChoice));
updatePaymentChoice();

function updateInvalidFields(){
  form.querySelectorAll('.checkout-field').forEach(field=>{
    const input=field.querySelector('input,select');
    const invalid=!input.validity.valid;
    field.classList.toggle('invalid',invalid);
    input.setAttribute('aria-invalid',String(invalid));
  });
}

form.addEventListener('input',()=>{
  if(form.classList.contains('was-validated'))updateInvalidFields();
});
form.addEventListener('change',()=>{
  if(form.classList.contains('was-validated'))updateInvalidFields();
});
form.addEventListener('submit',async event=>{
  event.preventDefault();
  form.classList.add('was-validated');
  updateInvalidFields();
  if(!form.checkValidity()){
    form.reportValidity();
    $('#checkoutFormMessage').textContent='Please complete the highlighted delivery details.';
    return;
  }

  const submit=form.querySelector('button[type="submit"]');
  const message=$('#checkoutFormMessage');
  submit.disabled=true;
  submit.setAttribute('aria-busy','true');
  message.textContent='Sending your order approval email...';
  try{
    const formData=new FormData(form);
    const requestId=crypto.randomUUID();
    const response=await fetch('/api/order',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        requestId,
        name:formData.get('name'),
        email:formData.get('email'),
        phone:formData.get('phone'),
        address:formData.get('address'),
        city:formData.get('city'),
        region:formData.get('region'),
        postalCode:formData.get('postalCode'),
        note:formData.get('note'),
        payment:formData.get('payment'),
        items:Object.entries(readStorage('elvare_cart',{})).map(([id,quantity])=>({id:Number(id),quantity}))
      })
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'We could not submit your order. Please try again.');
    if(result.status==='confirmed'){
      message.textContent='This order has already been confirmed.';
      return;
    }

    localStorage.removeItem('elvare_cart');
    $('#checkoutContent').hidden=true;
    $('#checkoutError').hidden=true;
    $('#orderReference').textContent=`Pending demo order · ${escapeHTML(result.reference)}`;
    renderOrderLines(result.items.map(item=>({
      product:{n:item.name,c:item.category,i:item.photo,p:item.price},
      quantity:item.quantity
    })),$('#confirmedItems'),false);
    $('#orderSuccess').hidden=false;
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(error){
    message.textContent=error instanceof Error
      ?error.message
      :'We could not submit your order. Please try again.';
  }finally{
    submit.disabled=false;
    submit.removeAttribute('aria-busy');
  }
});
