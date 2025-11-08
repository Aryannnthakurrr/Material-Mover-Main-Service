async function renderProducts(products) {
  const container = document.getElementById('products');
  container.innerHTML = '';
  if (!products || !products.length) { container.innerHTML = '<p>No results</p>'; return; }
  const isLoggedIn = localStorage.getItem('token') !== null;
  products.forEach(p => {
    const el = document.createElement('div'); el.className = 'card';
    el.innerHTML = `
  <div class="product-image-container" style="width: 100%; height: 200px; overflow: hidden; background: #f5f5f5; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; border-radius: 8px;">
    <img src="${p.image || '/images/placeholder.png'}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">
  </div>
  <h4>${p.title}</h4>
  <p>${p.description || ''}</p>
  <strong>₹${p.price || 0}</strong>
  ${isLoggedIn ? `
    ${p.address ? `<p class="address"><strong>Address:</strong> ${p.address}</p>` : ''}
    ${p.phone_number ? `<p class="phone"><strong>Contact:</strong> ${p.phone_number}</p>` : ''}
  ` : `
    <p class="login-notice" style="margin-top: 10px; color: #666; font-size: 0.9em;">
      <a href="/login.html" style="color: #2563eb; text-decoration: none;">Login</a> to view contact details
    </p>
  `}
`;

    container.appendChild(el);
  });
}

document.getElementById('searchBtn')?.addEventListener('click', async () => {
  const q = document.getElementById('query').value.trim();
  if (!q) return alert('enter query');
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const resp = await fetch('/api/products/search', { method: 'POST', headers, body: JSON.stringify({ query: q }) });
  const j = await resp.json();
  if (!resp.ok) return alert(j.message || JSON.stringify(j));
  renderProducts(j.products || []);
});

// Basic load: fetch all products
// Update header based on login state
function updateHeader() {
  const token = localStorage.getItem('token');
  const email = localStorage.getItem('email');
  const role = localStorage.getItem('role');
  
  const loginLink = document.getElementById('loginLink');
  const userInfo = document.getElementById('userInfo');
  const userEmail = document.getElementById('userEmail');
  
  if (token && email) {
    if (loginLink) loginLink.style.display = 'none';
    if (userInfo) userInfo.style.display = 'inline';
    if (userEmail) userEmail.textContent = email;
    
    // Redirect to appropriate dashboard if needed
    if (role === 'admin' && !window.location.pathname.includes('/admin.html')) {
      location.href = '/admin.html';
    } else if (role === 'seller' && !window.location.pathname.includes('/seller.html')) {
      location.href = '/seller.html';
    }
  } else {
    if (loginLink) loginLink.style.display = 'inline';
    if (userInfo) userInfo.style.display = 'none';
  }
}

//handle category filter
document.querySelectorAll('.category-item').forEach(item => {
  item.addEventListener('click', async () => {
    const category = item.dataset.category;
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const resp = await fetch('/api/products/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: category })
    });
    const j = await resp.json();
    if (resp.ok) renderProducts(j.products || []);
  });
});


// Handle logout
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.clear();
  location.href = '/';
});

async function loadInitial() {
  const r = await fetch('/api/products');
  const j = await r.json();
  if (r.ok) renderProducts(j.products || []);
  updateHeader();
}

loadInitial();
