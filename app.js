let selectedProduct=null,currentOrderId=null,adminKey=null,statusTimer=null;

async function loadProducts(){
  const res=await fetch("/api/products");
  const products=await res.json();

  document.getElementById("products").innerHTML=products.map(p=>`
    <div class="product">
      <h3>${escapeHtml(p.name)}</h3>
      <div class="price">₦${Number(p.price).toLocaleString()}</div>
      <button class="buy" onclick="buyProduct(${p.id})">BUY</button>
    </div>`).join("");
}

function buyProduct(id){
  selectedProduct=id;
  document.getElementById("paymentSection").classList.remove("hidden");
  document.getElementById("paymentForm").classList.add("hidden");
  document.getElementById("paymentSection").scrollIntoView({behavior:"smooth"});
}

function showPaymentForm(){
  document.getElementById("paymentForm").classList.remove("hidden");
  document.getElementById("paymentForm").scrollIntoView({behavior:"smooth"});
}

async function submitPayment(){
  const customerName=document.getElementById("customerName").value.trim();
  const transactionId=document.getElementById("transactionId").value.trim();
  const msg=document.getElementById("formMessage");

  if(!customerName||!transactionId){
    msg.textContent="Please enter your name and transaction ID/reference.";
    return;
  }

  const res=await fetch("/api/orders",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      productId:selectedProduct,
      customerName,
      transactionId
    })
  });

  const data=await res.json();

  if(!res.ok){
    msg.textContent=data.error||"Could not submit order.";
    return;
  }

  currentOrderId=data.id;
  document.getElementById("orderId").textContent=data.id;
  document.getElementById("statusSection").classList.remove("hidden");
  document.getElementById("paymentForm").classList.add("hidden");

  startStatusPolling();

  document.getElementById("statusSection").scrollIntoView({
    behavior:"smooth"
  });
}

function startStatusPolling(){
  clearInterval(statusTimer);
  refreshOrderStatus();
  statusTimer=setInterval(refreshOrderStatus,5000);
}

async function refreshOrderStatus(){
  if(!currentOrderId)return;

  const res=await fetch(
    "/api/orders/"+encodeURIComponent(currentOrderId)
  );

  if(!res.ok)return;

  const order=await res.json();

  document.getElementById("statusProduct").textContent=order.product;
  document.getElementById("paymentStatus").textContent=order.paymentStatus;
  document.getElementById("injectionStatus").textContent=
    order.injectionStatus||"WAITING";

  if(
    order.paymentStatus==="DECLINED"||
    order.injectionStatus==="INJECTED"
  ){
    clearInterval(statusTimer);
  }
}

function toggleMenu(){
  document.getElementById("sideMenu").classList.toggle("open");
}

function showAdminLogin(){
  toggleMenu();

  document.getElementById("adminLogin").classList.remove("hidden");

  document.getElementById("adminLogin").scrollIntoView({
    behavior:"smooth"
  });
}

async function adminLogin(){
  const key=document.getElementById("adminKey").value.trim();
  const msg=document.getElementById("adminMessage");

  if(!key){
    msg.textContent="Enter the admin key.";
    return;
  }

  const res=await fetch("/api/admin/orders",{
    headers:{"x-admin-key":key}
  });

  if(!res.ok){
    msg.textContent="ACCESS DENIED";
    adminKey=null;
    return;
  }

  adminKey=key;
  msg.textContent="ACCESS GRANTED";

  document.getElementById("adminDashboard").classList.remove("hidden");

  await loadOrders();

  document.getElementById("adminDashboard").scrollIntoView({
    behavior:"smooth"
  });
}

async function loadOrders(){
  if(!adminKey)return;

  const res=await fetch("/api/admin/orders",{
    headers:{"x-admin-key":adminKey}
  });

  if(!res.ok)return;

  const orders=await res.json();
  const box=document.getElementById("adminOrders");

  if(!orders.length){
    box.innerHTML="<p>No orders yet.</p>";
    return;
  }

  box.innerHTML=orders.map(o=>`
    <div class="order-card">
      <p><strong>${escapeHtml(o.id)}</strong></p>
      <p>Customer: ${escapeHtml(o.customerName)}</p>
      <p>Product: ${escapeHtml(o.product)}</p>
      <p>Amount: ₦${Number(o.amount).toLocaleString()}</p>
      <p>Transaction ID: ${escapeHtml(o.transactionId)}</p>
      <p>Payment: <strong>${escapeHtml(o.paymentStatus)}</strong></p>
      <p>Injection: <strong>${escapeHtml(o.injectionStatus||"WAITING")}</strong></p>

      <div class="order-actions">
        <button onclick="paymentDecision('${o.id}','APPROVED')">
          APPROVED
        </button>

        <button onclick="paymentDecision('${o.id}','DECLINED')">
          DECLINED
        </button>

        <button onclick="injectionDecision('${o.id}','INJECTING')">
          INJECTING
        </button>

        <button onclick="injectionDecision('${o.id}','INJECTED')">
          INJECTED
        </button>
      </div>
    </div>`).join("");
}

async function paymentDecision(id,status){
  await fetch(
    "/api/admin/orders/"+encodeURIComponent(id)+"/payment",
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "x-admin-key":adminKey
      },
      body:JSON.stringify({status})
    }
  );

  loadOrders();
}

async function injectionDecision(id,status){
  await fetch(
    "/api/admin/orders/"+encodeURIComponent(id)+"/injection",
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "x-admin-key":adminKey
      },
      body:JSON.stringify({status})
    }
  );

  loadOrders();
}

function closeAdmin(){
  document.getElementById("adminDashboard").classList.add("hidden");
  document.getElementById("adminLogin").classList.add("hidden");
  adminKey=null;
}

function escapeHtml(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

loadProducts();
