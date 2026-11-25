
import re
import math
from typing import Optional


# Symptom keywords mapped to broad medical specialties.
# This is navigation assistance, not medical diagnosis.
SPECIALTY_KEYWORDS = {
    "Cardiology": [
        "chest pain", "heart pain", "palpitations",
        "heartbeat", "heart problem"
    ],
    "Neurology": [
        "headache", "migraine", "seizure",
        "fits", "numbness", "dizziness"
    ],
    "Orthopedics": [
        "bone pain", "joint pain", "back pain",
        "knee pain", "fracture", "leg pain"
    ],
    "Nephrology": [
        "kidney pain", "kidney problem",
        "urine problem", "urinary problem"
    ],
    "General Medicine": [
        "fever", "cold", "cough", "vomiting",
        "stomach pain", "weakness", "body pains"
    ],
}

EMERGENCY_KEYWORDS = [
    "severe chest pain",
    "difficulty breathing",
    "cannot breathe",
    "unconscious",
    "stroke symptoms",
    "heavy bleeding",
    "severe bleeding",
    "suicidal",
]


def identify_specialties(symptoms: str):
    text = symptoms.lower()
    matches = []

    for specialty, keywords in SPECIALTY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            matches.append(specialty)

    if not matches:
        matches.append("General Medicine")

    return matches


def is_emergency(symptoms: str):
    text = symptoms.lower()
    return any(word in text for word in EMERGENCY_KEYWORDS)


def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate approximate straight-line distance in kilometres."""
    radius = 6371

    lat1, lon1, lat2, lon2 = map(
        math.radians, [lat1, lon1, lat2, lon2]
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    return round(
        radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)),
        2
    )


def recommend_hospitals(
    hospitals: list,
    symptoms: str,
    user_latitude: Optional[float] = None,
    user_longitude: Optional[float] = None,
):
    if is_emergency(symptoms):
        return {
            "emergency": True,
            "message": (
                "Possible emergency symptoms reported. "
                "Seek immediate emergency medical care. "
                "In India, call 112 if urgent assistance is needed."
            ),
            "specialties": [],
            "recommendations": [],
        }

    specialties = identify_specialties(symptoms)
    results = []

    for hospital in hospitals:
        if hospital.get("is_verified") is not True:
            continue

        hospital_specialties = [
            item.strip().lower()
            for item in (hospital.get("specialty") or "").split(",")
        ]

        matched = [
            specialty for specialty in specialties
            if specialty.lower() in hospital_specialties
        ]

        if not matched:
            continue

        result = dict(hospital)
        result["matched_specialties"] = matched
        result["match_score"] = 100

        latitude = hospital.get("latitude")
        longitude = hospital.get("longitude")

        result["distance_km"] = None

        if (
            user_latitude is not None
            and user_longitude is not None
            and latitude is not None
            and longitude is not None
        ):
            result["distance_km"] = calculate_distance(
                user_latitude,
                user_longitude,
                float(latitude),
                float(longitude),
            )

        results.append(result)

    # Prefer specialty match, then nearest distance when available.
    results.sort(
        key=lambda item: (
            -item["match_score"],
            item["distance_km"]
            if item["distance_km"] is not None
            else float("inf"),
        )
    )

    for index, hospital in enumerate(results):
        hospital["is_best_match"] = index == 0

    return {
        "emergency": False,
        "specialties": specialties,
        "count": len(results),
        "recommendations": results,
    }
