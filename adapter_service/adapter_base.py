from abc import ABC, abstractmethod
from typing import Dict, Any, List

class Adapter(ABC):
    id: str
    name: str
    version: str

    @abstractmethod
    def capabilities(self) -> Dict[str, Any]:
        """Return device capabilities and supported commands."""

    @abstractmethod
    def discover(self) -> List[Dict[str, Any]]:
        """Find devices and return metadata."""

    @abstractmethod
    def connect(self, config: Dict[str, Any]) -> bool:
        """Establish a session with the device using config."""

    @abstractmethod
    def read(self) -> Dict[str, Any]:
        """Read current state/metrics from the device."""

    @abstractmethod
    def write(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Send a command to the device and return result."""

    def disconnect(self) -> None:
        """Optional cleanup; default no-op."""
        return None
