/**
 * Lion Football Academy - PWA Utilities
 * Provides offline detection, installation helpers, and background sync
 */

// PWA Installation State
let deferredPrompt = null;
let isInstalled = false;

// Network status
let isOnline = navigator.onLine;
let networkStatus = 'online';

// Service Worker registration
let swRegistration = null;

// Offline queue for data sync
const offlineQueue = [];

/**
 * Initialize PWA functionality
 */
export function initializePWA() {
  console.log('🦁 Initializing Lion FA PWA utilities...');
  
  // Register service worker
  registerServiceWorker();
  
  // Setup network monitoring
  setupNetworkMonitoring();
  
  // Setup installation detection
  setupInstallationDetection();
  
  // Setup push notifications
  setupPushNotifications();
  
  // Setup background sync
  setupBackgroundSync();
  
  // Setup periodic sync
  setupPeriodicSync();
  
  console.log('✅ PWA utilities initialized');
}

/**
 * Service Worker Registration
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      swRegistration = registration;
      console.log('✅ Service Worker registered:', registration.scope);
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 New Service Worker installing...');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 New Service Worker ready');
            showUpdateAvailableNotification();
          }
        });
      });
      
      return registration;
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return null;
    }
  } else {
    console.warn('⚠️ Service Workers not supported');
    return null;
  }
}

/**
 * Network Status Monitoring
 */
function setupNetworkMonitoring() {
  // Initial status
  updateNetworkStatus();
  
  // Listen for network changes
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Periodic connectivity check
  setInterval(checkConnectivity, 30000); // Check every 30 seconds
}

function updateNetworkStatus() {
  const wasOnline = isOnline;
  isOnline = navigator.onLine;
  
  if (isOnline && !wasOnline) {
    handleOnline();
  } else if (!isOnline && wasOnline) {
    handleOffline();
  }
}

function handleOnline() {
  isOnline = true;
  networkStatus = 'online';
  console.log('🌐 Back online - syncing data...');
  
  // Trigger background sync
  triggerBackgroundSync();
  
  // Show online notification
  showNetworkStatusNotification('online');
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('pwa:online'));
}

function handleOffline() {
  isOnline = false;
  networkStatus = 'offline';
  console.log('📴 Gone offline - enabling offline mode...');
  
  // Show offline notification
  showNetworkStatusNotification('offline');
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('pwa:offline'));
}

async function checkConnectivity() {
  try {
    const response = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-cache'
    });
    
    if (response.ok) {
      networkStatus = 'online';
      if (!isOnline) {
        handleOnline();
      }
    } else {
      networkStatus = 'limited';
    }
  } catch (error) {
    networkStatus = 'offline';
    if (isOnline) {
      handleOffline();
    }
  }
}

/**
 * PWA Installation Detection and Prompts
 */
function setupInstallationDetection() {
  // Check if already installed
  checkInstallationStatus();
  
  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', handleInstallPrompt);
  
  // Listen for app installed
  window.addEventListener('appinstalled', handleAppInstalled);
}

function checkInstallationStatus() {
  // Check if running in standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    isInstalled = true;
    console.log('✅ PWA is installed and running in standalone mode');
  }
  
  // Check if running as installed PWA
  if (window.navigator.standalone === true) {
    isInstalled = true;
    console.log('✅ PWA is installed (iOS)');
  }
}

function handleInstallPrompt(event) {
  console.log('📱 Install prompt available');
  event.preventDefault();
  deferredPrompt = event;
  
  // Dispatch custom event to show install button
  window.dispatchEvent(new CustomEvent('pwa:installable'));
}

function handleAppInstalled(event) {
  console.log('✅ PWA installed successfully');
  isInstalled = true;
  deferredPrompt = null;
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('pwa:installed'));
  
  // Show success notification
  showInstallSuccessNotification();
}

/**
 * Show Installation Prompt
 */
export async function showInstallPrompt() {
  if (!deferredPrompt) {
    console.warn('⚠️ No install prompt available');
    return { outcome: 'dismissed', reason: 'no-prompt' };
  }
  
  try {
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for user response
    const choiceResult = await deferredPrompt.userChoice;
    console.log('📱 Install prompt result:', choiceResult.outcome);
    
    // Clean up
    deferredPrompt = null;
    
    return choiceResult;
    
  } catch (error) {
    console.error('❌ Install prompt failed:', error);
    return { outcome: 'dismissed', reason: 'error' };
  }
}

/**
 * Check if PWA is installable
 */
export function isInstallable() {
  return deferredPrompt !== null;
}

/**
 * Check if PWA is installed
 */
export function isPWAInstalled() {
  return isInstalled;
}

/**
 * Get network status
 */
export function getNetworkStatus() {
  return {
    online: isOnline,
    status: networkStatus
  };
}

/**
 * Push Notifications Setup
 */
async function setupPushNotifications() {
  if (!('Notification' in window) || !swRegistration) {
    console.warn('⚠️ Push notifications not supported');
    return;
  }
  
  try {
    // Check current permission status
    const permission = await Notification.requestPermission();
    console.log('🔔 Notification permission:', permission);
    
    if (permission === 'granted') {
      await subscribeToPushNotifications();
    }
    
  } catch (error) {
    console.error('❌ Push notification setup failed:', error);
  }
}

/**
 * Subscribe to Push Notifications
 */
export async function subscribeToPushNotifications() {
  if (!swRegistration) {
    console.error('❌ Service Worker not registered');
    return null;
  }
  
  try {
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: await getVAPIDKey()
    });
    
    console.log('✅ Push subscription created');
    
    // Send subscription to server
    await sendSubscriptionToServer(subscription);
    
    return subscription;
    
  } catch (error) {
    console.error('❌ Push subscription failed:', error);
    return null;
  }
}

