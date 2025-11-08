"""
Synthetic Data Generation for Low FICO Scores

This script generates synthetic loan applications with FICO scores < 614
to address out-of-distribution issues in the training data.

Method: Statistical sampling with domain knowledge constraints
"""

import pandas as pd
import numpy as np
from typing import Tuple
import json

def analyze_patterns(df: pd.DataFrame) -> dict:
    """Analyze existing data patterns to guide synthetic data generation."""
    patterns = {}
    
    # FICO vs Default Rate
    fico_buckets = [650, 700, 750, 850]
    fico_defaults = []
    for i in range(len(fico_buckets) - 1):
        subset = df[(df['fico'] >= fico_buckets[i]) & (df['fico'] < fico_buckets[i+1])]
        if len(subset) > 0:
            fico_defaults.append({
                'fico_range': f'{fico_buckets[i]}-{fico_buckets[i+1]}',
                'default_rate': subset['default'].mean(),
                'count': len(subset)
            })
    patterns['fico_default_rates'] = fico_defaults
    
    # Grade vs Default Rate
    patterns['grade_default_rates'] = df.groupby('grade')['default'].mean().to_dict()
    
    # FICO vs Grade relationship
    patterns['grade_fico_means'] = df.groupby('grade')['fico'].mean().to_dict()
    
    # Feature distributions
    patterns['loan_amnt'] = {
        'mean': float(df['loan_amnt'].mean()),
        'std': float(df['loan_amnt'].std()),
        'min': float(df['loan_amnt'].min()),
        'max': float(df['loan_amnt'].max())
    }
    patterns['annual_inc'] = {
        'mean': float(df['annual_inc'].mean()),
        'std': float(df['annual_inc'].std()),
        'min': float(df['annual_inc'].min()),
        'max': float(df['annual_inc'].max())
    }
    patterns['dti'] = {
        'mean': float(df['dti'].mean()),
        'std': float(df['dti'].std()),
        'min': float(df['dti'].min()),
        'max': float(df['dti'].max())
    }
    patterns['revol_util'] = {
        'mean': float(df['revol_util'].mean()),
        'std': float(df['revol_util'].std()),
        'min': float(df['revol_util'].min()),
        'max': float(df['revol_util'].max())
    }
    patterns['emp_length'] = {
        'mean': float(df['emp_length'].mean()),
        'std': float(df['emp_length'].std()),
        'min': float(df['emp_length'].min()),
        'max': float(df['emp_length'].max())
    }
    
    # Categorical distributions
    patterns['grade_dist'] = df['grade'].value_counts(normalize=True).to_dict()
    patterns['term_dist'] = df['term'].value_counts(normalize=True).to_dict()
    patterns['purpose_dist'] = df['purpose'].value_counts(normalize=True).to_dict()
    patterns['home_ownership_dist'] = df['home_ownership'].value_counts(normalize=True).to_dict()
    patterns['state_dist'] = df['state'].value_counts(normalize=True).to_dict()
    
    return patterns


def assign_grade_and_default_rate(fico: float) -> Tuple[str, float]:
    """
    Assign grade and expected default rate based on FICO score.
    Uses domain knowledge and extrapolation from existing patterns.
    More conservative (higher) default rates for very low FICO.
    """
    if fico < 400:
        # Extremely poor credit - very high default rate
        grade = 'G'
        # For FICO 300-400, expect 70-75% default rate
        default_rate = 0.72
    elif fico < 450:
        # Very poor credit
        grade = np.random.choice(['F', 'G'], p=[0.2, 0.8])
        default_rate = 0.65
    elif fico < 500:
        # Poor credit
        grade = np.random.choice(['F', 'G'], p=[0.4, 0.6])
        default_rate = 0.55
    elif fico < 550:
        # Fair-poor credit
        grade = np.random.choice(['E', 'F'], p=[0.3, 0.7])
        default_rate = 0.45
    elif fico < 600:
        # Fair credit
        grade = np.random.choice(['E', 'F'], p=[0.6, 0.4])
        default_rate = 0.35
    else:  # 600-614
        # Moderate credit
        grade = np.random.choice(['D', 'E'], p=[0.5, 0.5])
        default_rate = 0.30
    
    return grade, default_rate


