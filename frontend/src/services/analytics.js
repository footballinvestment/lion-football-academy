/**
 * Google Analytics 4 and User Tracking Service
 * Lion Football Academy - Comprehensive User Analytics
 */

class AnalyticsService {
  constructor() {
    this.isInitialized = false;
    this.gaId = process.env.REACT_APP_GA_MEASUREMENT_ID;
    this.gtmId = process.env.REACT_APP_GTM_ID;
    this.environment = process.env.REACT_APP_ENV || 'development';
    this.debugMode = this.environment === 'development';
    
    // User properties
    this.userProperties = {
      user_type: null,
      academy_role: null,
      registration_date: null,
      last_login: null
    };

    // Conversion goals
    this.conversionGoals = {
      user_registration: 'user_registration',
      first_login: 'first_login',
      profile_completion: 'profile_completion',
      training_attendance: 'training_attendance',
      qr_scan_success: 'qr_scan_success',
      parent_child_connection: 'parent_child_connection',
      coach_team_creation: 'coach_team_creation',
      performance_view: 'performance_view',
      billing_payment: 'billing_payment',
      announcement_read: 'announcement_read'
    };

    if (this.shouldInitialize()) {
      this.initializeAnalytics();
    }
  }

  // Check if analytics should be initialized
  shouldInitialize() {
    // Don't initialize in development unless explicitly enabled
    if (this.environment === 'development' && !process.env.REACT_APP_ENABLE_ANALYTICS) {
      return false;
    }

    // Check for Do Not Track preference
    if (navigator.doNotTrack === '1') {
      console.log('Analytics disabled due to Do Not Track preference');
      return false;
    }

    // Check for cookie consent (implement your cookie consent logic)
    if (!this.hasAnalyticsConsent()) {
      console.log('Analytics disabled - no user consent');
      return false;
    }

    return !!this.gaId;
  }