/**
 * Get VAPID key from server
 */
async function getVAPIDKey() {
  try {
    const response = await fetch('/api/push/vapid-key');
    const data = await response.json();
    return data.key;
  } catch (error) {
    console.error('❌ Failed to get VAPID key:', error);
    // Fallback key (should be replaced with actual key)
    return 'BEl62iUYgUivxIkv69yViEuiBIa40HI80YmqRcBXaLRw4wdlYdE_MF8hf4kXpJNNwqr03HiS2Vl_l9kNRVNF8D8';
  }
}

/**
 * Send subscription to server
 */
async function sendSubscriptionToServer(subscription) {
  try {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription)
    });
    
    console.log('✅ Subscription sent to server');
    
  } catch (error) {
    console.error('❌ Failed to send subscription to server:', error);
  }
}

/**
 * Background Sync Setup
 */
function setupBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
    console.warn('⚠️ Background Sync not supported');
    return;
  }
  
  console.log('✅ Background Sync available');
}

/**
 * Trigger Background Sync
 */
export async function triggerBackgroundSync(tag = 'general-sync') {
  if (!swRegistration) {
    console.warn('⚠️ Service Worker not registered');
    return;
  }
  
  if (!('sync' in swRegistration)) {
    console.warn('⚠️ Background Sync not supported');
    return;
  }
  
  try {
    await swRegistration.sync.register(tag);
    console.log(`🔄 Background sync registered: ${tag}`);
  } catch (error) {
    console.error('❌ Background sync registration failed:', error);
  }
}

/**
 * Queue data for offline sync
 */
export function queueForSync(data, type = 'general') {
  const queueItem = {
    id: generateId(),
    type,
    data,
    timestamp: Date.now(),
    retries: 0
  };
  
  offlineQueue.push(queueItem);
  
  // Store in IndexedDB
  storeInIndexedDB(`pending${type.charAt(0).toUpperCase() + type.slice(1)}`, queueItem);
  
  console.log(`📦 Queued for sync: ${type}`, queueItem);
  
  // Try to sync immediately if online
  if (isOnline) {
    triggerBackgroundSync(`${type}-sync`);
  }
}

/**
 * Periodic Sync Setup (for browsers that support it)
 */
async function setupPeriodicSync() {
  if (!swRegistration || !('periodicSync' in swRegistration)) {
    console.warn('⚠️ Periodic Sync not supported');
    return;
  }
  
  try {
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    
    if (status.state === 'granted') {
      await swRegistration.periodicSync.register('notification-sync', {
        minInterval: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      console.log('✅ Periodic sync registered');
    }
    
  } catch (error) {
    console.error('❌ Periodic sync setup failed:', error);
  }
}

/**
 * IndexedDB helper functions
 */
async function storeInIndexedDB(storeName, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LionFA_OfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const addRequest = store.add(data);
      
      addRequest.onsuccess = () => resolve(addRequest.result);
      addRequest.onerror = () => reject(addRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Notification helpers
 */
function showNetworkStatusNotification(status) {
  const message = status === 'online' 
    ? 'Back online! Data will sync automatically.' 
    : 'You\'re offline. Some features may be limited.';
    
  const icon = status === 'online' ? '🌐' : '📴';
  
  // Show browser notification if permission granted
  if (Notification.permission === 'granted') {
    new Notification(`${icon} Lion Football Academy`, {
      body: message,
      icon: '/icons/android-icon-96x96.png',
      tag: 'network-status',
      silent: status === 'offline'
    });
  }
  
  // Dispatch custom event for UI updates
  window.dispatchEvent(new CustomEvent('pwa:network-status', {
    detail: { status, message }
  }));
}

function showUpdateAvailableNotification() {
  if (Notification.permission === 'granted') {
    new Notification('🔄 Update Available', {
      body: 'A new version of Lion Football Academy is ready. Refresh to update.',
      icon: '/icons/android-icon-96x96.png',
      tag: 'app-update',
      requireInteraction: true,
      actions: [
        { action: 'update', title: 'Update Now' },
        { action: 'dismiss', title: 'Later' }
      ]
    });
  }
  
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('pwa:update-available'));
}

function showInstallSuccessNotification() {
  if (Notification.permission === 'granted') {
    new Notification('✅ Installation Complete', {
      body: 'Lion Football Academy is now installed on your device!',
      icon: '/icons/android-icon-96x96.png',
      tag: 'install-success'
    });
  }
}

/**
 * Utility functions
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Apply PWA update
 */
export function applyPWAUpdate() {
  if (swRegistration && swRegistration.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}

/**
 * Get PWA status
 */
export function getPWAStatus() {
  return {
    installed: isInstalled,
    installable: isInstallable(),
    online: isOnline,
    networkStatus,
    serviceWorkerReady: !!swRegistration,
    notificationsEnabled: Notification.permission === 'granted'
  };
}

/**
 * Manual sync trigger for specific data types
 */
export async function syncAttendanceData() {
  await triggerBackgroundSync('attendance-sync');
}

export async function syncMessages() {
  await triggerBackgroundSync('message-sync');
}

export async function syncNotifications() {
  await triggerBackgroundSync('notification-sync');
}

// Initialize PWA when module loads
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePWA);
  } else {
    initializePWA();
  }
}

export default {
  initializePWA,
  showInstallPrompt,
  isInstallable,
  isPWAInstalled,
  getNetworkStatus,
  subscribeToPushNotifications,
  triggerBackgroundSync,
  queueForSync,
  applyPWAUpdate,
  getPWAStatus,
  syncAttendanceData,
  syncMessages,
  syncNotifications
};