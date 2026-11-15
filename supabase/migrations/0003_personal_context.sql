-- 0003 Personal context, AI permissions and session trust (Units 30–34). Run once in the Supabase SQL editor, after 0002.
-- Adds: customer_preferences, commitments, payees.ai_approved, pending_actions.trace (explainable decisions),
-- the session_risk incident type, the simulated_unfamiliar_device origin, and the rent payee + context in the seed.
-- Nothing here changes complete_action(), balances or approval rules.

alter table pending_actions drop constraint pending_actions_origin_check;
alter table pending_actions add constraint pending_actions_origin_check
  check (origin in ('customer', 'simulated_compromised_agent', 'simulated_unfamiliar_device'));
-- The decision trace: intent, session, transaction, signals, rules, decision (shown to the customer and to staff).
alter table pending_actions add column trace jsonb;

alter table incidents drop constraint incidents_type_check;
alter table incidents add constraint incidents_type_check
  check (type in ('card_fraud', 'account_compromise', 'injection_blocked', 'scam_coaching', 'session_risk'));

-- Customer-controlled: may the assistant prepare payments to this payee?
alter table payees add column ai_approved boolean not null default true;

create table customer_preferences (
  profile_id                   uuid primary key references profiles (id),
  next_payday                  date not null,
  expected_income_cents        bigint not null check (expected_income_cents >= 0),
  savings_target_cents         bigint not null check (savings_target_cents >= 0),
  min_buffer_cents             bigint not null check (min_buffer_cents >= 0),
  preferred_savings_account_id uuid references accounts (id),
  -- The most the assistant may prepare in one action (AI mandate). Customer taps in the app are not limited by it.
  ai_max_prepare_cents         bigint not null check (ai_max_prepare_cents > 0),
  updated_at                   timestamptz not null default now()
);
alter table customer_preferences enable row level security;

create table commitments (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles (id),
  name           text not null,
  category       text not null check (category in ('rent', 'bill', 'subscription', 'other')),
  amount_cents   bigint not null check (amount_cents > 0),
  payee_id       uuid references payees (id),
  in_payday_plan boolean not null default false,
  created_at     timestamptz not null default now()
);
alter table commitments enable row level security;

create or replace function reset_demo()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p_alex     constant uuid := '00000000-0000-4000-8000-000000000001';
  a_everyday constant uuid := '00000000-0000-4000-8000-000000000011';
  a_saver    constant uuid := '00000000-0000-4000-8000-000000000012';
  c_debit    constant uuid := '00000000-0000-4000-8000-000000000021';
  y_mum      constant uuid := '00000000-0000-4000-8000-000000000031';
  y_power    constant uuid := '00000000-0000-4000-8000-000000000032';
  y_mercer   constant uuid := '00000000-0000-4000-8000-000000000033';
  y_rent     constant uuid := '00000000-0000-4000-8000-000000000034';
begin
  truncate table audit_logs, notifications, incidents, coaching_assessments, card_events, pending_actions,
                 transactions, commitments, customer_preferences, cards, payees, accounts, profiles restart identity cascade;

  insert into profiles (id, name, default_account_id) values (p_alex, 'Alex Nguyen', a_everyday);

  insert into accounts (id, profile_id, name, kind, aliases, bsb, number, balance_cents) values
    (a_everyday, p_alex, 'Everyday',   'everyday', '{everyday,main,everyday account}',  '999-001', '12345678', 150000),
    (a_saver,    p_alex, 'Goal Saver', 'savings',  '{savings,saver,goal saver}',        '999-001', '87654321', 420000);

  insert into cards (id, profile_id, account_id, last_four) values (c_debit, p_alex, a_everyday, '4821');

  insert into payees (id, profile_id, name, aliases, kind, reference, verified, created_at) values
    (y_mum,    p_alex, 'Linh Nguyen',        '{mum,mom,linh}',                         'person', null,         true,  now() - interval '400 days'),
    (y_power,  p_alex, 'BrightSpark Energy', '{electricity,power,brightspark,energy}', 'biller', 'BSE-204918', true,  now() - interval '300 days'),
    (y_rent,   p_alex, 'Sam Patel',          '{rent,sam,sam patel,landlord}',          'person', null,         true,  now() - interval '500 days'),
    -- Added yesterday while Alex was on the phone with a "bank security officer" (CoachGuard and session-trust demos).
    (y_mercer, p_alex, 'D. Mercer',          '{mercer,d mercer,dylan mercer}',         'person', null,         false, now() - interval '1 day');

  -- Synthetic personal context (Unit 30). Explicit, customer-editable; nothing is inferred.
  insert into customer_preferences (profile_id, next_payday, expected_income_cents, savings_target_cents, min_buffer_cents,
                                    preferred_savings_account_id, ai_max_prepare_cents)
    values (p_alex, greatest(date '2026-11-20', current_date + 1), 300000, 30000, 20000, a_saver, 100000);

  insert into commitments (profile_id, name, category, amount_cents, payee_id, in_payday_plan) values
    (p_alex, 'Rent',          'rent',         50000, y_rent,  true),
    (p_alex, 'Electricity',   'bill',         12000, y_power, true),
    (p_alex, 'Subscriptions', 'subscription',  3500, null,    false);

  insert into transactions (account_id, amount_cents, description, counterparty, kind, created_at) values
    (a_everyday,  150000, 'Salary',                     'Harbour Logistics Pty Ltd', 'salary',   now() - interval '5 minutes'),
    (a_everyday,  -50000, 'Rent',                       'Sam Patel',                 'transfer', now() - interval '14 days'),
    (a_everyday,   -6420, 'Groceries',                  'Corner Grocer',             'card',     now() - interval '5 days'),
    (a_everyday,   -4500, 'Phone bill',                 'TelcoOne',                  'payment',  now() - interval '9 days'),
    (a_everyday,   20000, 'Transfer from Goal Saver',   'Goal Saver',                'transfer', now() - interval '12 days'),
    (a_saver,     -20000, 'Transfer to Everyday',       'Everyday',                  'transfer', now() - interval '12 days');

  -- Card history for the fraud rules (average amount, known merchants). Never changes balances.
  insert into card_events (card_id, merchant, amount_cents, channel, new_merchant, decision, risk_level, card_action, created_at)
  select c_debit, m, amt, 'in_store', false, 'approved', 'low', 'none', now() - make_interval(days => d, hours => 9)
    from (values
      ('Corner Grocer',    4250,  1), ('Metro Café',        850,  2), ('CityLink Transit', 1200,  3),
      ('Metro Café',       1450,  5), ('Corner Grocer',    6420,  5), ('CityLink Transit', 1200,  8),
      ('Metro Café',        920, 10), ('Corner Grocer',    3815, 12), ('CityLink Transit', 1600, 14),
      ('Metro Café',       1275, 17), ('Corner Grocer',    8500, 19), ('CityLink Transit',  980, 22),
      ('Metro Café',       1100, 24), ('Corner Grocer',    2960, 27), ('CityLink Transit', 2400, 29)
    ) as h (m, amt, d);
end;
$$;

select reset_demo();
