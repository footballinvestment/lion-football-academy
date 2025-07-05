# Lion Football Academy - Performance Guide

## Table of Contents
1. [Performance Overview](#performance-overview)
2. [Frontend Performance](#frontend-performance)
3. [Backend Performance](#backend-performance)
4. [Database Optimization](#database-optimization)
5. [Caching Strategies](#caching-strategies)
6. [Network Optimization](#network-optimization)
7. [Monitoring and Profiling](#monitoring-and-profiling)
8. [Load Testing](#load-testing)
9. [Performance Budgets](#performance-budgets)
10. [Optimization Checklist](#optimization-checklist)

## Performance Overview

The Lion Football Academy system is designed to deliver optimal performance across all user interactions. This guide covers comprehensive performance optimization strategies for both frontend and backend components.

### Performance Goals
- **Page Load Time**: < 2 seconds on 3G networks
- **Time to Interactive (TTI)**: < 3 seconds
- **First Contentful Paint (FCP)**: < 1.5 seconds
- **API Response Time**: < 500ms for 95th percentile
- **Database Query Time**: < 100ms average
- **Memory Usage**: < 512MB per backend instance
- **CPU Usage**: < 70% under normal load

### Performance Metrics
- **Core Web Vitals**: LCP, FID, CLS
- **Custom Metrics**: API latency, database performance, cache hit rates
- **Business Metrics**: User engagement, conversion rates, bounce rates

## Frontend Performance

### 1. React Application Optimization

#### Code Splitting and Lazy Loading
```javascript
// Route-based code splitting
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Teams = lazy(() => import('./pages/Teams'));
const Training = lazy(() => import('./pages/Training'));
const Performance = lazy(() => import('./pages/Performance'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/training" element={<Training />} />
        <Route path="/performance" element={<Performance />} />
      </Routes>
    </Suspense>
  );
}

// Component-level lazy loading
const ExpensiveChart = lazy(() => 
  import('./components/PerformanceChart').then(module => ({
    default: module.PerformanceChart
  }))
);

// Conditional loading based on user permissions
const AdminPanel = lazy(() => {
  return import('./components/AdminPanel');
});

function ConditionalAdmin({ userRole }) {
  if (userRole !== 'admin') return null;
  
  return (
    <Suspense fallback={<div>Loading admin panel...</div>}>
      <AdminPanel />
    </Suspense>
  );
}
```

#### React Performance Optimizations
```javascript
import { memo, useMemo, useCallback, useState } from 'react';

// Memoized component to prevent unnecessary re-renders
const PlayerCard = memo(({ player, onEdit, onDelete }) => {
  const handleEdit = useCallback(() => {
    onEdit(player.id);
  }, [player.id, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(player.id);
  }, [player.id, onDelete]);

  // Memoized computed values
  const playerStats = useMemo(() => {
    return {
      totalGoals: player.performances?.reduce((sum, p) => sum + p.goals, 0) || 0,
      averageRating: player.performances?.length > 0 
        ? player.performances.reduce((sum, p) => sum + p.rating, 0) / player.performances.length 
        : 0
    };
  }, [player.performances]);

  return (
    <div className="player-card">
      <h3>{player.name}</h3>
      <p>Total Goals: {playerStats.totalGoals}</p>
      <p>Average Rating: {playerStats.averageRating.toFixed(1)}</p>
      <button onClick={handleEdit}>Edit</button>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
});

// Virtualized list for large datasets
import { FixedSizeList as List } from 'react-window';

const VirtualizedPlayerList = ({ players }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <PlayerCard player={players[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={players.length}
      itemSize={120}
      overscanCount={5}
    >
      {Row}
    </List>
  );
};

// Optimized state updates
const useOptimizedState = (initialValue) => {
  const [state, setState] = useState(initialValue);

  const optimizedSetState = useCallback((newValue) => {
    setState(prevState => {
      // Only update if value actually changed
      if (JSON.stringify(prevState) === JSON.stringify(newValue)) {
        return prevState;
      }
      return newValue;
    });
  }, []);

  return [state, optimizedSetState];
};
```

#### Bundle Optimization
```javascript
// webpack.config.js optimization
const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  // ... other config
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          maxSize: 244000, // 244KB
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
          maxSize: 244000,
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
        },
        mui: {
          test: /[\\/]node_modules[\\/]@mui[\\/]/,
          name: 'mui',
          chunks: 'all',
        }
      }
    },
    runtimeChunk: 'single',
    usedExports: true,
    sideEffects: false
  },
  plugins: [
    // Analyze bundle size
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html'
    })
  ]
};

// Tree shaking optimization
// Import only what you need
import { Button, TextField } from '@mui/material'; // ✅ Good
// import * as mui from '@mui/material'; // ❌ Bad

// Use babel-plugin-import for automatic optimization
// .babelrc
{
  "plugins": [
    ["import", {
      "libraryName": "@mui/material",
      "libraryDirectory": "",
      "camel2DashComponentName": false
    }, "core"],
    ["import", {
      "libraryName": "@mui/icons-material",
      "libraryDirectory": "",
      "camel2DashComponentName": false
    }, "icons"]
  ]
}
```

### 2. Asset Optimization

#### Image Optimization
```javascript
// Progressive image loading component
import { useState, useRef, useEffect } from 'react';

const OptimizedImage = ({ 
  src, 
  alt, 
  placeholder, 
  width, 
  height,
  loading = 'lazy' 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setLoaded(true);
    }
  }, []);

  const handleLoad = () => setLoaded(true);
  const handleError = () => setError(true);

  return (
    <div className="image-container" style={{ width, height }}>
      {!loaded && !error && (
        <div className="image-placeholder">
          {placeholder || <div className="skeleton" />}
        </div>
      )}
      
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );
};

// WebP support with fallback
const ResponsiveImage = ({ src, alt, sizes }) => {
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  
  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <source srcSet={src} type="image/jpeg" />
      <img src={src} alt={alt} sizes={sizes} loading="lazy" />
    </picture>
  );
};

// Image compression and resizing utility
const ImageOptimizer = {
  compress: (file, quality = 0.8, maxWidth = 800) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  },

  generateSrcSet: (baseUrl, sizes = [400, 800, 1200]) => {
    return sizes.map(size => `${baseUrl}?w=${size} ${size}w`).join(', ');
  }
};
```

#### Resource Loading Optimization
```javascript
// Critical resource preloading
const ResourcePreloader = () => {
  useEffect(() => {
    // Preload critical resources
    const criticalResources = [
      '/fonts/roboto-400.woff2',
      '/images/logo.webp',
      '/api/user/me'
    ];

    criticalResources.forEach(resource => {
      if (resource.startsWith('/api/')) {
        // Prefetch API data
        fetch(resource, { 
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
      } else {
        // Preload static assets
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        
        if (resource.includes('font')) {
          link.as = 'font';
          link.type = 'font/woff2';
          link.crossOrigin = 'anonymous';
        } else if (resource.includes('image')) {
          link.as = 'image';
        }
        
        document.head.appendChild(link);
      }
    });
  }, []);

  return null;
};

// Service Worker for caching
// sw.js
const CACHE_NAME = 'lfa-v1.2.0';
const STATIC_CACHE = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json'
];

const API_CACHE_PATTERNS = [
  '/api/teams',
  '/api/trainings',
  '/api/user/me'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE))
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache static assets
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
    );
  }

  // Network first for API calls with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.ok && API_CACHE_PATTERNS.some(pattern => 
            url.pathname.includes(pattern))) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
```

### 3. State Management Optimization

#### Redux Performance
```javascript
// Optimized Redux store configuration
import { configureStore } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

// Normalized state structure
const initialState = {
  users: {
    byId: {},
    allIds: [],
    loading: false,
    error: null
  },
  teams: {
    byId: {},
    allIds: [],
    loading: false,
    error: null
  }
};

// Memoized selectors
const selectUsers = state => state.users;
const selectTeams = state => state.teams;

const selectUserById = createSelector(
  [selectUsers, (state, userId) => userId],
  (users, userId) => users.byId[userId]
);

const selectTeamPlayers = createSelector(
  [selectUsers, selectTeams, (state, teamId) => teamId],
  (users, teams, teamId) => {
    const team = teams.byId[teamId];
    if (!team) return [];
    
    return team.playerIds.map(playerId => users.byId[playerId]);
  }
);

// RTK Query with optimistic updates
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    }
  }),
  tagTypes: ['User', 'Team', 'Training'],
  endpoints: builder => ({
    updateUser: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `users/${id}`,
        method: 'PATCH',
        body: patch
      }),
      // Optimistic update
      onQueryStarted: async ({ id, ...patch }, { dispatch, queryFulfilled }) => {
        const patchResult = dispatch(
          apiSlice.util.updateQueryData('getUser', id, draft => {
            Object.assign(draft, patch);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }]
    })
  })
});
```

## Backend Performance

### 1. Node.js Optimization

#### Event Loop Optimization
```javascript
// Non-blocking operations
const crypto = require('crypto');
const { promisify } = require('util');

// Avoid blocking the event loop
const pbkdf2 = promisify(crypto.pbkdf2);

class AuthService {
  // Use async crypto operations
  static async hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = await pbkdf2(password, salt, 100000, 64, 'sha512');
    return {
      salt: salt.toString('hex'),
      hash: hash.toString('hex')
    };
  }

  // Process large datasets in chunks
  static async processLargeDataset(data, chunkSize = 1000) {
    const results = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(item => this.processItem(item))
      );
      results.push(...chunkResults);
      
      // Yield control back to event loop
      await new Promise(resolve => setImmediate(resolve));
    }
    
    return results;
  }

  // Streaming for large responses
  static streamLargeData(res, query) {
    const stream = database.createReadStream(query);
    
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    });

    res.write('[');
    
    let first = true;
    stream.on('data', (chunk) => {
      if (!first) res.write(',');
      res.write(JSON.stringify(chunk));
      first = false;
    });

    stream.on('end', () => {
      res.write(']');
      res.end();
    });

    stream.on('error', (error) => {
      res.status(500).json({ error: error.message });
    });
  }
}
```

#### Memory Management
```javascript
// Memory-efficient data processing
class MemoryOptimizer {
  // Use streams for large file processing
  static processLargeFile(filePath) {
    const fs = require('fs');
    const readline = require('readline');
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const results = [];
    let lineCount = 0;

    return new Promise((resolve, reject) => {
      rl.on('line', (line) => {
        // Process line without loading entire file into memory
        const processed = this.processLine(line);
        if (processed) {
          results.push(processed);
        }
        
        lineCount++;
        
        // Periodically log progress
        if (lineCount % 10000 === 0) {
          console.log(`Processed ${lineCount} lines`);
        }
      });

      rl.on('close', () => resolve(results));
      rl.on('error', reject);
    });
  }

  // Object pooling for frequently created objects
  static createObjectPool(createFn, resetFn, initialSize = 10) {
    const pool = [];
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      pool.push(createFn());
    }

    return {
      acquire() {
        return pool.length > 0 ? pool.pop() : createFn();
      },
      
      release(obj) {
        resetFn(obj);
        pool.push(obj);
      },
      
      size() {
        return pool.length;
      }
    };
  }

  // Weak references for caches
  static createWeakCache() {
    const cache = new WeakMap();
    
    return {
      get(key) {
        return cache.get(key);
      },
      
      set(key, value) {
        cache.set(key, value);
      },
      
      has(key) {
        return cache.has(key);
      }
    };
  }
}

// Memory monitoring
const memoryMonitor = {
  logMemoryUsage() {
    const usage = process.memoryUsage();
    console.log({
      rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(usage.external / 1024 / 1024)} MB`
    });
  },

  startMonitoring(interval = 30000) {
    setInterval(() => {
      this.logMemoryUsage();
      
      // Force garbage collection if memory usage is high
      const usage = process.memoryUsage();
      const heapUsedPercent = usage.heapUsed / usage.heapTotal;
      
      if (heapUsedPercent > 0.8 && global.gc) {
        console.log('Running garbage collection...');
        global.gc();
      }
    }, interval);
  }
};
```

### 2. API Optimization

#### Response Optimization
```javascript
// Response compression and optimization
const compression = require('compression');
const express = require('express');

const app = express();

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

// Response optimization middleware
const optimizeResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Remove null/undefined values
    const cleaned = removeNullValues(data);
    
    // Implement field selection
    if (req.query.fields) {
      const fields = req.query.fields.split(',');
      const filtered = filterFields(cleaned, fields);
      return originalJson.call(this, filtered);
    }
    
    // Implement response pagination
    if (Array.isArray(cleaned) && req.query.page) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const start = (page - 1) * limit;
      const end = start + limit;
      
      const paginatedData = {
        data: cleaned.slice(start, end),
        pagination: {
          page,
          limit,
          total: cleaned.length,
          totalPages: Math.ceil(cleaned.length / limit)
        }
      };
      
      return originalJson.call(this, paginatedData);
    }
    
    return originalJson.call(this, cleaned);
  };
  
  next();
};

// Efficient field selection
const filterFields = (data, fields) => {
  if (Array.isArray(data)) {
    return data.map(item => filterFields(item, fields));
  }
  
  const filtered = {};
  fields.forEach(field => {
    if (field.includes('.')) {
      // Handle nested fields
      const [parent, ...children] = field.split('.');
      if (data[parent]) {
        filtered[parent] = filtered[parent] || {};
        const nestedField = children.join('.');
        Object.assign(filtered[parent], filterFields(data[parent], [nestedField]));
      }
    } else if (data.hasOwnProperty(field)) {
      filtered[field] = data[field];
    }
  });
  
  return filtered;
};

// Remove null/undefined values
const removeNullValues = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(removeNullValues);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== null && value !== undefined) {
        cleaned[key] = removeNullValues(value);
      }
    });
    return cleaned;
  }
  
  return obj;
};
```

#### Connection Pooling
```javascript
// Database connection pooling
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Connection pool settings
  min: 5,                    // Minimum connections
  max: 20,                   // Maximum connections
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout when acquiring connection
  
  // Performance settings
  statement_timeout: 10000,   // Statement timeout
  query_timeout: 10000,       // Query timeout
  
  // Health check
  application_name: 'lfa_backend'
});

