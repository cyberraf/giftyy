# Production Readiness Checklist

## ✅ Completed Changes

### 1. App Configuration (`app.json`)
- ✅ Updated package name from `com.anonymous.giftyy` to `com.giftyy.app`
- ✅ Updated iOS bundle identifier to `com.giftyy.app`
- ✅ Added app description: "Making gifting fun and memorable"
- ✅ Added primary color: `#f75507`
- ✅ Set privacy to "public"
- ✅ Added SDK version
- ✅ Removed duplicate permission (`android.permission.CAMERA`)
- ✅ Added Play Store URL placeholder
- ✅ Added privacy policy URL placeholder (⚠️ **UPDATE THIS**)

### 2. EAS Build Configuration (`eas.json`)
- ✅ Configured production build to use AAB format (recommended for Play Store)
- ✅ Added `autoIncrement` for version codes
- ✅ Added production environment variable

### 3. Code Cleanup
- ✅ Wrapped all console.log statements in `__DEV__` checks in `app/index.tsx`
- ✅ Development-only code is properly guarded

## ⚠️ Action Items Before Deploying

### 1. Update Privacy Policy URL
**File:** `app.json` (line 40)

Update the privacy policy URL to your actual privacy policy:
```json
"privacyPolicyUrl": "https://yourdomain.com/privacy-policy"
```

### 2. Verify Environment Variables
Ensure these are set in EAS Secrets:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OPENAI_API_KEY` (if used)

**Command to set secrets:**
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value your_url
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your_key
```

### 3. Play Store Assets Required
Prepare these assets for Play Store Console:
- **Feature Graphic**: 1024x500 pixels
- **Screenshots**: At least 2, up to 8 (phone and tablet)
- **App Icon**: 512x512 pixels (already configured)
- **High-res icon**: 1024x1024 pixels

### 4. Play Store Listing Information
Complete in Google Play Console:
- App name and description
- Short description (80 characters max)
- Full description (4000 characters max)
- Category selection
- Content rating questionnaire
- Data safety form
- Target audience
- Pricing and distribution countries

### 5. Build Production AAB
```bash
# Build production Android App Bundle
eas build --platform android --profile production

# This will:
# - Use AAB format (recommended for Play Store)
# - Auto-increment version code
# - Use production environment variables
# - Create a signed release build
```

### 6. Test Production Build
Before submitting:
- [ ] Test on multiple Android devices/versions
- [ ] Verify all features work (sign-up, checkout, video recording)
- [ ] Test with production Supabase credentials
- [ ] Verify error handling works without dev tools
- [ ] Test deep linking (QR codes, password reset)
- [ ] Verify video upload and playback
- [ ] Test checkout flow end-to-end

### 7. Submit to Play Store
```bash
# After building, submit to Play Store
eas submit --platform android

# Or manually upload the AAB from:
# - EAS Build dashboard
# - Or local build location
```

## 📋 Additional Recommendations

### Security
- ✅ Console logs are wrapped in `__DEV__` checks
- ✅ No hardcoded API keys (using environment variables)
- ⚠️ Consider adding error tracking (Sentry, etc.) for production

### Performance
- ✅ Code obfuscation handled by EAS Build automatically
- ✅ ProGuard/R8 optimization enabled by default

### Analytics (Optional)
- Consider adding analytics (Firebase Analytics, Mixpanel, etc.)
- Track key user events (sign-ups, purchases, video uploads)

### App Signing
- EAS handles app signing automatically
- Ensure Google Play App Signing is enabled in Play Console

## 🚀 Deployment Steps

1. **Update Privacy Policy URL** in `app.json`
2. **Verify environment variables** are set in EAS
3. **Build production AAB**: `eas build --platform android --profile production`
4. **Test the production build** thoroughly
5. **Prepare Play Store assets** (screenshots, feature graphic)
6. **Complete Play Store listing** in Google Play Console
7. **Submit for review**: `eas submit --platform android` or upload manually

## 📝 Notes

- Version code will auto-increment with each build (currently at 7)
- App version is `1.0.0` (semantic version for users)
- Package name changed to `com.giftyy.app` (ensure this matches your Play Console app)
- All development console logs are properly guarded and won't appear in production

## ⚠️ Important Reminders

1. **Privacy Policy**: Must be accessible and complete before submission
2. **Data Safety**: Complete the data safety form in Play Console accurately
3. **Content Rating**: Complete the content rating questionnaire
4. **Testing**: Test thoroughly on real devices before submission
5. **Version Code**: First production build will use version code 7 (or higher if auto-incremented)

