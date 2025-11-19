# ML Microservice - Step-by-Step Implementation Guide

This guide will walk you through creating the Python ML microservice from scratch.

---

## 📋 Overview

You'll create a FastAPI service that:
1. Loads a pre-trained ML model
2. Accepts transaction descriptions
3. Returns category predictions (Food, Transport, etc.)

---

## 🗂️ Step 1: Create Directory Structure

Create these folders manually or using commands:

```
ml-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── models/
│   │   ├── __init__.py
│   │   ├── classifier.py    # ML model logic
│   │   └── embeddings.py    # Embedding generation
│   ├── routers/
│   │   ├── __init__.py
│   │   └── classify.py      # API endpoints
│   └── utils/
│       ├── __init__.py
│       └── model_loader.py  # Model loading/caching
├── models/                  # Trained model files (create after training)
├── requirements.txt         # Python dependencies
├── Dockerfile              # For Cloud Run deployment
├── .dockerignore
├── .env.example
└── README.md
```

**Create folders:**
```bash
cd ml-service
mkdir app
mkdir app/models
mkdir app/routers
mkdir app/utils
mkdir models
```

---

## 📦 Step 2: Create requirements.txt

**File:** `ml-service/requirements.txt`

This file lists all Python packages needed.

```txt
# Web Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0

# Machine Learning
scikit-learn==1.3.2
sentence-transformers==2.2.2
joblib==1.3.2
numpy==1.24.3
pandas==2.1.3

# Utilities
python-dotenv==1.0.0
python-multipart==0.0.6

# CORS support
python-jose[cryptography]==3.3.0
```

**What each package does:**
- `fastapi`: Web framework for API
- `uvicorn`: ASGI server to run FastAPI
- `scikit-learn`: ML library (classifiers, vectorizers)
- `sentence-transformers`: For MiniLM embeddings
- `joblib`: Save/load ML models efficiently
- `numpy`, `pandas`: Data processing

---

## 🔧 Step 3: Create Model Loader Utility

**File:** `ml-service/app/utils/__init__.py`
```python
# Empty file - makes it a Python package
```

**File:** `ml-service/app/utils/model_loader.py`

This loads the trained model from disk into memory.

```python
import joblib
import os
from pathlib import Path
from typing import Optional, Any

# Global variables to cache loaded models
_classifier = None
_vectorizer = None
_embedding_model = None

def get_model_path() -> Path:
    """Get the path to the models directory."""
    # In Cloud Run, models are in /app/models
    # Locally, they're in ./models
    if os.path.exists("/app/models"):
        return Path("/app/models")
    return Path(__file__).parent.parent.parent / "models"

def load_classifier():
    """Load the scikit-learn classifier model."""
    global _classifier
    if _classifier is None:
        model_path = get_model_path() / "classifier.pkl"
        if not model_path.exists():
            raise FileNotFoundError(
                f"Classifier model not found at {model_path}. "
                "Please train the model first."
            )
        _classifier = joblib.load(model_path)
        print(f"✅ Loaded classifier from {model_path}")
    return _classifier

def load_vectorizer():
    """Load the TF-IDF vectorizer."""
    global _vectorizer
    if _vectorizer is None:
        model_path = get_model_path() / "vectorizer.pkl"
        if not model_path.exists():
            raise FileNotFoundError(
                f"Vectorizer not found at {model_path}. "
                "Please train the model first."
            )
        _vectorizer = joblib.load(model_path)
        print(f"✅ Loaded vectorizer from {model_path}")
    return _vectorizer

def load_embedding_model():
    """Load the sentence-transformers model (MiniLM)."""
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        # This downloads the model on first use (80MB)
        # Model: all-MiniLM-L6-v2 (lightweight, fast)
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Loaded embedding model (MiniLM)")
    return _embedding_model

def ensure_models_loaded():
    """Ensure all models are loaded (called at startup)."""
    try:
        load_classifier()
        load_vectorizer()
        load_embedding_model()
        return True
    except FileNotFoundError as e:
        print(f"⚠️ Warning: {e}")
        return False
```

