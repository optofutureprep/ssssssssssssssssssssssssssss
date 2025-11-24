# Script Error Troubleshooting Guide

## Errors Fixed ✅
1. **Duplicate STORAGE_KEY declaration** - Fixed by removing duplicate script.js loading
2. **Null safety in highlight functions** - Fixed by adding passageKey checks

## Current "Script error" Issue

"Script error" is a generic browser error message. Here's how to diagnose it:

### Step 1: Check Browser Console
1. Open http://localhost:8080/index.html
2. Press F12 to open Developer Tools
3. Click on the **Console** tab
4. Look for the actual error message (it will be more specific than "Script error")

### Step 2: Check Network Tab
1. In Developer Tools, click the **Network** tab
2. Refresh the page (Ctrl+R or F5)
3. Look for any files highlighted in **red** (these failed to load)
4. Click on any red entries to see the error details

### Common Causes:

#### 1. Missing Files (404 Errors)
If you see 404 errors in the Network tab:
- `init_tests.js` - This file might not exist
- `genchem_tests.js` - This file might not exist
- `db-wrapper.js` - This file might not exist

**Solution**: These files might be optional. We can comment them out if they don't exist.

#### 2. JavaScript Syntax Error in Loaded Files
The error might be in one of the exam data files.

**Solution**: Check each .js file for syntax errors using:
```bash
node -c "filename.js"
```

#### 3. React/Babel Loading Issues
The app uses React and Babel loaded from CDN. If CDN is slow or blocked:

**Solution**: Wait for external scripts to load, or check internet connection.

### Quick Fix to Try:

Check if these files exist:
- `init_tests.js`
- `genchem_tests.js`  
- `db-wrapper.js`
- `auth/instantdb-auth.js`

If any are missing, we need to comment out their `<script>` tags in index.html.

### Next Steps:
1. Share the FULL error message from the browser console
2. Share any red (failed) requests from the Network tab
3. I can then provide a specific fix