// Connection pool monitoring
pool.on('connect', (client) => {
  console.log('New client connected to database');
});

pool.on('error', (err, client) => {
  console.error('Database connection error:', err);
});

// Optimized query execution
class DatabaseService {
  static async query(text, params) {
    const start = Date.now();
    const client = await pool.connect();
    
    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query (${duration}ms):`, text);
      }
      
      return result;
    } finally {
      client.release();
    }
  }

  static async transaction(queries) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const results = [];
      
      for (const { text, params } of queries) {
        const result = await client.query(text, params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Batch operations for better performance
  static async batchInsert(table, columns, rows) {
    if (rows.length === 0) return;

    const placeholders = rows.map((_, i) => 
      `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
    ).join(', ');

    const values = rows.flat();
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
    
    return this.query(query, values);
  }
}
```

## Database Optimization

### 1. Query Optimization

#### Efficient Queries
```sql
-- Optimized queries with proper indexing

-- Before: Slow query without index
SELECT * FROM performance_data 
WHERE player_id = $1 AND recorded_at > $2;

-- After: Fast query with composite index
CREATE INDEX CONCURRENTLY idx_performance_player_date 
ON performance_data(player_id, recorded_at DESC);

SELECT id, metrics, notes, rating 
FROM performance_data 
WHERE player_id = $1 AND recorded_at > $2
ORDER BY recorded_at DESC
LIMIT 50;