**What this does:**
- Caches models in memory (faster than loading each time)
- Handles both local and Cloud Run paths
- Loads classifier, vectorizer, and embedding model

---

## 🤖 Step 4: Create Embedding Generator

**File:** `ml-service/app/models/__init__.py`
```python
# Empty file
```

**File:** `ml-service/app/models/embeddings.py`

This generates semantic embeddings from text using MiniLM.

```python
from typing import List
import numpy as np
from app.utils.model_loader import load_embedding_model

def generate_embeddings(texts: List[str]) -> np.ndarray:
    """
    Generate embeddings for a list of texts using MiniLM.
    
    Args:
        texts: List of text strings (transaction descriptions)
    
    Returns:
        numpy array of shape (n_texts, 384) - 384-dimensional vectors
    """
    model = load_embedding_model()
    
    # Generate embeddings
    # This returns a numpy array: shape (n_texts, 384)
    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,  # Normalize for better performance
        show_progress_bar=False
    )
    
    return embeddings

def generate_embedding(text: str) -> np.ndarray:
    """
    Generate embedding for a single text.
    
    Args:
        text: Single text string
    
    Returns:
        numpy array of shape (384,)
    """
    embeddings = generate_embeddings([text])
    return embeddings[0]  # Return first (and only) embedding
```

**What this does:**
- Takes transaction descriptions like "Starbucks Coffee"
- Converts them to 384-dimensional vectors
- These vectors capture semantic meaning (similar texts = similar vectors)

---

## 🎯 Step 5: Create Classifier Logic

**File:** `ml-service/app/models/classifier.py`

This combines TF-IDF features and embeddings, then predicts categories.

```python
from typing import List, Dict, Tuple
import numpy as np
from app.utils.model_loader import load_classifier, load_vectorizer
from app.models.embeddings import generate_embeddings

# Category mapping (adjust based on your categories)
CATEGORY_NAMES = [
    "Food & Dining",
    "Transport",
    "Groceries",
    "Shopping",
    "Bills & Utilities",
    "Entertainment",
    "Healthcare",
    "Education",
    "Travel",
    "Other"
]

def preprocess_text(text: str) -> str:
    """Clean and preprocess text."""
    # Convert to lowercase
    text = text.lower().strip()
    # Remove extra whitespace
    text = " ".join(text.split())
    return text

def extract_features(descriptions: List[str], amounts: List[float] = None) -> np.ndarray:
    """
    Extract features from transaction descriptions.
    
    Combines:
    1. TF-IDF features (from scikit-learn)
    2. MiniLM embeddings (semantic)
    3. Amount features (normalized)
    
    Args:
        descriptions: List of transaction descriptions
        amounts: Optional list of amounts
    
    Returns:
        Feature matrix of shape (n_samples, n_features)
    """
    # Preprocess texts
    processed_texts = [preprocess_text(desc) for desc in descriptions]
    
    # 1. TF-IDF features
    vectorizer = load_vectorizer()
    tfidf_features = vectorizer.transform(processed_texts).toarray()
    
    # 2. MiniLM embeddings (384 dimensions)
    embedding_features = generate_embeddings(processed_texts)
    
    # 3. Amount features (if provided)
    if amounts:
        amounts_array = np.array(amounts).reshape(-1, 1)
        # Normalize amounts (log scale for better distribution)
        amounts_normalized = np.log1p(np.abs(amounts_array))
    else:
        amounts_normalized = np.zeros((len(descriptions), 1))
    
    # Combine all features
    # Shape: (n_samples, tfidf_dim + 384 + 1)
    features = np.hstack([
        tfidf_features,
        embedding_features,
        amounts_normalized
    ])
    
    return features

def predict_category(description: str, amount: float = None) -> Dict[str, any]:
    """
    Predict category for a single transaction.
    
    Args:
        description: Transaction description
        amount: Transaction amount (optional)
    
    Returns:
        Dictionary with category, confidence, and probabilities
    """
    # Extract features
    features = extract_features([description], [amount] if amount else None)
    
    # Load classifier and predict
    classifier = load_classifier()
    
    # Get prediction
    predicted_class = classifier.predict(features)[0]
    category = CATEGORY_NAMES[predicted_class]
    
    # Get probabilities for all classes
    probabilities = classifier.predict_proba(features)[0]
    confidence = float(np.max(probabilities))
    
    # Get top 3 predictions
    top_3_indices = np.argsort(probabilities)[-3:][::-1]
    top_3 = [
        {
            "category": CATEGORY_NAMES[idx],
            "confidence": float(probabilities[idx])
        }
        for idx in top_3_indices
    ]
    
    return {
        "category": category,
        "confidence": confidence,
        "top_predictions": top_3
    }

def predict_batch(transactions: List[Dict[str, any]]) -> List[Dict[str, any]]:
    """
    Predict categories for multiple transactions.
    
    Args:
        transactions: List of dicts with 'description' and optional 'amount'
    
    Returns:
        List of prediction results
    """
    descriptions = [t["description"] for t in transactions]
    amounts = [t.get("amount") for t in transactions]
    
    # Extract features for all transactions at once (faster)
    features = extract_features(descriptions, amounts)
    
    # Predict
    classifier = load_classifier()
    predicted_classes = classifier.predict(features)
    probabilities = classifier.predict_proba(features)
    
    # Format results
    results = []
    for i, (pred_class, probs) in enumerate(zip(predicted_classes, probabilities)):
        confidence = float(np.max(probs))
        top_3_indices = np.argsort(probs)[-3:][::-1]
        
        results.append({
            "category": CATEGORY_NAMES[pred_class],
            "confidence": confidence,
            "top_predictions": [
                {
                    "category": CATEGORY_NAMES[idx],
                    "confidence": float(probs[idx])
                }
                for idx in top_3_indices
            ]
        })
    
    return results
```

