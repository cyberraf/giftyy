# Fix: "The Android App Bundle was signed with the wrong key" Error

## Problem

You're seeing this error:
```
The Android App Bundle was signed with the wrong key.
Found: SHA1: 69:63:34:C1:A2:D4:00:86:89:C8:5F:40:A1:17:F9:71:17:75:B3:8F
Expected: SHA1: 65:DC:47:48:DC:31:41:51:B2:3C:D3:DE:BC:47:E8:01:7B:6F:45:56
Package name: com.anonymous.giftyy
```

Your `app.json` has `package: "com.giftyy.app"`, but the error shows `com.anonymous.giftyy`.

## Root Cause

There's a mismatch between:
1. **The package name** in your app (`com.giftyy.app`)
2. **The app in Google Play Console** (likely `com.anonymous.giftyy` with a different signing key)
3. **The signing key** EAS is using vs. what Play Console expects

## Solution Options

### Option 1: Create a New App in Play Console (Recommended if starting fresh)

If this is a new app submission:

1. **Go to Google Play Console**: [https://play.google.com/console](https://play.google.com/console)

2. **Create a new app**:
   - Click "Create app"
   - Enter app name: "Giftyy"
   - Default language: Your language
   - App or game: App
   - Free or paid: Free
   - **Declarations**: Complete the required declarations (content rating, privacy policy, etc.)

3. **Set the package name**: When creating the app, ensure the package name matches exactly: `com.giftyy.app`

4. **Use App Signing by Google Play** (Recommended):
   - When you upload your first AAB, Google Play will manage the signing key
   - This means EAS can use any signing key, and Google will re-sign it
   - This is the easiest approach for new apps

5. **Upload your AAB**:
   ```bash
   eas submit --platform android --profile internal
   ```

### Option 2: Update Package Name to Match Existing App

If you have an existing app in Play Console with `com.anonymous.giftyy`:

1. **Update `app.json`** to use the existing package name:
   ```json
   "android": {
     "package": "com.anonymous.giftyy"
   }
   ```

2. **Rebuild the app**:
   ```bash
   eas build --platform android --profile internal
   ```

3. **Submit again**:
   ```bash
   eas submit --platform android --profile internal
   ```

**Note**: This will break deep links if you've already configured them with `com.giftyy.app`.

### Option 3: Check EAS Credentials and Use Matching Key

If the app in Play Console already exists and has App Signing enabled:

1. **Check if App Signing by Google Play is enabled**:
   - Go to Play Console → Your App → Setup → App integrity
   - Look for "App signing by Google Play" section
   - If enabled, Google manages the signing key automatically

2. **Check EAS credentials**:
   ```bash
   eas credentials
   ```
   - Select Android
   - View the current credentials
   - Check if there are multiple keystores

3. **If App Signing is enabled**, you should be able to upload with any key, and Google will re-sign it automatically.

### Option 4: Reset App Signing (Advanced - Use with Caution)

**⚠️ Warning**: This is only possible if you haven't published the app to production yet.

1. **Delete the existing app** in Play Console (if it's in draft/unpublished state)

2. **Create a new app** with package name `com.giftyy.app`

3. **Upload your AAB** with the new signing key

## Recommended Steps (For New App)

1. **Verify your package name** in `app.json` is `com.giftyy.app` ✅ (Already correct)

2. **Create a new app in Google Play Console**:
   - Package name: `com.giftyy.app`
   - Name: Giftyy
   - Enable "App Signing by Google Play" (default for new apps)

3. **Rebuild your app** (to ensure it uses the correct package name):
   ```bash
   eas build --platform android --profile internal
   ```

4. **Submit to the new app**:
   ```bash
   eas submit --platform android --profile internal
   ```

## Verify Your Build Configuration

Check that your build is using the correct package name:

1. After building, download the AAB from EAS
2. Use `bundletool` or check the build logs to verify the package name
3. Or check the EAS build page - it should show the package name

## Common Questions

**Q: Can I change the package name after publishing?**
A: No, package names cannot be changed after publishing. You'd need to create a new app.

**Q: Why is the package name different in the error?**
A: The app in Play Console might have been created with `com.anonymous.giftyy` (possibly from an earlier build or test).

**Q: What if I want to keep using `com.anonymous.giftyy`?**
A: Update `app.json` to use that package name, rebuild, and submit. But `com.giftyy.app` is better for branding.

## Next Steps

1. Check what apps exist in your Google Play Console
2. Decide whether to:
   - Create a new app with `com.giftyy.app` (recommended)
   - Or use the existing `com.anonymous.giftyy` app
3. Ensure App Signing by Google Play is enabled
4. Rebuild and resubmit

