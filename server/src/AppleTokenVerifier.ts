import { createPublicKey, verify, type JsonWebKey } from "node:crypto";

interface AppleJWK {
  kid: string;
  alg: string;
  kty: string;
  n: string;
  e: string;
}

interface AppleJWKS {
  keys: AppleJWK[];
}

interface AppleTokenHeader {
  kid?: string;
  alg?: string;
}

interface AppleTokenPayload {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  sub?: string;
  email?: string;
}

export interface VerifiedAppleToken {
  subject: string;
  email?: string;
}

const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const APPLE_ISSUER = "https://appleid.apple.com";
const JWKS_CACHE_MS = 60 * 60 * 1000;

export class AppleTokenVerifier {
  private jwks: AppleJWKS | null = null;
  private jwksFetchedAt = 0;

  constructor(private readonly audience: string) {}

  async verify(identityToken: unknown): Promise<VerifiedAppleToken | null> {
    if (typeof identityToken !== "string") {
      return null;
    }

    const parts = identityToken.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = parseBase64JSON<AppleTokenHeader>(encodedHeader);
    const payload = parseBase64JSON<AppleTokenPayload>(encodedPayload);
    if (!header || !payload || header.alg !== "RS256") {
      return null;
    }

    const jwks = await this.getJWKS();
    const key = jwks.keys.find((candidate) => candidate.kid === header.kid);
    if (!key) {
      return null;
    }

    const publicKey = createPublicKey({ key: key as unknown as JsonWebKey, format: "jwk" });
    const signature = Buffer.from(encodedSignature, "base64url");
    const validSignature = verify(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      publicKey,
      signature
    );
    if (!validSignature) {
      return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (
      payload.iss !== APPLE_ISSUER ||
      !payload.sub ||
      !payload.exp ||
      payload.exp <= nowSeconds ||
      !audience.includes(this.audience)
    ) {
      return null;
    }

    return { subject: payload.sub, email: payload.email };
  }

  private async getJWKS(): Promise<AppleJWKS> {
    if (this.jwks && Date.now() - this.jwksFetchedAt < JWKS_CACHE_MS) {
      return this.jwks;
    }

    const response = await fetch(APPLE_JWKS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Apple JWKS: ${response.status}`);
    }

    const jwks = (await response.json()) as AppleJWKS;
    this.jwks = jwks;
    this.jwksFetchedAt = Date.now();
    return jwks;
  }
}

function parseBase64JSON<T>(encoded: string): T | null {
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
