/**
 * Lion Football Academy - Service Worker
 * Provides offline functionality, caching, and background sync
 */

const CACHE_NAME = 'lion-fa-v1.0.0';
const STATIC_CACHE = 'lion-fa-static-v1.0.0';
const DYNAMIC_CACHE = 'lion-fa-dynamic-v1.0.0';
const API_CACHE = 'lion-fa-api-v1.0.0';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/manifest-icon-192.maskable.png',
  '/icons/manifest-icon-512.maskable.png',
  '/offline.html'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/auth/me',
  '/api/notifications/unread-counts',
  '/api/players/me',
  '/api/training/upcoming',
  '/api/qr/sessions'
];

// Routes that should always try network first
const NETWORK_FIRST_ROUTES = [
  '/api/auth/',
  '/api/qr/scan',
  '/api/qr/generate',
  '/api/messages',
  '/api/notifications/send'
];

// Routes that can work offline
const CACHE_FIRST_ROUTES = [
  '/api/players',
  '/api/teams',
  '/api/training',
  '/api/matches'
];

// Maximum cache sizes
const MAX_CACHE_SIZE = {
  [DYNAMIC_CACHE]: 50,
  [API_CACHE]: 100
};

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7 days
  DYNAMIC: 24 * 60 * 60 * 1000,    // 1 day
  API: 30 * 60 * 1000              // 30 minutes
};

/**
 * Service Worker Installation
 */
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Failed to cache static assets:', error);
      })
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        const deletePromises = cacheNames
          .filter(cacheName => {
            return cacheName.startsWith('lion-fa-') && 
                   cacheName !== STATIC_CACHE && 
                   cacheName !== DYNAMIC_CACHE && 
                   cacheName !== API_CACHE;
          })
          .map(cacheName => {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
      .catch(error => {
        console.error('❌ Service Worker activation failed:', error);
      })
  );
});

/**
 * Fetch Event Handler
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (url.pathname.includes('/static/')) {
    event.respondWith(handleStaticRequest(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

/**
 * Handle API requests with appropriate caching strategy
 */
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // Network-first for critical endpoints
    if (NETWORK_FIRST_ROUTES.some(route => pathname.startsWith(route))) {
      return await networkFirstStrategy(request, API_CACHE);
    }
    
    // Cache-first for stable data
    if (CACHE_FIRST_ROUTES.some(route => pathname.startsWith(route))) {
      return await cacheFirstStrategy(request, API_CACHE);
    }
    
    // Default to network-first for API requests
    return await networkFirstStrategy(request, API_CACHE);
    
  } catch (error) {
    console.error('❌ API request failed:', error);
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical endpoints
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This feature requires an internet connection',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle static asset requests
 */
async function handleStaticRequest(request) {
  try {
    return await cacheFirstStrategy(request, STATIC_CACHE);
  } catch (error) {
    console.error('❌ Static request failed:', error);
    return fetch(request);
  }
}

/**
 * Handle navigation requests (HTML pages)
 */
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    
    // Cache successful navigation responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('🌐 Network failed, checking cache...');
    
    // Check for cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    const offlineResponse = await caches.match('/offline.html');
    return offlineResponse || new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

/**
 * Network-first caching strategy
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      await limitCacheSize(cacheName, MAX_CACHE_SIZE[cacheName]);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('🌐 Network failed, checking cache for:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Check if cached response is still valid
      const cacheDate = new Date(cachedResponse.headers.get('date'));
      const now = new Date();
      const age = now - cacheDate;
      
      if (age < CACHE_EXPIRATION.API) {
        return cachedResponse;
      }
    }
    
    throw error;
  }
}

/**
 * Cache-first caching strategy
 */
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Check cache age for API responses
    if (cacheName === API_CACHE) {
      const cacheDate = new Date(cachedResponse.headers.get('date'));
      const now = new Date();
      const age = now - cacheDate;
      
      if (age > CACHE_EXPIRATION.API) {
        // Cache is stale, try to update in background
        updateCacheInBackground(request, cacheName);
      }
    }
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
    await limitCacheSize(cacheName, MAX_CACHE_SIZE[cacheName]);
  }
  
  return networkResponse;
}

