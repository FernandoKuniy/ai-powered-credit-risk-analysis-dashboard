# AI-Powered Credit Risk Analysis Dashboard

AI-powered credit risk analytics platform that scores loan applications in real time and provides portfolio-level risk insights and policy simulation.  
Built with **FastAPI**, **XGBoost**, **Next.js**, and **Supabase**.

---

## 🚀 Overview
This project demonstrates an end-to-end **AI credit risk scoring system** — from model training to API deployment and frontend analytics.

### Users can:
- Submit loan applications and get instant probability of default (PD), risk grade, and decision.  
- Explore portfolio metrics such as default rate, approval rate, and grade distribution.  
- Simulate policy changes using an interactive approval threshold slider.

---

## 🧠 Tech Stack
| Layer | Technologies |
|-------|---------------|
| **Backend** | FastAPI, scikit-learn, XGBoost, Pandas, SHAP |
| **Frontend** | Next.js (TypeScript), Tailwind CSS, Recharts |
| **Database** | Supabase (PostgreSQL) |
| **Deployment** | Render (backend), Vercel (frontend) |
| **Dev Tools** | GitHub Actions, Docker, Cursor, Lovable |

---

## 📂 Project Structure
ai-powered-credit-risk-analysis-dashboard/
│
├── backend/ # FastAPI app and ML model serving
│ ├── app.py
│ ├── schemas.py
│ ├── models/
│ │ └── model.pkl
│ └── requirements.txt
│
├── frontend/ # Next.js dashboard + scoring form
│
├── data/ # Raw and processed LendingClub loan data
│
├── notebooks/ # Model training notebooks
│
└── infra/ # Deployment configs (Dockerfile, CI/CD)

---

## ⚙️ Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/FernandoKuniy/ai-powered-credit-risk-analysis-dashboard.git
cd ai-powered-credit-risk-analysis-dashboard
```

### 2. Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000

## 💻 Virtual Environment Notes
A Python virtual environment keeps dependencies isolated from your system Python.
Create and activate it before installing packages.
# Create
python3.11 -m venv .venv

# Activate (macOS/Linux)
source .venv/bin/activate

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Deactivate when done
deactivate


### 3. Frontend setup
cd ../frontend
npm install
npm run dev
Visit http://localhost:3000 to open the web dashboard


## 4. 💡 Run both servers together (recommended)
A convenience script is included to launch both backend (FastAPI) and frontend (Next.js) at once.
From the project root, run:

chmod +x run_local.sh
./run_local.sh

This will:
- Start the FastAPI backend on localhost:8000
- Start the Next.js frontend on localhost:3000
- Automatically stop both when you press Ctrl+C


## 🧩 Features
- **Real-time Scoring** → Submit loan applications and get instant PD, risk grade, and decision
- **Portfolio Dashboard** → Interactive charts showing risk distribution, approval rates, and trends
- **Policy Simulator** → Adjust approval thresholds and see impact on approval/default rates
- **Data Persistence** → All scoring results saved to Supabase for analytics
- **Live Analytics** → KPI cards, grade distribution, recent applications table

## 📊 Example Workflow
1. **Submit Application** → Enter loan details in the scoring form
2. **Get Instant Results** → Receive PD, risk grade (A-G), and approve/review decision
3. **View Portfolio Analytics** → Dashboard shows total applications, approval rates, risk distribution
4. **Simulate Policies** → Adjust approval threshold slider to see impact on approval and default rates
5. **Track Trends** → View recent applications and monitor portfolio performance

## 🧮 Data Source
LendingClub Loan Dataset: https://www.kaggle.com/datasets/wordsforthewise/lending-club
Subset of 50k–200k records used for demo purposes.

## 🚀 Deployment

### Quick Setup
1. **Database**: Create Supabase project and run `supabase-schema.sql`
2. **Backend**: Deploy to Render with environment variables (see `DEPLOYMENT.md`)
3. **Frontend**: Deploy to Vercel with API URL configuration
4. **Test**: Submit applications and verify dashboard functionality

### Environment Variables
- **Backend (Render)**: `SUPABASE_URL`, `SUPABASE_KEY`, `ALLOWED_ORIGINS`, `API_KEY`
- **Frontend (Vercel)**: `NEXT_PUBLIC_API_URL`, `API_KEY`

See `DEPLOYMENT.md` for detailed setup instructions.

## 🧰 Future Enhancements
- **SHAP Explanations** → Feature importance for each prediction
- **Macro Data Integration** → FRED economic indicators (unemployment, rates)
- **Automated ETL** → Scheduled portfolio updates and caching
- **Authentication** → Role-based access (Loan Officer / Risk Manager)
- **Batch Scoring** → CSV upload for bulk predictions
- **Model Monitoring** → Performance tracking and drift detection

## 📝 License
This project is licensed under the MIT License.

## 👤 Author
Fernando S. Kuniy
🌐 https://fernando-kuniy.vercel.app/
💼 https://www.linkedin.com/in/fernando-kuniy/
