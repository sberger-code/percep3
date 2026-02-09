# percep3

Local prototype for a multimodal training app (frontend + module backend + adapter service).

## Prerequisites
- Python 3.x installed and available in your PATH

## Run the local web server (frontend + backend)
From the project root:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Open the app in your browser:

- `http://127.0.0.1:8080/frontend/`

The frontend loads modules from `http://127.0.0.1:8080/backend/` automatically.

## Run the adapter service
In a second terminal from the project root:

```powershell
python adapter_service\service.py
```

The adapter service listens on:

- `http://127.0.0.1:8765`

The frontend will show adapter status in the Progress view. Make sure the service is running to enable polling.

## Notes
- This is an offline-first prototype. All progress is stored locally in the browser.
- If you change ports, update CORS in `adapter_service/service.py` and the base URLs in the frontend if needed.
