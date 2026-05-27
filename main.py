# ═══════════════════════════════════════════════════════════════════════
#  main.py — Smart Shop AI Backend
#  A FastAPI server that exposes ML endpoints for the frontend.
#
#  HOW TO RUN:
#    pip install fastapi uvicorn lightgbm pandas numpy pydantic
#    uvicorn main:app --reload
#
#  The frontend (index.html) calls this server at http://localhost:8000
# ═══════════════════════════════════════════════════════════════════════

# ── IMPORTS ──────────────────────────────────────────────────────────────
# FastAPI: the web framework. Like Flask but modern and auto-validates types.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Pydantic: validates incoming JSON data matches our expected structure
from pydantic import BaseModel

# pandas: for working with tables of data (like Excel rows in Python)
import pandas as pd

# numpy: for math operations on arrays
import numpy as np

# LightGBM: the Gradient Boosting ML model
#   - Works by building many small decision trees one after another
#   - Each tree corrects the errors of the previous one
#   - Very fast and accurate, especially on tabular (structured) data
import lightgbm as lgb

# typing: for annotating what types of data our functions expect
from typing import List, Dict, Optional
from datetime import datetime, timedelta


# ═══════════════════════════════════════════════════════════════════════
# APP SETUP
# ═══════════════════════════════════════════════════════════════════════

# Create the FastAPI application
app = FastAPI(
    title="Smart Shop AI API",
    description="ML-powered inventory and demand forecasting for small merchants",
    version="2.0.0"
)

# CORS Middleware: allows the HTML frontend (running in browser) to call this API
# Without this, browsers block cross-origin API calls for security reasons
# allow_origins=["*"] means any website can call this API (fine for local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════
# DATA MODELS (Pydantic schemas)
# These define the structure of data we EXPECT to receive from frontend.
# FastAPI will auto-reject requests that don't match these schemas.
# ═══════════════════════════════════════════════════════════════════════

class SaleRecord(BaseModel):
    """A single sale transaction record."""
    date: str        # e.g. "2025-05-10"
    product: str     # e.g. "Boiled Egg"
    qty: float       # quantity sold (dozens/grams/kg)
    price: float     # price per unit in ₹
    revenue: float   # total revenue = qty * price


class SalesPayload(BaseModel):
    """The full payload the frontend sends — a list of all sales."""
    sales_data: List[SaleRecord]


# ═══════════════════════════════════════════════════════════════════════
# HELPER: FEATURE ENGINEERING FOR TIME SERIES
# ═══════════════════════════════════════════════════════════════════════

def create_features(daily_df: pd.DataFrame) -> pd.DataFrame:
    """
    Adds extra columns (features) that help LightGBM make better predictions.

    Why do we need extra features?
    - LightGBM can't directly understand dates like "2025-05-10"
    - We convert temporal info into numbers the model CAN learn from.

    Features we add:
      day_index   — integer offset from first sale day (0, 1, 2, ...)
      day_of_week — 0=Mon, 6=Sun (captures weekend patterns)
      day_of_month — 1–31 (captures monthly patterns e.g. start-of-month spikes)

    The more features we add, the better the model can learn patterns.
    For a full production app, you'd also add: weather, festivals, holidays, etc.
    """
    daily_df = daily_df.copy()

    # day_index: simple counter from 0. Captures overall trend (sales growing/shrinking over time)
    daily_df['day_index'] = (daily_df['date'] - daily_df['date'].min()).dt.days

    # day_of_week: 0=Monday, 6=Sunday. Captures weekly seasonality.
    # e.g. Sprouts might sell more on Sundays (market day).
    daily_df['day_of_week'] = daily_df['date'].dt.dayofweek

    # day_of_month: 1–31. Captures monthly patterns.
    # e.g. sales peak at month-start when people are paid.
    daily_df['day_of_month'] = daily_df['date'].dt.day

    return daily_df


# ═══════════════════════════════════════════════════════════════════════
# HELPER: TRAIN LIGHTGBM MODEL FOR ONE PRODUCT
# ═══════════════════════════════════════════════════════════════════════

def train_lgbm_model(daily_df: pd.DataFrame):
    """
    Trains a LightGBM regression model on daily sales data for one product.

    How LightGBM works (simplified):
    1. Start with a simple prediction (the average).
    2. Build a small decision tree that learns from the errors.
    3. Add that tree to the model to reduce errors.
    4. Repeat 100 times (num_boost_round=100).
    5. Final model = sum of all 100 small trees.

    This is called "Gradient Boosting" — boosting because each tree
    boosts the model's accuracy by correcting the previous errors.

    Args:
        daily_df: DataFrame with columns date, qty, day_index, day_of_week, day_of_month

    Returns:
        Trained LightGBM model, or None if not enough data
    """

    # Need at least 3 data points to train meaningfully
    if len(daily_df) < 3:
        return None

    # Features (inputs to the model) and label (what we're predicting)
    feature_columns = ['day_index', 'day_of_week', 'day_of_month']
    X = daily_df[feature_columns]  # Input: what day is it?
    y = daily_df['qty']            # Output: how much was sold?

    # LightGBM Dataset format (their optimized internal format)
    train_data = lgb.Dataset(X, label=y)

    # Hyperparameters: settings that control how the model trains
    params = {
        'objective': 'regression',   # We're predicting a number (not a category)
        'metric': 'rmse',            # Error metric: Root Mean Square Error
        'boosting_type': 'gbdt',     # Gradient Boosting Decision Trees

        # These are tuned small for tiny datasets:
        'learning_rate': 0.05,       # How much each tree adjusts (small = safer)
        'num_leaves': 7,             # Max splits per tree (small = less overfitting)
        'min_data_in_leaf': 2,       # Minimum sales needed per leaf node

        'verbose': -1,               # Suppress training logs
        'seed': 42                   # Random seed for reproducibility
    }

    # Train the model (100 rounds of boosting)
    model = lgb.train(
        params,
        train_data,
        num_boost_round=100,
        # callbacks=[lgb.log_evaluation(0)]  # uncomment to see training progress
    )

    return model