**What this does:**
- Combines TF-IDF + embeddings + amount features
- Predicts category using trained classifier
- Returns confidence scores and top predictions

---

## 🌐 Step 6: Create API Endpoints

**File:** `ml-service/app/routers/__init__.py`
```python
# Empty file
```

**File:** `ml-service/app/routers/classify.py`

This defines the REST API endpoints.

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from app.models.classifier import predict_category, predict_batch

router = APIRouter(prefix="/api", tags=["classification"])

# Request/Response models
class TransactionRequest(BaseModel):
    """Request model for single transaction classification."""
    description: str = Field(..., description="Transaction description")
    amount: Optional[float] = Field(None, description="Transaction amount")
    merchant: Optional[str] = Field(None, description="Merchant name")

class BatchTransactionRequest(BaseModel):
    """Request model for batch classification."""
    transactions: List[TransactionRequest] = Field(..., description="List of transactions")

class ClassificationResponse(BaseModel):
    """Response model for classification."""
    category: str
    confidence: float
    top_predictions: List[dict]

class BatchClassificationResponse(BaseModel):
    """Response model for batch classification."""
    results: List[ClassificationResponse]

@router.post("/classify", response_model=ClassificationResponse)
async def classify_transaction(request: TransactionRequest):
    """
    Classify a single transaction.
    
    Example:
    ```json
    {
        "description": "Starbucks Coffee",
        "amount": 5.50
    }
    ```
    """
    try:
        result = predict_category(
            description=request.description,
            amount=request.amount
        )
        return ClassificationResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Classification failed: {str(e)}"
        )

@router.post("/batch-classify", response_model=BatchClassificationResponse)
async def classify_batch_transactions(request: BatchTransactionRequest):
    """
    Classify multiple transactions at once (more efficient).
    
    Example:
    ```json
    {
        "transactions": [
            {"description": "Uber ride", "amount": 15.00},
            {"description": "Whole Foods", "amount": 45.00}
        ]
    }
    ```
    """
    try:
        transactions = [
            {"description": t.description, "amount": t.amount}
            for t in request.transactions
        ]
        results = predict_batch(transactions)
        return BatchClassificationResponse(
            results=[ClassificationResponse(**r) for r in results]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch classification failed: {str(e)}"
        )
