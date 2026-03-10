
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. RLS: users can read own roles, admins can read all
CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Security definer function for admin to query all data from any table
CREATE OR REPLACE FUNCTION public.admin_get_all_profiles()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles ORDER BY created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_get_all_disparos()
RETURNS SETOF public.disparos
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.disparos ORDER BY started_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_get_all_z_api_instances()
RETURNS SETOF public.z_api_instances
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.z_api_instances ORDER BY created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_get_all_lead_lists()
RETURNS SETOF public.lead_lists
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.lead_lists ORDER BY created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_get_all_templates()
RETURNS SETOF public.templates
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.templates ORDER BY created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_get_stats()
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
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'total_instances', (SELECT COUNT(*) FROM public.z_api_instances),
    'total_disparos', (SELECT COUNT(*) FROM public.disparos),
    'total_sent', (SELECT COALESCE(SUM(sent), 0) FROM public.disparos),
    'total_failed', (SELECT COALESCE(SUM(failed), 0) FROM public.disparos),
    'total_leads', (SELECT COUNT(*) FROM public.leads),
    'total_lists', (SELECT COUNT(*) FROM public.lead_lists),
    'total_templates', (SELECT COUNT(*) FROM public.templates)
  ) INTO result;
  RETURN result;
END;
$$;
