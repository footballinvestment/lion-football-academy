# Domain and SSL Certificate Setup Guide

## 🌐 Domain Configuration for Lion Football Academy

This guide covers setting up custom domains and SSL certificates for both frontend and backend services.

---

## 📋 Domain Requirements

### Recommended Domain Structure
```
Primary Domain: lionfootballacademy.com
Frontend: app.lionfootballacademy.com
Backend API: api.lionfootballacademy.com
Admin Panel: admin.lionfootballacademy.com
```

### Alternative Structure (Single Domain)
```
Primary Domain: lionfootballacademy.com
Frontend: lionfootballacademy.com
Backend API: lionfootballacademy.com/api
```

---

## 🔧 Vercel Domain Setup (Frontend)

### 1. Add Domain to Vercel Project

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Login to Vercel
vercel login

# Add custom domain
vercel domains add lionfootballacademy.com
vercel domains add app.lionfootballacademy.com
```

### 2. DNS Configuration

Add the following DNS records to your domain registrar:

```dns
# For root domain (lionfootballacademy.com)
Type: A
Name: @
Value: 76.76.19.61

# For subdomain (app.lionfootballacademy.com)
Type: CNAME
Name: app
Value: cname.vercel-dns.com

# For www redirect
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3. SSL Certificate (Automatic)

Vercel automatically provisions SSL certificates for:
- Let's Encrypt certificates
- Automatic renewal
- HTTPS redirect
- HTTP/2 support

### 4. Vercel Environment Variables

Update your Vercel project environment variables:

```bash
# Production environment
REACT_APP_API_URL=https://api.lionfootballacademy.com
REACT_APP_ENV=production

# Set via Vercel dashboard or CLI
vercel env add REACT_APP_API_URL production
```

---

## 🚂 Railway Domain Setup (Backend)

### 1. Add Domain to Railway Project

1. Go to Railway dashboard
2. Select your backend project
3. Navigate to Settings → Domains
4. Add custom domain: `api.lionfootballacademy.com`

### 2. DNS Configuration

Add the following DNS records:

```dns
# For API subdomain
Type: CNAME
Name: api
Value: your-project.railway.app
```

### 3. SSL Certificate (Automatic)

Railway automatically provides:
- Let's Encrypt SSL certificates
- Automatic HTTPS redirect
- Certificate auto-renewal
- HSTS headers

### 4. Railway Environment Variables

Update your Railway environment variables:

```bash
# Set in Railway dashboard
CORS_ORIGIN=https://lionfootballacademy.com,https://app.lionfootballacademy.com
DATABASE_URL=postgresql://[railway-provided]
```

---

## 🔒 Advanced SSL Configuration

### 1. Security Headers

Add to your backend middleware:

```javascript
// backend/src/middleware/security.js
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.lionfootballacademy.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 2. HTTPS Redirect Middleware

```javascript
// Force HTTPS in production
const forceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  next();
};

app.use(forceHTTPS);
```

### 3. CORS Configuration

```javascript
// backend/src/middleware/cors.js
const cors = require('cors');

