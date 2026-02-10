import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

from adapter_registry import load_adapters, ADAPTERS


class Handler(BaseHTTPRequestHandler):
    def _set_cors(self):
        self.send_header("Access-Control-Allow-Origin", "http://127.0.0.1:8080")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._set_cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}

    def do_GET(self):
        parts = urlparse(self.path).path.strip("/").split("/")
        if self.path == "/adapters":
            payload = [
                {
                    "id": a.id,
                    "name": a.name,
                    "version": a.version,
                    "capabilities": a.capabilities(),
                }
                for a in ADAPTERS.values()
            ]
            return self._json(200, payload)

        if len(parts) == 2 and parts[0] == "adapters" and parts[1] in ADAPTERS:
            a = ADAPTERS[parts[1]]
            return self._json(200, {
                "id": a.id,
                "name": a.name,
                "version": a.version,
                "capabilities": a.capabilities(),
            })

        if len(parts) == 3 and parts[0] == "adapters" and parts[2] == "read":
            adapter_id = parts[1]
            if adapter_id not in ADAPTERS:
                return self._json(404, {"error": "adapter not found"})
            state = ADAPTERS[adapter_id].read()
            return self._json(200, state)

        return self._json(404, {"error": "not found"})

    def do_POST(self):
        parts = urlparse(self.path).path.strip("/").split("/")
        if len(parts) == 3 and parts[0] == "adapters":
            adapter_id = parts[1]
            action = parts[2]
            if adapter_id not in ADAPTERS:
                return self._json(404, {"error": "adapter not found"})
            adapter = ADAPTERS[adapter_id]
            body = self._read_body()

            if action == "discover":
                return self._json(200, {"devices": adapter.discover()})
            if action == "connect":
                ok = adapter.connect(body)
                return self._json(200, {"connected": bool(ok)})
            if action == "write":
                result = adapter.write(body)
                return self._json(200, result)

        return self._json(404, {"error": "not found"})

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors()
        self.end_headers()


if __name__ == "__main__":
    load_adapters()
    host = "127.0.0.1"
    port = 8765
    print(f"Adapter service running on http://{host}:{port}")
    HTTPServer((host, port), Handler).serve_forever()
