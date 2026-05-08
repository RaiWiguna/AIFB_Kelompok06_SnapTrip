from typing import Literal

CategoryId = Literal["pantai", "gunung", "air_terjun", "wisata_tradisional"]

CANONICAL_CATEGORIES: tuple[dict[str, str], ...] = (
    {"id": "pantai", "label": "Pantai"},
    {"id": "gunung", "label": "Gunung"},
    {"id": "air_terjun", "label": "Air Terjun"},
    {"id": "wisata_tradisional", "label": "Wisata Tradisional"},
)

CATEGORY_IDS = {category["id"] for category in CANONICAL_CATEGORIES}


def validate_categories(categories: list[str]) -> list[str]:
    unique = []
    for category in categories:
        if category not in CATEGORY_IDS:
            raise ValueError(f"Unknown category id: {category}")
        if category not in unique:
            unique.append(category)
    if not unique:
        raise ValueError("At least one category is required")
    return unique