-- Query optimization examples
-- 1. Use LIMIT to prevent large result sets
SELECT u.id, u.name, u.email 
FROM users u 
WHERE u.user_type = 'player'
ORDER BY u.created_at DESC
LIMIT 20;

-- 2. Use EXISTS instead of IN for subqueries
SELECT t.id, t.name 
FROM teams t 
WHERE EXISTS (
    SELECT 1 FROM team_players tp 
    WHERE tp.team_id = t.id AND tp.status = 'active'
);

-- 3. Use proper JOIN types
SELECT u.name, t.name as team_name
FROM users u
INNER JOIN team_players tp ON u.id = tp.player_id
INNER JOIN teams t ON tp.team_id = t.id
WHERE u.user_type = 'player' AND tp.status = 'active';

-- 4. Use partial indexes for filtered queries
CREATE INDEX CONCURRENTLY idx_active_players 
ON team_players(team_id) 
WHERE status = 'active';

-- 5. Use covering indexes to avoid table lookups
CREATE INDEX CONCURRENTLY idx_user_summary 
ON users(user_type) 
INCLUDE (id, name, email, created_at);
```

#### Query Analysis and Monitoring
```sql
-- Enable query statistics tracking
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    stddev_time,
    rows
FROM pg_stat_statements 
WHERE mean_time > 100  -- queries taking more than 100ms on average
ORDER BY mean_time DESC
LIMIT 20;

-- Find most called queries
SELECT 
    query,
    calls,
    total_time,
    mean_time
FROM pg_stat_statements 
ORDER BY calls DESC
LIMIT 20;

-- Index usage analysis
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Table statistics
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;

-- Lock analysis
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### 2. Database Configuration

