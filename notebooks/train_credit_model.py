import pandas as pd, json, joblib
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv("data/raw/lendingclub_sample_5000.csv")

# Convert emp_length to numeric (years)
df["emp_length"] = (
    df["emp_length"]
    .astype(str)
    .str.extract(r"(\d+)")   # extract digits
    .fillna(0)
    .astype(float)
)

y = df["default"].astype(int)
X = df.drop(columns=["default"])

num = ["loan_amnt","annual_inc","dti","emp_length","revol_util","fico"]
cat = ["grade","term","purpose","home_ownership","state"]

pre = ColumnTransformer([
    ("num","passthrough",num),
    ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat),
])

clf = XGBClassifier(
    n_estimators=400, max_depth=4, learning_rate=0.07,
    subsample=0.9, colsample_bytree=0.9, reg_lambda=1.0,
    eval_metric="logloss", tree_method="hist"
)

pipe = Pipeline([("pre", pre), ("clf", clf)])

Xtr,Xte,ytr,yte = train_test_split(X,y,test_size=0.2, stratify=y, random_state=42)
pipe.fit(Xtr,ytr)
print("AUC:", roc_auc_score(yte, pipe.predict_proba(Xte)[:,1]))

joblib.dump(pipe, "backend/models/model.pkl")
json.dump({"feature_order": X.columns.tolist()}, open("backend/models/feature_meta.json","w"))
print("Saved artifacts to backend/models/")
