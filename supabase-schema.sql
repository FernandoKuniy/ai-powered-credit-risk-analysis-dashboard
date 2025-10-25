-- Supabase Database Schema for Credit Risk Analytics Platform
-- Run this in the Supabase SQL Editor

-- Applications table to store all scoring results
CREATE TABLE applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Input features
    loan_amnt INTEGER NOT NULL,
    annual_inc DECIMAL(12,2) NOT NULL,
    dti DECIMAL(5,2) NOT NULL,
    emp_length INTEGER NOT NULL,
    grade VARCHAR(1) NOT NULL,
    term VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    home_ownership VARCHAR(20) NOT NULL,
    state VARCHAR(2) NOT NULL,
    revol_util DECIMAL(5,2) NOT NULL,
    fico INTEGER NOT NULL,
    
    -- Model outputs
    pd DECIMAL(5,4) NOT NULL,
    risk_grade VARCHAR(1) NOT NULL,
    decision VARCHAR(10) NOT NULL
);

-- Portfolio stats table for cached aggregates
CREATE TABLE portfolio_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_applications INTEGER NOT NULL,
    avg_pd DECIMAL(5,4) NOT NULL,
    approval_rate DECIMAL(5,4) NOT NULL,
    default_rate DECIMAL(5,4) NOT NULL,
    grade_distribution JSONB NOT NULL,
    threshold DECIMAL(5,4) NOT NULL DEFAULT 0.25
);

-- Indexes for performance
CREATE INDEX idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX idx_applications_grade ON applications(grade);
CREATE INDEX idx_applications_pd ON applications(pd);
CREATE INDEX idx_applications_decision ON applications(decision);

-- Insert initial portfolio stats (will be updated by backend)
INSERT INTO portfolio_stats (
    total_applications, 
    avg_pd, 
    approval_rate, 
    default_rate, 
    grade_distribution
) VALUES (
    0, 
    0.0, 
    0.0, 
    0.0, 
    '{"A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "F": 0, "G": 0}'::jsonb
);