#### PostgreSQL Performance Tuning
```conf
# postgresql.conf performance settings

# Memory Settings
shared_buffers = 256MB                   # 25% of total RAM
effective_cache_size = 1GB              # 75% of total RAM
work_mem = 16MB                         # Per operation memory
maintenance_work_mem = 256MB            # For maintenance operations
wal_buffers = 16MB                      # WAL buffer size

# Query Planner Settings
random_page_cost = 1.1                  # SSD optimization
effective_io_concurrency = 200          # Concurrent I/O operations
default_statistics_target = 100         # Statistics collection

# Checkpoint Settings
checkpoint_completion_target = 0.9      # Smooth checkpoints
wal_checkpoint_timeout = 15min          # Checkpoint frequency
checkpoint_warning = 30s               # Warning threshold

# Connection Settings
max_connections = 200                   # Maximum connections
superuser_reserved_connections = 3      # Reserved for superuser

# Logging Settings
log_min_duration_statement = 1000       # Log queries > 1 second
log_checkpoints = on                    # Log checkpoint activity
log_connections = on                    # Log connections
log_disconnections = on                 # Log disconnections
log_lock_waits = on                     # Log lock waits
log_statement = 'mod'                   # Log modifications

# Autovacuum Settings
autovacuum = on                         # Enable autovacuum
autovacuum_max_workers = 3              # Number of workers
autovacuum_naptime = 1min              # Sleep time between runs
autovacuum_vacuum_threshold = 50        # Minimum deleted tuples
autovacuum_analyze_threshold = 50       # Minimum changed tuples
autovacuum_vacuum_scale_factor = 0.2    # Fraction of table size
autovacuum_analyze_scale_factor = 0.1   # Fraction for analyze

# Background Writer
bgwriter_delay = 200ms                  # Background writer delay
bgwriter_lru_maxpages = 100            # Max pages per round
bgwriter_lru_multiplier = 2.0          # Multiplier for next round
```

## Caching Strategies

### 1. Multi-Level Caching

