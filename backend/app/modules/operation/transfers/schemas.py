from pydantic import BaseModel


class TransferRequest(BaseModel):
    asset_id: str
    to_user_id: str
    reason: str = ""


class TransferResolve(BaseModel):
    approve: bool
