# Mobile EAS Secrets Checklist

Use these commands from repository root before cloud builds.

```bash
npx eas secret:create --scope project --name EXPO_PUBLIC_APP_ENV --value production
npx eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value https://missiononehk.vercel.app
npx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://ewddsnfwjmyztckydzzj.supabase.co
npx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <your-anon-key>
npx eas secret:create --scope project --name EXPO_PUBLIC_TELEMETRY_ENABLED --value true
npx eas secret:create --scope project --name EXPO_PUBLIC_MOBILE_TELEMETRY_ENDPOINT --value <optional-endpoint>
npx eas secret:create --scope project --name EXPO_PUBLIC_TELEMETRY_ERROR_SAMPLE_RATE --value 1
npx eas secret:create --scope project --name EXPO_PUBLIC_TELEMETRY_PERF_SAMPLE_RATE --value 0.3
```

Verification:

```bash
npx eas secret:list
npm run mobile:preflight
```
