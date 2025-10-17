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
- /score → Real-time credit scoring API endpoint
- /portfolio → Portfolio statistics and analytics
- Interactive Dashboard → Approval rate, risk distribution, simulation slider
- Explainability (optional) → SHAP-based feature insights

## 📊 Example Workflow
1. Input applicant data in the scoring form.
2. Receive instant predictions — PD, risk grade, and decision.
3. View aggregated portfolio metrics.
4. Adjust approval threshold to see impact on approval and default rates.

## 🧮 Data Source
LendingClub Loan Dataset: https://www.kaggle.com/datasets/wordsforthewise/lending-club
Subset of 50k–200k records used for demo purposes.

## 🧰 Future Enhancements
- Add SHAP visual explanations per prediction.
- Integrate FRED macroeconomic data (interest rates, unemployment).
- Implement Supabase scheduled jobs for nightly portfolio updates.
- Role-based authentication (Loan Officer / Risk Manager).

## 📝 License
This project is licensed under the MIT License.

## 👤 Author
Fernando S. Kuniy
🌐 https://fernando-kuniy.vercel.app/
💼 https://www.linkedin.com/in/fernando-kuniy/
