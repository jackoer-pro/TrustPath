-- 0002 CoachGuard (Unit 28). Run once in the Supabase SQL editor, after 0001.
-- Adds: the scam_coaching incident type, coaching_assessments, a link from incidents to an assessment,
-- and a recently added, unverified payee in the seed (the scam caller had Alex add "D. Mercer" yesterday).
-- Nothing here changes complete_action(), balances or any existing constraint other than incidents.type.

alter table incidents drop constraint incidents_type_check;
alter table incidents add constraint incidents_type_check
  check (type in ('card_fraud', 'account_compromise', 'injection_blocked', 'scam_coaching'));

create table coaching_assessments (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references profiles (id),
  assessment       text not null check (assessment in ('no_signs', 'some_signs', 'strong_signs')),
  -- [{ type, evidence, source: 'ai' | 'rules' }]; evidence is always an exact excerpt of the pasted text
  signals          jsonb not null default '[]',
  explanation      text not null,
  next_action      text not null,
  source           text not null check (source in ('ai', 'rules', 'ai+rules')),
  excerpt          text not null,
  created_at       timestamptz not null default now()
);
alter table coaching_assessments enable row level security;

alter table incidents add column coaching_assessment_id uuid references coaching_assessments (id);

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
begin
  truncate table audit_logs, notifications, incidents, coaching_assessments, card_events, pending_actions,
                 transactions, cards, payees, accounts, profiles restart identity cascade;

  insert into profiles (id, name, default_account_id) values (p_alex, 'Alex Nguyen', a_everyday);

  insert into accounts (id, profile_id, name, kind, aliases, bsb, number, balance_cents) values
    (a_everyday, p_alex, 'Everyday',   'everyday', '{everyday,main,everyday account}',  '999-001', '12345678', 150000),
    (a_saver,    p_alex, 'Goal Saver', 'savings',  '{savings,saver,goal saver}',        '999-001', '87654321', 420000);

  insert into cards (id, profile_id, account_id, last_four) values (c_debit, p_alex, a_everyday, '4821');

  insert into payees (id, profile_id, name, aliases, kind, reference, verified, created_at) values
    (y_mum,    p_alex, 'Linh Nguyen',        '{mum,mom,linh}',                         'person', null,         true,  now() - interval '400 days'),
    (y_power,  p_alex, 'BrightSpark Energy', '{electricity,power,brightspark,energy}', 'biller', 'BSE-204918', true,  now() - interval '300 days'),
    -- Added yesterday while Alex was on the phone with a "bank security officer" (CoachGuard demo).
    (y_mercer, p_alex, 'D. Mercer',          '{mercer,d mercer,dylan mercer}',         'person', null,         false, now() - interval '1 day');

  insert into transactions (account_id, amount_cents, description, counterparty, kind, created_at) values
    (a_everyday,  150000, 'Salary',                     'Harbour Logistics Pty Ltd', 'salary',   now() - interval '5 minutes'),
    (a_everyday,  -42000, 'Rent share',                 'Sam Patel',                 'payment',  now() - interval '3 days'),
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