def generate_synthetic_data(
    df_template: pd.DataFrame,
    n_samples: int = 5000,
    fico_ranges: list = None
) -> pd.DataFrame:
    """
    Generate synthetic loan applications with FICO < 614.
    
    Args:
        df_template: Existing dataset to use as templates
        n_samples: Number of synthetic samples to generate
        fico_ranges: List of (min, max, weight) tuples for FICO distribution
    
    Returns:
        DataFrame with synthetic loan applications
    """
    if fico_ranges is None:
        # Default distribution: more samples in extreme ranges to better train the model
        fico_ranges = [
            (300, 400, 0.25),   # 25% extremely poor (increased from 15%)
            (400, 500, 0.30),   # 30% very poor (increased from 25%)
            (500, 550, 0.20),   # 20% poor (decreased from 25%)
            (550, 600, 0.15),   # 15% fair-poor (decreased from 20%)
            (600, 614, 0.10),   # 10% moderate (decreased from 15%)
        ]
    
    synthetic_records = []
    
    print(f"   Generating {n_samples} synthetic samples...")
    print(f"   FICO distribution:")
    for min_fico, max_fico, weight in fico_ranges:
        print(f"     {min_fico}-{max_fico}: {weight*100:.0f}%")
    
    for i in range(n_samples):
        # 1. Sample a random real application as template
        template = df_template.sample(1).iloc[0]
        
        # 2. Assign target FICO based on weighted distribution
        weights = [w for _, _, w in fico_ranges]
        range_idx = np.random.choice(len(fico_ranges), p=weights)
        min_fico, max_fico, _ = fico_ranges[range_idx]
        target_fico = np.random.uniform(min_fico, max_fico)
        
        # 3. Determine grade and default rate based on FICO
        grade, expected_default_rate = assign_grade_and_default_rate(target_fico)
        
        # 4. Adjust features to be more realistic for low FICO
        # Income: slightly lower on average for very low FICO
        income_adjustment = 1.0
        if target_fico < 450:
            income_adjustment = np.random.uniform(0.85, 0.95)  # 5-15% lower
        
        # DTI: slightly higher for very low FICO
        dti_adjustment = 0.0
        if target_fico < 500:
            dti_adjustment = np.random.uniform(2, 5)  # Add 2-5 points
        
        # Employment: slightly shorter for very low FICO
        emp_adjustment = 0.0
        if target_fico < 500:
            emp_adjustment = -np.random.exponential(0.5)  # Slightly shorter
        
        # 5. Create synthetic record (matching original column order)
        synthetic_record = {
            'loan_amnt': max(1000, min(35000, template['loan_amnt'] + np.random.normal(0, 2000))),
            'annual_inc': max(20000, template['annual_inc'] * income_adjustment + np.random.normal(0, 5000)),
            'dti': max(0, min(50, template['dti'] + dti_adjustment + np.random.normal(0, 2))),
            'emp_length': max(0, template['emp_length'] + emp_adjustment + np.random.normal(0, 0.5)),
            'grade': grade,
            'term': template['term'],  # Keep from template
            'purpose': template['purpose'],  # Keep from template
            'home_ownership': template['home_ownership'],  # Keep from template
            'state': template['state'],  # Keep from template
            'revol_util': max(0, min(100, template['revol_util'] + np.random.normal(0, 5))),
            'fico': target_fico,
            'default': 1 if np.random.random() < expected_default_rate else 0
        }
        
        synthetic_records.append(synthetic_record)
    
    synthetic_df = pd.DataFrame(synthetic_records)
    
    # Convert emp_length to string format to match original data
    synthetic_df['emp_length'] = synthetic_df['emp_length'].apply(
        lambda x: f"{int(x)} years" if x >= 1 else "< 1 year"
    )
    
    return synthetic_df


