# Fayda National ID (eSignet) Integration Manifest

This document outlines the technical requirements and implementation steps for integrating CityLink as a Relying Party (RP) with the Fayda National ID system, based on the [eSignet/MOSIP OIDC standards](https://docs.esignet.io).

## 1. Connection Prerequisites
Before production "lock-in", the following credentials must be obtained from the National ID Program (NIDP):
- **Client ID**: The unique identifier for CityLink.
- **Private/Public Key Pair**: RSA or EC keys for `private_key_jwt` authentication.
- **Redirect URI**: Must be pre-registered (e.g., `citylink://auth/fayda/callback`).

## 2. OIDC Endpoints (Dynamic Discovery)
Endpoints should be fetched dynamically from:
`GET https://[FAYDA_DOMAIN]/.well-known/openid-configuration`

### Core Endpoints:
- **Authorization**: `/authorize` (Starts the user login/consent)
- **Token**: `/oauth/v2/token` (Exchanges code for JWTs)
- **UserInfo**: `/oidc/userinfo` (Returns verified identity claims)
- **JWKS**: `/.well-known/jwks.json` (Public keys for signature verification)

## 3. Implementation Flow

### Step A: Authorization Redirect
Redirect the citizen to the Fayda Authorization page with the following parameters:
```
GET /authorize?
  client_id=CITYLINK_CLIENT_ID&
  response_type=code&
  scope=openid profile phone&
  redirect_uri=citylink://auth/fayda/callback&
  state=[SECURE_RANDOM_STATE]&
  nonce=[SECURE_RANDOM_NONCE]&
  acr_values=mosip:idp:acr:biometrics
```

### Step B: Code Exchange (Back-channel)
Exchange the authorization `code` for tokens using the Fayda token endpoint.

**Request**: `POST /oauth/v2/token` with form-encoded parameters:
```
grant_type=authorization_code
code=[AUTHORIZATION_CODE_FROM_CALLBACK]
redirect_uri=citylink://auth/fayda/callback
client_id=CITYLINK_CLIENT_ID
client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
client_assertion=[SIGNED_JWT]
```

**Client Assertion JWT**: A JWT signed with CityLink's private key containing:
- `iss`: CITYLINK_CLIENT_ID
- `sub`: CITYLINK_CLIENT_ID  
- `aud`: Fayda token endpoint URL (e.g., `https://[FAYDA_DOMAIN]/oauth/v2/token`)
- `jti`: Unique JWT ID (UUID)
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp (max 5 minutes from iat)

**Generation**: Sign the JWT header + payload with CityLink's private key using RS256 or ES256 algorithm.

**Response**: JSON containing:
- `access_token`: Bearer token for UserInfo endpoint
- `id_token`: JWT containing verified user identity claims
- `token_type`: "Bearer"
- `expires_in`: Token lifetime in seconds

**ID Token Validation Checklist**:
- Verify signature against Fayda JWKS public keys
- Validate `iss` matches expected Fayda issuer
- Validate `aud` contains CITYLINK_CLIENT_ID
- Validate `exp` > current time and `iat` < current time
- Validate `nonce` matches the nonce sent in authorization request

### Step C: UserInfo Retrieval
Fetch the verified identity payload using the Access Token.
- **Response Format**: Nested JWT (JWS signed by Fayda, JWE encrypted for CityLink).
- **Claims to sync**:
  - `sub`: Unique Pairwise Identifier
  - `name`: Full Name
  - `birthdate`: Date of Birth
  - `phone`: Verified Phone Number
  - `individual_id`: The National ID / FIN

## 4. Security Requirements
1. **TLS Enforcement**: All Fayda endpoints MUST be accessed over HTTPS using TLS 1.2 or later. Reject any non-HTTPS or insecure/TLS versions below 1.2.
2. **Signature Verification**: Every ID Token and UserInfo response MUST be verified against the Fayda JWKS public keys.
3. **Encryption**: UserInfo responses are encrypted; the CityLink backend must have the corresponding private key to decrypt.
4. **State/Nonce Validation**: Protect against CSRF and replay attacks by validating the `state` and `nonce` parameters in the callback.
5. **ID Token Validation**: Validate every ID Token before accepting authentication.
   - `iss` must match the expected Fayda issuer.
   - `aud` must contain `CITYLINK_CLIENT_ID`.
   - `exp` must be in the future; reject expired tokens.
   - `iat` must be recent and not stale; reject tokens issued too far in the past.
6. **Token Storage**: Store all tokens securely and encrypted at rest. Avoid insecure browser storage such as `localStorage`; prefer secure platform storage like Keychain, Keystore, or secure enclave storage.
7. **HTTPS Redirect URI**: Redirect URIs, including custom schemes, must be registered and enforced securely. Even when using app-specific URL schemes, ensure the overall callback flow uses secure channels and does not expose authorization responses over insecure transports.

## 5. Current Implementation Status
- [x] **Frontend UI**: `KycFayda.tsx` (Step-based simulation ready).
- [x] **Service Layer**: `kyc.service.ts` (State management ready).
- [ ] **OIDC Handshake**: Pending `client_id` and credentials.

---
*Reference: https://docs.esignet.io/esignet-authentication/develop/integration/relying-party*