# ═══════════════════════════════════════════════════════════════════════
# ENDPOINT 1: /predict — 7-day Demand Forecast
# Called by frontend when merchant clicks "Run ML Model"
# ═══════════════════════════════════════════════════════════════════════

@app.post("/predict")
def run_lightgbm_forecast(payload: SalesPayload) -> Dict:
    """
    Trains a LightGBM model per product and predicts next 7 days of demand.

    Step-by-step walkthrough:
    1. Convert the JSON payload into a pandas DataFrame
    2. Loop through each product separately (each gets its own model)
    3. Resample to daily frequency (fill gaps with 0 for days with no sales)
    4. Engineer time features (day_of_week, day_index, etc.)
    5. Train LightGBM
    6. Predict next 7 days
    7. Clip predictions to 0+ (sales can't be negative)
    8. Return all forecasts as JSON

    Why a separate model per product?
    - Egg, Sprouts, and Malt have very different demand patterns
    - One combined model would confuse the patterns
    - Separate models learn each product's unique seasonality
    """

    # ── STEP 1: JSON → DataFrame ──────────────────────────────────────
    # Convert list of SaleRecord objects to a pandas DataFrame (table)
    df = pd.DataFrame([s.dict() for s in payload.sales_data])

    # Parse the date string into a proper datetime object
    # This lets us use .dt.dayofweek, .dt.day etc. later
    df['date'] = pd.to_datetime(df['date'])

    # ── STEP 2: Iterate per product ───────────────────────────────────
    forecasts = {}

    for product in df['product'].unique():

        # Filter to only this product's sales
        prod_df = df[df['product'] == product].sort_values('date')

        # ── STEP 3: Resample to daily ──────────────────────────────
        # Group by date and sum quantities (in case multiple entries per day)
        daily = prod_df.groupby('date')['qty'].sum().reset_index()

        # Resample to fill in missing days with 0
        # e.g. if there's no sale on Tuesday, we want qty=0 for that day
        # This prevents the model from thinking "Tuesday doesn't exist"
        daily = (
            daily
            .set_index('date')
            .resample('D')          # Daily frequency
            .sum()                  # Fill gaps with 0
            .reset_index()
        )

        # ── STEP 4: Feature engineering ────────────────────────────
        daily = create_features(daily)

        # ── STEP 5: Train the model ─────────────────────────────────
        model = train_lgbm_model(daily)

        if model is None:
            # Skip products with too few data points
            print(f"[SKIP] {product}: not enough data (need ≥3 days)")
            continue

        # ── STEP 6: Predict next 7 days ─────────────────────────────
        last_day   = daily['day_index'].max()        # Last day index seen
        last_date  = daily['date'].max()             # Last actual date

        # Build feature rows for the 7 future days
        future_rows = []
        for i in range(1, 8):
            future_date = last_date + timedelta(days=i)
            future_rows.append({
                'day_index':    last_day + i,
                'day_of_week':  future_date.dayofweek,
                'day_of_month': future_date.day
            })
        future_X = pd.DataFrame(future_rows)

        # Run the model on future features → get predicted quantities
        raw_predictions = model.predict(future_X)

        # ── STEP 7: Clip negatives ──────────────────────────────────
        # ML models can sometimes predict negative values
        # A merchant can't sell -3 dozens of eggs, so we floor at 0
        forecasts[product] = [
            round(max(0.0, float(pred)), 1)
            for pred in raw_predictions
        ]

    # ── STEP 8: Return JSON response ──────────────────────────────────
    return {
        "status": "success",
        "forecasts": forecasts,
        "forecast_days": 7
    }


# ═══════════════════════════════════════════════════════════════════════
# ENDPOINT 2: /wastage — Wastage Risk Analysis
# Computes how many days of stock remain and flags overstocked items.
# This runs purely on math — no ML needed.
# ═══════════════════════════════════════════════════════════════════════

class WastageRequest(BaseModel):
    """Request body for the wastage endpoint."""
    sales_data: List[SaleRecord]
    current_stocks: Dict[str, float]   # e.g. {"Boiled Egg": 45, "Sprouts": 1800}


