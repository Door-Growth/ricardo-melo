(() => {
  "use strict";

  const CONFIG = {
    ga4: "G-3435WNQZB1",
    ads: "AW-17993217235",
    meta: "1655339665813470",
    siteConversion: "AW-17993217235/o71fCM35zYodENPp6oND",
    irConversion: "AW-17993217235/aA0ICMr5zYodENPp6oND",
    whatsapp: "5511989364496",
    consentKey: "ricardo_melo_tracking_consent_v1",
    attributionKey: "ricardo_melo_campaign_attribution",
    anonymousKey: "ricardo_melo_anonymous_id",
    sessionKey: "ricardo_melo_session_id",
    consentDuration: 180 * 24 * 60 * 60 * 1000,
    leadDuration: 24 * 60 * 60 * 1000
  };

  const CAMPAIGN_KEYS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id",
    "gclid", "gbraid", "wbraid", "fbclid", "msclkid", "ttclid"
  ];
  const SITE_PAGES = {
    "": ["home", "Home"],
    "index.html": ["home", "Home"],
    "escritorio": ["escritorio", "Escritório"],
    "atuacao": ["atuacao", "Áreas de Atuação"],
    "equipe": ["equipe", "Equipe"],
    "noticias": ["noticias", "Notícias"],
    "contato": ["contato", "Contato"]
  };
  const pathParts = location.pathname.split("/").filter(Boolean);
  const isIrPage = pathParts.includes("isencao-ir-aposentados");
  const siteGroup = isIrPage ? "isencao_ir" : "institutional";
  const routeSegment = pathParts.at(-1) === "index.html" ? (pathParts.at(-2) || "") : (pathParts.at(-1) || "");
  const pageInfo = SITE_PAGES[routeSegment] || (pathParts.length <= 1 || pathParts.at(-1) === "index.html" ? SITE_PAGES[""] : ["pagina", document.title]);
  const pageSlug = isIrPage ? "isencao_ir" : pageInfo[0];
  const pageName = isIrPage ? "LP Isenção IR" : pageInfo[1];
  const leadPrefix = isIrPage ? "RME-IR" : "RME-ST";
  const leadStorageKey = isIrPage ? "ricardo_melo_lead_id_isencao_ir" : "ricardo_melo_lead_id_site";
  const debugRequested = new URLSearchParams(location.search).get("debug_mode") === "true";
  const debugKey = "ricardo_melo_tracking_debug";
  const debug = debugRequested || readSession(debugKey) === "true";
  const sentFaqs = new Set();
  const viewedPractices = new WeakSet();
  const scrollMilestones = new Set();
  const configuredGoogleIds = new Set();
  const gaIdentifiers = {};
  let practiceObserver;
  let currentScrollPercent = 0;
  let currentConsent = readConsent();
  let googleInitialized = false;
  let metaInitialized = false;
  let pageViewSent = false;

  if (debugRequested && (currentConsent?.analytics || currentConsent?.marketing)) writeSession(debugKey, "true");

  function log(message, details) {
    if (debug) console.info(`[Tracking] ${message}`, ...(details === undefined ? [] : [details]));
  }

  function safeSessionStorage() {
    try { return window.sessionStorage; } catch { return null; }
  }

  function safeLocalStorage() {
    try { return window.localStorage; } catch { return null; }
  }

  function readSession(key) {
    try { return safeSessionStorage()?.getItem(key) || null; } catch { return null; }
  }

  function writeSession(key, value) {
    try { safeSessionStorage()?.setItem(key, value); } catch { /* Storage is optional. */ }
  }

  function removeSession(key) {
    try { safeSessionStorage()?.removeItem(key); } catch { /* Storage is optional. */ }
  }

  function randomCode(length = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(length);
    try { crypto.getRandomValues(bytes); } catch {
      for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, byte => chars[Math.floor(byte * chars.length / 256)]).join("");
  }

  let leadId = `${leadPrefix}-${randomCode()}`;
  log("Page detected", { site_group: siteGroup, page_slug: pageSlug, lead_id: leadId });
  log("Lead ID", leadId);

  function readConsent() {
    try {
      const value = JSON.parse(safeLocalStorage()?.getItem(CONFIG.consentKey) || "null");
      if (!value) return null;
      if (!Number.isFinite(value.expires_at) || value.expires_at < Date.now()) {
        safeLocalStorage()?.removeItem(CONFIG.consentKey);
        clearOptionalData();
        return null;
      }
      return { analytics: value.analytics === true, marketing: value.marketing === true };
    } catch { return null; }
  }

  function saveConsent(analytics, marketing) {
    const previousConsent = currentConsent;
    currentConsent = { analytics: analytics === true, marketing: marketing === true };
    try {
      safeLocalStorage()?.setItem(CONFIG.consentKey, JSON.stringify({
        ...currentConsent,
        saved_at: Date.now(),
        expires_at: Date.now() + CONFIG.consentDuration
      }));
    } catch { /* The current choice still applies for this page view. */ }

    if (currentConsent.analytics || currentConsent.marketing) {
      persistCampaignParams();
      initializeIdentifiers();
      loadPermittedTags();
      if (currentConsent.analytics) {
        if (!previousConsent?.analytics) {
          [25, 50, 75].forEach(milestone => {
            if (currentScrollPercent >= milestone) scrollMilestones.add(milestone);
          });
        }
        setupPracticeViews();
      }
      if (previousConsent?.analytics && !currentConsent.analytics) clearAnalyticsData();
      if (previousConsent?.marketing && !currentConsent.marketing) clearMarketingData();
    } else {
      clearOptionalData();
      updateGoogleConsent();
    }
    renderConsentState();
  }

  function initializeIdentifiers() {
    const local = safeLocalStorage();
    const session = safeSessionStorage();
    try {
      const storedLeadId = session?.getItem(leadStorageKey);
      if (storedLeadId) leadId = storedLeadId;
      else session?.setItem(leadStorageKey, leadId);
      if (local && !local.getItem(CONFIG.anonymousKey)) local.setItem(CONFIG.anonymousKey, randomCode(32));
      if (session && !session.getItem(CONFIG.sessionKey)) session.setItem(CONFIG.sessionKey, randomCode(32));
    } catch { /* Anonymous identifiers are optional. */ }
  }

  function clearOptionalData() {
    const local = safeLocalStorage();
    const session = safeSessionStorage();
    try { local?.removeItem(CONFIG.anonymousKey); } catch { /* Storage is optional. */ }
    try {
      session?.removeItem(CONFIG.attributionKey);
      session?.removeItem(CONFIG.sessionKey);
      session?.removeItem(leadStorageKey);
      session?.removeItem(debugKey);
    } catch { /* Storage is optional. */ }
    CAMPAIGN_KEYS.forEach(removeSession);
    clearAnalyticsData();
    clearMarketingData();
  }

  function clearAnalyticsData() {
    ["_ga", "_gid", `_ga_${CONFIG.ga4.slice(2)}`].forEach(clearCookie);
    delete gaIdentifiers.client_id;
    delete gaIdentifiers.session_id;
  }

  function clearMarketingData() {
    ["_gcl_au", "_gcl_aw", "_gcl_gs", "_fbp", "_fbc"].forEach(clearCookie);
  }

  function clearCookie(name) {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    if (location.hostname.includes(".")) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${location.hostname}; SameSite=Lax`;
    }
  }

  function campaignValues() {
    const values = {};
    const params = new URLSearchParams(location.search);
    CAMPAIGN_KEYS.forEach(key => {
      const current = params.get(key);
      const stored = readSession(key);
      const value = current || stored;
      if (value) values[key] = value.slice(0, 200);
    });
    return values;
  }

  function persistCampaignParams() {
    const values = campaignValues();
    Object.entries(values).forEach(([key, value]) => writeSession(key, value));
    try {
      safeSessionStorage()?.setItem(CONFIG.attributionKey, JSON.stringify(values));
    } catch { /* Attribution is optional. */ }
    if (Object.keys(values).length) log("Campaign params restored", values);
  }

  function anonymousId() {
    try { return safeLocalStorage()?.getItem(CONFIG.anonymousKey) || undefined; } catch { return undefined; }
  }

  function sessionId() {
    return readSession(CONFIG.sessionKey) || undefined;
  }

  function readCookie(name) {
    try {
      const prefix = `${name}=`;
      const item = document.cookie.split(";").map(value => value.trim()).find(value => value.startsWith(prefix));
      return item ? decodeURIComponent(item.slice(prefix.length)) : undefined;
    } catch { return undefined; }
  }

  function deviceDetails() {
    const ua = navigator.userAgent || "";
    const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : undefined;
    const operatingSystem = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : undefined;
    const deviceType = /iPad|Tablet/.test(ua) ? "tablet" : /Mobi|Android/.test(ua) ? "mobile" : ua ? "desktop" : undefined;
    return { browser, operating_system: operatingSystem, device_type: deviceType };
  }

  function safeReferrer() {
    if (!document.referrer) return undefined;
    try {
      const value = new URL(document.referrer);
      return `${value.origin}${value.pathname}`;
    } catch { return undefined; }
  }

  function pageLocation() {
    const url = new URL(location.href);
    const allowed = campaignValues();
    url.search = "";
    Object.entries(allowed).forEach(([key, value]) => url.searchParams.set(key, value));
    url.hash = "";
    return url.href;
  }

  function baseParams() {
    const values = {
      client_name: "Ricardo Melo Advogados",
      site_group: siteGroup,
      page_type: isIrPage ? "landing_page" : "institutional",
      page_slug: pageSlug,
      page_name: pageName,
      lead_id: leadId,
      page_location: pageLocation(),
      page_path: `${location.pathname}${location.hash}`,
      page_title: document.title,
      page_referrer: safeReferrer(),
      anonymous_id: anonymousId(),
      session_id: sessionId(),
      ...deviceDetails(),
      screen_width: window.screen?.width,
      screen_height: window.screen?.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      language: navigator.language,
      timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } })(),
      connection_type: navigator.connection?.effectiveType,
      ga_client_id: gaIdentifiers.client_id,
      ga_session_id: gaIdentifiers.session_id
    };

    Object.assign(values, campaignValues());
    if (siteGroup === "isencao_ir") {
      values.product_name = "Isenção de Imposto de Renda para aposentados";
      values.product_slug = "isencao_ir_aposentados";
    }
    if (currentConsent?.marketing) {
      values._fbp = readCookie("_fbp");
      values._fbc = readCookie("_fbc");
    }
    return values;
  }

  function cleanParams(values) {
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== ""));
  }

  function locationFor(element) {
    if (element.closest(".floating-whatsapp")) return "floating_whatsapp";
    if (element.closest(".final-cta")) return "final_cta";
    if (element.closest("#main-nav, .site-nav")) return "nav";
    if (element.closest(".header, .site-header")) return "header";
    if (element.closest(".hero, .home-hero")) return "hero";
    if (element.closest("#documentos")) return "documentos";
    if (element.closest(".dark-section")) return "valores_receber";
    if (element.closest(".authority")) return "autoridade";
    if (element.closest(".welcome")) return "welcome";
    if (element.closest(".contact-layout")) return "contact";
    if (element.closest(".footer, .site-footer")) return "footer";
    if (element.closest(".cta-section")) return "cta_section";
    if (element.closest("main")) return "content";
    return "content";
  }

  function buttonParams(element) {
    const destination = element.href ? new URL(element.href, location.href) : null;
    const values = {
      button_text: (element.innerText || element.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 100),
      button_location: locationFor(element),
      button_id: element.id || undefined,
      ...baseParams()
    };
    if (destination && destination.origin === location.origin) values.destination_url = `${destination.origin}${destination.pathname}${destination.hash}`;
    return cleanParams(values);
  }

  function ensureGoogleTag() {
    if (!currentConsent?.analytics && !currentConsent?.marketing) return;
    if (!googleInitialized) {
      googleInitialized = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
      window.gtag("consent", "default", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
      window.gtag("js", new Date());
      const script = document.createElement("script");
      script.async = true;
      script.id = "rma-google-tag";
      script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4}`;
      document.head.appendChild(script);
      script.addEventListener("load", captureGoogleIds, { once: true });
    }

    updateGoogleConsent();
    if (currentConsent.analytics && !configuredGoogleIds.has(CONFIG.ga4)) {
      window.gtag("config", CONFIG.ga4, { send_page_view: false });
      configuredGoogleIds.add(CONFIG.ga4);
      if (!pageViewSent) {
        pageViewSent = true;
        sendGa("page_view", cleanParams(baseParams()));
      }
    }
    if (currentConsent.marketing && !configuredGoogleIds.has(CONFIG.ads)) {
      window.gtag("config", CONFIG.ads);
      configuredGoogleIds.add(CONFIG.ads);
    }
  }

  function updateGoogleConsent() {
    if (!googleInitialized || typeof window.gtag !== "function") return;
    window.gtag("consent", "update", {
      analytics_storage: currentConsent?.analytics ? "granted" : "denied",
      ad_storage: currentConsent?.marketing ? "granted" : "denied",
      ad_user_data: currentConsent?.marketing ? "granted" : "denied",
      ad_personalization: currentConsent?.marketing ? "granted" : "denied"
    });
  }

  function captureGoogleIds() {
    if (typeof window.gtag !== "function" || !currentConsent?.analytics) return;
    ["client_id", "session_id"].forEach(key => {
      window.gtag("get", CONFIG.ga4, key, value => {
        if (value) gaIdentifiers[key] = value;
      });
    });
  }

  function loadMetaPixel() {
    if (!currentConsent?.marketing || metaInitialized) return;
    metaInitialized = true;
    const fbq = window.fbq || function fbq() {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    if (!window.fbq) {
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];
      window.fbq = fbq;
    }
    const script = document.createElement("script");
    script.async = true;
    script.id = "rma-meta-pixel";
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
    window.fbq("init", CONFIG.meta);
    window.fbq("track", "PageView");
    log("Meta event sent", { event: "PageView" });
  }

  function loadPermittedTags() {
    ensureGoogleTag();
    loadMetaPixel();
  }

  function sendGa(eventName, params) {
    if (!currentConsent?.analytics || typeof window.gtag !== "function") return;
    const values = cleanParams({ ...baseParams(), ...params });
    window.gtag("event", eventName, values);
    log("GA4 event sent", { event: eventName, ...values });
  }

  function sendMeta(eventName, params) {
    if (!currentConsent?.marketing || typeof window.fbq !== "function") return;
    const values = cleanParams({ ...baseParams(), ...params });
    window.fbq("trackCustom", eventName, values);
    log("Meta event sent", { event: eventName, ...values });
  }

  function campaignAttribution() {
    return cleanParams(campaignValues());
  }

  function isWhatsApp(url) {
    return /(^|\.)api\.whatsapp\.com$|(^|\.)wa\.me$/i.test(url.hostname);
  }

  function isMap(url) {
    return /(^|\.)maps\.google\.|(^|\.)goo\.gl$/i.test(url.hostname) || /google\.[^/]+\/maps/i.test(url.href);
  }

  function makeWhatsAppUrl(anchor) {
    const text = isIrPage
      ? `Olá! Gostaria de saber mais sobre a isenção de Imposto de Renda para aposentados.\n\nRef: ${leadId}`
      : `Olá! Gostaria de mais informações sobre os serviços do escritório.\n\nRef: ${leadId}`;
    const url = new URL("https://api.whatsapp.com/send");
    url.searchParams.set("phone", CONFIG.whatsapp);
    url.searchParams.set("text", text);
    anchor.href = url.href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    log("WhatsApp URL", { phone: CONFIG.whatsapp, lead_id: leadId });
  }

  function prepareWhatsAppLinks() {
    document.querySelectorAll("a.whatsapp-btn, a[href*='api.whatsapp.com'], a[href*='wa.me']").forEach(anchor => makeWhatsAppUrl(anchor));
  }

  function conversionWasSent() {
    const key = isIrPage ? "ricardo_melo_ir_lead_last_sent" : "ricardo_melo_site_lead_last_sent";
    const store = safeLocalStorage();
    try {
      const lastSent = Number(store?.getItem(key) || 0);
      if (lastSent && Date.now() - lastSent < CONFIG.leadDuration) return true;
      store?.setItem(key, String(Date.now()));
    } catch { /* The current page still prevents repeated clicks in memory below. */ }
    return false;
  }

  let memoryLeadSent = false;
  function trackWhatsApp(anchor) {
    const params = buttonParams(anchor);
    if (!currentConsent?.analytics && !currentConsent?.marketing) return;
    if (memoryLeadSent || conversionWasSent()) {
      memoryLeadSent = true;
      sendGa("whatsapp_repeat_click", params);
      log("Duplicate conversion blocked", { site_group: siteGroup, page_path: location.pathname, lead_id: leadId });
      return;
    }
    memoryLeadSent = true;
    const eventName = isIrPage ? "lead_lp_isencao_ir" : "lead_site_whatsapp";
    sendGa(eventName, params);
    if (currentConsent?.marketing) {
      const sendTo = isIrPage ? CONFIG.irConversion : CONFIG.siteConversion;
      window.gtag("event", "conversion", {
        send_to: sendTo,
        transaction_id: leadId,
        ...params
      });
      log("Google Ads conversion sent", { send_to: sendTo, lead_id: leadId, button_location: params.button_location });
      sendMeta(eventName, params);
    }
  }

  function trackSecondary(eventName, params) {
    sendGa(eventName, params);
  }

  function trackClick(event) {
    const anchor = event.target.closest?.("a[href]");
    if (!anchor) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return; }
    if (isWhatsApp(url)) {
      makeWhatsAppUrl(anchor);
      trackWhatsApp(anchor);
      return;
    }
    const params = buttonParams(anchor);
    if (url.protocol === "tel:") {
      trackSecondary("click_phone", params);
      return;
    }
    if (url.protocol === "mailto:") {
      trackSecondary("click_email", params);
      return;
    }
    if (isMap(url)) {
      trackSecondary("click_maps", params);
      return;
    }
    if (url.origin === location.origin && url.pathname.includes("/isencao-ir-aposentados/")) {
      sendGa("view_isencao_ir", {
        source_page: pageSlug,
        button_text: params.button_text,
        button_location: params.button_location,
        destination_url: `${url.origin}${url.pathname}`,
        ...baseParams()
      });
    }
    if (url.origin === location.origin && anchor.matches(".button, .btn, .text-link, .area-card") && !anchor.closest(".site-nav, .nav")) {
      trackSecondary("cta_click", params);
    }
  }

  function setupPracticeViews() {
    if (practiceObserver) practiceObserver.disconnect();
    if (!currentConsent?.analytics) return;
    const cards = document.querySelectorAll("[data-practice-area]");
    if (!cards.length) return;
    if (!("IntersectionObserver" in window)) {
      cards.forEach(card => sendPracticeView(card));
      return;
    }
    practiceObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        sendPracticeView(entry.target);
        practiceObserver.unobserve(entry.target);
      }
    }), { threshold: 0.35 });
    cards.forEach(card => practiceObserver.observe(card));
  }

  function sendPracticeView(element) {
    if (!currentConsent?.analytics || viewedPractices.has(element)) return;
    viewedPractices.add(element);
    const area = element.dataset.practiceArea;
    if (area) sendGa("view_practice_area", { practice_area: area, ...baseParams() });
  }

  function setupScrollTracking() {
    let scheduled = false;
    window.addEventListener("scroll", () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        if (total <= 0) return;
        const percent = Math.floor(window.scrollY / total * 100);
        currentScrollPercent = percent;
        if (!currentConsent?.analytics) return;
        [25, 50, 75].forEach(milestone => {
          if (percent >= milestone && !scrollMilestones.has(milestone)) {
            scrollMilestones.add(milestone);
            sendGa("scroll", { percent_scrolled: milestone, ...baseParams() });
          }
        });
      });
    }, { passive: true });
  }

  function setupFaqTracking() {
    document.addEventListener("click", event => {
      const button = event.target.closest?.(".faq button");
      if (!button) return;
      const isOpen = button.getAttribute("aria-expanded") === "true";
      if (!isOpen) return;
      const question = button.textContent.replace(/[+−-]/g, "").replace(/\s+/g, " ").trim();
      if (!currentConsent?.analytics || !question || sentFaqs.has(question)) return;
      sentFaqs.add(question);
      sendGa("faq_open", { faq_question: question, page_slug: "isencao_ir", ...baseParams() });
    });
  }

  function buildConsentUi() {
    const manager = document.createElement("button");
    manager.type = "button";
    manager.className = "rma-cookie-manager";
    manager.textContent = "Preferências de cookies";
    manager.addEventListener("click", () => showConsentBanner(true));
    document.body.appendChild(manager);

    const banner = document.createElement("section");
    banner.className = "rma-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "rma-consent-title");
    banner.hidden = true;
    banner.innerHTML = `
      <div class="rma-consent-copy">
        <h2 id="rma-consent-title">Privacidade e cookies</h2>
        <p>Com sua autorização, usamos medição de audiência (Google Analytics) e tecnologias de publicidade (Google Ads e Meta Pixel). Você pode aceitar, recusar ou escolher as categorias. Sua escolha pode ser alterada depois em “Preferências de cookies”.</p>
      </div>
      <div class="rma-consent-actions">
        <button type="button" data-consent="preferences">Preferências</button>
        <button type="button" data-consent="reject">Recusar opcionais</button>
        <button type="button" data-consent="accept">Aceitar todos</button>
      </div>
      <div class="rma-consent-preferences" hidden>
        <label><input type="checkbox" name="analytics"> Medição de audiência (Google Analytics 4)</label>
        <label><input type="checkbox" name="marketing"> Publicidade (Google Ads e Meta Pixel)</label>
        <div class="rma-consent-actions"><button type="button" data-consent="save">Salvar preferências</button><button type="button" data-consent="cancel">Voltar</button></div>
      </div>`;

    banner.addEventListener("click", event => {
      const action = event.target.closest?.("[data-consent]")?.dataset.consent;
      if (action === "accept") saveConsent(true, true);
      if (action === "reject") saveConsent(false, false);
      if (action === "preferences") {
        const panel = banner.querySelector(".rma-consent-preferences");
        panel.hidden = false;
        panel.querySelector('[name="analytics"]').checked = currentConsent?.analytics === true;
        panel.querySelector('[name="marketing"]').checked = currentConsent?.marketing === true;
      }
      if (action === "cancel") banner.querySelector(".rma-consent-preferences").hidden = true;
      if (action === "save") {
        saveConsent(
          banner.querySelector('[name="analytics"]').checked,
          banner.querySelector('[name="marketing"]').checked
        );
      }
    });

    document.body.appendChild(banner);
    consentBanner = banner;
    if (!currentConsent) showConsentBanner(false);
    else {
      if (currentConsent.analytics || currentConsent.marketing) {
        persistCampaignParams();
        initializeIdentifiers();
        loadPermittedTags();
      }
      renderConsentState();
    }
    return banner;
  }

  let consentBanner;
  function showConsentBanner(openPreferences) {
    if (!consentBanner) return;
    consentBanner.hidden = false;
    consentBanner.querySelector(".rma-consent-preferences").hidden = !openPreferences;
    if (openPreferences) {
      consentBanner.querySelector('[name="analytics"]').checked = currentConsent?.analytics === true;
      consentBanner.querySelector('[name="marketing"]').checked = currentConsent?.marketing === true;
    }
  }

  function renderConsentState() {
    if (!consentBanner) return;
    consentBanner.hidden = true;
    consentBanner.querySelector(".rma-consent-preferences").hidden = true;
  }

  if (document.body) {
    prepareWhatsAppLinks();
    document.addEventListener("click", trackClick);
    setupPracticeViews();
    setupScrollTracking();
    setupFaqTracking();
    consentBanner = buildConsentUi();
  }

  if (debug) {
    window.rmaTracking = {
      config: { ...CONFIG },
      page: { site_group: siteGroup, page_slug: pageSlug, page_name: pageName },
      lead_id: leadId,
      consent: () => ({ ...currentConsent }),
      params: () => cleanParams(baseParams())
    };
  }
})();

