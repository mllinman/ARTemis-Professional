# BulletDrop Studios Website

Professional website for BulletDrop Studios showcasing the ARTemis digital painting application.

## 🌐 Website Structure

```
website/
├── index.html              # Homepage
├── css/
│   └── main.css           # Main stylesheet
├── js/
│   └── main.js            # JavaScript for navigation and interactions
├── images/
│   ├── README.md          # Image guidelines
│   ├── logo.png           # Company logo (add your own)
│   ├── favicon.png        # Website favicon (add your own)
│   └── app-screenshot.png # App screenshot (add your own)
└── pages/
    ├── features.html      # Features showcase
    ├── pricing.html       # Pricing and subscription plans
    ├── about.html         # About BulletDrop Studios
    ├── docs.html          # Documentation hub
    ├── contact.html       # Contact form and information
    ├── privacy.html       # Privacy policy
    └── terms.html         # Terms of service
```

## 🚀 Quick Start

### Option 1: Direct Browser Access (Recommended)

Simply open `index.html` in any modern web browser:

```bash
# Navigate to website directory
cd website

# Open in browser (macOS)
open index.html

# Open in browser (Linux)
xdg-open index.html

# Open in browser (Windows)
start index.html
```

### Option 2: Local Web Server

For better testing with relative paths:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (npx)
npx serve .

# Then visit: http://localhost:8000
```

## 📄 Pages Overview

### Homepage (`index.html`)
- Hero section with call-to-action
- Feature overview grid
- Key features showcase
- Pricing teaser
- CTA section

### Features Page (`pages/features.html`)
- Comprehensive feature list
- Detailed tool descriptions
- Brush system overview
- Layer management details
- Professional tools showcase

### Pricing Page (`pages/pricing.html`)
- Basic (Free) and Pro ($5/month) tiers
- Detailed feature comparison table
- FAQ section
- Subscription information

### About Page (`pages/about.html`)
- Company mission and vision
- Our story and values
- Technology stack
- Statistics and metrics

### Documentation (`pages/docs.html`)
- Quick start guide
- Links to detailed documentation
- Keyboard shortcuts reference
- Support resources

### Contact Page (`pages/contact.html`)
- Contact form (demo implementation)
- Email addresses for different departments
- Link to GitHub repository

### Legal Pages
- **Privacy Policy** (`pages/privacy.html`) - Data collection and usage
- **Terms of Service** (`pages/terms.html`) - User agreement and terms

## 🎨 Customization

### Adding Images

1. Add your logo to `images/logo.png`
2. Add a favicon to `images/favicon.png`
3. Add app screenshots to `images/app-screenshot.png`

See `images/README.md` for image specifications.

### Updating Content

Edit the HTML files directly:
- Update company information in footer sections
- Modify pricing in `pages/pricing.html`
- Update feature lists in `pages/features.html`
- Customize legal pages with your specific terms

### Styling

Customize appearance in `css/main.css`:
- Color scheme (CSS variables in `:root`)
- Typography and fonts
- Layout and spacing
- Responsive breakpoints

### JavaScript Functionality

Extend interactivity in `js/main.js`:
- Navigation behavior
- Form handling (contact form currently has demo implementation)
- Animations and transitions
- Additional features

## 🔗 Integration with ARTemis App

The website links to the ARTemis application at:
- `../src/login.html` - Login/authentication page
- `../src/index.html` - Main application

Update these paths if your ARTemis installation is located elsewhere.

## 📱 Responsive Design

The website is fully responsive with breakpoints at:
- **Mobile**: < 768px
- **Tablet**: 768px - 968px
- **Desktop**: > 968px

Test on different devices and screen sizes to ensure proper display.

## 🌟 Features

### Navigation
- Sticky header
- Mobile hamburger menu
- Active page highlighting
- Smooth scrolling

### UI/UX
- Modern gradient hero sections
- Card-based layouts
- Hover animations
- Professional color scheme
- Glassmorphism effects

### Performance
- Minimal dependencies
- Pure CSS animations
- Optimized images (when added)
- Fast loading times

### SEO
- Semantic HTML5
- Meta descriptions
- Proper heading hierarchy
- Alt text for images

### Accessibility
- ARIA labels
- Keyboard navigation
- Color contrast compliance
- Screen reader friendly

## 🛠️ Development

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Text editor or IDE
- Optional: Local web server for testing

### Best Practices
- Keep HTML semantic and clean
- Use CSS variables for theming
- Minimize JavaScript dependencies
- Optimize images before adding
- Test on multiple browsers
- Validate HTML/CSS

### Browser Compatibility
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## 📊 Analytics (Optional)

To add analytics, insert tracking code before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR-ID');
</script>
```

## 📧 Contact Form Implementation

The contact form in `pages/contact.html` currently has a demo implementation. To make it functional:

1. **Backend API**: Create a server endpoint to handle form submissions
2. **Email Service**: Use services like SendGrid, Mailgun, or AWS SES
3. **Serverless**: Use AWS Lambda, Netlify Functions, or similar
4. **Form Services**: Use Formspree, Basin, or Google Forms

Example with Formspree:
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

## 🚀 Deployment

### GitHub Pages
```bash
# Push to GitHub
git add website/
git commit -m "Add BulletDrop Studios website"
git push

# Enable GitHub Pages in repository settings
# Set source to main branch, /website folder
```

### Netlify
1. Connect your GitHub repository
2. Set build command: (none)
3. Set publish directory: `website`
4. Deploy!

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd website
vercel
```

### Custom Server
Upload the `website/` directory contents to your web server via FTP/SFTP.

## 📝 TODO

- [ ] Add actual logo and favicon images
- [ ] Add app screenshots
- [ ] Implement functional contact form backend
- [ ] Add blog section (optional)
- [ ] Add customer testimonials
- [ ] Add gallery of user artwork
- [ ] Integrate real payment processing
- [ ] Add newsletter signup
- [ ] Implement search functionality
- [ ] Add multi-language support

## 🤝 Contributing

Contributions are welcome! To improve the website:

1. Edit HTML/CSS/JS files
2. Test changes locally
3. Submit pull request with description

## 📄 License

MIT License - See main project LICENSE file

## 🔗 Related Links

- [ARTemis Application](../src/index.html)
- [Main README](../README.md)
- [GitHub Repository](https://github.com/mllinman/ARTemis)
- [Business Plan](../BUSINESS_PLAN.md)

---

Made with ❤️ by BulletDrop Studios