```

**What this does:**
- Defines `/api/classify` endpoint (single transaction)
- Defines `/api/batch-classify` endpoint (multiple transactions)
- Validates input with Pydantic models
- Returns structured JSON responses

---

## 🚀 Step 7: Create FastAPI Application

**File:** `ml-service/app/__init__.py`
```python
# Empty file
```

**File:** `ml-service/app/main.py`

This is the main FastAPI application that ties everything together.

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import classify
from app.utils.model_loader import ensure_models_loaded
import os

# Create FastAPI app
app = FastAPI(
    title="FinTrack ML Service",
    description="Machine Learning service for transaction categorization",
    version="1.0.0"
)

# Configure CORS (allow frontend to call this API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain: ["https://your-app.web.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(classify.router)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    models_loaded = ensure_models_loaded()
    return {
        "status": "healthy",
        "model_loaded": models_loaded,
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "FinTrack ML Service",
        "docs": "/docs",
        "health": "/health"
    }

# Model info endpoint
@app.get("/model-info")
async def model_info():
    """Get information about the loaded model."""
    try:
        from app.utils.model_loader import load_classifier
        classifier = load_classifier()
        
        return {
            "model_type": type(classifier).__name__,
            "n_classes": len(classifier.classes_) if hasattr(classifier, 'classes_') else None,
            "status": "loaded"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# Startup event - load models when service starts
@app.on_event("startup")
async def startup_event():
    """Load models when the service starts."""
    print("🚀 Starting ML Service...")
    models_loaded = ensure_models_loaded()
    if models_loaded:
        print("✅ All models loaded successfully!")
    else:
        print("⚠️ Some models failed to load. Service will still start but classification may fail.")
    print("📖 API docs available at: http://localhost:8001/docs")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("👋 Shutting down ML Service...")
```

**What this does:**
- Creates FastAPI app
- Configures CORS (allows frontend to call API)
- Includes classification router
- Adds health check endpoint
- Loads models on startup
- Auto-generates API docs at `/docs`

---

## 🐳 Step 8: Create Dockerfile

**File:** `ml-service/Dockerfile`

This tells Cloud Run how to build and run your service.

```dockerfile
# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY models/ ./models/

# Expose port (Cloud Run uses PORT environment variable)
ENV PORT=8080
EXPOSE 8080

# Run the application
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1
```

**What this does:**
- Uses Python 3.11
- Installs dependencies
- Copies your code
- Runs FastAPI with uvicorn
- Cloud Run will automatically use this

---

## 📝 Step 9: Create .dockerignore

**File:** `ml-service/.dockerignore`

This tells Docker what files to ignore (makes builds faster).

```
__pycache__
*.pyc
*.pyo
*.pyd
.Python
venv/
env/
.venv
*.egg-info
.git
.gitignore
.env
.env.local
*.md
.DS_Store
```

---

## 📋 Step 10: Create .env.example

**File:** `ml-service/.env.example`

Example environment variables (for local development).

```env
# Model paths
MODEL_PATH=./models

# Logging
LOG_LEVEL=info

# API settings
API_HOST=0.0.0.0
API_PORT=8001
```

---

## 📚 Step 11: Create README

**File:** `ml-service/README.md`

```markdown
# FinTrack ML Service

Machine Learning microservice for transaction categorization.

## Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn app.main:app --reload --port 8001

# Visit: http://localhost:8001/docs
```

## Testing

```bash
# Health check
curl http://localhost:8001/health

# Classify transaction
curl -X POST http://localhost:8001/api/classify \
  -H "Content-Type: application/json" \
  -d '{"description": "Starbucks Coffee", "amount": 5.50}'
```

## Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for Cloud Run deployment instructions.
```

---

## 🧪 Step 12: Test Locally

**Before deploying, test everything locally:**

```bash
cd ml-service

# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the service
uvicorn app.main:app --reload --port 8001
```

**Visit:** http://localhost:8001/docs

You'll see:
- ✅ Auto-generated API documentation
- ✅ Try out endpoints
- ✅ Test classification (will fail until you train a model)

---

## 🎓 Step 13: Train Your First Model

**You need to train a model before classification works.**

Create a training script: `ml-service/train_model.py`

```python
"""
Training script for transaction classifier.

You'll need sample transaction data with labels.
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report
import joblib
from pathlib import Path
from sentence_transformers import SentenceTransformer

# Load your training data
# Format: CSV with columns: description, amount, category
df = pd.read_csv("training_data.csv")  # You'll create this

# Prepare features
descriptions = df['description'].tolist()
amounts = df['amount'].tolist()
categories = df['category'].tolist()

# 1. Train TF-IDF vectorizer
vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
tfidf_features = vectorizer.fit_transform(descriptions).toarray()

# 2. Generate embeddings
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
embedding_features = embedding_model.encode(descriptions)

# 3. Combine features
amounts_normalized = np.log1p(np.abs(np.array(amounts))).reshape(-1, 1)
features = np.hstack([tfidf_features, embedding_features, amounts_normalized])

# 4. Train classifier
X_train, X_test, y_train, y_test = train_test_split(
    features, categories, test_size=0.2, random_state=42
)

classifier = RandomForestClassifier(n_estimators=100, random_state=42)
classifier.fit(X_train, y_train)

# 5. Evaluate
y_pred = classifier.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"Accuracy: {accuracy:.2%}")
print(classification_report(y_test, y_pred))

# 6. Save models
models_dir = Path("models")
models_dir.mkdir(exist_ok=True)

joblib.dump(classifier, models_dir / "classifier.pkl")
joblib.dump(vectorizer, models_dir / "vectorizer.pkl")
print("✅ Models saved!")
```

**For now, you can create a dummy model for testing:**

```python
# ml-service/create_dummy_model.py
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from pathlib import Path

# Create dummy data
descriptions = [
    "Starbucks Coffee", "McDonald's", "Uber ride", "Gas station",
    "Whole Foods", "Target", "Electric bill", "Netflix subscription"
]
categories = [0, 0, 1, 1, 2, 3, 4, 5]  # Food, Food, Transport, Transport, Groceries, Shopping, Bills, Entertainment

# Train simple model
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(descriptions).toarray()

classifier = RandomForestClassifier(n_estimators=10, random_state=42)
classifier.fit(X, categories)

# Save
models_dir = Path("models")
models_dir.mkdir(exist_ok=True)
joblib.dump(classifier, models_dir / "classifier.pkl")
joblib.dump(vectorizer, models_dir / "vectorizer.pkl")
print("✅ Dummy models created!")
```

---

## ✅ Summary

You've created:
1. ✅ Directory structure
2. ✅ `requirements.txt` - Dependencies
3. ✅ `app/utils/model_loader.py` - Model loading
4. ✅ `app/models/embeddings.py` - Embedding generation
5. ✅ `app/models/classifier.py` - Classification logic
6. ✅ `app/routers/classify.py` - API endpoints
7. ✅ `app/main.py` - FastAPI application
8. ✅ `Dockerfile` - Deployment config
9. ✅ `.dockerignore` - Docker ignore file
10. ✅ `.env.example` - Environment template
11. ✅ `README.md` - Documentation

**Next Steps:**
1. Test locally: `uvicorn app.main:app --reload --port 8001`
2. Create/train a model (or use dummy model for testing)
3. Deploy to Cloud Run (see DEPLOYMENT.md)

---

## 🐛 Common Issues

**Issue: Models not found**
- Solution: Create `models/` folder and train a model first

**Issue: Import errors**
- Solution: Make sure all `__init__.py` files exist

**Issue: CORS errors**
- Solution: Check CORS settings in `app/main.py`

**Issue: Port already in use**
- Solution: Change port: `--port 8002`

---

**You're ready to code! Follow these steps one by one. 🚀**

