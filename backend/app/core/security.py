"""Small, dependency-free security helpers for the hackathon API."""

import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone


PASSWORD_ITERATIONS = 310_000
TOKEN_LIFETIME_HOURS = 8


def hash_password(password: str) -> str:
    """Return a PBKDF2-SHA256 password hash; never store a raw password."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )
    return "pbkdf2_sha256${}${}${}".format(
        PASSWORD_ITERATIONS,
        base64.urlsafe_b64encode(salt).decode("ascii"),
        base64.urlsafe_b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, encoded_salt, encoded_digest = stored_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(encoded_salt.encode("ascii"))
        expected = base64.urlsafe_b64decode(encoded_digest.encode("ascii"))
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, int(iterations)
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def _base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode_base64url(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _token_secret() -> bytes:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET must be configured before starting AssetFlow API")
    return secret.encode("utf-8")


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=TOKEN_LIFETIME_HOURS)).timestamp()),
    }
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = "{}.{}".format(
        _base64url(json.dumps(header, separators=(",", ":")).encode("utf-8")),
        _base64url(json.dumps(payload, separators=(",", ":")).encode("utf-8")),
    )
    signature = hmac.new(
        _token_secret(), signing_input.encode("ascii"), hashlib.sha256
    ).digest()
    return "{}.{}".format(signing_input, _base64url(signature))


def get_token_subject(token: str) -> int | None:
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".")
        signing_input = "{}.{}".format(encoded_header, encoded_payload)
        expected = hmac.new(
            _token_secret(), signing_input.encode("ascii"), hashlib.sha256
        ).digest()
        signature = _decode_base64url(encoded_signature)
        if not hmac.compare_digest(expected, signature):
            return None
        payload = json.loads(_decode_base64url(encoded_payload))
        if int(payload["exp"]) <= int(datetime.now(timezone.utc).timestamp()):
            return None
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None