const corsOptions = {
  origin: [
    'https://lionfootballacademy.com',
    'https://app.lionfootballacademy.com',
    'https://admin.lionfootballacademy.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};

app.use(cors(corsOptions));
```

---

## 📊 Domain Verification & Testing

### 1. DNS Propagation Check

```bash
# Check DNS propagation
dig lionfootballacademy.com
dig app.lionfootballacademy.com
dig api.lionfootballacademy.com

# Check SSL certificate
openssl s_client -connect lionfootballacademy.com:443 -servername lionfootballacademy.com
```

### 2. SSL Certificate Verification

```bash
# Check SSL certificate details
curl -I https://lionfootballacademy.com
curl -I https://api.lionfootballacademy.com

# Check SSL rating
# Visit: https://www.ssllabs.com/ssltest/
```

### 3. Security Headers Test

```bash
# Test security headers
curl -I https://api.lionfootballacademy.com/health

# Should include:
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# x-content-type-options: nosniff
# x-frame-options: DENY
# x-xss-protection: 1; mode=block
```

---

## 🎯 CDN and Performance Optimization

### 1. Vercel CDN (Frontend)

Vercel automatically provides:
- Global CDN distribution
- Edge caching
- Image optimization
- Brotli compression

### 2. Railway CDN (Backend)

For static assets served by backend:

```javascript
// Serve static files with proper caching
app.use('/static', express.static('public', {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));
```

### 3. Cache Control Headers

```javascript
// API responses caching
app.use('/api/public', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  next();
});

app.use('/api/static', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=86400'); // 1 day
  next();
});
```

---

## 🔧 Domain Management Scripts

### 1. Domain Health Check Script

```javascript
// scripts/domain-health-check.js
const axios = require('axios');

const domains = [
  'https://lionfootballacademy.com',
  'https://api.lionfootballacademy.com'
];

async function checkDomains() {
  for (const domain of domains) {
    try {
      const response = await axios.get(domain, { timeout: 5000 });
      console.log(`✅ ${domain}: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${domain}: ${error.message}`);
    }
  }
}

checkDomains();
```

### 2. SSL Certificate Monitoring

```javascript
// scripts/ssl-monitor.js
const https = require('https');

function checkSSL(hostname) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      port: 443,
      method: 'GET',
      timeout: 5000
    }, (res) => {
      const cert = res.connection.getPeerCertificate();
      resolve({
        hostname,
        valid: res.connection.authorized,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        issuer: cert.issuer.CN,
        daysUntilExpiry: Math.floor((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24))
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    req.end();
  });
}

// Usage
checkSSL('lionfootballacademy.com').then(console.log);
```

---

## 🎯 Production Checklist

### Pre-deployment Domain Setup

- [ ] Domain purchased and configured
- [ ] DNS records added and propagated
- [ ] Vercel domain added and verified
- [ ] Railway domain added and verified
- [ ] SSL certificates active and valid
- [ ] Security headers configured
- [ ] CORS origins updated
- [ ] Environment variables updated with production URLs

### Post-deployment Verification

- [ ] Frontend loads on custom domain
- [ ] API endpoints accessible via custom domain
- [ ] HTTPS redirect working
- [ ] SSL certificate valid (A+ rating)
- [ ] Security headers present
- [ ] CORS working for cross-origin requests
- [ ] CDN caching working
- [ ] Performance optimization active

### Monitoring Setup

- [ ] Domain health checks configured
- [ ] SSL certificate expiry monitoring
- [ ] DNS monitoring setup
- [ ] Performance monitoring active
- [ ] Error tracking for domain issues

---

## 📞 Troubleshooting

### Common Issues

1. **DNS Propagation Delays**
   - Wait 24-48 hours for full propagation
   - Use DNS checker tools
   - Clear local DNS cache

2. **SSL Certificate Issues**
   - Verify domain ownership
   - Check DNS records
   - Contact platform support

3. **CORS Errors**
   - Update environment variables
   - Check origin configuration
   - Verify protocol (HTTP vs HTTPS)

4. **Performance Issues**
   - Enable CDN
   - Configure caching headers
   - Optimize assets

### Support Resources

- **Vercel Documentation**: https://vercel.com/docs/concepts/projects/domains
- **Railway Documentation**: https://docs.railway.app/deploy/custom-domains
- **SSL Labs Tester**: https://www.ssllabs.com/ssltest/
- **DNS Checker**: https://dnschecker.org/

---

## 🎉 Success Metrics

Your domain setup is successful when:

- ✅ All domains resolve correctly
- ✅ SSL certificates are valid and secure
- ✅ Security headers are properly configured
- ✅ Performance optimization is active
- ✅ Monitoring and alerting are working
- ✅ Users can access the application reliably

**Note**: This setup provides enterprise-grade domain and SSL configuration suitable for production deployment.