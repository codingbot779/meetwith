create table if not exists public.meetings (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.meetings enable row level security;

drop policy if exists "Anyone can create meetings" on public.meetings;
create policy "Anyone can create meetings"
  on public.meetings for insert to anon
  with check (true);

drop policy if exists "Anyone can view meetings" on public.meetings;
create policy "Anyone can view meetings"
  on public.meetings for select to anon
  using (true);

drop policy if exists "Anyone can update meetings" on public.meetings;
create policy "Anyone can update meetings"
  on public.meetings for update to anon
  using (true) with check (true);

-- 모임을 만든 사람만 삭제할 수 있도록 관리자 키의 SHA-256 해시를 저장합니다.
-- (원본 키는 만든 사람의 브라우저에만 있고, DB에는 해시만 남습니다.)
alter table public.meetings add column if not exists admin_token_hash text;

-- anon은 data 컬럼만 수정할 수 있습니다. (관리자 해시를 바꿔치기하지 못하도록)
revoke update on public.meetings from anon;
grant update (data) on public.meetings to anon;

-- anon이 테이블에서 직접 delete 하는 것은 막고, 아래 함수로만 삭제합니다.
drop policy if exists "Anyone can delete meetings" on public.meetings;
revoke delete on public.meetings from anon;

-- 관리자 키가 일치할 때만 모임과 응답(이름·가능 시간)을 영구 삭제합니다.
create or replace function public.delete_meeting(meeting_id text, admin_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.meetings
  where id = meeting_id
    and admin_token_hash is not null
    and admin_token_hash = encode(sha256(convert_to(admin_token, 'UTF8')), 'hex');
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

revoke all on function public.delete_meeting(text, text) from public;
grant execute on function public.delete_meeting(text, text) to anon;

-- 모임을 만든 사람이 확정한 시간. anon은 data 컬럼만 수정할 수 있으므로 이 컬럼은 아래 함수로만 바뀝니다.
alter table public.meetings add column if not exists confirmed jsonb;

-- 관리자 키가 일치할 때만 확정 시간을 저장합니다. confirmed_slot이 null이면 확정을 취소합니다.
create or replace function public.confirm_meeting(meeting_id text, admin_token text, confirmed_slot jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.meetings
  set confirmed = confirmed_slot
  where id = meeting_id
    and admin_token_hash is not null
    and admin_token_hash = encode(sha256(convert_to(admin_token, 'UTF8')), 'hex');
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

revoke all on function public.confirm_meeting(text, text, jsonb) from public;
grant execute on function public.confirm_meeting(text, text, jsonb) to anon;
