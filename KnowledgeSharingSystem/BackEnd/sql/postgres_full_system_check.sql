-- postgres_full_system_check.sql
-- Run this file in pgAdmin Query Tool (database: KSS)
-- Purpose: one-shot health check for tables + core workflows.

-- =========================================================
-- 1) ENV / DB CONTEXT
-- =========================================================
select
    current_database() as database_name,
    current_user as db_user,
    version() as postgres_version,
    now() as checked_at;

-- =========================================================
-- 2) TABLE PRESENCE + ROW COUNTS (expected core tables)
-- =========================================================
with expected(table_name) as (
    values
        ('users'),
        ('categories'),
        ('access_rules'),
        ('documents'),
        ('document_categories'),
        ('comments'),
        ('questions'),
        ('answers'),
        ('document_reviews'),
        ('reports'),
        ('point_transactions'),
        ('download_history'),
        ('user_activity_logs'),
        ('notifications'),
        ('registration_otps'),
        ('document_reactions'),
        ('saved_documents'),
        ('question_sessions'),
        ('question_messages'),
        ('session_ratings'),
        ('point_events'),
        ('document_access_logs'),
        ('document_text_artifacts'),
        ('document_plagiarism_reviews'),
        ('admin_action_logs')
),
existing as (
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
),
counts as (
    select 'users' as table_name, count(*)::bigint as row_count from public.users
    union all select 'categories', count(*) from public.categories
    union all select 'access_rules', count(*) from public.access_rules
    union all select 'documents', count(*) from public.documents
    union all select 'document_categories', count(*) from public.document_categories
    union all select 'comments', count(*) from public.comments
    union all select 'questions', count(*) from public.questions
    union all select 'answers', count(*) from public.answers
    union all select 'document_reviews', count(*) from public.document_reviews
    union all select 'reports', count(*) from public.reports
    union all select 'point_transactions', count(*) from public.point_transactions
    union all select 'download_history', count(*) from public.download_history
    union all select 'user_activity_logs', count(*) from public.user_activity_logs
    union all select 'notifications', count(*) from public.notifications
    union all select 'registration_otps', count(*) from public.registration_otps
    union all select 'document_reactions', count(*) from public.document_reactions
    union all select 'saved_documents', count(*) from public.saved_documents
    union all select 'question_sessions', count(*) from public.question_sessions
    union all select 'question_messages', count(*) from public.question_messages
    union all select 'session_ratings', count(*) from public.session_ratings
    union all select 'point_events', count(*) from public.point_events
    union all select 'document_access_logs', count(*) from public.document_access_logs
    union all select 'document_text_artifacts', count(*) from public.document_text_artifacts
    union all select 'document_plagiarism_reviews', count(*) from public.document_plagiarism_reviews
    union all select 'admin_action_logs', count(*) from public.admin_action_logs
)
select
    e.table_name,
    case when ex.table_name is not null then 'OK' else 'MISSING' end as table_status,
    coalesce(c.row_count, 0) as row_count
from expected e
left join existing ex on ex.table_name = e.table_name
left join counts c on c.table_name = e.table_name
order by e.table_name;

-- =========================================================
-- 3) USERS / ROLES / ADMIN SEED
-- =========================================================
select
    role,
    count(*) as users
from public.users
group by role
order by role;

select
    user_id,
    username,
    email,
    role,
    points,
    is_active,
    created_at
from public.users
where role = 'admin'
order by created_at asc;

-- =========================================================
-- 4) DOCUMENT WORKFLOW SNAPSHOT
-- =========================================================
select
    status,
    count(*) as documents
from public.documents
group by status
order by status;

select
    d.document_id,
    d.title,
    d.status,
    d.owner_user_id,
    d.created_at
from public.documents d
order by d.created_at desc
limit 20;

-- =========================================================
-- 5) COMMENT WORKFLOW SNAPSHOT
-- =========================================================
select
    status,
    count(*) as comments
from public.comments
group by status
order by status;

select
    c.comment_id,
    c.document_id,
    c.author_user_id,
    c.parent_comment_id,
    c.status,
    c.created_at
from public.comments c
order by c.created_at desc
limit 30;

-- =========================================================
-- 6) POINTS / EVENTS SNAPSHOT
-- =========================================================
select
    event_type,
    status,
    count(*) as events,
    coalesce(sum(points), 0) as total_points
from public.point_events
group by event_type, status
order by event_type, status;

select
    pe.event_id,
    pe.user_id,
    pe.event_type,
    pe.points,
    pe.status,
    pe.document_id,
    pe.comment_id,
    pe.qa_session_id,
    pe.created_at,
    pe.reviewed_at
from public.point_events pe
order by pe.created_at desc
limit 30;

-- =========================================================
-- 7) Q&A WORKFLOW SNAPSHOT
-- =========================================================
select
    status,
    count(*) as sessions
from public.question_sessions
group by status
order by status;

select
    qs.session_id,
    qs.document_id,
    qs.asker_user_id,
    qs.owner_user_id,
    qs.status,
    qs.created_at,
    qs.closed_at
from public.question_sessions qs
order by qs.created_at desc
limit 20;

select
    qm.message_id,
    qm.session_id,
    qm.sender_user_id,
    qm.created_at
from public.question_messages qm
order by qm.created_at desc
limit 30;

select
    sr.rating_id,
    sr.session_id,
    sr.asker_user_id,
    sr.owner_user_id,
    sr.stars,
    sr.created_at
from public.session_ratings sr
order by sr.created_at desc
limit 20;

-- =========================================================
-- 8) NOTIFICATION / REPORT SNAPSHOT
-- =========================================================
select
    type,
    is_read,
    count(*) as notifications
from public.notifications
group by type, is_read
order by type, is_read;

select
    status,
    count(*) as reports
from public.reports
group by status
order by status;

-- =========================================================
-- 9) ORPHAN DATA CHECK (should be 0)
-- =========================================================
select
    (
        select count(*)
        from public.documents d
        left join public.users u on u.user_id = d.owner_user_id
        where u.user_id is null
    ) as documents_missing_owner,
    (
        select count(*)
        from public.comments c
        left join public.users u on u.user_id = c.author_user_id
        where u.user_id is null
    ) as comments_missing_author,
    (
        select count(*)
        from public.point_events pe
        left join public.users u on u.user_id = pe.user_id
        where u.user_id is null
    ) as point_events_missing_user;

-- =========================================================
-- 10) SIMPLE PASS/FAIL SUMMARY
-- =========================================================
with checks as (
    select
        'has_admin_user' as check_name,
        exists (select 1 from public.users where role = 'admin') as pass
    union all
    select
        'has_users',
        exists (select 1 from public.users)
    union all
    select
        'has_documents',
        exists (select 1 from public.documents)
    union all
    select
        'has_categories',
        exists (select 1 from public.categories)
    union all
    select
        'has_point_events',
        exists (select 1 from public.point_events)
    union all
    select
        'has_question_sessions',
        exists (select 1 from public.question_sessions)
)
select
    check_name,
    case when pass then 'PASS' else 'FAIL' end as result
from checks
order by check_name;
