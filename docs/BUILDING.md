# Running ARTemis-Professional

ARTemis-Professional is a web-based application that runs directly in your browser. No compilation or build process is required!

## Prerequisites

### Standalone Browser Mode (Recommended)
- Any modern web browser:
  - Chrome/Chromium 80+
  - Edge 80+
  - Firefox 75+
  - Safari 13.1+
- No additional dependencies required!

### Optional Desktop Mode (Electron)
- Node.js 16+ and npm (only for Electron desktop wrapper)

## Running the Application

### Method 1: Standalone Browser Mode (No Installation)

This is the simplest way to use ARTemis:

1. Clone or download the repository:
   ```bash
   git clone https://github.com/mllinman/ARTemis-Professional.git
   cd ARTemis-Professional
   ```

2. Open the application in your browser:
   - **Option A:** Open `src/index.html` directly in your browser
   - **Option B:** For authentication features, open `src/login.html` first

3. Start creating immediately! All features work in browser mode.

**Advantages:**
- ✅ Zero dependencies - no installation needed
- ✅ Works on any device with a modern browser
- ✅ All features fully functional
- ✅ Works on Windows, macOS, Linux, iOS, Android, ChromeOS

### Method 2: Desktop Mode (Optional Electron Wrapper)

For a native desktop experience with OS-level file dialogs:

```bash
# Install dependencies
npm install

# Run the application
npm start
```

**Desktop app advantages:**
- Native OS file dialogs
- Desktop application window
- OS menu integration

## Deployment Options

### Option 1: Local File Access
Simply double-click `src/index.html` or open it with your browser.

### Option 2: Local Web Server
For the best experience, serve the files through a local web server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js http-server
npx http-server -p 8000

# Then open: http://localhost:8000/src/index.html
```

### Option 3: Deploy to Web Hosting
Upload the entire repository to any web hosting service:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting provider

Users can then access it directly through their web browser!

## System Requirements

### Browser Mode
- **Operating System:** Any (Windows, macOS, Linux, iOS, Android, ChromeOS)
- **Browser:** Modern web browser with HTML5 Canvas support
- **Memory:** 2GB RAM recommended
- **Storage:** ~50MB for application files

### Optional Desktop Mode
- **Operating System:** Windows 10+, macOS 10.13+, or Linux
- **Node.js:** Version 16 or higher
- **Memory:** 4GB RAM recommended

## Recommended Hardware

For the best experience:
- Touch-screen monitor or graphics tablet with pressure sensitivity
- 8GB RAM or more
- Modern GPU for smooth canvas rendering

## Troubleshooting

### Browser Compatibility Issues

If you experience issues:
1. Ensure you're using a modern browser (Chrome/Edge recommended)
2. Clear your browser cache
3. Try opening in an incognito/private window
4. Check the browser console (F12) for error messages

### File Save/Load Issues

The app uses the File System Access API with fallbacks:
- **Chrome/Edge:** Full file system access support
- **Firefox/Safari:** Uses download/upload fallback
- Both methods work, but Chrome/Edge provides a better experience

### Performance Issues

If the canvas is slow:
1. Reduce canvas size
2. Use fewer layers
3. Close unused browser tabs
4. Disable browser extensions
5. Update your graphics drivers

## Development

To modify or develop the application:

1. Edit files in the `src/` directory:
   - `index.html` - UI structure
   - `renderer.js` - Core application logic
   - `styles.css` - Visual styling

2. Refresh your browser to see changes (no build step needed)

3. Use browser developer tools (F12) for debugging

## Security Note

When running locally, some features (like screen-wide eyedropper) may have limitations due to browser security policies. For full functionality, serve the app through a web server rather than opening files directly.
