-- TrustPath schema, money rules and demo seed.
-- Apply once in the Supabase SQL editor. Never edit after applying; add 0002_… instead.
-- All money is integer cents (AUD). The browser never talks to this database:
-- RLS is on with no policies, and the server uses the secret key.

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table profiles (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  default_account_id uuid,
  outgoing_paused    boolean not null default false,
  new_payees_blocked boolean not null default false,
  emergency_since    timestamptz,
  created_at         timestamptz not null default now()
);

create table accounts (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles (id),
  name          text not null,
  kind          text not null check (kind in ('everyday', 'savings')),
  aliases       text[] not null default '{}',
  bsb           text not null,
  number        text not null,
  balance_cents bigint not null constraint accounts_balance_nonnegative check (balance_cents >= 0),
  created_at    timestamptz not null default now()
);

alter table profiles
  add constraint profiles_default_account_fk foreign key (default_account_id)
  references accounts (id) deferrable initially deferred;

create table payees (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id),
  name       text not null,
  aliases    text[] not null default '{}',
  kind       text not null check (kind in ('person', 'biller')),
  reference  text,
  verified   boolean not null default false,
  created_at timestamptz not null default now()
);

create table cards (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles (id),
  account_id    uuid not null references accounts (id),
  last_four     text not null check (last_four ~ '^[0-9]{4}$'),
  status        text not null default 'active' check (status in ('active', 'temporarily_locked', 'locked')),
  reported_lost boolean not null default false,
  created_at    timestamptz not null default now()
);

create table transactions (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts (id),
  amount_cents bigint not null check (amount_cents <> 0),
  description  text not null,
  counterparty text,
  kind         text not null check (kind in ('salary', 'transfer', 'payment', 'purchase', 'card')),
  created_at   timestamptz not null default now()
);

create table pending_actions (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles (id),
  type            text not null check (type in ('transfer', 'purchase')),
  from_account_id uuid not null references accounts (id),
  to_account_id   uuid references accounts (id),
  payee_id        uuid references payees (id),
  -- Raw recipient text for a transfer that didn't resolve (always blocked), e.g. "J. Smith".
  recipient_label text,
  merchant        text,
  product_id      text,
  amount_cents    bigint not null check (amount_cents > 0),
  description     text,
  payload_hash    text not null,
  status          text not null check (status in ('pending_approval', 'completed', 'cancelled', 'held', 'blocked', 'expired')),
  risk_level      text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  reasons         jsonb not null default '[]',
  origin          text not null default 'customer' check (origin in ('customer', 'simulated_compromised_agent')),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '10 minutes',
  completed_at    timestamptz,
  constraint pending_actions_target check (
    (type = 'transfer' and merchant is null and product_id is null and (
          (to_account_id is not null and payee_id is null)
       or (to_account_id is null and payee_id is not null)
       or (to_account_id is null and payee_id is null and recipient_label is not null and status = 'blocked')))
    or
    (type = 'purchase' and to_account_id is null and payee_id is null and recipient_label is null
       and merchant is not null and product_id is not null)
  )
);

create table card_events (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null references cards (id),
  merchant     text not null,
  amount_cents bigint not null check (amount_cents > 0),
  channel      text not null check (channel in ('ecommerce', 'in_store')),
  new_merchant boolean not null,
  decision     text not null check (decision in ('approved', 'declined', 'review')),
  risk_level   text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  reasons      jsonb not null default '[]',
  card_action  text not null default 'none' check (card_action in ('none', 'temporarily_locked')),
  created_at   timestamptz not null default now()
);

create table incidents (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles (id),
  type          text not null check (type in ('card_fraud', 'account_compromise', 'injection_blocked')),
  severity      text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status        text not null default 'open' check (status in ('open', 'contained', 'investigated')),
  title         text not null,
  description   text not null,
  card_event_id uuid references card_events (id),
  action_id     uuid references pending_actions (id),
  measures      jsonb not null default '[]',
  ai_brief      text,
  reviewed_by   text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles (id),
  kind          text not null,
  title         text not null,
  body          text not null,
  card_event_id uuid references card_events (id),
  response      text check (response in ('confirmed', 'denied')),
  created_at    timestamptz not null default now()
);

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor       text not null check (actor in ('customer', 'ai_agent', 'trust_engine', 'fraud_engine', 'bank_staff', 'system')),
  action      text not null,
  entity_type text not null,
  entity_id   text,
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ─── Row level security: on everywhere, no policies ──────────────────────────
-- anon and authenticated get nothing; the server's secret key bypasses RLS.

