from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg2.errors import UniqueViolation

from app.core.security import create_access_token, get_token_subject, hash_password, verify_password
from .repository import create_employee, get_user_by_email, get_user_by_id, is_active_department
from .schemas import LoginRequest, SignupRequest


router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer(auto_error=False)


def api_success(message: str, data):
    return {"success": True, "message": message, "data": data}


def public_user(user):
    return {
        "id": user["user_id"],
        "name": user["name"],
        "email": user["email"],
        "department_id": user["department_id"],
        "status": user["status"].lower(),
        "role": user["role"].lower().replace(" ", "_"),
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required")
    user_id = get_token_subject(credentials.credentials)
    user = get_user_by_id(user_id) if user_id else None
    if user is None or user["status"] != "Active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session is invalid or has expired")
    return user


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest):
    if payload.department_id is not None and not is_active_department(payload.department_id):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Select an active department")
    if get_user_by_email(payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this email")
    try:
        user = create_employee(payload.name, payload.email, hash_password(payload.password), payload.department_id)
    except UniqueViolation as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this email") from error
    return api_success("Account created", {"access_token": create_access_token(user["user_id"]), "user": public_user(user)})


@router.post("/login")
def login(payload: LoginRequest):
    user = get_user_by_email(payload.email)
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user["status"] != "Active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account is deactivated. Contact an administrator.")
    return api_success("Signed in", {"access_token": create_access_token(user["user_id"]), "user": public_user(user)})


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return api_success("Current user", public_user(current_user))
