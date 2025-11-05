import pandas as pd
from sklearn.model_selection import train_test_split

# Load larger chunk to ensure we have enough data after cleaning
# Using 250k rows to account for data loss during cleaning/dropna
df = pd.read_csv("data/raw/lendingclub_sample.csv", low_memory=False, nrows=250000)

# Clean and reduce columns
df = df.rename(columns={"addr_state":"state", "fico_range_high":"fico"})
df["default"] = df["loan_status"].isin([
    "Charged Off","Default","Late (31-120 days)","Late (16-30 days)"
]).astype(int)

df = df[[
    "loan_amnt","annual_inc","dti","emp_length","grade","term",
    "purpose","home_ownership","state","revol_util","fico","default"
]].dropna()

print(f"✅ Loaded {len(df)} rows after cleaning")

# Create 150k stratified sample to maintain default rate distribution
# If we have fewer than 150k rows, use all available data
target_size = 150000
if len(df) >= target_size:
    # Use stratified sampling to maintain default rate
    df_sampled, _ = train_test_split(
        df, 
        train_size=target_size, 
        stratify=df["default"], 
        random_state=42
    )
    print(f"✅ Created stratified sample of {len(df_sampled)} rows")
    print(f"   Default rate: {df_sampled['default'].mean():.2%}")
else:
    df_sampled = df
    print(f"⚠️  Only {len(df)} rows available, using all data")
    print(f"   Default rate: {df_sampled['default'].mean():.2%}")

# Save 150k sample
df_sampled.to_csv("data/raw/lendingclub_sample_150k.csv", index=False)
print(f"✅ Saved sample to data/raw/lendingclub_sample_150k.csv")

# Keep the 5k sample for backward compatibility (if needed)
if len(df) >= 5000:
    df_5k = df.sample(5000, random_state=42)
    df_5k.to_csv("data/raw/lendingclub_sample_5000.csv", index=False)
    print("✅ Saved 5k sample to data/raw/lendingclub_sample_5000.csv")