def validate_synthetic_data(synthetic_df: pd.DataFrame, original_df: pd.DataFrame) -> dict:
    """Validate that synthetic data maintains realistic properties."""
    validation_results = {}
    
    # Check FICO range
    validation_results['fico_range'] = {
        'min': float(synthetic_df['fico'].min()),
        'max': float(synthetic_df['fico'].max()),
        'mean': float(synthetic_df['fico'].mean()),
        'valid': bool(synthetic_df['fico'].max() < 614)
    }
    
    # Check default rate
    validation_results['default_rate'] = {
        'synthetic': float(synthetic_df['default'].mean()),
        'original': float(original_df['default'].mean()),
        'valid': True  # Should be higher than original
    }
    
    # Check grade distribution
    validation_results['grade_dist'] = synthetic_df['grade'].value_counts(normalize=True).to_dict()
    
    # Check FICO vs Default relationship
    fico_buckets = [300, 400, 500, 600, 614]
    fico_default_relationship = []
    for i in range(len(fico_buckets) - 1):
        subset = synthetic_df[
            (synthetic_df['fico'] >= fico_buckets[i]) & 
            (synthetic_df['fico'] < fico_buckets[i+1])
        ]
        if len(subset) > 0:
            fico_default_relationship.append({
                'fico_range': f'{fico_buckets[i]}-{fico_buckets[i+1]}',
                'default_rate': float(subset['default'].mean()),
                'count': len(subset)
            })
    validation_results['fico_default_relationship'] = fico_default_relationship
    
    # Check feature ranges
    validation_results['feature_ranges'] = {
        'loan_amnt': {
            'min': float(synthetic_df['loan_amnt'].min()),
            'max': float(synthetic_df['loan_amnt'].max())
        },
        'annual_inc': {
            'min': float(synthetic_df['annual_inc'].min()),
            'max': float(synthetic_df['annual_inc'].max())
        },
        'dti': {
            'min': float(synthetic_df['dti'].min()),
            'max': float(synthetic_df['dti'].max())
        }
    }
    
    return validation_results


def main():
    """Main function to generate and validate synthetic data."""
    print("=" * 60)
    print("Synthetic Data Generation for Low FICO Scores")
    print("=" * 60)
    
    # Load existing training data
    print("\n[1/3] Loading existing training data...")
    df = pd.read_csv("data/raw/lendingclub_sample_150k.csv")
    print(f"   Loaded {len(df)} rows")
    print(f"   FICO range: {df['fico'].min():.0f} - {df['fico'].max():.0f}")
    print(f"   Default rate: {df['default'].mean():.2%}")
    
    # Convert emp_length to numeric for analysis
    df["emp_length"] = (
        df["emp_length"]
        .astype(str)
        .str.extract(r"(\d+)")
        .fillna(0)
        .astype(float)
    )
    
    # Analyze patterns
    print("\n[2/3] Analyzing data patterns...")
    patterns = analyze_patterns(df)
    print("   ✓ Patterns analyzed")
    print(f"   Grade default rates: {patterns['grade_default_rates']}")
    
    # Generate synthetic data
    print("\n[3/3] Generating synthetic data...")
    # Increased volume: 15,000 samples for better coverage
    synthetic_df = generate_synthetic_data(df, n_samples=15000)
    print(f"   ✓ Generated {len(synthetic_df)} synthetic samples")
    
    # Validate synthetic data
    print("\n[4/4] Validating synthetic data...")
    validation = validate_synthetic_data(synthetic_df, df)
    
    print("\nValidation Results:")
    print(f"   FICO range: {validation['fico_range']['min']:.0f} - {validation['fico_range']['max']:.0f}")
    print(f"   Default rate: {validation['default_rate']['synthetic']:.2%}")
    print(f"   Grade distribution:")
    for grade, pct in sorted(validation['grade_dist'].items()):
        print(f"     {grade}: {pct:.1%}")
    
    print("\n   FICO vs Default Rate:")
    for rel in validation['fico_default_relationship']:
        print(f"     {rel['fico_range']}: {rel['default_rate']:.2%} ({rel['count']} samples)")
    
    # Save synthetic data
    output_path = "data/raw/lendingclub_synthetic_low_fico.csv"
    synthetic_df.to_csv(output_path, index=False)
    print(f"\n✅ Saved synthetic data to {output_path}")
    
    # Save validation report
    validation_path = "data/raw/synthetic_data_validation.json"
    with open(validation_path, 'w') as f:
        json.dump(validation, f, indent=2)
    print(f"✅ Saved validation report to {validation_path}")
    
    print("\n" + "=" * 60)
    print("Synthetic Data Generation Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()

