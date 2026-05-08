from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CollectionCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class CollectionRenameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class TripCreationSessionCreateRequest(BaseModel):
    source: str = "upload"


class ConfirmCategoriesRequest(BaseModel):
    categories: list[str] = Field(min_length=1)
