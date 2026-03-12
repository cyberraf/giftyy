-- Create ai_sessions table
create table public.ai_sessions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text null,
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  constraint ai_sessions_pkey primary key (id),
  constraint ai_sessions_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Create ai_messages table
create table public.ai_messages (
  id uuid not null default gen_random_uuid(),
  session_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  constraint ai_messages_pkey primary key (id),
  constraint ai_messages_session_id_fkey foreign key (session_id) references public.ai_sessions (id) on delete cascade
);

-- Create ai_feedback table
create table public.ai_feedback (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  product_id uuid null,
  recipient_id uuid null,
  feedback_type text not null check (feedback_type in ('like', 'dislike')),
  reason text null,
  created_at timestamptz not null default now(),
  constraint ai_feedback_pkey primary key (id),
  constraint ai_feedback_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint ai_feedback_recipient_id_fkey foreign key (recipient_id) references public.recipients (id) on delete set null
);

-- Create occasions table
create table public.occasions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  recipient_id uuid not null,
  title text not null,
  date date not null,
  type text not null default 'other',
  recurring boolean not null default true,
  created_at timestamptz not null default now(),
  constraint occasions_pkey primary key (id),
  constraint occasions_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint occasions_recipient_id_fkey foreign key (recipient_id) references public.recipients (id) on delete cascade
);

-- Create gift_recommendations table
create table public.gift_recommendations (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  recipient_id uuid null,
  occasion_id uuid null,
  product_id uuid not null,
  status text not null check (status in ('suggested', 'purchased', 'rejected', 'saved')) default 'suggested',
  generated_at timestamptz not null default now(),
  constraint gift_recommendations_pkey primary key (id),
  constraint gift_recommendations_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint gift_recommendations_recipient_id_fkey foreign key (recipient_id) references public.recipients (id) on delete set null,
  constraint gift_recommendations_occasion_id_fkey foreign key (occasion_id) references public.occasions (id) on delete set null
);

-- Enable RLS
alter table public.ai_sessions enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.occasions enable row level security;
alter table public.gift_recommendations enable row level security;

-- Policies for ai_sessions
create policy "Users can view their own ai_sessions"
on public.ai_sessions for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own ai_sessions"
on public.ai_sessions for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own ai_sessions"
on public.ai_sessions for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own ai_sessions"
on public.ai_sessions for delete
to authenticated
using (auth.uid() = user_id);

-- Policies for ai_messages
create policy "Users can view messages of their sessions"
on public.ai_messages for select
to authenticated
using (
  exists (
    select 1 from public.ai_sessions
    where ai_sessions.id = ai_messages.session_id
    and ai_sessions.user_id = auth.uid()
  )
);

create policy "Users can insert messages to their sessions"
on public.ai_messages for insert
to authenticated
with check (
  exists (
    select 1 from public.ai_sessions
    where ai_sessions.id = ai_messages.session_id
    and ai_sessions.user_id = auth.uid()
  )
);

-- Policies for ai_feedback
create policy "Users can view their own feedback"
on public.ai_feedback for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own feedback"
on public.ai_feedback for insert
to authenticated
with check (auth.uid() = user_id);

-- Policies for occasions
create policy "Users can view their own occasions"
on public.occasions for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own occasions"
on public.occasions for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own occasions"
on public.occasions for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own occasions"
on public.occasions for delete
to authenticated
using (auth.uid() = user_id);

-- Policies for gift_recommendations
create policy "Users can view their own recommendations"
on public.gift_recommendations for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own recommendations"
on public.gift_recommendations for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own recommendations"
on public.gift_recommendations for update
to authenticated
using (auth.uid() = user_id);
