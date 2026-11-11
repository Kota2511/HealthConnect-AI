
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional
from database import supabase


app = FastAPI(
    title="HealthConnect AI",
    description="AI Powered Healthcare Hospital Finder",
    version="1.0.0"
)

security = HTTPBearer()


# CORS Configuration

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://health-connect-ai-ten.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Hospital Add Model
class HospitalCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    address: str = Field(min_length=5)
    city: str = Field(min_length=2, max_length=100)
    phone: Optional[str] = None
    specialty: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# Hospital Update Model
class HospitalUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    address: Optional[str] = Field(default=None, min_length=5)
    city: Optional[str] = Field(default=None, min_length=2, max_length=100)
    phone: Optional[str] = None
    specialty: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# Verify Admin Login
def verify_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        auth_response = supabase.auth.get_user(token)
        user = auth_response.user

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid login session"
            )

        admin_response = (
            supabase.table("admin_users")
            .select("user_id")
            .eq("user_id", str(user.id))
            .maybe_single()
            .execute()
        )

        if not admin_response.data:
            raise HTTPException(
                status_code=403,
                detail="Admin access required"
            )

        return user

    except HTTPException:
        raise

    except Exception as e:
        print("ADMIN AUTH ERROR:", repr(e))
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )


# Add display status to hospital records
def format_hospital(hospital):
    hospital = dict(hospital)

    hospital["verification_status"] = (
        "Verified"
        if hospital.get("is_verified") is True
        else "Pending Verification"
    )

    return hospital


# Home Route
@app.get("/")
def root():
    return {
        "message": "Welcome to HealthConnect AI",
        "status": "Backend is running successfully"
    }


# Health Check
@app.get("/health")
def health_check():
    return {
        "status": "Healthy",
        "project": "HealthConnect AI"
    }


# Public: Get All Hospitals (Verified + Pending)
@app.get("/hospitals")
def get_hospitals():
    try:
        response = (
            supabase.table("hospitals")
            .select("*")
            .order("name", desc=False)
            .execute()
        )

        hospitals = [
            format_hospital(hospital)
            for hospital in (response.data or [])
        ]

        return {
            "status": "success",
            "count": len(hospitals),
            "hospitals": hospitals
        }

    except Exception as e:
        print("GET HOSPITALS ERROR:", repr(e))
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch hospitals"
        )


# Admin: Get All Hospitals
@app.get("/admin/hospitals")
def get_all_hospitals(admin=Depends(verify_admin)):
    try:
        response = (
            supabase.table("hospitals")
            .select("*")
            .order("id", desc=True)
            .execute()
        )

        hospitals = [
            format_hospital(hospital)
            for hospital in (response.data or [])
        ]

        return {
            "status": "success",
            "count": len(hospitals),
            "hospitals": hospitals
        }

    except Exception as e:
        print("ADMIN GET HOSPITALS ERROR:", repr(e))
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch hospital records"
        )


# Add New Hospital
@app.post("/hospitals")
def add_hospital(
    hospital: HospitalCreate,
    admin=Depends(verify_admin)
):
    try:
        hospital_data = hospital.model_dump()
        hospital_data["is_verified"] = False

        response = (
            supabase.table("hospitals")
            .insert(hospital_data)
            .execute()
        )

        print("HOSPITAL INSERT SUCCESS:", hospital.name)

        return {
            "status": "success",
            "message": "Hospital added successfully. Verification is pending.",
            "hospital": (
                format_hospital(response.data[0])
                if response.data else None
            )
        }

    except Exception as e:
        print("ADD HOSPITAL ERROR:", repr(e))
        raise HTTPException(
            status_code=500,
            detail="Unable to add hospital. Check backend terminal."
        )


# Admin: Edit Hospital
@app.put("/hospitals/{hospital_id}")
def update_hospital(
    hospital_id: int,
    hospital: HospitalUpdate,
    admin=Depends(verify_admin)
):
    try:
        update_data = hospital.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="Please provide at least one field to update"
            )

        response = (
            supabase.table("hospitals")
            .update(update_data)
            .eq("id", hospital_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Hospital not found"
            )

        print("HOSPITAL UPDATED:", hospital_id)

        return {
            "status": "success",
            "message": "Hospital updated successfully",
            "hospital": format_hospital(response.data[0])
        }

    except HTTPException:
        raise

    except Exception as e:
        print("UPDATE HOSPITAL ERROR:", repr(e))
        raise HTTPException(
            status_code=500,
            detail="Unable to update hospital. Check backend terminal."
        )
