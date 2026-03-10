
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', u.id,
      'email', u.email,
      'created_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ) ORDER BY u.created_at DESC
  )
  INTO result
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id;
  RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_user_data(_target_user_id uuid)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'instances', COALESCE((SELECT json_agg(row_to_json(i) ORDER BY i.created_at DESC) FROM public.z_api_instances i WHERE i.user_id = _target_user_id), '[]'::json),
    'disparos', COALESCE((SELECT json_agg(row_to_json(d) ORDER BY d.started_at DESC) FROM public.disparos d WHERE d.user_id = _target_user_id), '[]'::json),
    'templates', COALESCE((SELECT json_agg(row_to_json(t) ORDER BY t.created_at DESC) FROM public.templates t WHERE t.user_id = _target_user_id), '[]'::json),
    'lead_lists', COALESCE((SELECT json_agg(
      json_build_object(
        'id', ll.id,
        'name', ll.name,
        'description', ll.description,
        'created_at', ll.created_at,
        'lead_count', (SELECT COUNT(*) FROM public.leads l WHERE l.list_id = ll.id)
      ) ORDER BY ll.created_at DESC
    ) FROM public.lead_lists ll WHERE ll.user_id = _target_user_id), '[]'::json)
  ) INTO result;
  RETURN result;
END;
$$;
