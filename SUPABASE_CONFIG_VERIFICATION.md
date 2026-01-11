# Supabase Configuration Verification Guide

## Environment Variables Required

The app requires these environment variables in `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### How to Get These Values:
1. Go to https://app.supabase.com
2. Select your project
3. Go to **Project Settings** → **API**
4. Copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## Supabase Redirect URLs Configuration

You need to add these redirect URLs in your Supabase project:

### Required Redirect URLs:

1. **OAuth Callback** (for Google Sign-In):
   - `giftyy://auth/callback`
   - In development (Expo Go): `exp://localhost:8081`
   - In development (Dev Client): `exp://127.0.0.1:8081`
   - In development (Network): `exp://YOUR_IP:8081` (e.g., `exp://192.168.1.153:8081`)

2. **Password Reset**:
   - `giftyy://reset-password`

### How to Configure:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. In the **"Redirect URLs"** section, click **"Add URL"** and add:
   - `giftyy://auth/callback`
   - `giftyy://reset-password`
   - `exp://localhost:8081` (for local development)
   - `exp://127.0.0.1:8081` (for local development)
5. **Optional but Recommended**: Set **Site URL** to `giftyy://` (for password reset emails)
6. Click **"Save"**

---

## Verification Checklist

- [ ] `.env.local` file exists in project root
- [ ] `EXPO_PUBLIC_SUPABASE_URL` is set and valid
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` is set and valid
- [ ] `giftyy://auth/callback` is in Supabase Redirect URLs
- [ ] `giftyy://reset-password` is in Supabase Redirect URLs
- [ ] Development redirect URLs are added (if testing locally)
- [ ] Site URL is set to `giftyy://` (optional, for password reset)

---

## Testing the Configuration

After configuring, you can test:

1. **Supabase Connection**: The app should connect to Supabase without errors
2. **Google Sign-In**: Try signing in with Google - should redirect back to the app
3. **Password Reset**: Try resetting a password - email link should open the app

---

## Common Issues

### "supabaseUrl is required" error
- **Solution**: Make sure `.env.local` exists with `EXPO_PUBLIC_SUPABASE_URL` set
- Restart Expo server after adding environment variables

### "giftyy://auth/callback is not in Supabase Redirect URLs"
- **Solution**: Add `giftyy://auth/callback` to Supabase Redirect URLs in Authentication settings
- For development, also add the Expo Go URL (e.g., `exp://192.168.1.153:8081`)

### OAuth redirect not working
- **Check**: The redirect URL format must match exactly
- **Check**: Make sure you're using a development build, not Expo Go (for native modules)
- **Check**: The redirect URL in Supabase matches what's logged in the console

---

## Current Configuration Status

Run these commands to verify:

```bash
# Check if .env.local exists
ls -la .env.local

# Check environment variables (if .env.local exists)
grep -E "EXPO_PUBLIC_SUPABASE" .env.local || echo "No Supabase env vars found"
```

Note: You'll need to manually verify the Supabase dashboard settings.
