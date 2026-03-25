from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Service(BaseModel):
    service_id: str = Field(default_factory=lambda: f"srv_{uuid.uuid4().hex[:12]}")
    name: str
    category: str  # kulso, belso, komplett, extra
    price: float
    duration: int  # minutes
    description: Optional[str] = None
    car_size: Optional[str] = None  # S, M, L, XL, XXL
    package: Optional[str] = None  # Eco, Pro, VIP
    features: Optional[List[str]] = None  # List of included features
    service_type: Optional[str] = None  # base_service or extra
    min_price: Optional[float] = None  # For "from X Ft" pricing
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServiceCreate(BaseModel):
    name: str
    category: str
    price: float
    duration: int
    description: Optional[str] = None
    car_size: Optional[str] = None
    package: Optional[str] = None
    features: Optional[List[str]] = None
    service_type: Optional[str] = None
    min_price: Optional[float] = None

# Package feature definitions based on X-CLEAN price list
PACKAGE_FEATURES = {
    "kulso": {
        "Eco": [
            "Külső tisztítás",
            "Külső ablakfelületek tisztítása",
            "Wax"
        ],
        "Pro": [
            "Külső tisztítás",
            "Külső ablakfelületek tisztítása", 
            "Wax",
            "Falcok tisztítása",
            "Felni- és gumitisztítás"
        ],
        "VIP": [
            "Külső tisztítás",
            "Külső ablakfelületek tisztítása",
            "Wax",
            "Liquid kerámia",
            "Falcok tisztítása",
            "Felni- és gumitisztítás",
            "Felni- és gumiápolás",
            "Műanyag felületek ápolása",
            "Bogároldás"
        ]
    },
    "belso": {
        "Eco": [
            "Porszívózás (gyors)",
            "Belső ablakfelületek tisztítása",
            "Portalanítás"
        ],
        "Pro": [
            "Porszívózás (alapos)",
            "Belső ablakfelületek tisztítása",
            "Portalanítás",
            "Műanyag felületek tisztítása"
        ],
        "VIP": [
            "Porszívózás (alapos)",
            "Belső ablakfelületek tisztítása",
            "Portalanítás",
            "Műanyag felületek tisztítása",
            "Műanyag felületek ápolása",
            "Szőnyegtisztítás"
        ]
    },
    "komplett": {
        "Eco": [
            "Külső tisztítás",
            "Külső ablakfelületek tisztítása",
            "Wax",
            "Porszívózás (gyors)",
            "Belső ablakfelületek tisztítása",
            "Portalanítás"
        ],
        "Pro": [
            "Külső tisztítás",
            "Külső ablakfelületek tisztítása",
            "Wax",
            "Falcok tisztítása",
            "Felni- és gumitisztítás",
            "Porszívózás (alapos)",
            "Belső ablakfelületek tisztítása",
            "Portalanítás",
            "Műanyag felületek tisztítása"
        ],
        "VIP": [
            "Külső tisztítás",
            "Külső ablakfelületek tisztítása",
            "Wax",
            "Liquid kerámia",
            "Falcok tisztítása",
            "Felni- és gumitisztítás",
            "Felni- és gumiápolás",
            "Műanyag felületek ápolása",
            "Bogároldás",
            "Porszívózás (alapos)",
            "Belső ablakfelületek tisztítása",
            "Portalanítás",
            "Műanyag felületek tisztítása",
            "Műanyag felületek ápolása",
            "Szőnyegtisztítás"
        ]
    }
}

