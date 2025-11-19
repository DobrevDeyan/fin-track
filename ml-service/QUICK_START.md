# ML Service - Quick Start Checklist

Follow this checklist in order to build the ML microservice.

## ✅ Step-by-Step Checklist

### Phase 1: Setup (5 minutes)

- [ ] **Create folders**
  ```bash
  cd ml-service
  mkdir app
  mkdir app\models
  mkdir app\routers
  mkdir app\utils
  mkdir models
  ```

- [ ] **Create `requirements.txt`**
  - Copy from STEP_BY_STEP_GUIDE.md Step 2
  - Lists all Python packages needed

- [ ] **Create empty `__init__.py` files**
  - `app/__init__.py` (empty)
  - `app/models/__init__.py` (empty)
  - `app/routers/__init__.py` (empty)
  - `app/utils/__init__.py` (empty)

### Phase 2: Core Code (30 minutes)

- [ ] **Create `app/utils/model_loader.py`**
  - Copy code from STEP_BY_STEP_GUIDE.md Step 3
  - Handles loading models from disk

- [ ] **Create `app/models/embeddings.py`**
  - Copy code from STEP_BY_STEP_GUIDE.md Step 4
  - Generates MiniLM embeddings

- [ ] **Create `app/models/classifier.py`**
  - Copy code from STEP_BY_STEP_GUIDE.md Step 5
  - Main classification logic

- [ ] **Create `app/routers/classify.py`**
  - Copy code from STEP_BY_STEP_GUIDE.md Step 6
  - API endpoints

- [ ] **Create `app/main.py`**
  - Copy code from STEP_BY_STEP_GUIDE.md Step 7
  - FastAPI application

### Phase 3: Deployment Files (10 minutes)

- [ ] **Create `Dockerfile`**
  - Copy from STEP_BY_STEP_GUIDE.md Step 8
  - For Cloud Run deployment

- [ ] **Create `.dockerignore`**
  - Copy from STEP_BY_STEP_GUIDE.md Step 9

- [ ] **Create `.env.example`**
  - Copy from STEP_BY_STEP_GUIDE.md Step 10

- [ ] **Create `README.md`**
  - Copy from STEP_BY_STEP_GUIDE.md Step 11

### Phase 4: Test Locally (10 minutes)

- [ ] **Install dependencies**
  ```bash
  python -m venv venv
  venv\Scripts\activate
  pip install -r requirements.txt
  ```

- [ ] **Create dummy model** (for testing)
  - Create `create_dummy_model.py` (see Step 13 in guide)
  - Run: `python create_dummy_model.py`

- [ ] **Start service**
  ```bash
  uvicorn app.main:app --reload --port 8001
  ```

- [ ] **Test in browser**
  - Visit: http://localhost:8001/docs
  - Try the `/api/classify` endpoint

### Phase 5: Deploy (15 minutes)

- [ ] **Deploy to Cloud Run**
  ```bash
  gcloud run deploy ml-service --source .
  ```

- [ ] **Get service URL**
  - Save the URL (e.g., `https://ml-service-xxxxx.run.app`)

- [ ] **Test deployed service**
  ```bash
  curl https://ml-service-xxxxx.run.app/health
  ```

---

## 📝 File Creation Order

1. **Folders** → Create directory structure
2. **requirements.txt** → Dependencies
3. **__init__.py files** → Make Python packages
4. **model_loader.py** → Model loading utility
5. **embeddings.py** → Embedding generation
6. **classifier.py** → Classification logic
7. **classify.py** → API endpoints
8. **main.py** → FastAPI app
9. **Dockerfile** → Deployment config
10. **Other config files** → .dockerignore, .env.example, README

---

## 🎯 What Each File Does

| File | Purpose |
|------|---------|
| `requirements.txt` | Lists Python packages |
| `app/utils/model_loader.py` | Loads ML models from disk |
| `app/models/embeddings.py` | Converts text to vectors |
| `app/models/classifier.py` | Predicts categories |
| `app/routers/classify.py` | REST API endpoints |
| `app/main.py` | FastAPI application (main entry) |
| `Dockerfile` | How to build container |
| `.dockerignore` | What Docker should ignore |

---

## 🚀 Quick Commands

```bash
# Install
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Run locally
uvicorn app.main:app --reload --port 8001

# Test
curl http://localhost:8001/health

# Deploy
gcloud run deploy ml-service --source .
```

---

## 📚 Full Details

See `STEP_BY_STEP_GUIDE.md` for:
- Complete code for each file
- Explanations of what each part does
- Troubleshooting tips
- Training script examples

---

**Start with Phase 1 and work through each step! 🚀**

