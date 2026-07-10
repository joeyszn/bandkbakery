/**
 * Shared authentication module for B&KERY.
 * Used by all pages to maintain consistent login state.
 */

(function(){
  'use strict';

  const AUTH_TOKEN_KEY = 'bk_auth_token';
  const AUTH_USER_KEY = 'bk_auth_user';

  // ─── Token / User Helpers ───────────────────────────────────────
  window.BK_getAuthToken = function(){
    return localStorage.getItem(AUTH_TOKEN_KEY) || null;
  };

  window.BK_getAuthUser = function(){
    try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null'); } catch(e){ return null; }
  };

  window.BK_setAuthUser = function(user){
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  };

  window.BK_clearAuth = function(){
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  // ─── API Calls ──────────────────────────────────────────────────
  window.BK_apiAuth = async function(action, body = {}){
    const resp = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body })
    });
    const json = await resp.json();
    if(!resp.ok) throw new Error(json.error || 'Auth request failed');
    return json;
  };

  window.BK_apiGetMe = async function(){
    const token = window.BK_getAuthToken();
    if(!token) return null;
    try {
      const resp = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(!resp.ok) return null;
      const json = await resp.json();
      return json.user || null;
    } catch(e){
      return null;
    }
  };

  // ─── Sign In / Sign Up / Sign Out ───────────────────────────────
  window.BK_signIn = async function(email, password){
    const result = await window.BK_apiAuth('login', { email, password });
    if(result.session?.access_token){
      localStorage.setItem(AUTH_TOKEN_KEY, result.session.access_token);
      window.BK_setAuthUser(result.user);
      window.BK_updateAllAuthUI();
      window.BK_closeAuthModal();
      if(typeof window.BK_loadCartFromApi === 'function') window.BK_loadCartFromApi();
      window.BK_showMiniToast(`Welcome back, ${result.user?.name || result.user?.email || 'friend'}!`);
      return true;
    }
    return false;
  };

  window.BK_signUp = async function(name, email, password){
    const result = await window.BK_apiAuth('signup', { email, password, name });
    if(result.session?.access_token){
      localStorage.setItem(AUTH_TOKEN_KEY, result.session.access_token);
      window.BK_setAuthUser(result.user);
      window.BK_updateAllAuthUI();
      window.BK_closeAuthModal();
      if(typeof window.BK_loadCartFromApi === 'function') window.BK_loadCartFromApi();
      window.BK_showMiniToast('Account created! Welcome to B&KERY.');
      return true;
    }
    return false;
  };

  window.BK_signOut = async function(){
    const token = window.BK_getAuthToken();
    if(token){
      try { await window.BK_apiAuth('logout'); } catch(e){}
    }
    window.BK_clearAuth();
    if(typeof window.BK_clearCartData === 'function') window.BK_clearCartData();
    window.BK_updateAllAuthUI();
    window.BK_showMiniToast('You have been signed out.');
  };

  // ─── Auth UI Update ─────────────────────────────────────────────
  window.BK_updateAllAuthUI = function(){
    // Update header auth button if it exists
    const user = window.BK_getAuthUser();
    const btn = document.getElementById('auth-toggle-btn');
    if(btn){
      if(user){
        btn.className = 'btn btn-auth-user';
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Hi, ${(user.name || user.email || 'User').split(' ')[0]}`;
        btn.onclick = () => window.BK_openProfileModal();
      } else {
        btn.className = 'btn btn-ghost';
        btn.textContent = 'Sign In';
        btn.onclick = () => window.BK_openAuthModal();
      }
    }

    // Update orders page auth button if it exists
    const ordersBtn = document.getElementById('orders-auth-btn');
    if(ordersBtn){
      if(user){
        ordersBtn.className = 'btn btn-auth-user';
        ordersBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Hi, ${(user.name || user.email || 'User').split(' ')[0]}`;
        ordersBtn.onclick = () => window.BK_openProfileModal();
      } else {
        ordersBtn.className = 'btn btn-ghost';
        ordersBtn.textContent = 'Sign In';
        ordersBtn.onclick = () => window.BK_openAuthModal();
      }
    }

    // Update profile modal if visible
    const profName = document.getElementById('profile-user-name');
    const profEmail = document.getElementById('profile-user-email');
    if(profName && user) profName.textContent = user.name || 'B&KERY Member';
    if(profEmail && user) profEmail.textContent = user.email || '';
  };

  // ─── Profile Modal ──────────────────────────────────────────────
  window.BK_openProfileModal = function(){
    const user = window.BK_getAuthUser();
    if(!user) return;
    const profName = document.getElementById('profile-user-name');
    const profEmail = document.getElementById('profile-user-email');
    if(profName) profName.textContent = user.name || 'B&KERY Member';
    if(profEmail) profEmail.textContent = user.email || '';
    const overlay = document.getElementById('profile-modal-overlay');
    if(overlay){
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    }
  };

  window.BK_closeProfileModal = function(){
    const overlay = document.getElementById('profile-modal-overlay');
    if(overlay){
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  };

  // ─── Auth Modal ─────────────────────────────────────────────────
  window.BK_openAuthModal = function(){
    // Show auth error containers
    const signinError = document.getElementById('auth-signin-error');
    const signupError = document.getElementById('auth-signup-error');
    if(signinError) { signinError.textContent = ''; signinError.classList.remove('visible'); }
    if(signupError) { signupError.textContent = ''; signupError.classList.remove('visible'); }

    const overlay = document.getElementById('auth-modal-overlay');
    if(!overlay){
      // Inject auth modal if it doesn't exist on this page
      injectAuthModals();
    }
    const modalOverlay = document.getElementById('auth-modal-overlay');
    if(modalOverlay){
      modalOverlay.classList.add('open');
      modalOverlay.setAttribute('aria-hidden', 'false');
      const title = document.getElementById('auth-modal-title');
      const subtitle = document.getElementById('auth-modal-subtitle');
      const signinForm = document.getElementById('auth-signin-form');
      const signupForm = document.getElementById('auth-signup-form');
      if(title) title.textContent = 'Sign In';
      if(subtitle) subtitle.textContent = 'Welcome back! Sign in to your B&KERY account.';
      if(signinForm) signinForm.style.display = 'block';
      if(signupForm) signupForm.style.display = 'none';
    }
  };

  window.BK_closeAuthModal = function(){
    const overlay = document.getElementById('auth-modal-overlay');
    if(overlay){
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  };

  // ─── Inject Auth Modals into page if missing ────────────────────
  function injectAuthModals(){
    if(document.getElementById('auth-modal-overlay')) return;

    const modalHTML = `
  <div class="bk-modal-overlay" id="auth-modal-overlay" aria-hidden="true">
    <div class="bk-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" tabindex="-1" style="max-width:420px">
      <button type="button" class="bk-modal-close" id="auth-modal-close" aria-label="Close dialog">×</button>
      <div class="auth-modal-inner">
        <div class="auth-header">
          <div class="auth-header-icon">👤</div>
          <h2 id="auth-modal-title">Sign In</h2>
          <p id="auth-modal-subtitle">Welcome back! Sign in to your B&KERY account.</p>
        </div>
        <div id="auth-forms">
          <div id="auth-signin-form">
            <div class="auth-field">
              <label for="auth-email">Email</label>
              <input id="auth-email" type="email" autocomplete="email" placeholder="you@example.com" />
            </div>
            <div class="auth-field">
              <label for="auth-password">Password</label>
              <input id="auth-password" type="password" autocomplete="current-password" placeholder="••••••••" />
            </div>
            <button type="button" class="auth-submit" id="auth-signin-btn">Sign In</button>
            <div class="auth-error" id="auth-signin-error"></div>
            <div class="auth-footer">
              Don't have an account? <a id="auth-show-signup">Sign Up</a>
            </div>
          </div>
          <div id="auth-signup-form" style="display:none">
            <div class="auth-field">
              <label for="auth-name">Full Name</label>
              <input id="auth-name" type="text" autocomplete="name" placeholder="Karen Smith" />
            </div>
            <div class="auth-field">
              <label for="auth-signup-email">Email</label>
              <input id="auth-signup-email" type="email" autocomplete="email" placeholder="you@example.com" />
            </div>
            <div class="auth-field">
              <label for="auth-signup-password">Password</label>
              <input id="auth-signup-password" type="password" autocomplete="new-password" placeholder="••••••••" />
            </div>
            <button type="button" class="auth-submit" id="auth-signup-btn">Create Account</button>
            <div class="auth-error" id="auth-signup-error"></div>
            <div class="auth-footer">
              Already have an account? <a id="auth-show-signin">Sign In</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="bk-modal-overlay" id="profile-modal-overlay" aria-hidden="true">
    <div class="bk-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" tabindex="-1" style="max-width:360px">
      <button type="button" class="bk-modal-close" id="profile-modal-close" aria-label="Close dialog">×</button>
      <div class="auth-modal-inner">
        <div class="auth-header">
          <div class="auth-header-icon">👤</div>
          <h2 id="profile-modal-title">My Account</h2>
          <p id="profile-modal-subtitle"></p>
        </div>
        <div style="text-align:center;margin-bottom:16px">
          <p id="profile-user-name" style="font-weight:700;color:#522f1c;margin:0 0 4px"></p>
          <p id="profile-user-email" style="margin:0;color:#6b4a38;font-size:0.92rem"></p>
        </div>
        <button type="button" class="auth-submit" id="profile-logout-btn" style="background:#c53030">Sign Out</button>
      </div>
    </div>
  </div>`;

    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    // Insert modals before the footer or at the end of body
    const footer = document.getElementById('footer');
    if(footer) {
      footer.parentNode.insertBefore(div, footer);
    } else {
      document.body.appendChild(div);
    }

    // Bind modal events
    setTimeout(bindAuthModalEvents, 0);
  }

  // ─── Bind Auth Modal Events ─────────────────────────────────────
  function bindAuthModalEvents(){
    document.getElementById('auth-modal-close')?.addEventListener('click', window.BK_closeAuthModal);
    document.getElementById('auth-modal-overlay')?.addEventListener('click', (e) => {
      if(e.target === e.currentTarget) window.BK_closeAuthModal();
    });

    document.getElementById('profile-modal-close')?.addEventListener('click', window.BK_closeProfileModal);
    document.getElementById('profile-modal-overlay')?.addEventListener('click', (e) => {
      if(e.target === e.currentTarget) window.BK_closeProfileModal();
    });

    document.getElementById('profile-logout-btn')?.addEventListener('click', async () => {
      window.BK_closeProfileModal();
      await window.BK_signOut();
      // Reload page to refresh orders, cart, etc.
      window.location.reload();
    });

    document.getElementById('auth-signin-btn')?.addEventListener('click', async () => {
      const email = document.getElementById('auth-email')?.value.trim();
      const password = document.getElementById('auth-password')?.value;
      if(!email || !password){
        const errEl = document.getElementById('auth-signin-error');
        if(errEl) { errEl.textContent = 'Email and password are required'; errEl.classList.add('visible'); }
        return;
      }
      try {
        await window.BK_signIn(email, password);
      } catch(e){
        const errEl = document.getElementById('auth-signin-error');
        if(errEl) { errEl.textContent = e.message || 'Login failed'; errEl.classList.add('visible'); }
      }
    });

    document.getElementById('auth-signup-btn')?.addEventListener('click', async () => {
      const name = document.getElementById('auth-name')?.value.trim();
      const email = document.getElementById('auth-signup-email')?.value.trim();
      const password = document.getElementById('auth-signup-password')?.value;
      if(!email || !password){
        const errEl = document.getElementById('auth-signup-error');
        if(errEl) { errEl.textContent = 'Email and password are required'; errEl.classList.add('visible'); }
        return;
      }
      try {
        await window.BK_signUp(name, email, password);
      } catch(e){
        const errEl = document.getElementById('auth-signup-error');
        if(errEl) { errEl.textContent = e.message || 'Sign up failed'; errEl.classList.add('visible'); }
      }
    });

    document.getElementById('auth-show-signup')?.addEventListener('click', (e) => {
      e.preventDefault();
      const err1 = document.getElementById('auth-signin-error');
      const err2 = document.getElementById('auth-signup-error');
      if(err1) { err1.textContent = ''; err1.classList.remove('visible'); }
      if(err2) { err2.textContent = ''; err2.classList.remove('visible'); }
      const title = document.getElementById('auth-modal-title');
      const subtitle = document.getElementById('auth-modal-subtitle');
      const signinForm = document.getElementById('auth-signin-form');
      const signupForm = document.getElementById('auth-signup-form');
      if(title) title.textContent = 'Sign Up';
      if(subtitle) subtitle.textContent = 'Create your B&KERY account to save orders and track them across devices.';
      if(signinForm) signinForm.style.display = 'none';
      if(signupForm) signupForm.style.display = 'block';
    });

    document.getElementById('auth-show-signin')?.addEventListener('click', (e) => {
      e.preventDefault();
      const err1 = document.getElementById('auth-signin-error');
      const err2 = document.getElementById('auth-signup-error');
      if(err1) { err1.textContent = ''; err1.classList.remove('visible'); }
      if(err2) { err2.textContent = ''; err2.classList.remove('visible'); }
      const title = document.getElementById('auth-modal-title');
      const subtitle = document.getElementById('auth-modal-subtitle');
      const signinForm = document.getElementById('auth-signin-form');
      const signupForm = document.getElementById('auth-signup-form');
      if(title) title.textContent = 'Sign In';
      if(subtitle) subtitle.textContent = 'Welcome back! Sign in to your B&KERY account.';
      if(signinForm) signinForm.style.display = 'block';
      if(signupForm) signupForm.style.display = 'none';
    });
  }

  // ─── Mini Toast Notification ────────────────────────────────────
  window.BK_showMiniToast = function(message){
    const existing = document.querySelector('.bk-mini-toast');
    if(existing) existing.remove();

    const t = document.createElement('div');
    t.className = 'bk-mini-toast';
    t.textContent = message;
    Object.assign(t.style,{
      position:'fixed',
      right:'18px',
      top:'80px',
      background:'#fff6e0',
      color:'#5b3a28',
      padding:'10px 14px',
      borderRadius:'10px',
      boxShadow:'0 8px 24px rgba(82,47,28,.16)',
      zIndex:9999,
      fontWeight:700,
      letterSpacing:'0.01em',
      maxWidth:'400px'
    });
    document.body.appendChild(t);
    t.animate([{opacity:0,transform:'translateY(-12px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});
    setTimeout(()=>{
      t.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-12px)'}],{duration:240,easing:'cubic-bezier(.4,.0,.6,1)'}).onfinish=()=>t.remove();
    },3000);
  };

  // ─── Login Protection ───────────────────────────────────────────
  window.BK_requireAuth = function(redirectUrl){
    const user = window.BK_getAuthUser();
    if(!user){
      window.BK_openAuthModal();
      return false;
    }
    return true;
  };

  // ─── Clear Cart Data Helper ─────────────────────────────────────
  window.BK_clearCartData = function(){
    localStorage.removeItem('bk_cart');
    localStorage.removeItem('bk_pending_orders');
  };

  // ─── Init on page load ──────────────────────────────────────────
  window.BK_initAuth = async function(){
    // Refresh session from server
    try {
      const user = await window.BK_apiGetMe();
      if(user){
        window.BK_setAuthUser(user);
      }
    } catch(e){
      console.error('Auth session refresh failed:', e);
    }

    // Update UI
    window.BK_updateAllAuthUI();

    // Bind auth toggle buttons
    document.getElementById('auth-toggle-btn')?.addEventListener('click', () => {
      const user = window.BK_getAuthUser();
      if(!user){
        window.BK_openAuthModal();
      }
    });

    // Handle #auth hash
    if(window.location.hash === '#auth' && !window.BK_getAuthUser()){
      setTimeout(() => window.BK_openAuthModal(), 300);
    }
  };

  // Auto-initialize on DOM ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', window.BK_initAuth);
  } else {
    window.BK_initAuth();
  }

})();