  // Initialize Google Analytics 4
  async initializeAnalytics() {
    try {
      // Load gtag script
      await this.loadGtagScript();
      
      // Configure Google Analytics
      this.configureGA4();
      
      // Configure Google Tag Manager if available
      if (this.gtmId) {
        this.configureGTM();
      }

      this.isInitialized = true;
      
      // Track page view for initial load
      this.trackPageView();
      
      console.log('Analytics initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  // Load Google Tag script
  loadGtagScript() {
    return new Promise((resolve, reject) => {
      if (window.gtag) {
        resolve();
        return;
      }

      // Add gtag script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.gaId}`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);

      // Initialize gtag function
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
    });
  }

  // Configure Google Analytics 4
  configureGA4() {
    window.gtag('js', new Date());
    window.gtag('config', this.gaId, {
      debug_mode: this.debugMode,
      send_page_view: false, // We'll send manually
      allow_google_signals: true,
      allow_ad_personalization_signals: this.hasAdsConsent(),
      anonymize_ip: true,
      custom_map: {
        custom_parameter_1: 'user_type',
        custom_parameter_2: 'academy_role'
      }
    });
  }

  // Configure Google Tag Manager
  configureGTM() {
    // GTM implementation
    (function(w,d,s,l,i){
      w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
      j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
      f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer', this.gtmId);
  }

  // Set user properties
  setUserProperties(properties) {
    if (!this.isInitialized) return;

    this.userProperties = { ...this.userProperties, ...properties };
    
    window.gtag('config', this.gaId, {
      user_properties: this.userProperties
    });

    if (this.debugMode) {
      console.log('User properties set:', properties);
    }
  }

  // Set user ID for cross-device tracking
  setUserId(userId) {
    if (!this.isInitialized) return;

    window.gtag('config', this.gaId, {
      user_id: userId
    });

    if (this.debugMode) {
      console.log('User ID set:', userId);
    }
  }

  // Track page view
  trackPageView(pageTitle = null, pagePath = null) {
    if (!this.isInitialized) return;

    const title = pageTitle || document.title;
    const path = pagePath || window.location.pathname + window.location.search;

    window.gtag('event', 'page_view', {
      page_title: title,
      page_location: window.location.href,
      page_path: path,
      ...this.getDefaultEventParams()
    });

    if (this.debugMode) {
      console.log('Page view tracked:', { title, path });
    }
  }

  // Track custom event
  trackEvent(eventName, parameters = {}) {
    if (!this.isInitialized) return;

    const eventParams = {
      ...this.getDefaultEventParams(),
      ...parameters
    };

    window.gtag('event', eventName, eventParams);

    if (this.debugMode) {
      console.log('Event tracked:', eventName, eventParams);
    }
  }

  // Track conversion goal
  trackConversion(goalType, value = null, currency = 'USD') {
    if (!this.isInitialized) return;

    const conversionEvent = this.conversionGoals[goalType];
    if (!conversionEvent) {
      console.warn('Unknown conversion goal:', goalType);
      return;
    }

    const params = {
      ...this.getDefaultEventParams(),
      value: value,
      currency: currency
    };

    window.gtag('event', conversionEvent, params);

    if (this.debugMode) {
      console.log('Conversion tracked:', goalType, params);
    }
  }

  // User registration tracking
  trackUserRegistration(userType, method = 'email') {
    this.trackConversion('user_registration');
    this.trackEvent('sign_up', {
      method: method,
      user_type: userType,
      event_category: 'authentication',
      event_label: 'user_registration'
    });
  }

  // Login tracking
  trackLogin(userType, method = 'email') {
    this.trackEvent('login', {
      method: method,
      user_type: userType,
      event_category: 'authentication',
      event_label: 'user_login'
    });

    // Track first login conversion
    if (this.isFirstLogin()) {
      this.trackConversion('first_login');
    }
  }

  // Training attendance tracking
  trackTrainingAttendance(trainingId, attendanceType, checkInMethod = 'manual') {
    this.trackEvent('training_attendance', {
      training_id: trainingId,
      attendance_type: attendanceType,
      check_in_method: checkInMethod,
      event_category: 'engagement',
      event_label: 'training_attendance'
    });

    if (attendanceType === 'present') {
      this.trackConversion('training_attendance');
    }
  }

  // QR code scanning tracking
  trackQRScan(scanType, success = true, errorType = null) {
    this.trackEvent('qr_scan', {
      scan_type: scanType,
      success: success,
      error_type: errorType,
      event_category: 'interaction',
      event_label: 'qr_scan'
    });

    if (success && scanType === 'attendance') {
      this.trackConversion('qr_scan_success');
    }
  }

  // Performance metrics tracking
  trackPerformanceView(viewType, playerId = null) {
    this.trackEvent('performance_view', {
      view_type: viewType,
      player_id: playerId,
      event_category: 'content',
      event_label: 'performance_analytics'
    });

    this.trackConversion('performance_view');
  }

  // Team creation tracking
  trackTeamCreation(teamType, playerCount) {
    this.trackEvent('team_creation', {
      team_type: teamType,
      player_count: playerCount,
      event_category: 'management',
      event_label: 'team_creation'
    });

    this.trackConversion('coach_team_creation');
  }

  // Parent-child connection tracking
  trackParentChildConnection(connectionMethod) {
    this.trackEvent('parent_child_connection', {
      connection_method: connectionMethod,
      event_category: 'relationship',
      event_label: 'family_connection'
    });

    this.trackConversion('parent_child_connection');
  }

  // Billing and payment tracking
  trackPayment(amount, currency, paymentMethod, itemType) {
    this.trackEvent('purchase', {
      transaction_id: `txn_${Date.now()}`,
      value: amount,
      currency: currency,
      payment_type: paymentMethod,
      item_category: itemType,
      event_category: 'ecommerce',
      event_label: 'payment_success'
    });

    this.trackConversion('billing_payment', amount, currency);
  }

  // Announcement engagement tracking
  trackAnnouncementRead(announcementId, announcementType) {
    this.trackEvent('announcement_read', {
      announcement_id: announcementId,
      announcement_type: announcementType,
      event_category: 'engagement',
      event_label: 'announcement_interaction'
    });

    this.trackConversion('announcement_read');
  }

  // User engagement tracking
  trackUserEngagement(engagementType, duration = null) {
    this.trackEvent('user_engagement', {
      engagement_type: engagementType,
      engagement_time_msec: duration,
      event_category: 'engagement',
      event_label: 'user_interaction'
    });
  }

  // Error tracking
  trackError(errorType, errorMessage, errorPage) {
    this.trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      error_page: errorPage,
      event_category: 'error',
      event_label: 'application_error'
    });
  }

  // Search tracking
  trackSearch(searchTerm, searchCategory, resultsCount) {
    this.trackEvent('search', {
      search_term: searchTerm,
      search_category: searchCategory,
      results_count: resultsCount,
      event_category: 'interaction',
      event_label: 'search_query'
    });
  }

  // Feature usage tracking
  trackFeatureUsage(featureName, featureCategory = 'general') {
    this.trackEvent('feature_usage', {
      feature_name: featureName,
      feature_category: featureCategory,
      event_category: 'feature',
      event_label: 'feature_interaction'
    });
  }

  // Enhanced ecommerce tracking
  trackAddToCart(itemId, itemName, category, quantity, price) {
    this.trackEvent('add_to_cart', {
      currency: 'USD',
      value: price * quantity,
      items: [{
        item_id: itemId,
        item_name: itemName,
        category: category,
        quantity: quantity,
        price: price
      }]
    });
  }

  // Custom dimension tracking
  setCustomDimension(index, value) {
    if (!this.isInitialized) return;

    window.gtag('config', this.gaId, {
      [`custom_parameter_${index}`]: value
    });
  }

  // Get default event parameters
  getDefaultEventParams() {
    return {
      app_name: 'Lion Football Academy',
      app_version: process.env.REACT_APP_VERSION || '1.0.0',
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId()
    };
  }

  // Get or create session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  // Check if user has analytics consent
  hasAnalyticsConsent() {
    // Implement your cookie consent logic
    const consent = localStorage.getItem('analytics_consent');
    return consent === 'true';
  }

  // Check if user has ads consent
  hasAdsConsent() {
    const consent = localStorage.getItem('ads_consent');
    return consent === 'true';
  }

  // Check if this is user's first login
  isFirstLogin() {
    const hasLoggedBefore = localStorage.getItem('has_logged_before');
    if (!hasLoggedBefore) {
      localStorage.setItem('has_logged_before', 'true');
      return true;
    }
    return false;
  }

  // Grant consent for analytics
  grantAnalyticsConsent() {
    localStorage.setItem('analytics_consent', 'true');
    
    if (!this.isInitialized && this.gaId) {
      this.initializeAnalytics();
    }
    
    if (this.isInitialized) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
  }

  // Revoke consent for analytics
  revokeAnalyticsConsent() {
    localStorage.setItem('analytics_consent', 'false');
    
    if (this.isInitialized) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied'
      });
    }
  }

  // Debug information
  getDebugInfo() {
    return {
      initialized: this.isInitialized,
      gaId: this.gaId,
      gtmId: this.gtmId,
      environment: this.environment,
      debugMode: this.debugMode,
      hasConsent: this.hasAnalyticsConsent(),
      userProperties: this.userProperties,
      sessionId: this.getSessionId()
    };
  }

  // Manually trigger analytics initialization (for consent management)
  manualInit() {
    if (!this.isInitialized && this.hasAnalyticsConsent()) {
      this.initializeAnalytics();
    }
  }
}

// Create singleton instance
const analytics = new AnalyticsService();

export default analytics;