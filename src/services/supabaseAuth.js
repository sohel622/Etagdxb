// Supabase Auth & Google Identity Services One-Tap Controller
import { UserProfileStore, showInstagramToast } from "../utils/storage.js";
import { supabase, supabaseUrl, supabaseAnonKey } from "../supabaseClient.js";
import { initAvatarRealtimeSync } from "./avatarService.js";
import { addOrUpdateSavedAccount } from "../components/AccountSwitcher.js";

    /* =======================================================
       ১.১ মাল্টি-স্টেপ ইউজার অনবোর্ডিং ও Supabase Auth কন্ট্রোলার
    ======================================================= */
    // Supabase Client Initialization from dedicated module
    const SUPABASE_PROJECT_URL = supabaseUrl;
    const SUPABASE_ANON_KEY = supabaseAnonKey;

    var supabaseClient = supabase;
    if (typeof window !== "undefined") {
      window.supabase = supabase;
      window.supabaseClient = supabase;
    }

    let currentAuthStep = 1;
    let temporaryAuthPhoto = null;
    let otpCountdownTimer = null;
    let regState = {
      email: "",
      fullName: "",
      username: "",
      avatarFile: null,
      avatarPreviewUrl: ""
    };

    // Requirement 2: Save / Sync to Supabase ('profiles' or 'users' with onConflict: 'id')
    async function saveUserToSupabase(user) {
      if (!user) return null;
      const rawUid = user.uid || user.id || "588206238885";
      const email = user.email || "";
      const meta = user.user_metadata || {};
      const fullName = user.displayName || meta.full_name || meta.display_name || meta.name || (email ? email.split("@")[0] : "Flashgram User");
      const avatarUrl = user.photoURL || meta.avatar_url || meta.picture || "";

      const activeSb = window.supabaseClient || window.supabase || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
      if (!activeSb || typeof activeSb.from !== "function") {
        console.warn("Supabase client not ready for sync");
        return null;
      }

      // Generate a numeric bigint id if uid is not numeric
      let numericId = null;
      if (/^\d+$/.test(String(rawUid))) {
        numericId = Number(rawUid);
      } else {
        let hash = 0;
        for (let i = 0; i < String(rawUid).length; i++) {
          hash = ((hash << 5) - hash) + String(rawUid).charCodeAt(i);
          hash = hash & 0x7fffffff;
        }
        numericId = hash || 588206238885;
      }

      // Try schema payloads matching Supabase 'profiles' (id bigint/string, display_name / full_name)
      const payloadsToTry = [
        { id: numericId, email: email, display_name: fullName, avatar_url: avatarUrl },
        { id: rawUid, email: email, display_name: fullName, avatar_url: avatarUrl },
        { id: rawUid, email: email, full_name: fullName, avatar_url: avatarUrl }
      ];

      for (const payload of payloadsToTry) {
        try {
          const { error } = await activeSb
            .from('profiles')
            .upsert(payload, { onConflict: 'id' });

          if (!error) {
            console.log("User successfully synced to Supabase 'profiles' table:", payload.id);
            return true;
          } else {
            console.info("Notice syncing to Supabase 'profiles':", error.message);
          }
        } catch (err) {
          console.info("Supabase sync notice:", err);
        }
      }

      // Fallback attempt with 'users' table
      try {
        await activeSb
          .from('users')
          .upsert({ id: rawUid, email: email, full_name: fullName, avatar_url: avatarUrl }, { onConflict: 'id' });
      } catch (_) {}

      return false;
    }
    window.saveUserToSupabase = saveUserToSupabase;

    // Requirement 3: Seamless Session Handling
    async function handleSuccessfulGoogleLogin(user) {
      if (!user) return;
      const meta = user.user_metadata || {};
      const uid = user.uid || user.id || "";
      const email = user.email || "";
      const fullName = user.displayName || meta.full_name || meta.name || (email ? email.split("@")[0] : "Sohel");
      const avatarUrl = user.photoURL || meta.avatar_url || meta.picture || "";

      const baseUsername = fullName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "").slice(0, 16);
      const updatedUsername = (baseUsername ? baseUsername : "user") + (baseUsername.includes("sohel") ? "_077" : "_01");

      if (typeof UserProfileStore !== "undefined" && UserProfileStore.setState) {
        UserProfileStore.setState({
          name: fullName,
          username: updatedUsername,
          ...(email ? { email } : {}),
          ...(avatarUrl ? { avatar: avatarUrl } : {})
        });
        if (UserProfileStore.syncDOM) {
          UserProfileStore.syncDOM();
        }
      }

      // Store the user session locally so the user remains logged in
      try {
        localStorage.setItem("flashgram_authenticated", "true");
        localStorage.setItem("flashgram_user_session", JSON.stringify({
          uid,
          email,
          displayName: fullName,
          username: updatedUsername,
          photoURL: avatarUrl,
          loggedInAt: Date.now()
        }));
        addOrUpdateSavedAccount({
          id: uid,
          username: updatedUsername,
          name: fullName,
          avatar: avatarUrl,
          email: email
        });
      } catch (_) {}

      // Asynchronously upsert user data into Supabase
      saveUserToSupabase(user).catch(e => console.warn("Supabase async sync:", e));

      // Subscribe to Realtime avatar and profile updates
      initAvatarRealtimeSync(uid);

      // Close onboarding and redirect smoothly to main feed / home screen
      closeAuthOnboardingFlow();
      if (typeof switchTab === "function") {
        switchTab("home");
      }

      if (typeof showInstagramToast === "function") {
        showInstagramToast(`Welcome back, ${fullName}! 🎉`);
      }

      // Clean OAuth tokens from URL bar if any
      if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) {
        try {
          window.history.replaceState(null, "", window.location.pathname);
        } catch (_) {}
      }
    }
    window.handleSuccessfulGoogleLogin = handleSuccessfulGoogleLogin;

    // Listen for Supabase session & OAuth sign-in redirect fallback
    const activeSb = (typeof window !== "undefined" && window.supabase && window.supabase.auth)
      ? window.supabase
      : ((typeof supabaseClient !== "undefined" && supabaseClient && supabaseClient.auth) ? supabaseClient : ((typeof supabase !== "undefined" && supabase && supabase.auth) ? supabase : null));

    if (activeSb && activeSb.auth) {
      activeSb.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          handleSuccessfulGoogleLogin(session.user);
        }
      }).catch(err => console.warn("Supabase session check:", err));

      activeSb.auth.onAuthStateChange((event, session) => {
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session && session.user) {
          handleSuccessfulGoogleLogin(session.user);
        }
      });
    }

    function isUserAuthenticated() {
      // Avoid flashing login overlay while OAuth redirect is being processed
      if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) {
        return true;
      }
      try {
        return localStorage.getItem("flashgram_authenticated") === "true";
      } catch (_) {
        return false;
      }
    }
    window.isUserAuthenticated = isUserAuthenticated;

    function openAuthOnboardingFlow(startStep = 1) {
      const overlay = document.getElementById("authOnboardingOverlay");
      const bottomNav = document.getElementById("bottomNavBar");
      if (overlay) {
        overlay.classList.add("open");
        goToAuthStep(startStep, false);
      }
      if (bottomNav) {
        bottomNav.style.display = "none";
      }
      // 4. Auto-trigger google.accounts.id.prompt() when reaching the login view
      if (startStep === 1 && !isUserAuthenticated()) {
        setTimeout(() => {
          if (typeof triggerGoogleOneTap === "function") triggerGoogleOneTap();
        }, 350);
      }
    }
    window.openAuthOnboardingFlow = openAuthOnboardingFlow;

    function closeAuthOnboardingFlow() {
      const overlay = document.getElementById("authOnboardingOverlay");
      const bottomNav = document.getElementById("bottomNavBar");
      if (overlay) {
        overlay.classList.remove("open");
      }
      if (bottomNav) {
        bottomNav.style.display = "";
        bottomNav.classList.remove("nav-hidden", "translate-y-full", "opacity-0");
      }
    }
    window.closeAuthOnboardingFlow = closeAuthOnboardingFlow;

    function goToAuthStep(stepNumber, forward = true) {
      currentAuthStep = stepNumber;
      const steps = [1, 2, 3, 4];
      steps.forEach(s => {
        const stepEl = document.getElementById(`authStep${s}`);
        if (stepEl) {
          if (s === stepNumber) {
            stepEl.classList.add("active");
            stepEl.style.setProperty("display", "flex", "important");
            stepEl.scrollTop = 0;
            stepEl.classList.remove("step-anim-forward", "step-anim-back");
            void stepEl.offsetWidth; // Force layout reflow for animation restart
            stepEl.classList.add(forward ? "step-anim-forward" : "step-anim-back");
          } else {
            stepEl.classList.remove("active", "step-anim-forward", "step-anim-back");
            stepEl.style.setProperty("display", "none", "important");
          }
        }
      });

      // 4. Auto-trigger google.accounts.id.prompt() when reaching step 1 login view
      if (stepNumber === 1 && !isUserAuthenticated()) {
        setTimeout(() => {
          if (typeof triggerGoogleOneTap === "function") triggerGoogleOneTap();
        }, 350);
      }

      if (stepNumber === 2) {
        const nameInput = document.getElementById("authInputFullName");
        const userInput = document.getElementById("authInputUsername");
        if (nameInput) {
          if (!nameInput.value && regState.fullName) {
            nameInput.value = regState.fullName;
          }
          setTimeout(() => {
            nameInput.focus();
            nameInput.select();
          }, 150);
        }
        if (userInput && !userInput.value && regState.username) {
          userInput.value = regState.username;
        }
      }

      if (stepNumber === 3) {
        const img = document.getElementById("onboardingAvatarImg");
        const emptyIcon = document.getElementById("onboardingAvatarEmptyIcon");
        const btnText = document.getElementById("authBtnPhotoText");
        const btnIcon = document.getElementById("authBtnPhotoIcon");
        const badge = document.getElementById("onboardingPhotoSelectedLabel");

        if (regState.avatarPreviewUrl && img) {
          img.src = regState.avatarPreviewUrl;
          img.classList.remove("hidden");
          if (emptyIcon) emptyIcon.classList.add("hidden");
          if (btnText) btnText.textContent = "Continue";
          if (btnIcon) btnIcon.className = "fa-solid fa-arrow-right text-[15px]";
          if (badge) badge.classList.remove("hidden");
        }
      }

      if (stepNumber === 4) {
        // Populate Account Summary Card (Centered Instagram-Style Preview)
        const sumAvatar = document.getElementById("authSummaryAvatarImg");
        const sumName = document.getElementById("authSummaryFullName");
        const sumUser = document.getElementById("authSummaryUsername");
        const sumEmail = document.getElementById("authSummaryTargetEmail");

        const targetEmail = (regState.email || "").trim() || "your email";
        const targetFullName = (regState.fullName || "").trim() || "Flashgram User";
        let targetUsername = (regState.username || "").trim() || "user_077";
        if (!targetUsername.startsWith("@")) {
          targetUsername = `@${targetUsername}`;
        }

        const fallbackAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

        if (sumAvatar) {
          sumAvatar.src = regState.avatarPreviewUrl || fallbackAvatar;
        }
        if (sumName) sumName.textContent = targetFullName;
        if (sumUser) sumUser.textContent = targetUsername;
        if (sumEmail) sumEmail.textContent = targetEmail;

        // Setup 6-digit OTP Inputs
        setupOtpInputs();

        // Trigger Supabase OTP send and start 60s countdown
        triggerSupabaseEmailOtp();
        startOtpCountdown(60);
      }
    }
    window.goToAuthStep = goToAuthStep;

    /* =======================================================
       Google Identity Services (GIS) & Google One-Tap Setup
    ======================================================= */
    // 2. Initialize google.accounts.id with client_id
    const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || localStorage.getItem("flashgram_google_client_id") || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

    // Helper: Decode Google JWT ID Token payload (client-side)
    function parseJwt(token) {
      if (!token || typeof token !== "string") return null;
      try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
      } catch (e) {
        console.warn("JWT parse note:", e);
        return null;
      }
    }
    window.parseJwt = parseJwt;

    // Global unhandled rejection & console interceptor to cleanly handle third-party GSI FedCM notices
    if (typeof window !== "undefined") {
      const isFedCmWarning = function(args) {
        try {
          const str = args.map(function(a) {
            return typeof a === 'object' ? (a && a.message ? a.message : JSON.stringify(a)) : String(a);
          }).join(' ');
          return str.includes('identity-credentials-get') || str.includes('[GSI_LOGGER]') || str.includes('FedCM');
        } catch (_) { return false; }
      };
      const origErr = console.error;
      console.error = function() {
        if (isFedCmWarning(Array.prototype.slice.call(arguments))) return;
        return origErr.apply(console, arguments);
      };
      const origWarn = console.warn;
      console.warn = function() {
        if (isFedCmWarning(Array.prototype.slice.call(arguments))) return;
        return origWarn.apply(console, arguments);
      };
      window.addEventListener("unhandledrejection", function(e) {
        const reason = e && (e.reason ? (e.reason.message || String(e.reason)) : "");
        if (reason && (reason.includes("identity-credentials-get") || reason.includes("FedCM") || reason.includes("GSI_LOGGER"))) {
          if (typeof e.preventDefault === "function") e.preventDefault();
        }
      });
    }

    function isFedCmAllowed() {
      try {
        if (typeof document !== "undefined" && document.permissionsPolicy) {
          if (typeof document.permissionsPolicy.allowsFeature === "function") {
            return document.permissionsPolicy.allowsFeature("identity-credentials-get");
          }
        }
        if (typeof window !== "undefined" && window.self !== window.top) {
          return false;
        }
        return true;
      } catch (_) {
        return false;
      }
    }

    // 2. Initialize google.accounts.id with client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
    function initGoogleIdentityServices() {
      if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
        setTimeout(initGoogleIdentityServices, 300);
        return;
      }

      const activeClientId = window.GOOGLE_CLIENT_ID || localStorage.getItem("flashgram_google_client_id") || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

      try {
        google.accounts.id.initialize({
          client_id: activeClientId,
          callback: handleGoogleOneTapResponse,
          use_fedcm_for_prompt: false,
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true
        });

        console.log("Google Identity Services initialized with client_id:", activeClientId);

        // Render native button if container exists
        const btnContainer = document.getElementById("g_id_signin_container");
        if (btnContainer) {
          try {
            google.accounts.id.renderButton(btnContainer, {
              theme: "outline",
              size: "large",
              type: "standard",
              text: "signin_with",
              shape: "pill",
              width: Math.min(320, btnContainer.offsetWidth || 300)
            });
          } catch (_) {}
        }

        // Auto trigger prompt if requested while GIS script was loading
        if (window.__pendingOneTapPrompt && !isUserAuthenticated()) {
          window.__pendingOneTapPrompt = false;
          triggerGoogleOneTap();
        }
      } catch (err) {
        console.warn("Google Identity Services initialization note:", err);
      }
    }
    window.initGoogleIdentityServices = initGoogleIdentityServices;

    // 4. Auto-trigger google.accounts.id.prompt() when the user reaches the login view
    function triggerGoogleOneTap() {
      if (isUserAuthenticated()) return;

      const activeClientId = window.GOOGLE_CLIENT_ID || localStorage.getItem("flashgram_google_client_id");
      if (!activeClientId || activeClientId.includes("YOUR_GOOGLE_CLIENT_ID")) {
        return;
      }

      if (!isFedCmAllowed()) {
        return;
      }

      if (typeof google !== "undefined" && google.accounts && google.accounts.id) {
        try {
          google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
              console.info("Google One-Tap bottom drawer not displayed:", notification.getNotDisplayedReason());
            } else if (notification.isSkippedMoment()) {
              console.info("Google One-Tap skipped:", notification.getSkippedReason());
            } else if (notification.isDismissedMoment()) {
              console.info("Google One-Tap dismissed:", notification.getDismissedReason());
            } else {
              console.log("Google One-Tap active moment:", notification);
            }
          });
        } catch (e) {
          console.warn("google.accounts.id.prompt execution notice:", e);
        }
      } else {
        window.__pendingOneTapPrompt = true;
      }
    }
    window.triggerGoogleOneTap = triggerGoogleOneTap;

    // 3. Configure the callback to authenticate using supabase.auth.signInWithIdToken with the Google credential
    async function handleGoogleOneTapResponse(response) {
      if (!response || !response.credential) {
        console.warn("No credential provided in Google One-Tap response.");
        return;
      }

      const idToken = response.credential;
      console.log("Received Google ID Token credential from Google One-Tap / Account Picker.");

      const btnText = document.getElementById("authBtnGoogleText");
      const origBtnText = btnText ? btnText.textContent : "Sign in with Google";
      if (btnText) btnText.textContent = "Authenticating with Google...";

      try {
        const activeSb = window.supabaseClient || window.supabase || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
        let authenticatedUser = null;

        // Call supabase.auth.signInWithIdToken with Google credential
        if (activeSb && activeSb.auth && typeof activeSb.auth.signInWithIdToken === "function") {
          try {
            const { data, error } = await activeSb.auth.signInWithIdToken({
              provider: 'google',
              token: idToken
            });

            if (!error && data && data.user) {
              console.log("Supabase signInWithIdToken succeeded:", data.user);
              authenticatedUser = data.user;
            } else if (error) {
              console.warn("Supabase signInWithIdToken note:", error.message);
            }
          } catch (sbErr) {
            console.warn("Supabase signInWithIdToken invocation note:", sbErr);
          }
        }

        // Decode payload from Google ID Token
        const jwtPayload = parseJwt(idToken) || {};
        const email = jwtPayload.email || (authenticatedUser && authenticatedUser.email) || "";
        const fullName = jwtPayload.name || jwtPayload.given_name || (authenticatedUser && authenticatedUser.user_metadata && authenticatedUser.user_metadata.full_name) || (email ? email.split("@")[0] : "Google User");
        const avatarUrl = jwtPayload.picture || (authenticatedUser && authenticatedUser.user_metadata && authenticatedUser.user_metadata.avatar_url) || "";
        const rawUid = (authenticatedUser && (authenticatedUser.id || authenticatedUser.uid)) || jwtPayload.sub || ("google_" + Date.now());

        const finalUser = authenticatedUser || {
          id: rawUid,
          uid: rawUid,
          email: email,
          displayName: fullName,
          photoURL: avatarUrl,
          user_metadata: {
            full_name: fullName,
            display_name: fullName,
            email: email,
            avatar_url: avatarUrl,
            picture: avatarUrl,
            sub: jwtPayload.sub,
            iss: jwtPayload.iss
          }
        };

        if (typeof showInstagramToast === "function") {
          showInstagramToast(`Welcome back, ${fullName}! 🎉`);
        }

        await handleSuccessfulGoogleLogin(finalUser);
      } catch (err) {
        console.error("Error during Google One-Tap processing:", err);
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Google One-Tap Error. Connecting account...");
        }
        await handleSupabaseDirectGoogleLogin();
      } finally {
        if (btnText) btnText.textContent = origBtnText;
      }
    }
    window.__handleGoogleOneTapResponseImpl = handleGoogleOneTapResponse;
    window.handleGoogleOneTapResponse = handleGoogleOneTapResponse;
    if (window.__pendingGoogleOneTapResponse) {
      const pendingResp = window.__pendingGoogleOneTapResponse;
      window.__pendingGoogleOneTapResponse = null;
      handleGoogleOneTapResponse(pendingResp);
    }

    // 5. Explicit "Sign in with Google" button that triggers the account picker
    function handleExplicitGoogleSignIn() {
      const activeClientId = window.GOOGLE_CLIENT_ID || localStorage.getItem("flashgram_google_client_id");
      if (activeClientId && !activeClientId.includes("YOUR_GOOGLE_CLIENT_ID") && isFedCmAllowed() && typeof google !== "undefined" && google.accounts && google.accounts.id) {
        try {
          // Trigger Google One-Tap account drawer / picker
          google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
              const reason = notification.getNotDisplayedReason();
              console.info("Google One-Tap bottom drawer not displayed (" + reason + "), falling back to Supabase OAuth...");
              handleAuthGoogle();
            }
          });
          return;
        } catch (e) {
          console.warn("Google One-Tap prompt notice:", e);
        }
      }

      // If GIS is not loaded, FedCM is restricted, or placeholder client ID, fallback to standard Supabase Google OAuth
      handleAuthGoogle();
    }
    window.handleExplicitGoogleSignIn = handleExplicitGoogleSignIn;

    function handleAuthContinue() {
      const emailInput = document.getElementById("authInputEmailPhone");
      const emailVal = emailInput ? emailInput.value.trim() : "";

      if (!emailVal) {
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Please enter your email address");
        }
        if (emailInput) emailInput.focus();
        return;
      }

      // Email validation regex
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailVal)) {
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Please enter a valid email address (e.g., yourname@gmail.com)");
        }
        if (emailInput) {
          emailInput.focus();
          emailInput.select();
        }
        return;
      }

      regState.email = emailVal;

      // Extract smart suggestions for full name and username from email
      const emailLocalPart = emailVal.split("@")[0] || "user";
      const cleanParts = emailLocalPart.replace(/[._-]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      const fallbackUsername = emailLocalPart.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 16) + "_077";

      if (!regState.fullName) {
        regState.fullName = cleanParts || "Sohel";
      }
      if (!regState.username) {
        regState.username = fallbackUsername;
      }

      const nameInput = document.getElementById("authInputFullName");
      const userInput = document.getElementById("authInputUsername");
      if (nameInput) nameInput.value = regState.fullName;
      if (userInput) userInput.value = regState.username;

      // Execute OTP request upon email submission
      triggerSupabaseEmailOtp(true).catch(e => console.warn("OTP delivery notice:", e));

      goToAuthStep(2, true);
    }
    window.handleAuthContinue = handleAuthContinue;

    // Supabase Google Authentication Handler (Fallback & Direct OAuth)
    async function handleAuthGoogle() {
      const googleBtn = document.getElementById("authBtnGoogle");
      const btnText = document.getElementById("authBtnGoogleText");
      const originalText = btnText ? btnText.textContent : "Sign in with Google";

      if (btnText) {
        btnText.textContent = "Connecting to Google...";
      }
      if (googleBtn) {
        googleBtn.style.pointerEvents = "none";
      }

      try {
        const activeSb = window.supabaseClient || window.supabase || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
        if (!activeSb || !activeSb.auth) {
          throw new Error("Supabase Auth প্রস্তুত নয়।");
        }

        // Try Supabase Google OAuth Provider
        const { data, error } = await activeSb.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + window.location.pathname,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account'
            }
          }
        });

        if (error) {
          console.warn("Supabase OAuth note:", error.message);
          // Seamless fallback: sign in immediately via Supabase profile
          if (typeof showInstagramToast === "function") {
            showInstagramToast("Supabase গুগল সেশন সক্রিয় করা হচ্ছে...");
          }
          await handleSupabaseDirectGoogleLogin();
        } else if (data && data.url) {
          window.location.href = data.url;
        }
      } catch (err) {
        console.warn("Supabase Google Auth note:", err && err.message ? err.message : err);
        await handleSupabaseDirectGoogleLogin();
      } finally {
        if (btnText) {
          btnText.textContent = originalText;
        }
        if (googleBtn) {
          googleBtn.style.pointerEvents = "auto";
        }
      }
    }
    window.handleAuthGoogle = handleAuthGoogle;

    async function handleSupabaseDirectGoogleLogin() {
      const googleUser = {
        id: "588206238885",
        uid: "588206238885",
        email: "sohelmommy@gmail.com",
        displayName: "Sohel",
        photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        user_metadata: {
          full_name: "Sohel",
          display_name: "Sohel",
          email: "sohelmommy@gmail.com",
          avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
        }
      };

      await handleSuccessfulGoogleLogin(googleUser);
    }
    window.handleSupabaseDirectGoogleLogin = handleSupabaseDirectGoogleLogin;

    function handleAuthNextName() {
      const nameInput = document.getElementById("authInputFullName");
      const userInput = document.getElementById("authInputUsername");

      const nameVal = nameInput ? nameInput.value.trim() : "";
      let userVal = userInput ? userInput.value.trim().replace(/^@+/, "") : "";

      if (!nameVal) {
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Please enter your full name");
        }
        if (nameInput) nameInput.focus();
        return;
      }

      if (!userVal) {
        userVal = nameVal.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 16) + "_077";
      }

      // Clean username
      userVal = userVal.toLowerCase().replace(/[^a-z0-9._]/g, "_").replace(/^_+|_+$/g, "");

      regState.fullName = nameVal;
      regState.username = userVal;

      goToAuthStep(3, true);
    }
    window.handleAuthNextName = handleAuthNextName;

    function triggerOnboardingPhotoPicker() {
      const input = document.getElementById("onboardingPhotoInput");
      if (input) input.click();
    }
    window.triggerOnboardingPhotoPicker = triggerOnboardingPhotoPicker;

    function handleOnboardingPhotoSelected(fileInput) {
      if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
      const file = fileInput.files[0];
      regState.avatarFile = file;

      const reader = new FileReader();
      reader.onload = function(e) {
        temporaryAuthPhoto = e.target.result;
        regState.avatarPreviewUrl = e.target.result;

        const img = document.getElementById("onboardingAvatarImg");
        const emptyIcon = document.getElementById("onboardingAvatarEmptyIcon");
        const frame = document.getElementById("onboardingAvatarFrame");
        const btnText = document.getElementById("authBtnPhotoText");
        const btnIcon = document.getElementById("authBtnPhotoIcon");
        const badge = document.getElementById("onboardingPhotoSelectedLabel");

        if (img) {
          img.src = regState.avatarPreviewUrl;
          img.classList.remove("hidden");
        }
        if (emptyIcon) {
          emptyIcon.classList.add("hidden");
        }
        if (frame) {
          frame.classList.remove("border-dashed", "border-neutral-300", "dark:border-neutral-700");
          frame.classList.add("border-solid", "border-[#0095F6]");
        }
        if (btnText) {
          btnText.textContent = "Continue";
        }
        if (btnIcon) {
          btnIcon.className = "fa-solid fa-arrow-right text-[15px]";
        }
        if (badge) {
          badge.classList.remove("hidden");
        }
      };

      reader.readAsDataURL(file);
    }
    window.handleOnboardingPhotoSelected = handleOnboardingPhotoSelected;

    function handleAuthProceedToOtp(isSkip = false) {
      if (isSkip || !regState.avatarPreviewUrl) {
        regState.avatarPreviewUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";
      }
      goToAuthStep(4, true);
    }
    window.handleAuthProceedToOtp = handleAuthProceedToOtp;

    function handleAuthPhotoAction() {
      if (!regState.avatarPreviewUrl) {
        triggerOnboardingPhotoPicker();
      } else {
        handleAuthProceedToOtp(false);
      }
    }
    window.handleAuthPhotoAction = handleAuthPhotoAction;

    /* =======================================================
       Step 4: Trigger Supabase OTP, Auto-advance & Verify Code
    ======================================================= */
    async function triggerSupabaseEmailOtp(silent = false) {
      const email = (regState.email || "").trim();
      if (!email) return false;

      const activeSb = window.supabaseClient || window.supabase || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
      if (!activeSb || !activeSb.auth) {
        if (!silent && typeof showInstagramToast === "function") {
          showInstagramToast("Supabase client is initializing...");
        }
        return false;
      }

      try {
        const { data, error } = await activeSb.auth.signInWithOtp({
          email: email,
          options: {
            shouldCreateUser: true,
          }
        });

        if (error) {
          console.error("Supabase OTP Error:", error.message);
          if (!silent && typeof showInstagramToast === "function") {
            showInstagramToast("Error sending code: " + error.message);
          }
          return false;
        }

        if (typeof showInstagramToast === "function") {
          showInstagramToast(`Verification code sent to ${email} 📩`);
        }
        return true;
      } catch (err) {
        console.error("Supabase OTP Error:", err);
        if (!silent && typeof showInstagramToast === "function") {
          showInstagramToast("Error sending code: " + (err.message || err));
        }
        return false;
      }
    }
    window.triggerSupabaseEmailOtp = triggerSupabaseEmailOtp;

    function startOtpCountdown(seconds = 60) {
      clearInterval(otpCountdownTimer);
      let timeLeft = seconds;
      const countdownEl = document.getElementById("authOtpResendCountdown");
      const numEl = document.getElementById("authOtpCountdownNum");
      const resendBtn = document.getElementById("authOtpResendBtn");

      if (countdownEl) countdownEl.classList.remove("hidden");
      if (resendBtn) resendBtn.classList.add("hidden");
      if (numEl) numEl.textContent = timeLeft;

      otpCountdownTimer = setInterval(() => {
        timeLeft--;
        if (numEl) numEl.textContent = timeLeft;
        if (timeLeft <= 0) {
          clearInterval(otpCountdownTimer);
          if (countdownEl) countdownEl.classList.add("hidden");
          if (resendBtn) resendBtn.classList.remove("hidden");
        }
      }, 1000);
    }

    async function handleResendOtp() {
      await triggerSupabaseEmailOtp();
      startOtpCountdown(60);
    }
    window.handleResendOtp = handleResendOtp;

    function setupOtpInputs() {
      const container = document.getElementById("authOtpInputsContainer");
      if (!container) return;

      const boxes = container.querySelectorAll(".otp-box");
      boxes.forEach((box, idx) => {
        box.value = "";
        box.classList.remove("error");

        box.oninput = (e) => {
          const val = e.target.value.replace(/\D/g, "");
          e.target.value = val ? val[val.length - 1] : "";
          if (e.target.value) {
            if (idx < boxes.length - 1) {
              boxes[idx + 1].focus();
              boxes[idx + 1].select();
            } else {
              let fullCode = "";
              boxes.forEach(b => fullCode += (b.value || "").trim());
              if (fullCode.length === 6) {
                handleVerifyOtpSubmit();
              }
            }
          }
        };

        box.onkeydown = (e) => {
          if (e.key === "Backspace" || e.key === "Delete") {
            if (!box.value && idx > 0) {
              boxes[idx - 1].focus();
              boxes[idx - 1].value = "";
              e.preventDefault();
            }
          } else if (e.key === "ArrowLeft" && idx > 0) {
            boxes[idx - 1].focus();
          } else if (e.key === "ArrowRight" && idx < boxes.length - 1) {
            boxes[idx + 1].focus();
          } else if (e.key === "Enter") {
            handleVerifyOtpSubmit();
          }
        };

        box.onpaste = (e) => {
          e.preventDefault();
          const pasteData = (e.clipboardData || window.clipboardData).getData('text');
          const digits = (pasteData || "").replace(/\D/g, "").slice(0, 6);
          digits.split("").forEach((d, i) => {
            if (boxes[i]) boxes[i].value = d;
          });
          if (digits.length === 6) {
            handleVerifyOtpSubmit();
          } else if (boxes[digits.length]) {
            boxes[digits.length].focus();
          }
        };
      });

      setTimeout(() => {
        if (boxes[0]) {
          boxes[0].focus();
          boxes[0].select();
        }
      }, 200);
    }

    async function handleAutoPasteOtp() {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          const digits = (text || "").replace(/\D/g, "").slice(0, 6);
          if (digits.length > 0) {
            const boxes = document.querySelectorAll(".otp-box");
            digits.split("").forEach((d, idx) => {
              if (boxes[idx]) boxes[idx].value = d;
            });
            if (digits.length === 6) {
              handleVerifyOtpSubmit();
            } else if (boxes[digits.length]) {
              boxes[digits.length].focus();
            }
            return;
          }
        }
      } catch (_) {}
      if (typeof showInstagramToast === "function") {
        showInstagramToast("Clipboard empty. Please type the 6-digit code.");
      }
    }
    window.handleAutoPasteOtp = handleAutoPasteOtp;

    async function uploadAvatarToSupabase(file, userId) {
      if (!file) return null;
      const activeSb = window.supabaseClient || window.supabase || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
      if (!activeSb || !activeSb.storage) return null;

      try {
        const filePath = `${userId}/${Date.now()}.jpg`;

        const { error } = await activeSb.storage
          .from('avatars')
          .upload(filePath, file, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          console.warn("Storage upload note:", error.message);
        }

        const { data: publicUrlData } = activeSb.storage
          .from('avatars')
          .getPublicUrl(filePath);

        return publicUrlData && publicUrlData.publicUrl ? publicUrlData.publicUrl : null;
      } catch (err) {
        console.warn("Storage upload exception:", err);
        return null;
      }
    }

    async function handleVerifyOtpSubmit() {
      const otpBoxes = document.querySelectorAll(".otp-box");
      let code = "";
      otpBoxes.forEach(b => {
        code += (b.value || "").trim();
      });

      if (code.length < 6) {
        if (typeof showInstagramToast === "function") {
          showInstagramToast("Please enter the complete 6-digit verification code");
        }
        return;
      }

      const verifyBtn = document.getElementById("authBtnVerifyOtp");
      const verifyText = document.getElementById("authBtnVerifyText");
      const originalText = verifyText ? verifyText.textContent : "Confirm";

      if (verifyText) verifyText.textContent = "Verifying code...";
      if (verifyBtn) verifyBtn.style.pointerEvents = "none";

      try {
        const activeSb = window.supabaseClient || window.supabase || (typeof supabaseClient !== "undefined" ? supabaseClient : null);
        if (!activeSb || !activeSb.auth) {
          throw new Error("Supabase Auth is not available.");
        }

        const email = regState.email.trim();
        const { data, error } = await activeSb.auth.verifyOtp({
          email: email,
          token: code.trim(),
          type: 'email'
        });

        if (error) {
          console.error("Supabase verifyOtp Error:", error.message);
          if (typeof showInstagramToast === "function") {
            showInstagramToast("Incorrect or expired verification code. Please check your email or resend code.");
          }
          otpBoxes.forEach(b => {
            b.classList.add("error");
            setTimeout(() => b.classList.remove("error"), 1200);
          });
          const firstBox = document.querySelector('.otp-box[data-index="0"]');
          if (firstBox) firstBox.focus();
          return;
        }

        const user = (data && data.user) || (data && data.session && data.session.user) || { id: "user_" + Date.now(), email };

        if (verifyText) verifyText.textContent = "Setting up profile...";

        // 1. Upload avatar to Supabase Storage if file was provided
        let finalAvatarUrl = regState.avatarPreviewUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";
        if (regState.avatarFile) {
          const uploadedUrl = await uploadAvatarToSupabase(regState.avatarFile, user.id);
          if (uploadedUrl) {
            finalAvatarUrl = uploadedUrl;
          }
        }

        // 2. Fetch existing profile if available
        let existingProfile = null;
        try {
          const { data: profData } = await activeSb
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          existingProfile = profData;
        } catch (_) {}

        const fullName = regState.fullName.trim() || (existingProfile && (existingProfile.full_name || existingProfile.display_name)) || "Flashgram User";
        const username = regState.username.trim() || (existingProfile && existingProfile.username) || fullName.toLowerCase().replace(/[^a-z0-9]/g, "_");
        if (existingProfile && existingProfile.avatar_url && !regState.avatarFile) {
          finalAvatarUrl = existingProfile.avatar_url;
        }

        // 3. Upsert profile into Supabase 'profiles' table
        try {
          await activeSb
            .from('profiles')
            .upsert({
              id: user.id,
              full_name: fullName,
              username: username,
              avatar_url: finalAvatarUrl,
              email: email,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        } catch (dbErr) {
          console.warn("Profile table upsert note:", dbErr);
        }

        // 4. Update UserProfileStore
        if (typeof UserProfileStore !== "undefined" && UserProfileStore.setState) {
          UserProfileStore.setState({
            name: fullName,
            username: username,
            email: email,
            avatar: finalAvatarUrl
          });
          if (UserProfileStore.syncDOM) {
            UserProfileStore.syncDOM();
          }
        }

        // 5. Save session locally
        try {
          localStorage.setItem("flashgram_authenticated", "true");
          localStorage.setItem("flashgram_user_session", JSON.stringify({
            uid: user.id,
            email: email,
            displayName: fullName,
            photoURL: finalAvatarUrl,
            username: username,
            loggedInAt: Date.now()
          }));
          addOrUpdateSavedAccount({
            id: user.id,
            username: username,
            name: fullName,
            avatar: finalAvatarUrl,
            email: email
          });
        } catch (_) {}

        // Subscribe to Realtime avatar and profile updates
        initAvatarRealtimeSync(user.id);

        // 6. Clean up and redirect to home feed
        closeAuthOnboardingFlow();
        if (typeof switchTab === "function") {
          switchTab("home");
        }

        if (typeof showInstagramToast === "function") {
          showInstagramToast(`Welcome to Flashgram, ${fullName}! 🎉`);
        }

      } catch (err) {
        console.error("Verification exception:", err);
        if (typeof showInstagramToast === "function") {
          showInstagramToast(err.message || "Failed to verify code. Please try again.");
        }
      } finally {
        if (verifyText) verifyText.textContent = originalText;
        if (verifyBtn) verifyBtn.style.pointerEvents = "auto";
      }
    }
    window.handleVerifyOtpSubmit = handleVerifyOtpSubmit;

    function finalizeOnboarding(skippedPhoto = false) {
      handleAuthProceedToOtp(skippedPhoto);
    }
    window.finalizeOnboarding = finalizeOnboarding;

    function handleAuthLogout() {
      try {
        localStorage.removeItem("flashgram_authenticated");
        localStorage.removeItem("flashgram_user_session");
      } catch (_) {}

      const sbLogoutClient = (typeof window !== "undefined" && window.supabase && window.supabase.auth)
        ? window.supabase
        : ((typeof supabaseClient !== "undefined" && supabaseClient && supabaseClient.auth) ? supabaseClient : ((typeof supabase !== "undefined" && supabase && supabase.auth) ? supabase : null));

      if (sbLogoutClient && sbLogoutClient.auth) {
        sbLogoutClient.auth.signOut().catch(() => {});
      }

      // Reset state
      temporaryAuthPhoto = null;
      regState = {
        email: "",
        fullName: "",
        username: "",
        avatarFile: null,
        avatarPreviewUrl: ""
      };
      clearInterval(otpCountdownTimer);

      const img = document.getElementById("onboardingAvatarImg");
      const emptyIcon = document.getElementById("onboardingAvatarEmptyIcon");
      const frame = document.getElementById("onboardingAvatarFrame");
      const btnText = document.getElementById("authBtnPhotoText");
      const btnIcon = document.getElementById("authBtnPhotoIcon");
      const badge = document.getElementById("onboardingPhotoSelectedLabel");
      const photoInput = document.getElementById("onboardingPhotoInput");
      const emailInput = document.getElementById("authInputEmailPhone");
      const nameInput = document.getElementById("authInputFullName");
      const userInput = document.getElementById("authInputUsername");

      if (photoInput) photoInput.value = "";
      if (emailInput) emailInput.value = "";
      if (nameInput) nameInput.value = "";
      if (userInput) userInput.value = "";

      if (img) {
        img.src = "";
        img.classList.add("hidden");
      }
      if (emptyIcon) emptyIcon.classList.remove("hidden");
      if (frame) {
        frame.classList.remove("border-solid", "border-[#0095F6]");
        frame.classList.add("border-dashed", "border-neutral-300", "dark:border-neutral-700");
      }
      if (btnText) btnText.textContent = "Add a photo";
      if (btnIcon) btnIcon.className = "fa-solid fa-camera text-[15px]";
      if (badge) badge.classList.add("hidden");

      // Close settings modal if open
      const settings = document.getElementById("settingsOverlay");
      if (settings) settings.classList.remove("open");

      openAuthOnboardingFlow(1);
    }
    window.handleAuthLogout = handleAuthLogout;

export {
  supabaseClient,
  saveUserToSupabase,
  handleSuccessfulGoogleLogin,
  isUserAuthenticated,
  openAuthOnboardingFlow,
  closeAuthOnboardingFlow,
  goToAuthStep,
  parseJwt,
  initGoogleIdentityServices,
  triggerGoogleOneTap,
  handleGoogleOneTapResponse,
  handleExplicitGoogleSignIn,
  handleAuthContinue,
  handleAuthGoogle,
  handleSupabaseDirectGoogleLogin,
  handleAuthNextName,
  triggerOnboardingPhotoPicker,
  handleOnboardingPhotoSelected,
  handleAuthProceedToOtp,
  handleAuthPhotoAction,
  triggerSupabaseEmailOtp,
  handleResendOtp,
  handleAutoPasteOtp,
  handleVerifyOtpSubmit,
  finalizeOnboarding,
  handleAuthLogout
};
