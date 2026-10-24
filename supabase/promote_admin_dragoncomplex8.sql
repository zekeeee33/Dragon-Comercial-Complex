-- Run in the Supabase SQL Editor after dragoncomplex8@gmail.com exists in Auth.
do $$
begin
  update public.profiles
  set role = 'admin',
      status = 'active',
      updated_at = now()
  where lower(email) = 'dragoncomplex8@gmail.com';

  if not found then
    raise exception 'No profile found for dragoncomplex8@gmail.com. Create the user in Supabase Auth, then run this script again.';
  end if;
end;
$$;
