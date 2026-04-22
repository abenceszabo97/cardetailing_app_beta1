"""
One-off migration: normalize transfer payment method aliases to "atutalas".

Usage:
  python migrate_payment_methods_to_atutalas.py --dry-run
  python migrate_payment_methods_to_atutalas.py
"""

import argparse
import asyncio
from typing import Dict, List

from database import db, close_db


TARGET_COLLECTIONS: List[str] = ["jobs", "bookings", "invoices"]
ALIASES: List[str] = ["utalas", "banki_atutalas"]
CANONICAL = "atutalas"


async def run_migration(dry_run: bool) -> Dict[str, int]:
    summary: Dict[str, int] = {}

    for collection_name in TARGET_COLLECTIONS:
        collection = db[collection_name]
        query = {"payment_method": {"$in": ALIASES}}

        matches = await collection.count_documents(query)
        summary[f"{collection_name}_matched"] = matches

        if dry_run or matches == 0:
            summary[f"{collection_name}_modified"] = 0
            continue

        result = await collection.update_many(query, {"$set": {"payment_method": CANONICAL}})
        summary[f"{collection_name}_modified"] = result.modified_count

    return summary


async def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize payment method values to 'atutalas'.")
    parser.add_argument("--dry-run", action="store_true", help="Only show how many rows would be updated.")
    args = parser.parse_args()

    try:
        summary = await run_migration(dry_run=args.dry_run)
        mode = "DRY RUN" if args.dry_run else "MIGRATION"
        print(f"\n[{mode}] payment method normalization results:")
        for key in sorted(summary.keys()):
            print(f"  - {key}: {summary[key]}")
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