@app.post("/wastage")
def analyze_wastage(req: WastageRequest) -> Dict:
    """
    Computes wastage risk for each product.

    Logic:
        avg_daily_sales = total_qty_sold / number_of_sale_days
        days_of_stock   = current_stock / avg_daily_sales
        risk_score      = days_of_stock mapped to 0–100 scale

    A days_of_stock > 7 means you have more than a week's worth of
    inventory — for perishables like eggs, that's high wastage risk.

    Returns:
        Each product's: avg_daily_sales, days_of_stock, risk_level, recommendation
    """

    if not req.sales_data:
        return {"status": "error", "message": "No sales data provided"}

    df = pd.DataFrame([s.dict() for s in req.sales_data])
    df['date'] = pd.to_datetime(df['date'])

    results = {}

    for product, current_stock in req.current_stocks.items():
        prod_sales = df[df['product'] == product]

        if prod_sales.empty:
            results[product] = {
                "avg_daily_sales": 0,
                "days_of_stock": None,
                "risk_level": "unknown",
                "recommendation": "No sales history — cannot assess risk"
            }
            continue

        # Average daily sales = total sold / number of active days
        total_qty    = prod_sales['qty'].sum()
        unique_days  = prod_sales['date'].nunique()
        avg_daily    = total_qty / unique_days if unique_days > 0 else 0

        # How many days will current stock last?
        days_left = (current_stock / avg_daily) if avg_daily > 0 else float('inf')

        # Classify risk level
        if days_left <= 1:
            risk_level = "critical_low"
            recommendation = f"URGENT: Buy more {product} immediately — less than 1 day left!"
        elif days_left <= 3:
            risk_level = "low"
            recommendation = f"Stock running low. Plan to restock {product} in 1-2 days."
        elif days_left <= 5:
            risk_level = "healthy"
            recommendation = f"{product} stock is healthy. Monitor daily."
        elif days_left <= 7:
            risk_level = "moderate_high"
            recommendation = f"Consider reducing {product} order next time — {days_left:.1f} days of stock remaining."
        else:
            risk_level = "high_wastage"
            recommendation = f"⚠️ High wastage risk! {product} has {days_left:.1f} days of stock. Reduce purchase volume."

        results[product] = {
            "avg_daily_sales": round(avg_daily, 2),
            "days_of_stock": round(days_left, 1),
            "risk_level": risk_level,
            "recommendation": recommendation,
            "current_stock": current_stock
        }

    return {
        "status": "success",
        "wastage_analysis": results,
        "analyzed_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════
# ENDPOINT 3: /patterns — Rush Hour / Day-of-Week Pattern Detection
# Finds which days sell most per product.
# ═══════════════════════════════════════════════════════════════════════

@app.post("/patterns")
def detect_patterns(payload: SalesPayload) -> Dict:
    """
    Analyzes which days of the week each product sells the most.

    How it works:
    1. Extract the day-of-week from each sale date
    2. Sum all quantities sold on each day of the week
    3. Find the best day (max total) and worst day (min total)
    4. Return a recommendation: "Buy more before Saturdays"

    Why is this valuable?
    A merchant who knows "eggs sell 40% more on Sundays" can:
    - Stock up on Saturday evening
    - Avoid running out during peak demand
    - Avoid overstocking on slow days (reducing wastage)
    """

    if not payload.sales_data:
        return {"status": "error", "message": "No data"}

    df = pd.DataFrame([s.dict() for s in payload.sales_data])
    df['date'] = pd.to_datetime(df['date'])
    df['day_of_week'] = df['date'].dt.day_name()  # "Monday", "Tuesday", etc.

    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    patterns  = {}

    for product in df['product'].unique():
        prod_df = df[df['product'] == product]

        # Sum qty per day-of-week
        by_day = prod_df.groupby('day_of_week')['qty'].sum().reindex(day_order, fill_value=0)

        best_day  = by_day.idxmax()
        worst_day = by_day.idxmin()

        patterns[product] = {
            "daily_totals": by_day.round(1).to_dict(),
            "peak_day": best_day,
            "slowest_day": worst_day,
            "recommendation": f"Stock up before {best_day}s. Reduce purchase on {worst_day}s."
        }

    return {
        "status": "success",
        "patterns": patterns
    }


# ═══════════════════════════════════════════════════════════════════════
# ENDPOINT 4: /health — Quick health check
# The frontend can ping this to confirm the backend is alive.
# ═══════════════════════════════════════════════════════════════════════

@app.get("/health")
def health_check():
    """Simple liveness check. Returns 200 OK if server is running."""
    return {
        "status": "ok",
        "message": "Smart Shop AI Backend is running",
        "endpoints": ["/predict", "/wastage", "/patterns", "/health"]
    }


# ═══════════════════════════════════════════════════════════════════════
# RUN LOCALLY (only when executed directly, not via uvicorn)
# Usage: python main.py   OR   uvicorn main:app --reload
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    print("Starting Smart Shop AI Backend...")
    print("Open: http://localhost:8000/docs for interactive API docs")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
