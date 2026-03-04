# carolina-futons-mobile

React Native mobile app for Carolina Futons — AR camera, product browsing, cart, and checkout.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your Stripe and Wix API keys (see .env.example for details)

# 3. Start the dev server
npx expo start
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key — app crashes without it |
| `EXPO_PUBLIC_WIX_CLIENT_ID` | Wix OAuth client ID |
| `EXPO_PUBLIC_WIX_API_KEY` | Wix REST API key |
| `EXPO_PUBLIC_WIX_SITE_ID` | Wix site ID |

See [`.env.example`](.env.example) for all variables and where to obtain them.
