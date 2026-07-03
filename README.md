# PharmaCheck

> AI-powered medicine packaging authentication for resource-constrained settings.

## Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB Atlas account (free tier)

## Installation

### 1. Clone the repo
git clone https://github.com/Irakoze-Hortance/pharmacheck-ui.git

```
cd pharmacheck-ui
```

### 2. Backend (FastAPI)
1. cd capstone-ml
2. ip install -r requirements.txt
3. cp .env.example .env        # fill in MONGO_URI
4. uvicorn main:app --reload

### 3. Frontend (Next.js Dashboard)
cd pharmacheck
npm install
npm run dev

### 4. Android App
- Open /android in Android Studio
- Add google-services.json if applicable
- Place tflite model in app/src/main/assets/
- Run on device or emulator (API 26+)

## Live Demo
- API: https://capstone-ml-lqpp.onrender.com/docs

## Demo Video
[5-minute walkthrough — YouTube/Drive link]