# Price matrix based on car size and package
PRICE_MATRIX = {
    "S": {
        "kulso": {"Eco": 4000, "Pro": 7800, "VIP": 9700},
        "belso": {"Eco": 3000, "Pro": 5300, "VIP": 6700},
        "komplett": {"Eco": 6000, "Pro": 11800, "VIP": 14700}
    },
    "M": {
        "kulso": {"Eco": 4800, "Pro": 8600, "VIP": 10800},
        "belso": {"Eco": 3500, "Pro": 6000, "VIP": 7400},
        "komplett": {"Eco": 7500, "Pro": 13100, "VIP": 16400}
    },
    "L": {
        "kulso": {"Eco": 5500, "Pro": 9400, "VIP": 11700},
        "belso": {"Eco": 4000, "Pro": 6400, "VIP": 8000},
        "komplett": {"Eco": 8600, "Pro": 14200, "VIP": 17800}
    },
    "XL": {
        "kulso": {"Eco": 6300, "Pro": 10700, "VIP": 13400},
        "belso": {"Eco": 4800, "Pro": 7400, "VIP": 9300},
        "komplett": {"Eco": 10100, "Pro": 16400, "VIP": 20500}
    },
    "XXL": {
        "kulso": {"Eco": 8000, "Pro": 11700, "VIP": 14600},
        "belso": {"Eco": 6300, "Pro": 7700, "VIP": 9600},
        "komplett": {"Eco": 13000, "Pro": 17400, "VIP": 21700}
    }
}

# Duration matrix (in minutes) based on car size
DURATION_MATRIX = {
    "S": {"kulso": 30, "belso": 30, "komplett": 60},
    "M": {"kulso": 35, "belso": 35, "komplett": 70},
    "L": {"kulso": 40, "belso": 40, "komplett": 80},
    "XL": {"kulso": 45, "belso": 45, "komplett": 90},
    "XXL": {"kulso": 50, "belso": 50, "komplett": 100}
}

# Extra services with pricing
EXTRA_SERVICES = [
    # Külső extrák
    {"name": "Egyéb szennyeződések eltávolítása", "category": "extra_kulso", "min_price": 2000, "description": "Kátrány, röprozsda, stb."},
    {"name": "Vízkő eltávolítás", "category": "extra_kulso", "min_price": 9000, "description": ""},
    {"name": "Gyanta eltávolítás", "category": "extra_kulso", "min_price": 3000, "description": ""},
    {"name": "Liquid kerámia", "category": "extra_kulso", "price": 12000, "description": "Prémium védőréteg"},
    # Belső extrák
    {"name": "Légtér, klíma ózonos fertőtlenítése", "category": "extra_belso", "price": 8000, "description": ""},
    {"name": "Komplett kárpittisztítás", "category": "extra_belso", "min_price": 28000, "description": ""},
    {"name": "Kárpittisztítás/ülés", "category": "extra_belso", "price": 7000, "description": "Áras ülésenként"},
    {"name": "Folteltávolítás", "category": "extra_belso", "min_price": 3000, "description": ""},
    {"name": "Komplett 3 fázisú bőrápolás", "category": "extra_belso", "min_price": 30000, "description": ""},
    {"name": "3 fázisú bőrápolás/ülés", "category": "extra_belso", "price": 7000, "description": "Áras ülésenként"},
    {"name": "Állatszőr eltávolítás", "category": "extra_belso", "min_price": 5000, "description": ""},
    # Speciális
    {"name": "Eladásra felkészítés", "category": "extra_special", "min_price": 50000, "description": "Teljes körű felkészítés"}
]

# Car size descriptions for UI
CAR_SIZE_INFO = {
    "S": {"name": "S - Kis autó", "description": "Ferdehátú, kisautó", "examples": "Suzuki Swift, VW Polo, Opel Corsa"},
    "M": {"name": "M - Közepes", "description": "Sedan, kompakt", "examples": "VW Golf, Toyota Corolla, Audi A3"},
    "L": {"name": "L - Nagy", "description": "Kombi, nagy sedan", "examples": "VW Passat, Skoda Octavia Kombi, BMW 5"},
    "XL": {"name": "XL - SUV", "description": "SUV, crossover", "examples": "VW Tiguan, Toyota RAV4, BMW X3"},
    "XXL": {"name": "XXL - Nagy SUV", "description": "Terepjáró, kisbusz", "examples": "VW Touareg, Range Rover, Ford Transit"}
}
