import pandas as pd

# Load small chunk
df = pd.read_csv("data/raw/lendingclub_sample.csv", low_memory=False, nrows=200000)

# Clean and reduce columns
df = df.rename(columns={"addr_state":"state", "fico_range_high":"fico"})
df["default"] = df["loan_status"].isin([
    "Charged Off","Default","Late (31-120 days)","Late (16-30 days)"
]).astype(int)

df = df[[
    "loan_amnt","annual_inc","dti","emp_length","grade","term",
    "purpose","home_ownership","state","revol_util","fico","default"
]].dropna()

# Sample for performance
df = df.sample(5000, random_state=42)
df.to_csv("data/raw/lendingclub_sample_5000.csv", index=False)

print("✅ Saved sample to data/raw/lendingclub_sample_5000.csv")
