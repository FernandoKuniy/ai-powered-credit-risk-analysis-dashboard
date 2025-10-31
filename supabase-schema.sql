-- Supabase Database Schema for Credit Risk Analytics Platform
-- Run this in the Supabase SQL Editor

-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'loan_officer' CHECK (role IN ('loan_officer', 'risk_manager')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications table to store all scoring results
CREATE TABLE applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
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

-- Row Level Security (RLS) Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can view their own applications (simplified policy)
CREATE POLICY "Users can view own applications" ON applications
    FOR SELECT USING (
        auth.uid() = user_id AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Users can insert applications
CREATE POLICY "Users can insert applications" ON applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'loan_officer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to compute portfolio statistics using SQL aggregation
CREATE OR REPLACE FUNCTION public.compute_portfolio_stats(p_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_total_applications INTEGER;
    v_avg_pd DECIMAL(5,4);
    v_approval_rate DECIMAL(5,4);
    v_default_rate DECIMAL(5,4);
    v_grade_distribution JSONB;
BEGIN
    -- Get total count and average PD in one query
    SELECT 
        COUNT(*)::INTEGER,
        COALESCE(AVG(pd), 0.0)::DECIMAL(5,4)
    INTO v_total_applications, v_avg_pd
    FROM applications
    WHERE (p_user_id IS NULL OR user_id = p_user_id);
    
    -- Return empty stats if no applications
    IF v_total_applications = 0 THEN
        RETURN json_build_object(
            'total_applications', 0,
            'avg_pd', 0.0,
            'approval_rate', 0.0,
            'default_rate', 0.0,
            'grade_distribution', '{"A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "F": 0, "G": 0}'::jsonb
        );
    END IF;
    
    -- Calculate approval rate using COUNT with CASE
    SELECT 
        COALESCE(
            COUNT(*) FILTER (WHERE decision = 'approve')::DECIMAL / NULLIF(COUNT(*), 0),
            0.0
        )::DECIMAL(5,4)
    INTO v_approval_rate
    FROM applications
    WHERE (p_user_id IS NULL OR user_id = p_user_id);
    
    -- Calculate grade distribution using JSON aggregation
    SELECT json_object_agg(
        risk_grade,
        grade_count
    )
    INTO v_grade_distribution
    FROM (
        SELECT 
            risk_grade,
            COUNT(*)::INTEGER as grade_count
        FROM applications
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
        GROUP BY risk_grade
    ) grade_counts;
    
    -- Ensure all grades are present (fill missing with 0)
    v_grade_distribution := (
        SELECT json_object_agg(
            grade,
            COALESCE((v_grade_distribution->>grade)::INTEGER, 0)
        )
        FROM unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G']) grade
    );
    
    -- Default rate is same as avg_pd (using avg PD as proxy)
    v_default_rate := v_avg_pd;
    
    -- Return aggregated statistics as JSON
    RETURN json_build_object(
        'total_applications', v_total_applications,
        'avg_pd', v_avg_pd,
        'approval_rate', v_approval_rate,
        'default_rate', v_default_rate,
        'grade_distribution', v_grade_distribution
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
