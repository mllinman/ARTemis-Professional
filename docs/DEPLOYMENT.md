# Deployment Guide for BulletDrop Studios Website

This guide explains how to deploy the BulletDrop Studios website and ARTemis application.

## 📁 Repository Structure

```
/
├── website/              # BulletDrop Studios marketing website
│   ├── index.html       # Homepage
│   ├── pages/           # Additional pages
│   ├── css/             # Stylesheets
│   ├── js/              # JavaScript
│   └── images/          # Website assets
├── src/                 # ARTemis application files
│   ├── login.html       # App authentication
│   └── index.html       # Main app
├── index.html           # Root redirect to website
└── README.md            # Project documentation
```

## 🚀 Deployment Options

### Option 1: GitHub Pages (Recommended)

**Advantages:**
- Free hosting
- Automatic HTTPS
- Easy deployment
- Custom domain support

**Steps:**

1. **Enable GitHub Pages:**
   - Go to repository Settings
   - Navigate to Pages section
   - Set source to `main` branch, `/` (root) folder
   - Click Save

2. **Custom Domain (Optional):**
   - Add a CNAME file with your domain
   - Configure DNS settings with your domain provider
   - Enable HTTPS in GitHub Pages settings

3. **Access:**
   - Website: `https://[username].github.io/ARTemis/`
   - Or: `https://yourdomain.com` (if custom domain configured)

### Option 2: Netlify

**Advantages:**
- Automatic deploys from Git
- Form handling
- Serverless functions
- Instant rollbacks

**Steps:**

1. **Deploy from GitHub:**
   ```bash
   # Connect your GitHub repository to Netlify
   # Or use Netlify CLI:
   npm install -g netlify-cli
   cd /path/to/ARTemis
   netlify deploy
   ```

2. **Configuration:**
   - Build command: (none)
   - Publish directory: `.` (root)
   - Environment variables: (if needed)

3. **Custom Domain:**
   - Add domain in Netlify dashboard
   - Update DNS settings

### Option 3: Vercel

**Advantages:**
- Blazing fast CDN
- Preview deployments
- Automatic HTTPS
- Great developer experience

**Steps:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd /path/to/ARTemis
vercel

# Follow prompts for configuration
```

### Option 4: Traditional Web Hosting

**For cPanel, shared hosting, or VPS:**

1. **Build/Prepare:**
   ```bash
   # No build needed - static files only
   ```

2. **Upload Files:**
   - Upload entire repository to web root
   - Or upload via FTP/SFTP
   - Ensure file permissions are correct (644 for files, 755 for directories)

3. **Configure Web Server:**
   
   **Apache (.htaccess):**
   ```apache
   # Redirect root to website
   DirectoryIndex website/index.html
   
   # Enable gzip compression
   <IfModule mod_deflate.c>
     AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript
   </IfModule>
   
   # Browser caching
   <IfModule mod_expires.c>
     ExpiresActive On
     ExpiresByType image/jpeg "access plus 1 year"
     ExpiresByType image/png "access plus 1 year"
     ExpiresByType text/css "access plus 1 month"
     ExpiresByType application/javascript "access plus 1 month"
   </IfModule>
   ```

   **Nginx:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /var/www/artemis;
       
       location / {
           try_files $uri $uri/ /website/index.html;
       }
       
       # Gzip compression
       gzip on;
       gzip_types text/css application/javascript;
       
       # Browser caching
       location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
           expires 1y;
       }
   }
   ```

## 🔧 Configuration

### Update URLs and Paths

Before deploying, ensure all URLs are correct:

1. **Website files** (`website/index.html`, `website/pages/*.html`):
   - Links to app: `../src/login.html`
   - Links between pages: relative paths

2. **Root index.html**:
   - Redirect URL: `website/index.html`
   - Direct links: `website/index.html` and `src/login.html`

### Add Images

Add required images to `website/images/`:
- `logo.png` - Company logo
- `favicon.png` - Browser icon
- `app-screenshot.png` - Application preview

See `website/images/README.md` for specifications.

### Environment Variables (if needed)

For contact form or other backend features:
```bash
# Example for Netlify/Vercel
CONTACT_EMAIL=info@bulletdropstudios.com
SENDGRID_API_KEY=your-api-key
```

## 📧 Contact Form Setup

The contact form in `website/pages/contact.html` has demo implementation. To make it functional:

### Option A: Formspree
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
  <!-- existing form fields -->
</form>
```

### Option B: Netlify Forms
```html
<form name="contact" method="POST" data-netlify="true">
  <!-- existing form fields -->
</form>
```

### Option C: Custom Backend
Create API endpoint and update form action in JavaScript.

## 🔒 SSL/HTTPS

### GitHub Pages
- Automatically enabled for `.github.io` domains
- Enable in Settings > Pages for custom domains

### Netlify/Vercel
- Automatically enabled for all domains

### Traditional Hosting
- Use Let's Encrypt for free SSL
- Or purchase SSL certificate from hosting provider

## 📊 Analytics (Optional)

### Google Analytics

Add to `<head>` in all pages:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Plausible Analytics (Privacy-friendly alternative)

```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

## 🧪 Testing Before Deployment

### Local Testing

```bash
# Start local server
cd website
python3 -m http.server 8000

# Visit: http://localhost:8000
```

### Test Checklist

- [ ] All pages load correctly
- [ ] Navigation works (all links)
- [ ] Mobile responsive design
- [ ] Images load (or placeholders show)
- [ ] Forms work (or show appropriate message)
- [ ] Links to ARTemis app work
- [ ] Footer links work
- [ ] Browser compatibility (Chrome, Firefox, Safari, Edge)

## 🔄 Continuous Deployment

### GitHub Actions (Example)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
```

## 📱 Progressive Web App (Optional)

To make ARTemis installable:

1. Create `manifest.json`:
```json
{
  "name": "ARTemis - BulletDrop Studios",
  "short_name": "ARTemis",
  "start_url": "/src/login.html",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "website/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "website/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

2. Link in HTML:
```html
<link rel="manifest" href="/manifest.json">
```

3. Add service worker for offline support (optional)

## 🐛 Troubleshooting

### Issue: 404 Errors
- Check file paths are relative
- Ensure files are in correct directories
- Verify web server configuration

### Issue: Images Not Loading
- Check image files exist in `website/images/`
- Verify correct file extensions
- Check case sensitivity (especially on Linux servers)

### Issue: Contact Form Not Working
- Implement one of the form solutions above
- Check browser console for JavaScript errors

### Issue: CSS/JS Not Loading
- Clear browser cache
- Check file paths
- Verify MIME types on server

## 📝 Post-Deployment

1. **Update README:** Add live URL to main README.md
2. **Test Everything:** Full site walkthrough
3. **Monitor:** Set up uptime monitoring
4. **Analytics:** Review traffic and behavior
5. **Iterate:** Gather feedback and improve

## 🔗 Useful Links

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Netlify Documentation](https://docs.netlify.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [Web.dev Best Practices](https://web.dev/)

---

For questions or issues, see `website/pages/contact.html` or open an issue on GitHub.