#### Application Caching
```javascript
// Multi-level cache implementation
const NodeCache = require('node-cache');
const Redis = require('redis');

class MultiLevelCache {
  constructor() {
    // Level 1: In-memory cache (fastest, smallest)
    this.memoryCache = new NodeCache({
      stdTTL: 300,        // 5 minutes default TTL
      checkperiod: 60,    // Check for expired keys every minute
      maxKeys: 1000       // Maximum 1000 keys in memory
    });

    // Level 2: Redis cache (fast, larger)
    this.redisClient = Redis.createClient({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false
    });

    this.stats = {
      memoryHits: 0,
      redisHits: 0,
      misses: 0,
      writes: 0
    };
  }

  async get(key) {
    // Try memory cache first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult !== undefined) {
      this.stats.memoryHits++;
      return memoryResult;
    }

    // Try Redis cache
    try {
      const redisResult = await this.redisClient.get(key);
      if (redisResult !== null) {
        const parsed = JSON.parse(redisResult);
        
        // Populate memory cache
        this.memoryCache.set(key, parsed);
        
        this.stats.redisHits++;
        return parsed;
      }
    } catch (error) {
      console.error('Redis get error:', error);
    }

    this.stats.misses++;
    return null;
  }

  async set(key, value, ttl = 300) {
    // Store in memory cache
    this.memoryCache.set(key, value, ttl);

    // Store in Redis cache
    try {
      await this.redisClient.setex(key, ttl, JSON.stringify(value));
      this.stats.writes++;
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async del(key) {
    this.memoryCache.del(key);
    
    try {
      await this.redisClient.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }

  // Cache warming for frequently accessed data
  async warmCache(data) {
    const promises = Object.entries(data).map(([key, value]) => 
      this.set(key, value, 3600) // 1 hour TTL for warmed data
    );
    
    await Promise.all(promises);
    console.log(`Warmed cache with ${Object.keys(data).length} entries`);
  }

  getStats() {
    const total = this.stats.memoryHits + this.stats.redisHits + this.stats.misses;
    return {
      ...this.stats,
      memoryHitRate: total > 0 ? (this.stats.memoryHits / total * 100).toFixed(2) + '%' : '0%',
      redisHitRate: total > 0 ? (this.stats.redisHits / total * 100).toFixed(2) + '%' : '0%',
      overallHitRate: total > 0 ? ((this.stats.memoryHits + this.stats.redisHits) / total * 100).toFixed(2) + '%' : '0%'
    };
  }
}

// Cache middleware for Express
const cache = new MultiLevelCache();

const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Generate cache key
    const key = keyGenerator ? 
      keyGenerator(req) : 
      `${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`;

    // Try to get from cache
    const cached = await cache.get(key);
    if (cached) {
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json;
    
    // Override json method to cache response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cache.set(key, data, ttl);
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

// Usage examples
app.get('/api/teams', 
  cacheMiddleware(600), // Cache for 10 minutes
  getTeamsController
);

app.get('/api/users/:id/performance', 
  cacheMiddleware(300, req => `user_performance:${req.params.id}:${req.query.period || 'all'}`),
  getUserPerformanceController
);
```

### 2. Database Query Caching

#### Query Result Caching
```javascript
// Database query caching layer
class QueryCache {
  constructor(cache) {
    this.cache = cache;
    this.queryStats = new Map();
  }

  async cachedQuery(sql, params = [], options = {}) {
    const { ttl = 300, tags = [], key = null } = options;
    
    // Generate cache key
    const cacheKey = key || this.generateQueryKey(sql, params);
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.updateQueryStats(cacheKey, 'hit');
      return cached;
    }

    // Execute query
    const start = Date.now();
    const result = await DatabaseService.query(sql, params);
    const duration = Date.now() - start;

    // Cache result
    await this.cache.set(cacheKey, result, ttl);
    
    // Store cache tags for invalidation
    if (tags.length > 0) {
      await this.storeCacheTags(cacheKey, tags);
    }

    this.updateQueryStats(cacheKey, 'miss', duration);
    return result;
  }

  async invalidateByTags(tags) {
    for (const tag of tags) {
      const keys = await this.getKeysForTag(tag);
      await Promise.all(keys.map(key => this.cache.del(key)));
    }
  }

  generateQueryKey(sql, params) {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim();
    const paramString = JSON.stringify(params);
    return `query:${crypto.createHash('md5')
      .update(normalizedSql + paramString)
      .digest('hex')}`;
  }

  updateQueryStats(key, type, duration = 0) {
    const stats = this.queryStats.get(key) || { hits: 0, misses: 0, totalDuration: 0 };
    
    if (type === 'hit') {
      stats.hits++;
    } else {
      stats.misses++;
      stats.totalDuration += duration;
    }
    
    this.queryStats.set(key, stats);
  }
}

// Service layer with caching
class UserService {
  static async getUser(id) {
    return queryCache.cachedQuery(
      'SELECT id, name, email, user_type FROM users WHERE id = $1',
      [id],
      { ttl: 600, tags: ['users'], key: `user:${id}` }
    );
  }

  static async updateUser(id, data) {
    const result = await DatabaseService.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [data.name, data.email, id]
    );

    // Invalidate related caches
    await queryCache.invalidateByTags(['users']);
    await cache.del(`user:${id}`);

    return result;
  }

  static async getUserTeams(userId) {
    return queryCache.cachedQuery(`
      SELECT t.id, t.name, t.age_group 
      FROM teams t
      INNER JOIN team_players tp ON t.id = tp.team_id
      WHERE tp.player_id = $1 AND tp.status = 'active'
    `, [userId], { 
      ttl: 300, 
      tags: ['teams', 'team_players'], 
      key: `user_teams:${userId}` 
    });
  }
}
```

## Network Optimization

### 1. CDN and Static Assets

#### CloudFlare Configuration
```javascript
// CloudFlare optimization settings
const cloudflareConfig = {
  // Cache everything
  cacheLevel: 'aggressive',
  
  // Browser cache TTL
  browserCacheTTL: 86400, // 24 hours
  
  // Edge cache TTL
  edgeCacheTTL: 2592000, // 30 days
  
  // Minification
  minify: {
    css: true,
    html: true,
    js: true
  },
  
  // Compression
  compression: 'gzip',
  
  // Image optimization
  polish: 'lossy',
  mirage: true,
  
  // Performance features
  rocketLoader: true,
  http2ServerPush: true,
  
  // Security
  alwaysUseHttps: true,
  automaticHttpsRewrites: true,
  
  // Page rules for different content types
  pageRules: [
    {
      targets: ['*.css', '*.js', '*.png', '*.jpg', '*.gif', '*.ico'],
      actions: {
        cacheLevel: 'cache_everything',
        edgeCacheTTL: 2592000, // 30 days
        browserCacheTTL: 86400  // 24 hours
      }
    },
    {
      targets: ['/api/*'],
      actions: {
        cacheLevel: 'bypass',
        disableRailgun: true
      }
    }
  ]
};

// Asset optimization for CDN
const AssetOptimizer = {
  // Generate responsive image URLs
  generateResponsiveImages(baseUrl, sizes = [400, 800, 1200, 1600]) {
    return sizes.map(size => ({
      src: `${baseUrl}?w=${size}&q=80&f=webp`,
      width: size,
      media: size === 400 ? '(max-width: 400px)' :
             size === 800 ? '(max-width: 800px)' :
             size === 1200 ? '(max-width: 1200px)' : ''
    }));
  },

  // Optimize images for different formats
  generateImageVariants(baseUrl) {
    return {
      webp: `${baseUrl}?f=webp&q=80`,
      avif: `${baseUrl}?f=avif&q=75`,
      jpeg: `${baseUrl}?f=jpeg&q=85`,
      fallback: baseUrl
    };
  },

  // Generate srcset for responsive images
  generateSrcSet(baseUrl, sizes = [400, 800, 1200, 1600]) {
    return sizes.map(size => `${baseUrl}?w=${size}&q=80 ${size}w`).join(', ');
  }
};
```

### 2. HTTP/2 and Server Push

#### HTTP/2 Server Push
```javascript
// HTTP/2 Server Push implementation
const http2 = require('http2');
const fs = require('fs');

const server = http2.createSecureServer({
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
});

server.on('stream', (stream, headers) => {
  const path = headers[':path'];
  
  // Push critical resources for main page
  if (path === '/') {
    const criticalResources = [
      '/static/css/main.css',
      '/static/js/main.js',
      '/static/fonts/roboto-400.woff2',
      '/static/images/logo.webp'
    ];

    criticalResources.forEach(resource => {
      stream.pushStream({ ':path': resource }, (err, pushStream) => {
        if (err) return;
        
        const resourcePath = `./build${resource}`;
        if (fs.existsSync(resourcePath)) {
          const fileStream = fs.createReadStream(resourcePath);
          fileStream.pipe(pushStream);
        }
      });
    });
  }

  // Serve requested resource
  if (path.startsWith('/static/')) {
    const filePath = `./build${path}`;
    if (fs.existsSync(filePath)) {
      const fileStream = fs.createReadStream(filePath);
      stream.respond({
        'content-type': getContentType(path),
        ':status': 200
      });
      fileStream.pipe(stream);
    } else {
      stream.respond({ ':status': 404 });
      stream.end('Not Found');
    }
  } else {
    // Serve index.html for SPA routes
    stream.respond({
      'content-type': 'text/html',
      ':status': 200
    });
    fs.createReadStream('./build/index.html').pipe(stream);
  }
});

// Resource hints for browsers
const generateResourceHints = (criticalResources) => {
  return criticalResources.map(resource => {
    const type = resource.includes('.css') ? 'style' :
                 resource.includes('.js') ? 'script' :
                 resource.includes('.woff') ? 'font' : 'image';
    
    return `<link rel="preload" href="${resource}" as="${type}"${type === 'font' ? ' crossorigin' : ''}>`;
  }).join('\n');
};
```

## Monitoring and Profiling

### 1. Performance Monitoring

#### Real-time Performance Tracking
```javascript
// Performance monitoring service
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = {
      apiResponseTime: 1000,    // 1 second
      dbQueryTime: 500,         // 500ms
      memoryUsage: 0.8,         // 80%
      cpuUsage: 0.7,           // 70%
      errorRate: 0.05          // 5%
    };
  }

  // Track API endpoint performance
  trackAPIEndpoint(req, res, next) {
    const start = process.hrtime.bigint();
    
    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      
      const metric = {
        endpoint: `${req.method} ${req.route?.path || req.path}`,
        duration,
        statusCode: res.statusCode,
        timestamp: new Date(),
        userId: req.user?.id,
        userAgent: req.get('User-Agent')
      };

      this.recordMetric('api_response_time', metric);
      
      // Check for slow responses
      if (duration > this.thresholds.apiResponseTime) {
        this.createAlert('slow_api_response', {
          endpoint: metric.endpoint,
          duration,
          threshold: this.thresholds.apiResponseTime
        });
      }
    });

    next();
  }

  // Track database query performance
  trackDatabaseQuery(query, params, duration) {
    const metric = {
      query: query.substring(0, 100), // Truncate for storage
      duration,
      timestamp: new Date(),
      paramCount: params?.length || 0
    };

    this.recordMetric('db_query_time', metric);

    if (duration > this.thresholds.dbQueryTime) {
      this.createAlert('slow_db_query', {
        query: metric.query,
        duration,
        threshold: this.thresholds.dbQueryTime
      });
    }
  }

  // Track system resources
  trackSystemResources() {
    const usage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metric = {
      memory: {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        usagePercent: (usage.heapUsed / usage.heapTotal) * 100
      },
      cpu: cpuUsage,
      uptime: process.uptime(),
      timestamp: new Date()
    };

    this.recordMetric('system_resources', metric);

    // Check thresholds
    if (metric.memory.usagePercent > this.thresholds.memoryUsage * 100) {
      this.createAlert('high_memory_usage', {
        usage: metric.memory.usagePercent,
        threshold: this.thresholds.memoryUsage * 100
      });
    }
  }

  // Record custom business metrics
  trackBusinessMetric(name, value, metadata = {}) {
    const metric = {
      name,
      value,
      metadata,
      timestamp: new Date()
    };

    this.recordMetric('business_metrics', metric);
  }

  recordMetric(category, metric) {
    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }

    const categoryMetrics = this.metrics.get(category);
    categoryMetrics.push(metric);

    // Keep only last 1000 metrics per category
    if (categoryMetrics.length > 1000) {
      categoryMetrics.splice(0, categoryMetrics.length - 1000);
    }
  }

  createAlert(type, data) {
    const alert = {
      id: Date.now().toString(),
      type,
      data,
      timestamp: new Date(),
      severity: this.getAlertSeverity(type)
    };

    this.alerts.push(alert);

    // Send alert to monitoring system
    this.sendAlert(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  getAlertSeverity(type) {
    const severityMap = {
      slow_api_response: 'warning',
      slow_db_query: 'warning',
      high_memory_usage: 'critical',
      high_cpu_usage: 'critical',
      high_error_rate: 'critical'
    };
    
    return severityMap[type] || 'info';
  }

  // Generate performance report
  generateReport(timeframe = '1h') {
    const timeframeMs = this.parseTimeframe(timeframe);
    const cutoff = new Date(Date.now() - timeframeMs);

    const report = {
      timeframe,
      generated: new Date(),
      api: this.getAPIMetrics(cutoff),
      database: this.getDatabaseMetrics(cutoff),
      system: this.getSystemMetrics(cutoff),
      alerts: this.alerts.filter(a => a.timestamp > cutoff)
    };

    return report;
  }

  getAPIMetrics(cutoff) {
    const apiMetrics = this.metrics.get('api_response_time') || [];
    const recent = apiMetrics.filter(m => m.timestamp > cutoff);

    if (recent.length === 0) return { totalRequests: 0 };

    const totalRequests = recent.length;
    const errorRequests = recent.filter(m => m.statusCode >= 400).length;
    const totalDuration = recent.reduce((sum, m) => sum + m.duration, 0);

    return {
      totalRequests,
      averageResponseTime: Math.round(totalDuration / totalRequests),
      errorRate: ((errorRequests / totalRequests) * 100).toFixed(2),
      slowRequests: recent.filter(m => m.duration > this.thresholds.apiResponseTime).length
    };
  }

  getDatabaseMetrics(cutoff) {
    const dbMetrics = this.metrics.get('db_query_time') || [];
    const recent = dbMetrics.filter(m => m.timestamp > cutoff);

    if (recent.length === 0) return { totalQueries: 0 };

    const totalQueries = recent.length;
    const totalDuration = recent.reduce((sum, m) => sum + m.duration, 0);

    return {
      totalQueries,
      averageQueryTime: Math.round(totalDuration / totalQueries),
      slowQueries: recent.filter(m => m.duration > this.thresholds.dbQueryTime).length
    };
  }

  getSystemMetrics(cutoff) {
    const systemMetrics = this.metrics.get('system_resources') || [];
    const recent = systemMetrics.filter(m => m.timestamp > cutoff);

    if (recent.length === 0) return {};

    const memoryUsages = recent.map(m => m.memory.usagePercent);

    return {
      averageMemoryUsage: (memoryUsages.reduce((sum, u) => sum + u, 0) / memoryUsages.length).toFixed(2),
      peakMemoryUsage: Math.max(...memoryUsages).toFixed(2),
      samples: recent.length
    };
  }
}

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor();

// Start system resource monitoring
setInterval(() => {
  performanceMonitor.trackSystemResources();
}, 30000); // Every 30 seconds

module.exports = performanceMonitor;
```

## Load Testing

### 1. Load Testing with Artillery

#### Artillery Configuration
```yaml
# artillery-config.yml
config:
  target: 'https://api.lionfootballacademy.com'
  phases:
    # Warm-up phase
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    
    # Ramp up phase
    - duration: 300
      arrivalRate: 5
      rampTo: 50
      name: "Ramp up load"
    
    # Sustained load phase
    - duration: 600
      arrivalRate: 50
      name: "Sustained load"
    
    # Peak load phase
    - duration: 120
      arrivalRate: 50
      rampTo: 100
      name: "Peak load"
    
    # Cool down phase
    - duration: 60
      arrivalRate: 100
      rampTo: 5
      name: "Cool down"

  payload:
    path: "./test-data.csv"
    fields:
      - "email"
      - "password"
    order: sequence

  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: "Authentication Flow"
    weight: 30
    flow:
      - post:
          url: "/api/v1/auth/login"
          json:
            email: "{{ email }}"
            password: "{{ password }}"
          capture:
            - json: "$.token"
              as: "authToken"
      - get:
          url: "/api/v1/users/me"
          headers:
            Authorization: "Bearer {{ authToken }}"

  - name: "Teams and Training"
    weight: 40
    flow:
      - post:
          url: "/api/v1/auth/login"
          json:
            email: "coach@test.com"
            password: "testpass123"
          capture:
            - json: "$.token"
              as: "authToken"
      - get:
          url: "/api/v1/teams"
          headers:
            Authorization: "Bearer {{ authToken }}"
      - get:
          url: "/api/v1/trainings"
          headers:
            Authorization: "Bearer {{ authToken }}"

  - name: "Performance Data"
    weight: 20
    flow:
      - post:
          url: "/api/v1/auth/login"
          json:
            email: "player@test.com"
            password: "testpass123"
          capture:
            - json: "$.token"
              as: "authToken"
      - get:
          url: "/api/v1/performance/analytics/{{ $randomString() }}"
          headers:
            Authorization: "Bearer {{ authToken }}"

  - name: "Static Assets"
    weight: 10
    flow:
      - get:
          url: "/static/css/main.css"
      - get:
          url: "/static/js/main.js"
      - get:
          url: "/manifest.json"
```

#### Load Testing Scripts
```javascript
// load-test-runner.js
const { spawn } = require('child_process');
const fs = require('fs');

class LoadTestRunner {
  constructor() {
    this.testResults = [];
  }

  async runLoadTest(configFile, outputFile) {
    return new Promise((resolve, reject) => {
      const artillery = spawn('artillery', [
        'run',
        '--config', configFile,
        '--output', outputFile
      ]);

      let output = '';
      let error = '';

      artillery.stdout.on('data', (data) => {
        output += data.toString();
        console.log(data.toString());
      });

      artillery.stderr.on('data', (data) => {
        error += data.toString();
        console.error(data.toString());
      });

      artillery.on('close', (code) => {
        if (code === 0) {
          this.parseResults(outputFile);
          resolve({ success: true, output });
        } else {
          reject({ success: false, error, code });
        }
      });
    });
  }

  parseResults(outputFile) {
    try {
      const results = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      const summary = results.aggregate;

      const analysis = {
        timestamp: new Date(),
        scenarios: summary.scenariosCompleted,
        requests: summary.requestsCompleted,
        responses: {
          total: summary.responses,
          '2xx': summary.codes[200] || 0,
          '4xx': Object.keys(summary.codes)
            .filter(code => code.startsWith('4'))
            .reduce((sum, code) => sum + summary.codes[code], 0),
          '5xx': Object.keys(summary.codes)
            .filter(code => code.startsWith('5'))
            .reduce((sum, code) => sum + summary.codes[code], 0)
        },
        latency: {
          min: summary.latency.min,
          max: summary.latency.max,
          median: summary.latency.median,
          p95: summary.latency.p95,
          p99: summary.latency.p99
        },
        errors: summary.errors || {},
        rps: {
          mean: summary.rps.mean,
          count: summary.rps.count
        }
      };

      this.testResults.push(analysis);
      this.generateReport(analysis);
      
      return analysis;
    } catch (error) {
      console.error('Error parsing results:', error);
    }
  }

  generateReport(analysis) {
    const report = {
      testSummary: {
        status: this.getTestStatus(analysis),
        totalRequests: analysis.requests,
        errorRate: this.calculateErrorRate(analysis),
        averageLatency: analysis.latency.median,
        throughput: analysis.rps.mean
      },
      performanceMetrics: {
        responseTime: {
          p95: analysis.latency.p95,
          p99: analysis.latency.p99,
          target: 1000, // 1 second target
          passed: analysis.latency.p95 < 1000
        },
        throughput: {
          achieved: analysis.rps.mean,
          target: 100, // 100 RPS target
          passed: analysis.rps.mean >= 100
        },
        errorRate: {
          achieved: this.calculateErrorRate(analysis),
          target: 1, // 1% error rate target
          passed: this.calculateErrorRate(analysis) < 1
        }
      },
      recommendations: this.generateRecommendations(analysis)
    };

    console.log('\n=== Load Test Report ===');
    console.log(JSON.stringify(report, null, 2));

    // Save report
    fs.writeFileSync(
      `load-test-report-${new Date().toISOString()}.json`,
      JSON.stringify(report, null, 2)
    );
  }

  getTestStatus(analysis) {
    const errorRate = this.calculateErrorRate(analysis);
    const p95Latency = analysis.latency.p95;

    if (errorRate > 5 || p95Latency > 3000) {
      return 'FAIL';
    } else if (errorRate > 1 || p95Latency > 1000) {
      return 'WARNING';
    } else {
      return 'PASS';
    }
  }

  calculateErrorRate(analysis) {
    const totalResponses = analysis.responses.total;
    const errorResponses = analysis.responses['4xx'] + analysis.responses['5xx'];
    return totalResponses > 0 ? (errorResponses / totalResponses * 100).toFixed(2) : 0;
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    const errorRate = parseFloat(this.calculateErrorRate(analysis));

    if (analysis.latency.p95 > 1000) {
      recommendations.push('High P95 latency detected. Consider optimizing database queries and adding caching.');
    }

    if (errorRate > 1) {
      recommendations.push('High error rate detected. Check application logs and error handling.');
    }

    if (analysis.rps.mean < 50) {
      recommendations.push('Low throughput detected. Consider scaling application instances.');
    }

    if (analysis.latency.p99 > analysis.latency.p95 * 2) {
      recommendations.push('High latency variance detected. Check for resource contention.');
    }

    return recommendations;
  }
}

module.exports = LoadTestRunner;
```

## Performance Budgets

### 1. Performance Budget Definition

#### Budget Configuration
```javascript
// performance-budget.js
const performanceBudgets = {
  // Page load performance
  pageLoad: {
    firstContentfulPaint: 1500,      // 1.5 seconds
    largestContentfulPaint: 2500,    // 2.5 seconds
    firstInputDelay: 100,            // 100ms
    cumulativeLayoutShift: 0.1,      // 0.1 CLS score
    timeToInteractive: 3000,         // 3 seconds
    speedIndex: 2000                 // 2 seconds
  },

  // Resource budgets
  resources: {
    totalSize: 2 * 1024 * 1024,     // 2MB total
    javascript: 500 * 1024,          // 500KB JS
    css: 100 * 1024,                // 100KB CSS
    images: 1 * 1024 * 1024,        // 1MB images
    fonts: 200 * 1024,              // 200KB fonts
    requests: 50                     // 50 total requests
  },

  // API performance
  api: {
    responseTime: {
      p95: 500,                     // 95th percentile < 500ms
      p99: 1000                     // 99th percentile < 1000ms
    },
    errorRate: 1,                   // < 1% error rate
    throughput: 100                 // > 100 requests/second
  },

  // Database performance
  database: {
    queryTime: {
      average: 50,                  // < 50ms average
      p95: 100                      // < 100ms 95th percentile
    },
    connectionPool: {
      utilization: 70,              // < 70% pool utilization
      waitTime: 10                  // < 10ms wait time
    }
  }
};

// Budget monitoring
class PerformanceBudgetMonitor {
  constructor(budgets) {
    this.budgets = budgets;
    this.violations = [];
  }

  checkPageLoadBudget(metrics) {
    const violations = [];

    Object.entries(this.budgets.pageLoad).forEach(([metric, budget]) => {
      if (metrics[metric] > budget) {
        violations.push({
          type: 'pageLoad',
          metric,
          actual: metrics[metric],
          budget,
          severity: this.getSeverity(metrics[metric], budget)
        });
      }
    });

    return violations;
  }

  checkResourceBudget(resources) {
    const violations = [];

    Object.entries(this.budgets.resources).forEach(([resource, budget]) => {
      if (resources[resource] > budget) {
        violations.push({
          type: 'resource',
          metric: resource,
          actual: resources[resource],
          budget,
          severity: this.getSeverity(resources[resource], budget)
        });
      }
    });

    return violations;
  }

  checkAPIBudget(metrics) {
    const violations = [];

    // Check response time
    if (metrics.responseTime.p95 > this.budgets.api.responseTime.p95) {
      violations.push({
        type: 'api',
        metric: 'responseTime.p95',
        actual: metrics.responseTime.p95,
        budget: this.budgets.api.responseTime.p95,
        severity: 'high'
      });
    }

    // Check error rate
    if (metrics.errorRate > this.budgets.api.errorRate) {
      violations.push({
        type: 'api',
        metric: 'errorRate',
        actual: metrics.errorRate,
        budget: this.budgets.api.errorRate,
        severity: 'critical'
      });
    }

    return violations;
  }

  getSeverity(actual, budget) {
    const ratio = actual / budget;
    
    if (ratio > 2) return 'critical';
    if (ratio > 1.5) return 'high';
    if (ratio > 1.2) return 'medium';
    return 'low';
  }

  generateBudgetReport() {
    const allViolations = [
      ...this.violations
    ];

    const report = {
      timestamp: new Date(),
      budgetStatus: allViolations.length === 0 ? 'PASS' : 'FAIL',
      violations: allViolations,
      summary: {
        total: allViolations.length,
        critical: allViolations.filter(v => v.severity === 'critical').length,
        high: allViolations.filter(v => v.severity === 'high').length,
        medium: allViolations.filter(v => v.severity === 'medium').length,
        low: allViolations.filter(v => v.severity === 'low').length
      }
    };

    return report;
  }
}

module.exports = { performanceBudgets, PerformanceBudgetMonitor };
```

## Optimization Checklist

### 1. Frontend Optimization Checklist

```markdown
## Frontend Performance Checklist

### Code Optimization
- [ ] Implement code splitting for routes and components
- [ ] Use React.memo for expensive components
- [ ] Implement useMemo and useCallback for expensive computations
- [ ] Remove unused dependencies and code
- [ ] Enable tree shaking in webpack
- [ ] Minimize bundle size with webpack-bundle-analyzer

### Asset Optimization
- [ ] Optimize images (WebP format, responsive images)
- [ ] Implement lazy loading for images
- [ ] Minify CSS and JavaScript
- [ ] Use font-display: swap for web fonts
- [ ] Enable GZIP/Brotli compression
- [ ] Implement resource preloading for critical assets

### Caching Strategy
- [ ] Implement service worker for offline caching
- [ ] Set appropriate cache headers
- [ ] Use CDN for static assets
- [ ] Implement application-level caching
- [ ] Configure browser caching

### Performance Monitoring
- [ ] Track Core Web Vitals
- [ ] Monitor bundle size and performance budgets
- [ ] Set up performance alerts
- [ ] Regular performance audits with Lighthouse
```

### 2. Backend Optimization Checklist

```markdown
## Backend Performance Checklist

### Database Optimization
- [ ] Analyze and optimize slow queries
- [ ] Implement proper database indexing
- [ ] Configure connection pooling
- [ ] Enable query result caching
- [ ] Monitor database performance metrics

### API Optimization
- [ ] Implement response caching
- [ ] Add request rate limiting
- [ ] Optimize response payloads (remove unnecessary fields)
- [ ] Implement pagination for large datasets
- [ ] Use streaming for large responses

### Server Configuration
- [ ] Configure Node.js performance settings
- [ ] Implement cluster mode for multi-core usage
- [ ] Optimize memory usage and garbage collection
- [ ] Configure reverse proxy (NGINX)
- [ ] Set up load balancing

### Monitoring and Alerting
- [ ] Set up application performance monitoring
- [ ] Configure error tracking and alerting
- [ ] Monitor system resources (CPU, memory, disk)
- [ ] Set up uptime monitoring
- [ ] Regular performance testing
```

This performance guide provides comprehensive strategies for optimizing the Lion Football Academy system across all layers - from frontend user experience to backend API performance and database optimization. Regular performance monitoring and testing should be part of the development workflow to maintain optimal system performance.