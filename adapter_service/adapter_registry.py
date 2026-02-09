from typing import Dict
from importlib import import_module
from pathlib import Path

from adapter_base import Adapter

ADAPTERS: Dict[str, Adapter] = {}


def load_adapters() -> Dict[str, Adapter]:
    ADAPTERS.clear()
    adapters_dir = Path(__file__).parent / "adapters"
    for path in adapters_dir.glob("*.py"):
        if path.name.startswith("_"):
            continue
        module_name = f"adapters.{path.stem}"
        module = import_module(module_name)
        for item in getattr(module, "ADAPTERS", []):
            ADAPTERS[item.id] = item
    return ADAPTERS
