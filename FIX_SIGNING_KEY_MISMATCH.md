# Fix Signing Key Mismatch Error

## Problem
The build is using the wrong signing key. Google Play Console expects:
- **Expected SHA1**: `65:DC:47:48:DC:31:41:51:B2:3C:D3:DE:BC:47:E8:01:7B:6F:45:56`
- **Found SHA1**: `69:63:34:C1:A2:D4:00:86:89:C8:5F:40:A1:17:F9:71:17:75:B3:8F`

## Solution

You need to use the **`t56Br0V6By`** keystore credentials (which has the expected SHA1) for your builds.

### Steps to Fix:

1. **Run the credentials command:**
   ```bash
   eas credentials
   ```

2. **Select:**
   - Platform: `Android`
   - Build profile: `internal` (or `production` if submitting to production)

3. **Select:** `Keystore: Manage everything needed to build your project`

4. **Select:** `Use an existing keystore`

5. **Select:** `Build Credentials t56Br0V6By` (the one with SHA1: `65:DC:47:48...`)

6. **Set it as default:** When prompted, select `yes` to set it as default

7. **Repeat for production profile** if needed:
   - Go back and select `production` profile
   - Do the same steps to set `t56Br0V6By` as default

### Verify

After setting the credentials, verify by running:
```bash
eas credentials
```

Select Android → internal (or production), and confirm that `t56Br0V6By` is marked as "(Default)".

### Rebuild and Submit

After setting the correct credentials:
1. Rebuild your app: `eas build --platform android --profile internal`
2. Submit: `eas submit --platform android --profile internal`

The signing key error should be resolved.

## Important Notes

- **Never delete the `t56Br0V6By` keystore** - it's the one registered with Google Play Console
- The `OIwaYXjYYC` keystore you just created won't work because Play Console doesn't recognize it
- All future builds must use the `t56Br0V6By` keystore for this app

