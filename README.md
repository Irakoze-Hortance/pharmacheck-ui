# PharmaCheck

> AI-powered medicine packaging authentication for resource-constrained settings.

## Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB Atlas account (free tier)

## Installation

### 1. Clone the repo
git clone https://github.com/Irakoze-Hortance/capstone-ml.git
cd pharmacheck

### 2. Backend (FastAPI)
cd capstone-ml
pip install -r requirements.txt
cp .env.example .env        # fill in MONGO_URI
uvicorn main:app --reload

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

