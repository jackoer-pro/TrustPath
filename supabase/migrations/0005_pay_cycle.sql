-- 0005 Consistent pay cycle (Unit 38). Run once in the Supabase SQL editor, after 0004.
-- Alex was paid today, so the next (fortnightly) payday is today + 14 days, and expected pay is $1,500,
-- matching the salary deposit. Only the seed changes: no schema, balances or rules.

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

  -- Mum's birthday is "today" in Australia, so the morning briefing works on any filming day after a reset (Unit 35).
  update payees set birthday = (now() at time zone 'Australia/Sydney')::date where id = y_mum;

  -- Synthetic personal context (Unit 30). Explicit, customer-editable; nothing is inferred.
  insert into customer_preferences (profile_id, next_payday, expected_income_cents, savings_target_cents, min_buffer_cents,
                                    preferred_savings_account_id, ai_max_prepare_cents)
    -- Paid today (fortnightly): the next payday is 14 days away, and expected pay matches today's $1,500 salary.
    values (p_alex, (now() at time zone 'Australia/Sydney')::date + 14, 150000, 30000, 20000, a_saver, 100000);

  insert into commitments (profile_id, name, category, amount_cents, payee_id, in_payday_plan) values
    (p_alex, 'Rent',          'rent',         50000, y_rent,  true),
    (p_alex, 'Electricity',   'bill',         12000, y_power, true),
    (p_alex, 'Subscriptions', 'subscription',  3500, null,    false);

  insert into transactions (account_id, amount_cents, description, counterparty, kind, created_at) values
    (a_everyday,  150000, 'Salary',                     'Harbour Logistics Pty Ltd', 'salary',   now() - interval '5 minutes'),
    (a_everyday,  -50000, 'Rent',                       'Sam Patel',                 'transfer', now() - interval '14 days'),
    (a_everyday,   -5000, 'Happy birthday Mum',         'Linh Nguyen',               'transfer', now() - interval '365 days'),
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
