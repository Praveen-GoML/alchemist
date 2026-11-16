# PreQ Backend

FastAPI service behind the PreQ tracker. It turns a Statement of Work into a verified prerequisite checklist, tracks client evidence, produces the BRD, and stores client-shared credentials encrypted.

## What it does

- **SOW analysis** (`/api/analyze-sow`, `/api/analyze-sow-file`): extracts requirements, prerequisites, dependencies, risks, assumptions and open questions with Gemini. Long documents are split into chunks and analysed in parallel.
- **Accuracy checks**: malformed model JSON is repaired automatically, each prerequisite's cited quote is verified against the source text, and a second AI audit pass removes unsupported items and adds missed explicit ones.
- **Checklist and evidence**: items, owners, escalation, evidence upload, manual and AI verification, and a readiness certificate.
- **BRD**: generate, preview, and export as Word (`.docx`); export the tracker as Excel.
- **Project context**: `GET /api/projects/{id}/context` returns everything about a project (without secrets) for use in AI assistants.
- **Credential vault**: shared credentials are encrypted at rest (Fernet) and masked in every response.
- **Copilot**: chat, missing-item suggestions, handover specifications and credential-guide generation.
- Optional Slack notifications and an inbound webhook for shared secrets.

## Requirements

- Python 3.10 or newer
- A Gemini API key
- SQLite works out of the box for local development; use Postgres in production

## Setup

```bash
cd preq-backend
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # then edit the values
uvicorn main:app --reload --port 8002
```

- API root: <http://127.0.0.1:8002/api>
- Interactive docs: <http://127.0.0.1:8002/docs>
- Health check: `GET /api/health`

The first run creates the database tables and applies the lightweight column migrations in `main.py`.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Production | Postgres URL. Empty means local SQLite (`preq_local.db`) |
| `GEMINI_API_KEY` | For AI | Google Gemini key. Users can also send their own via the `x-gemini-api-key` header |
| `GROQ_API_KEY` | No | Legacy fallback. A `gsk_...` key is detected and routed to Groq |
| `CREDENTIAL_ENCRYPTION_KEY` | Production | Fernet key that encrypts shared credentials. Locally a `.credential_key` file is created if unset |
| `PREQ_ADMIN_TOKEN` | No | Enables `GET /api/items/{id}/credential` (send as `X-Admin-Token`) |
| `SLACK_WEBHOOK_URL` | No | Escalation and credential-share notifications |

Generate an encryption key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Project layout

```
preq-backend/
├── main.py              # FastAPI app, routes, migrations, metrics
├── models.py            # SQLAlchemy models
├── schemas.py           # Pydantic request/response models
├── database.py          # engine and session
├── copilot_service.py   # AI calls, prompts, JSON repair, SOW analysis and audit
├── brd_service.py       # BRD generation and Word export
├── credential_vault.py  # encrypt/decrypt/mask shared credentials
├── dynamic_scraper.py   # AI-guided credential setup guidance
├── universal_parser.py  # text extraction from PDF, DOCX, PPTX, XLSX and more
├── templates_data.py    # starter prerequisite templates
├── seed_data.py         # optional demo project
├── api/index.py         # Vercel entry point
├── test_suite.py        # end-to-end API check (needs a running server)
└── test_sow_analysis.py # analysis tests
```

## Key endpoints

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/analyze-sow-file` | Analyse an uploaded SOW (PDF, DOCX, TXT) and create a project |
| POST | `/api/projects/{id}/retry-analysis` | Re-run extraction on the stored proposal text |
| GET | `/api/projects` / `/api/projects/{id}` | List and read projects |
| GET | `/api/projects/{id}/checklist` | Prerequisites for a project |
| POST | `/api/projects/{id}/items` | Add a prerequisite |
| POST | `/api/items/{id}/submit-evidence` | Submit files, links, notes and credentials |
| POST | `/api/items/{id}/verify` / `/ai-verify` / `/reject` | Review evidence |
| GET | `/api/projects/{id}/context` | Full project context (no secrets) |
| GET | `/api/projects/{id}/export-brd-docx` | Download the BRD |
| GET | `/api/projects/{id}/export-excel-tracker` | Download the tracker |

See `/docs` for the complete list with schemas.

## Testing

```bash
uvicorn main:app --port 8002        # in one terminal
python test_suite.py                # end-to-end audit against the running API
python -m unittest test_sow_analysis -v   # analysis logic
```

## Deployment (Vercel)

Create a Vercel project with root directory `preq-backend`. `vercel.json` routes all traffic to `main.py`. Set `DATABASE_URL`, `GEMINI_API_KEY` and `CREDENTIAL_ENCRYPTION_KEY`, then redeploy. Uploaded files are stored on local disk, which is ephemeral on Vercel, so use external storage for anything that must persist.

## Security notes

- Credentials are never returned in plain text by normal endpoints. Losing `CREDENTIAL_ENCRYPTION_KEY` makes them unreadable.
- The client page is public by design: anyone with a project link can submit evidence. Share links only with the client.
- Never commit `.env`, `.credential_key` or the local database.
