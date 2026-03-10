-- ==========================================
-- HEARING LOSS ANALYTICS MASTER VIEWS
-- ==========================================
-- This script creates a master view for Power BI 
-- to perform comprehensive hearing loss analysis.

-- 1. Master Analysis View
-- Join students with screenings and calculate hearing grades
CREATE OR REPLACE VIEW public.v_analytics_master AS
SELECT 
    s.screening_id,
    st.id AS student_id,
    st.name AS student_name,
    st.age,
    st.gender,
    st.school_name,
    st.class_name,
    s.date AS screening_date,
    s.left_pta,
    s.right_pta,
    -- Core Analysis
    (s.left_pta + s.right_pta) / 2 AS avg_pta,
    ABS(s.left_pta - s.right_pta) AS ear_difference,
    -- WHO Hearing Grade Classification
    CASE 
        WHEN (s.left_pta + s.right_pta) / 2 <= 20 THEN 'Normal (0-20dB)'
        WHEN (s.left_pta + s.right_pta) / 2 <= 35 THEN 'Mild (21-35dB)'
        WHEN (s.left_pta + s.right_pta) / 2 <= 50 THEN 'Moderate (36-50dB)'
        WHEN (s.left_pta + s.right_pta) / 2 <= 65 THEN 'Moderately Severe (51-65dB)'
        WHEN (s.left_pta + s.right_pta) / 2 <= 80 THEN 'Severe (66-80dB)'
        ELSE 'Profound (>80dB)'
    END AS hearing_grade,
    -- Missed Stuff: Intervention Priority
    CASE 
        WHEN (s.left_pta + s.right_pta) / 2 > 35 THEN 'High - Clinical Action Needed'
        WHEN ABS(s.left_pta - s.right_pta) > 15 THEN 'Medium - Asymmetry Detected'
        WHEN (s.left_pta + s.right_pta) / 2 > 20 THEN 'Low - Monitor Student'
        ELSE 'None - Normal'
    END AS intervention_priority
FROM public.screening_pta s
JOIN public.student_summary st ON s.patient_id = st.id;

-- 2. School/Class Statistical Summary View
-- Pre-calculates aggregates for faster Power BI performance
CREATE OR REPLACE VIEW public.v_statistical_summary AS
SELECT 
    school_name,
    class_name,
    COUNT(DISTINCT student_id) AS total_students,
    COUNT(screening_id) AS total_screenings,
    AVG(avg_pta) AS avg_school_pta,
    MIN(avg_pta) AS min_school_pta,
    MAX(avg_pta) AS max_school_pta,
    COUNT(CASE WHEN intervention_priority = 'High - Clinical Action Needed' THEN 1 END) AS high_risk_count
FROM public.v_analytics_master
GROUP BY school_name, class_name;

-- 3. Age & Gender Demographic Analysis View
CREATE OR REPLACE VIEW public.v_demographic_analysis AS
SELECT 
    age,
    gender,
    AVG(avg_pta) AS avg_pta,
    COUNT(screening_id) AS screening_count
FROM public.v_analytics_master
GROUP BY age, gender;
