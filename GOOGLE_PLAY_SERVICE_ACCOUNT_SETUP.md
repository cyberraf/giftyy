# Google Play Service Account Setup Guide

## Important Note

**Google has updated the Play Console interface.** The "API access" section has been removed. You now need to invite service accounts through **"Users and permissions"** instead.

## Service Account Information

**Service Account Email:** `giftyy@store-loc-293307.iam.gserviceaccount.com`

## Required Permissions

Your service account needs **Release Manager** or **Admin** access in Google Play Console to submit apps.

## Step-by-Step Instructions

### 1. Access Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app (or create it if it doesn't exist)

### 2. Navigate to Users and Permissions

**Important:** Google has updated the Play Console interface. The "API access" section has been removed. You now use "Users and permissions" instead.

1. Click on **Settings** (gear icon) in the left sidebar
2. Click on **Users and permissions** (NOT "API access" - that section no longer exists)
3. You'll see a list of users with access to your app

### 3. Grant Service Account Access

**Invite Service Account as a User:**

1. Click **Invite new users** (button at the top or in the users list)
2. Enter the service account email: `giftyy@store-loc-293307.iam.gserviceaccount.com`
3. **Select App Permissions:** Check the app(s) you want to grant access to
4. **Select Role:** Choose **Release manager** (or **Admin** for full access)
   - **Release manager**: Can manage app releases and track releases (Recommended)
   - **Admin**: Full access to the app (Use if Release manager doesn't work)
5. Click **Invite user** or **Send invitation**

**Note:** If the service account is already listed but doesn't have permissions:
1. Click on the service account email in the list
2. Click **Manage permissions** or **Edit access**
3. Grant the appropriate role and save

### 4. Required Roles Explained

- **Release manager**: Can manage app releases and track releases (Recommended)
- **Admin**: Full access to the app (Use if Release manager doesn't work)

### 5. Verify Permissions

After granting access, verify:
1. The service account email appears in the **Users and permissions** list
2. Status shows as "Active" or "Accepted"
3. The role shows as "Release manager" or "Admin" under the app permissions
4. The app is listed under "Apps with access" for that service account

## Common Issues

### Issue: "Missing necessary permissions"

**Solution:** Make sure you:
- Granted the service account access in Play Console (not just created it in Google Cloud Console)
- Selected the correct role (Release manager or Admin)
- The app exists in Play Console with the correct package name: `com.giftyy.app`

### Issue: Service account not found

**Solution:** 
1. Make sure you're in the correct Google Play Console account
2. The service account email must match exactly: `giftyy@store-loc-293307.iam.gserviceaccount.com`
3. Check that you've created the app in Play Console with package name `com.giftyy.app`

## Testing the Setup

After granting permissions, test with:

```bash
eas submit --platform android --profile internal
```

This should now work without permission errors.

## Additional Resources

- [EAS Submit Documentation](https://docs.expo.dev/submit/android/)
- [Google Play API Access Guide](https://support.google.com/googleplay/android-developer/answer/6112435)
- [Fastlane Service Account Setup](https://docs.fastlane.tools/getting-started/android/setup/#collect-your-google-credentials)

