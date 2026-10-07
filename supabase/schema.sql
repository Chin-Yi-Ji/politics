-- 先看政見：Supabase 資料表
-- 在 Supabase 的 SQL Editor 整份貼上執行一次即可。
-- 所有資料表都開啟 RLS 且不設任何 policy：只有伺服器端的 service role 金鑰讀寫得到，
-- 瀏覽器端的 anon 金鑰完全碰不到。

create extension if not exists pgcrypto;

-- 使用者作答。不存 IP、不存裝置識別、不需登入。
create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  county_id text not null,
  expectation_text text,            -- 使用者寫的期待原文；選後 30 天清空
  matched_domains text[] not null default '{}',
  classify_mode text not null,      -- ai / keyword / manual
  picks jsonb,                      -- [{domainId, candidateId|null}]
  recommended text[],
  completed_at timestamptz
);
create index if not exists responses_county_idx on responses (county_id);

-- 「回報遺漏」收件匣
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  county_id text not null,
  candidate_name text,
  domain_id text,
  message text not null,
  source_url text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text,
  resolved_at timestamptz
);

-- 後台對單張政見卡的下架（hide）與放行（publish）
create table if not exists policy_overrides (
  policy_id text primary key,
  action text not null check (action in ('hide', 'publish')),
  updated_at timestamptz not null default now()
);

-- 後台開關：recommendEnabled、statsEnabled
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- 每月 Gemini 分類呼叫次數，用來守住預算上限
create table if not exists usage (
  month text primary key,
  classify_calls integer not null default 0
);

alter table responses enable row level security;
alter table reports enable row level security;
alter table policy_overrides enable row level security;
alter table settings enable row level security;
alter table usage enable row level security;

create or replace function inc_usage(p_month text) returns integer
language sql as $$
  insert into usage (month, classify_calls) values (p_month, 1)
  on conflict (month) do update set classify_calls = usage.classify_calls + 1
  returning classify_calls;
$$;

-- 各領域關注度：某縣市有多少份作答提到這個領域
create or replace function domain_interest(p_county text)
returns table (domain_id text, n bigint, total bigint)
language sql stable as $$
  with r as (select matched_domains from responses where county_id = p_county),
       t as (select count(*) as total from r)
  select d as domain_id, count(*) as n, (select total from t) as total
  from r, unnest(r.matched_domains) as d
  group by d;
$$;

revoke all on function inc_usage(text) from anon, authenticated;
revoke all on function domain_interest(text) from anon, authenticated;

-- 選後 30 天（2026-12-28）執行一次：清掉使用者原始文字，只留彙總用的欄位
-- update responses set expectation_text = null where expectation_text is not null;
