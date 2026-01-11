# Supabase Configuration Checklist

## ✅ Quick Verification

### 1. Environment Variables (`.env.local`)

Your `.env.local` file exists. Verify it contains:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Status**: File exists - ✓

### 2. Required Redirect URLs in Supabase Dashboard

Add these URLs in your Supabase project:

#### **OAuth Callback URLs:**
- `giftyy://auth/callback` (Production/Development Build)
- `exp://localhost:8081` (Development - Expo Go local)
- `exp://127.0.0.1:8081` (Development - Expo Go local alternative)
- `exp://YOUR_IP:8081` (Development - Expo Go on network, check console for exact IP)

#### **Password Reset URL:**
- `giftyy://reset-password`

### 3. How to Configure in Supabase:

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. **Select your project**
3. **Navigate to**: Authentication → URL Configuration
4. **Add Redirect URLs**: Click "Add URL" and add all URLs listed above
5. **Set Site URL** (Optional but recommended): Set to `giftyy://`
6. **Save** the configuration

---

## 📋 Configuration Checklist

- [ ] `.env.local` file exists with both environment variables
- [ ] `EXPO_PUBLIC_SUPABASE_URL` is set (check format: `https://xxxxx.supabase.co`)
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` is set (check format: starts with `eyJ...`)
- [ ] `giftyy://auth/callback` added to Supabase Redirect URLs
- [ ] `giftyy://reset-password` added to Supabase Redirect URLs
- [ ] Development URLs added (if testing locally)
- [ ] Site URL set to `giftyy://` (optional)

---

## 🔍 How to Verify Configuration

### Check Environment Variables:
```bash
# Check if file exists and has required vars
grep "EXPO_PUBLIC_SUPABASE" .env.local

# Verify URL format (should be https://xxx.supabase.co)
grep "EXPO_PUBLIC_SUPABASE_URL" .env.local
```

### Test in App:
1. **Start the app**: `npx expo start`
2. **Check console logs**: Look for:
   - `[Supabase] Environment check:` - Should show URL and Key as "exists: true"
   - If you see errors about missing environment variables, check `.env.local`
3. **Test OAuth**: Try Google sign-in and check console for redirect URI
4. **Test Password Reset**: Try forgot password flow

---

## ⚠️ Common Issues

### "supabaseUrl is required" Error
- **Solution**: Make sure `.env.local` exists and has `EXPO_PUBLIC_SUPABASE_URL` set
- **Action**: Restart Expo server after adding environment variables

### "giftyy://auth/callback is not in Supabase Redirect URLs"
- **Solution**: Add `giftyy://auth/callback` to Supabase Redirect URLs
- **Note**: The exact URL format is logged in console when OAuth is initiated
- **Action**: Copy the exact URL from console logs and add it to Supabase

### OAuth Callback Not Working
- **Check**: Redirect URL in Supabase must match exactly what's logged in console
- **Check**: Make sure you're using a development build (not Expo Go) for native modules
- **Check**: Development URLs might need to include IP address (e.g., `exp://192.168.1.153:8081`)

---

## 📝 Notes

- **Development vs Production**: Different redirect URLs are needed for development (Expo Go) vs production (dev client)
- **Expo Go Limitations**: Some features (like camera) require a development build, not Expo Go
- **URL Format**: The redirect URL is generated using `makeRedirectUri()` - check console logs for the exact format
- **Restart Required**: Always restart Expo server after changing `.env.local` file

---

## 🚀 Next Steps

1. ✅ Verify `.env.local` has both required environment variables
2. ✅ Add redirect URLs to Supabase Dashboard
3. ✅ Restart Expo server
4. ✅ Test OAuth flow
5. ✅ Test password reset flow
