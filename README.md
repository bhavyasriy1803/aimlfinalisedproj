# BranchIQ — Bank Branch Performance Intelligence

An AI-powered web application that predicts bank branch performance scores using a Linear Regression model trained on 310 branch records across 24 operational metrics.

**Live demo:** *(add your Vercel URL here after deployment)*

---

## Features

- 24-feature input form organised across 5 operational categories
- Animated performance gauge with tier classification (Poor / Below Average / Good / Excellent)
- Full detailed analysis report: model metrics, tier distribution, branch positioning, feature comparison
- REST API endpoints for predictions and dataset statistics
- R² = 0.9822 · RMSE = 0.67 on held-out test set

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.x · Flask |
| ML Model | scikit-learn Linear Regression |
| Data | pandas · openpyxl |
| Frontend | Vanilla HTML · CSS · JavaScript |
| Hosting | Vercel (serverless Python) |

---

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 2. Create and activate a virtual environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the development server

```bash
python app.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

---

## Deployment

### Deploy to GitHub

```bash
git init
git add .
git commit -m "Initial commit — BranchIQ"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### Deploy to Vercel

**Option A — Vercel Dashboard (recommended)**

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New Project**
3. Import your GitHub repository
4. Framework Preset: select **Other**
5. Click **Deploy** — Vercel detects `vercel.json` automatically

**Option B — Vercel CLI**

```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts. On subsequent deploys:

```bash
vercel --prod
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Main application UI |
| POST | `/api/predict` | Predict performance score (JSON body) |
| GET | `/api/sample-data` | Fetch a random training sample |
| GET | `/api/model-stats` | Model metrics and dataset statistics |
| GET | `/api/feature-stats` | Feature means, stds, mins, maxs |

### Example: POST /api/predict

```bash
curl -X POST https://<your-app>.vercel.app/api/predict \
  -H "Content-Type: application/json" \
  -d '{"Customers_Count": 2500, "Staff_Count": 45}'
```

Response:
```json
{
  "prediction": 43.82,
  "tier": "Good",
  "description": "This branch is performing above average...",
  "score_percent": 55.4,
  "percentile": 56.1,
  "model_r2": 0.9822,
  "model_rmse": 0.6719,
  "tier_dist": {"Excellent": 15, "Good": 149, "Below Average": 118, "Poor": 28},
  "feature_comparison": [...]
}
```

---

## Project Structure

```
branchiq/
├── app.py                        # Flask application & API routes
├── bank_model.pkl                # Trained Linear Regression model
├── finalisedaimlrawdataset.xlsx  # Training dataset (310 samples)
├── finalisedaimlmodel1106.ipynb  # Model training notebook
├── requirements.txt              # Python dependencies
├── vercel.json                   # Vercel deployment configuration
├── .gitignore
├── templates/
│   └── index.html                # Main HTML template (Jinja2)
└── static/
    ├── style.css                 # Professional bank theme CSS
    └── main.js                   # Interactive JS (tabs, gauge, charts)
```

---

## Model Details

| Metric | Value |
|---|---|
| Algorithm | Linear Regression |
| Training samples | 248 |
| Test samples | 62 |
| R² Score | 0.9822 |
| RMSE | 0.6719 |
| Score range | 27.53 – 56.94 |
| Features | 24 |

Performance tiers: **Excellent** ≥ 50 · **Good** 42–50 · **Below Average** 35–42 · **Poor** < 35

### Model Performance Matrix

During the training phase (documented in the Jupyter Notebook), we used **GridSearchCV** for hyperparameter tuning and evaluated three different models to find the most optimal one for our dataset. 

Here is the exact performance matrix comparing the models:

| Model | R² Score (Accuracy) | Mean Squared Error (MSE) | Root Mean Squared Error (RMSE) |
| :--- | :--- | :--- | :--- |
| **Linear Regression (Optimal)** | **0.9735 (97.3%)** | **0.694** | **0.833** |
| **Random Forest** | 0.8265 (82.6%) | 4.545 | 2.132 |
| **Decision Tree** | 0.5920 (59.2%) | 10.691 | 3.269 |

**Why Linear Regression is the Best:**
Linear Regression was finalized as the optimal model because it significantly outperformed the ensemble and tree-based models, proving that the relationship between our 24 branch metrics and the final performance score is highly linear.
