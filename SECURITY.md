# Security Configuration

## JWT Verification Setup

This application now uses **proper JWT signature verification** for all Supabase authentication tokens. This prevents token forgery and ensures only valid, authenticated users can access protected endpoints.

### Required Environment Variable

Add the following environment variable to your `.env.local` file:

```bash
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here
```

### How to Get Your Supabase JWT Secret

1. **Go to your Supabase Dashboard**
2. **Navigate to Settings → API**
3. **Find the "JWT Secret" section**
4. **Copy the JWT Secret value**
5. **Add it to your environment variables**

### Example Configuration

```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_jwt_secret
API_KEY=your_api_key
```

### Security Benefits

✅ **Token Signature Verification**: Prevents forged JWT tokens  
✅ **Expiration Checking**: Rejects expired tokens  
✅ **Audience Validation**: Ensures tokens are for "authenticated" users  
✅ **Algorithm Validation**: Only accepts HS256 signed tokens  

### Fallback Behavior

If `SUPABASE_JWT_SECRET` is not configured:
- The application will log a warning
- JWT verification will be disabled
- User-specific filtering will not work
- **This is NOT recommended for production**

### Production Recommendations

1. **Always configure JWT secret in production**
2. **Use environment variables for secrets**
3. **Never commit secrets to version control**
4. **Rotate JWT secrets periodically**
5. **Monitor authentication logs**

## API Authentication Flow

1. **Frontend**: User signs in via Supabase Auth
2. **Frontend**: Gets JWT access token from Supabase
3. **Frontend**: Sends token in `Authorization: Bearer <token>` header
4. **Backend**: Verifies JWT signature with Supabase secret
5. **Backend**: Extracts user ID from verified token
6. **Backend**: Filters data by authenticated user ID

This ensures complete end-to-end authentication with proper security.
