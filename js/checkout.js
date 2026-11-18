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
form.addEventListener('submit',event=>{
  event.preventDefault();
  form.classList.add('was-validated');
  updateInvalidFields();
  if(!form.checkValidity()){
    form.reportValidity();
    $('#checkoutFormMessage').textContent='Please complete the highlighted delivery details.';
    return;
  }

  try{
    localStorage.removeItem('elvare_cart');
  }catch{
    $('#checkoutFormMessage').textContent='Your order could not be completed because the saved bag could not be updated. Please try again.';
    return;
  }

  $('#checkoutContent').hidden=true;
  $('#checkoutError').hidden=true;
  $('#orderReference').textContent=`Demo reference · ELV-${Date.now().toString(36).toUpperCase()}`;
  renderOrderLines(lines,$('#confirmedItems'),false);
  $('#orderSuccess').hidden=false;
  window.scrollTo({top:0,behavior:'smooth'});
});
