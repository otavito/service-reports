(function () {
  document.documentElement.classList.add("auth-pending");

  const msalConfig = {
    auth: {
      clientId: "b1438db9-79e6-457a-99fd-66e7ae4fe160",
      authority: "https://login.microsoftonline.com/81dbb0d4-0d50-4aa5-a35c-04b98c73f3e0",
      redirectUri: window.location.origin + window.location.pathname,
      postLogoutRedirectUri: window.location.origin + window.location.pathname
    },
    cache: {
      cacheLocation: "sessionStorage"
    }
  };

  const loginRequest = {
    scopes: ["User.Read", "GroupMember.Read.All"]
  };

  const tokenRequest = {
    scopes: ["User.Read", "GroupMember.Read.All"]
  };

  const ALLOWED_GROUP_ID = "622b603c-f4df-41cd-88fb-ea857d6ddf79";
  const msalInstance = new msal.PublicClientApplication(msalConfig);

  let currentAccount = null;
  let authorized = false;
  let authOverlayEl = null;
  let authStatusEl = null;
  let authTitleEl = null;
  let authDescriptionEl = null;
  let overlayLoginBtn = null;
  let overlayLogoutBtn = null;
  let headerLoginBtn = null;
  let headerLogoutBtn = null;
  let headerUserEl = null;
  let headerUsernameEl = null;
  let headerAvatarEl = null;

  function ensureStyles() {
    if (document.getElementById("service-report-auth-styles")) {
      return;
    }

    const styleEl = document.createElement("style");
    styleEl.id = "service-report-auth-styles";
    styleEl.textContent = `
      html.auth-pending main {
        visibility: hidden;
      }

      .header-inner {
        position: relative;
      }

      .auth-header-controls {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .auth-user {
        display: none;
        align-items: center;
        gap: 0.65rem;
        color: var(--color-text);
      }

      .auth-user-avatar {
        width: 34px;
        height: 34px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--color-accent);
        color: var(--color-primary);
        font-size: 0.85rem;
        font-weight: 700;
      }

      .auth-user-name {
        font-size: 0.93rem;
        font-weight: 600;
      }

      .auth-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        padding: 0.65rem 1rem;
        border: 1px solid var(--color-primary);
        border-radius: var(--radius);
        background: var(--color-primary);
        color: #ffffff;
        font-size: 0.92rem;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s, transform 0.15s;
      }

      .auth-button:hover {
        background: var(--color-primary-hover, #1e40af);
        border-color: var(--color-primary-hover, #1e40af);
        transform: translateY(-1px);
      }

      .auth-button.secondary {
        background: transparent;
        color: var(--color-primary);
      }

      .auth-button.secondary:hover {
        background: var(--color-accent);
        border-color: var(--color-primary);
      }

      .auth-overlay {
        position: fixed;
        inset: 0;
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        background: rgba(244, 246, 249, 0.96);
        backdrop-filter: blur(3px);
      }

      .auth-overlay[hidden] {
        display: none;
      }

      .auth-card {
        width: min(100%, 460px);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 14px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
        padding: clamp(1.5rem, 4vw, 2rem);
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .auth-card h2 {
        color: var(--color-text);
        font-size: clamp(1.35rem, 4vw, 1.9rem);
        letter-spacing: -0.02em;
      }

      .auth-card p {
        color: var(--color-text-muted);
        line-height: 1.6;
      }

      .auth-status {
        display: none;
        padding: 0.8rem 0.95rem;
        border-radius: 10px;
        font-size: 0.92rem;
        line-height: 1.45;
      }

      .auth-status.visible {
        display: block;
      }

      .auth-status.info {
        background: #eff6ff;
        color: #1d4ed8;
      }

      .auth-status.error {
        background: #fee2e2;
        color: #b91c1c;
      }

      .auth-overlay-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 0.35rem;
      }

      @media (max-width: 640px) {
        .auth-header-controls {
          width: 100%;
          justify-content: space-between;
          margin-left: 0;
        }

        .header-inner {
          flex-wrap: wrap;
        }
      }
    `;

    document.head.appendChild(styleEl);
  }

  function ensureHeaderControls() {
    const headerInner = document.querySelector(".header-inner");
    if (!headerInner || headerInner.querySelector(".auth-header-controls")) {
      return;
    }

    const controlsEl = document.createElement("div");
    controlsEl.className = "auth-header-controls";
    controlsEl.innerHTML = `
      <div class="auth-user" id="auth-user-info">
        <div class="auth-user-avatar" id="auth-user-avatar">U</div>
        <span class="auth-user-name" id="auth-username">User</span>
      </div>
      <button type="button" class="auth-button secondary" id="auth-login-header-button">Login</button>
      <button type="button" class="auth-button" id="auth-logout-header-button" style="display: none;">Logout</button>
    `;

    headerInner.appendChild(controlsEl);

    headerLoginBtn = controlsEl.querySelector("#auth-login-header-button");
    headerLogoutBtn = controlsEl.querySelector("#auth-logout-header-button");
    headerUserEl = controlsEl.querySelector("#auth-user-info");
    headerUsernameEl = controlsEl.querySelector("#auth-username");
    headerAvatarEl = controlsEl.querySelector("#auth-user-avatar");

    headerLoginBtn.addEventListener("click", login);
    headerLogoutBtn.addEventListener("click", logout);
  }

  function ensureOverlay() {
    if (document.getElementById("auth-overlay")) {
      authOverlayEl = document.getElementById("auth-overlay");
      return;
    }

    authOverlayEl = document.createElement("div");
    authOverlayEl.id = "auth-overlay";
    authOverlayEl.className = "auth-overlay";
    authOverlayEl.innerHTML = `
      <div class="auth-card">
        <h2 id="auth-overlay-title">Sign in required</h2>
        <p id="auth-overlay-description">Please sign in with your Microsoft account to access this application.</p>
        <div id="auth-status" class="auth-status"></div>
        <div class="auth-overlay-actions">
          <button type="button" class="auth-button" id="auth-overlay-login-button">Sign In with Microsoft</button>
          <button type="button" class="auth-button secondary" id="auth-overlay-logout-button" style="display: none;">Logout</button>
        </div>
      </div>
    `;

    document.body.appendChild(authOverlayEl);

    authTitleEl = authOverlayEl.querySelector("#auth-overlay-title");
    authDescriptionEl = authOverlayEl.querySelector("#auth-overlay-description");
    authStatusEl = authOverlayEl.querySelector("#auth-status");
    overlayLoginBtn = authOverlayEl.querySelector("#auth-overlay-login-button");
    overlayLogoutBtn = authOverlayEl.querySelector("#auth-overlay-logout-button");

    overlayLoginBtn.addEventListener("click", login);
    overlayLogoutBtn.addEventListener("click", logout);
  }

  function setStatus(message, type) {
    if (!authStatusEl) {
      return;
    }

    if (!message) {
      authStatusEl.textContent = "";
      authStatusEl.className = "auth-status";
      return;
    }

    authStatusEl.textContent = message;
    authStatusEl.className = `auth-status visible ${type || "info"}`;
  }

  function setOverlayState(state, message) {
    ensureOverlay();

    if (state === "authorized") {
      authOverlayEl.hidden = true;
      document.documentElement.classList.remove("auth-pending");
      return;
    }

    authOverlayEl.hidden = false;
    document.documentElement.classList.add("auth-pending");

    if (state === "loading") {
      authTitleEl.textContent = "Checking access";
      authDescriptionEl.textContent = "Validating your sign-in and permissions.";
      overlayLoginBtn.style.display = "none";
      overlayLogoutBtn.style.display = currentAccount ? "inline-flex" : "none";
      setStatus(message || "Checking your permissions...", "info");
      return;
    }

    if (state === "denied") {
      authTitleEl.textContent = "Access denied";
      authDescriptionEl.textContent = "Your account is signed in, but it does not have permission to access this application.";
      overlayLoginBtn.style.display = "none";
      overlayLogoutBtn.style.display = "inline-flex";
      setStatus(message || "You are not a member of the required access group.", "error");
      return;
    }

    authTitleEl.textContent = "Sign in required";
    authDescriptionEl.textContent = "Please sign in with your Microsoft account to access this application.";
    overlayLoginBtn.style.display = "inline-flex";
    overlayLogoutBtn.style.display = "none";
    setStatus(message || "", message ? "error" : "info");
  }

  function updateHeaderUser() {
    ensureHeaderControls();

    if (!headerUserEl || !headerLoginBtn || !headerLogoutBtn) {
      return;
    }

    if (currentAccount) {
      const displayName = currentAccount.name || currentAccount.username || "User";
      const initialsSource = currentAccount.name || currentAccount.username || "U";
      const initials = initialsSource
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        || initialsSource.charAt(0)
        || "U";

      headerUserEl.style.display = "flex";
      headerLoginBtn.style.display = "none";
      headerLogoutBtn.style.display = "inline-flex";
      headerUsernameEl.textContent = displayName;
      headerAvatarEl.textContent = initials.toUpperCase();
      return;
    }

    headerUserEl.style.display = "none";
    headerLoginBtn.style.display = "inline-flex";
    headerLogoutBtn.style.display = "none";
  }

  async function login() {
    setStatus("", "info");
    await msalInstance.loginRedirect(loginRequest);
  }

  async function logout() {
    await msalInstance.logoutRedirect({ account: currentAccount || msalInstance.getActiveAccount() || null });
  }

  async function getToken() {
    const account = currentAccount || msalInstance.getActiveAccount();

    if (!account) {
      throw new Error("No active account available.");
    }

    try {
      const response = await msalInstance.acquireTokenSilent({ ...tokenRequest, account });
      return response.accessToken;
    } catch (error) {
      if (error instanceof msal.InteractionRequiredAuthError) {
        await msalInstance.acquireTokenRedirect({ ...tokenRequest, account });
      }

      throw error;
    }
  }

  async function isMemberOfAllowedGroup() {
    const token = await getToken();
    const response = await fetch("https://graph.microsoft.com/v1.0/me/memberOf?$select=id", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status}`);
    }

    const data = await response.json();
    const groups = (data.value || []).map((item) => item.id);
    return groups.includes(ALLOWED_GROUP_ID);
  }

  async function resolveAccount() {
    const redirectResponse = await msalInstance.handleRedirectPromise();

    if (redirectResponse && redirectResponse.account) {
      return redirectResponse.account;
    }

    const activeAccount = msalInstance.getActiveAccount();
    if (activeAccount) {
      return activeAccount;
    }

    const accounts = msalInstance.getAllAccounts();
    return accounts[0] || null;
  }

  async function initialize() {
    ensureStyles();
    ensureHeaderControls();
    ensureOverlay();
    setOverlayState("loading", "Checking your session...");

    try {
      currentAccount = await resolveAccount();
      updateHeaderUser();

      if (!currentAccount) {
        authorized = false;
        setOverlayState("login");
        return false;
      }

      msalInstance.setActiveAccount(currentAccount);
      setOverlayState("loading", "Checking your permissions...");

      const allowed = await isMemberOfAllowedGroup();
      authorized = allowed;
      updateHeaderUser();

      if (!allowed) {
        setOverlayState("denied");
        return false;
      }

      setOverlayState("authorized");
      return true;
    } catch (error) {
      console.error("Authentication initialization error:", error);
      authorized = false;
      setOverlayState("login", error?.message || "Unable to validate your sign-in.");
      updateHeaderUser();
      return false;
    }
  }

  window.serviceReportAuth = {
    initialize,
    getToken,
    getCurrentAccount() {
      return currentAccount;
    },
    isAuthorized() {
      return authorized;
    }
  };

  window.serviceReportAuthReady = new Promise((resolve, reject) => {
    const start = async () => {
      try {
        await initialize();
        resolve(window.serviceReportAuth);
      } catch (error) {
        reject(error);
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  });
})();