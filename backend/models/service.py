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
    location: Optional[str] = None  # Debrecen, Budapest, or None for all
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
    location: Optional[str] = None

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
    # Lámpapolírozás — önállóan is kérhető, minden szolgáltatással kombinálható
    {"name": "Lámpapolír (pár)", "category": "extra_kulso", "price": 21990, "description": "S, M, L méretű autókhoz"},
    {"name": "Lámpapolír terepjáróhoz (pár)", "category": "extra_kulso", "price": 23990, "description": "XL, XXL méretű autókhoz"},
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

# Polishing price matrix (Debrecen only)
POLISHING_PRICES = {
    "1lepes": {
        "name": "1-lépéses polírozás",
        "duration_label": "1–3 óra",
        "prices": {
            "S": 37990, "M": 43990, "L": 50990, "XL": 56990, "XXL": 63990
        }
    },
    "tobbLepes": {
        "name": "Többlépéses polírozás",
        "duration_label": "2–5 óra",
        "prices": {
            "S": 50990, "M": 56990, "L": 63990, "XL": 69990, "XXL": 75990
        }
    }
}

POLISHING_ADDONS = [
    {"name": "Lámpapolír (pár)", "price": 21990, "note": "S, M, L méretekig"},
    {"name": "Lámpapolír terepjáróhoz (pár)", "price": 23990, "note": "XL, XXL méretektől"},
]

# Car size descriptions for UI
CAR_SIZE_INFO = {
    "S": {"name": "S - Kis autó", "description": "Ferdehátú, kisautó", "examples": "Suzuki Swift, VW Polo, Opel Corsa"},
    "M": {"name": "M - Közepes", "description": "Sedan, kompakt", "examples": "VW Golf, Toyota Corolla, Audi A3"},
    "L": {"name": "L - Nagy", "description": "Kombi, nagy sedan", "examples": "VW Passat, Skoda Octavia Kombi, BMW 5"},
    "XL": {"name": "XL - SUV", "description": "SUV, crossover", "examples": "VW Tiguan, Toyota RAV4, BMW X3"},
    "XXL": {"name": "XXL - Nagy SUV", "description": "Terepjáró, kisbusz", "examples": "VW Touareg, Range Rover, Ford Transit"}
}

# Promotional/Special offers
PROMOTIONS = [
    {
        "id": "budapest_mobil_komplett",
        "name": "Teljes külső-belső mobil autókozmetika",
        "description": "Kiszállással! Kiszállási díj: 0 Ft. Belső takarítás + porszívózás, belső üvegtisztítás, belső műanyagápolás, műszerfalápolás, bogároldás, külső tisztítás, külső üvegtisztítás, külső műanyagápolás, felnitisztítás, gumiápolás + AJÁNDÉK illatosító + AJÁNDÉK likvidkerámia bevonat",
        "price": 19990,
        "original_price": 29990,
        "discount_percent": 33,
        "category": "komplett",
        "car_sizes": ["S", "M", "L", "XL", "XXL"],
        "package": "Pro",
        "features": [
            "Belső takarítás + porszívózás",
            "Belső üvegtisztítás",
            "Belső műanyagápolás",
            "Műszerfalápolás",
            "Bogároldás",
            "Külső tisztítás",
            "Külső üvegtisztítás",
            "Külső műanyagápolás",
            "Felnitisztítás",
            "Gumiápolás",
            "🎁 AJÁNDÉK illatosító",
            "🎁 AJÁNDÉK likvidkerámia bevonat"
        ],
        "duration": 120,
        "badge": "🚗 MOBIL",
        "valid_until": None,
        "active": True,
        "location": "Budapest",
        "mobile": True,
        "travel_fee": 0
    },
    {
        "id": "tavaszi_akcio",
        "name": "Tavaszi akció",
        "description": "Komplett külső+belső tisztítás M méretig",
        "price": 15990,
        "original_price": 16400,  # M Komplett Pro ár
        "discount_percent": 3,
        "category": "komplett",
        "car_sizes": ["S", "M"],
        "package": "Pro",
        "features": [
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
        "duration": 70,
        "badge": "🌸 AKCIÓ",
        "valid_until": "2025-04-30",
        "active": True
    }
]
