Race Timer Website (Sporty Theme)
Files:
- admin.html : Admin control panel (start/stop/reset timer, add/delete drivers)
- user.html  : Viewer page (read-only)
- script.js  : Shared JavaScript (uses Firebase Realtime DB - compat SDK)
- style.css  : Red/black racing theme
- firebase is included inline in both HTML files (firebase.js content embedded)

How to use:
1. Place all files in the same folder and open admin.html and user.html in your browser.
2. Make sure your Firebase Realtime Database rules allow read/write during testing, or configure the rules and hosting.
   Example test rules (not for production):
   {
  "rules": {
    ".read": true,
    ".write": true
  }
}
3. To use your own Firebase project, replace the config object inside the firebase script in the HTML files.

Notes:
- This package uses the Firebase compat SDK so it works from local file:// or simple hosting.
- If you host the pages, ensure Firebase Realtime Database is enabled and you set the correct project config.