alter table profiles        enable row level security;
alter table accounts        enable row level security;
alter table payees          enable row level security;
alter table cards           enable row level security;
alter table transactions    enable row level security;
alter table pending_actions enable row level security;
alter table card_events     enable row level security;
alter table incidents       enable row level security;
alter table notifications   enable row level security;
alter table audit_logs      enable row level security;

-- ─── complete_action: the ONLY code path that changes balances ───────────────
-- One transaction: single-use status flip bound to the payload hash and expiry,
-- debit (the CHECK raises on overdraft and rolls everything back), credit for
-- own-account transfers, transaction rows.

create function complete_action(p_action_id uuid, p_payload_hash text)
returns pending_actions
language plpgsql
set search_path = public
as $$
declare
  a          pending_actions;
  from_name  text;
  to_name    text;
  payee_kind text;
begin
  update pending_actions
     set status = 'completed', completed_at = now()
   where id = p_action_id
     and status = 'pending_approval'
     and payload_hash = p_payload_hash
     and expires_at > now()
  returning * into a;

  if not found then
    raise exception 'ACTION_NOT_APPROVABLE';
  end if;

  update accounts set balance_cents = balance_cents - a.amount_cents where id = a.from_account_id
  returning name into from_name;

  if a.to_account_id is not null then
    update accounts set balance_cents = balance_cents + a.amount_cents where id = a.to_account_id
    returning name into to_name;

    insert into transactions (account_id, amount_cents, description, counterparty, kind) values
      (a.from_account_id, -a.amount_cents, coalesce(a.description, 'Transfer to ' || to_name), to_name, 'transfer'),
      (a.to_account_id,    a.amount_cents, coalesce(a.description, 'Transfer from ' || from_name), from_name, 'transfer');

  elsif a.payee_id is not null then
    select name, kind into to_name, payee_kind from payees where id = a.payee_id;

    insert into transactions (account_id, amount_cents, description, counterparty, kind) values
      (a.from_account_id, -a.amount_cents, coalesce(a.description, 'Payment to ' || to_name), to_name,
       case when payee_kind = 'biller' then 'payment' else 'transfer' end);

  else
    insert into transactions (account_id, amount_cents, description, counterparty, kind) values
      (a.from_account_id, -a.amount_cents, coalesce(a.description, 'Purchase at ' || a.merchant), a.merchant, 'purchase');
  end if;

  return a;
end;
$$;

-- ─── reset_demo: wipe everything and re-seed the persona ─────────────────────
-- Keep in sync with project-overview.md → Demo Persona and lib/banking/constants.ts.

create function reset_demo()
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
begin
  truncate table audit_logs, notifications, incidents, card_events, pending_actions,
                 transactions, cards, payees, accounts, profiles restart identity cascade;

  insert into profiles (id, name, default_account_id) values (p_alex, 'Alex Nguyen', a_everyday);

  insert into accounts (id, profile_id, name, kind, aliases, bsb, number, balance_cents) values
    (a_everyday, p_alex, 'Everyday',   'everyday', '{everyday,main,everyday account}',  '999-001', '12345678', 150000),
    (a_saver,    p_alex, 'Goal Saver', 'savings',  '{savings,saver,goal saver}',        '999-001', '87654321', 420000);

  insert into cards (id, profile_id, account_id, last_four) values (c_debit, p_alex, a_everyday, '4821');

  insert into payees (id, profile_id, name, aliases, kind, reference, verified) values
    (y_mum,   p_alex, 'Linh Nguyen',        '{mum,mom,linh}',                       'person', null,         true),
    (y_power, p_alex, 'BrightSpark Energy', '{electricity,power,brightspark,energy}', 'biller', 'BSE-204918', true);

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

-- Only the server (service_role / secret key) may call the functions.
revoke execute on function complete_action(uuid, text) from public, anon, authenticated;
revoke execute on function reset_demo() from public, anon, authenticated;
grant execute on function complete_action(uuid, text) to service_role;
grant execute on function reset_demo() to service_role;

select reset_demo();