/**
 * Update cache in background without blocking response
 */
function updateCacheInBackground(request, cacheName) {
  fetch(request)
    .then(response => {
      if (response.ok) {
        return caches.open(cacheName).then(cache => {
          cache.put(request, response);
        });
      }
    })
    .catch(error => {
      console.log('Background cache update failed:', error);
    });
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName, maxSize) {
  if (!maxSize) return;
  
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    const keysToDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

/**
 * Background Sync for offline actions
 */
self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncAttendanceData());
  } else if (event.tag === 'message-sync') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

/**
 * Sync attendance data when back online
 */
async function syncAttendanceData() {
  try {
    console.log('📊 Syncing attendance data...');
    
    // Get pending attendance data from IndexedDB
    const pendingData = await getFromIndexedDB('pendingAttendance');
    
    for (const data of pendingData) {
      try {
        await fetch('/api/qr/attendance/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        // Remove from pending queue
        await removeFromIndexedDB('pendingAttendance', data.id);
        
      } catch (error) {
        console.error('Failed to sync attendance item:', error);
      }
    }
    
    console.log('✅ Attendance sync completed');
    
  } catch (error) {
    console.error('❌ Attendance sync failed:', error);
  }
}

/**
 * Sync messages when back online
 */
async function syncMessages() {
  try {
    console.log('💬 Syncing messages...');
    
    const pendingMessages = await getFromIndexedDB('pendingMessages');
    
    for (const message of pendingMessages) {
      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        await removeFromIndexedDB('pendingMessages', message.id);
        
      } catch (error) {
        console.error('Failed to sync message:', error);
      }
    }
    
    console.log('✅ Message sync completed');
    
  } catch (error) {
    console.error('❌ Message sync failed:', error);
  }
}

/**
 * Sync notifications when back online
 */
async function syncNotifications() {
  try {
    console.log('🔔 Syncing notifications...');
    
    // Fetch latest notifications
    const response = await fetch('/api/notifications');
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put('/api/notifications', response.clone());
    }
    
    console.log('✅ Notification sync completed');
    
  } catch (error) {
    console.error('❌ Notification sync failed:', error);
  }
}

/**
 * Push notification handler
 */
self.addEventListener('push', event => {
  console.log('🔔 Push notification received');
  
  let notificationData = {
    title: 'Lion Football Academy',
    body: 'You have a new notification',
    icon: '/icons/android-icon-192x192.png',
    badge: '/icons/android-icon-96x96.png',
    tag: 'default',
    requireInteraction: false,
    actions: []
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
      
      // Add action buttons based on notification type
      if (data.type === 'message') {
        notificationData.actions = [
          { action: 'view', title: 'View Message', icon: '/icons/shortcut-messages.png' },
          { action: 'dismiss', title: 'Dismiss' }
        ];
      } else if (data.type === 'training') {
        notificationData.actions = [
          { action: 'view', title: 'View Schedule', icon: '/icons/shortcut-training.png' },
          { action: 'qr', title: 'Open QR Code', icon: '/icons/shortcut-qr.png' }
        ];
      }
      
    } catch (error) {
      console.error('Error parsing push notification data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();
  
  let targetUrl = '/';
  
  // Handle different actions
  switch (event.action) {
    case 'view':
      if (event.notification.data && event.notification.data.url) {
        targetUrl = event.notification.data.url;
      }
      break;
    case 'qr':
      targetUrl = '/qr';
      break;
    case 'dismiss':
      return; // Just close notification
    default:
      // Default click without action button
      if (event.notification.data && event.notification.data.url) {
        targetUrl = event.notification.data.url;
      }
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

/**
 * IndexedDB helper functions
 */
async function getFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LionFA_OfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
}

async function removeFromIndexedDB(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LionFA_OfflineDB', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

/**
 * Handle service worker updates
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🦁 Lion Football Academy Service Worker loaded successfully');