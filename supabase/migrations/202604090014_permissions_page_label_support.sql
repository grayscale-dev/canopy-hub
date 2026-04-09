update public.permissions
set page = 'Support'
where code = 'support.edit'
   or lower(page) in ('/support', 'support');
