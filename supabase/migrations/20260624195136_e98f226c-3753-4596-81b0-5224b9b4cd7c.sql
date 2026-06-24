DROP POLICY IF EXISTS "participants public insert" ON public.participants;
DROP POLICY IF EXISTS "participants public update" ON public.participants;
DROP POLICY IF EXISTS "participants public delete" ON public.participants;

CREATE POLICY "participants public insert" ON public.participants
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    id ~ '^p_[a-z0-9]{8,24}$'
    AND current_url ~ '^/(view/(red|blue)/(home|contact))?$'
    AND (assigned_url IS NULL OR assigned_url ~ '^/view/(red|blue)/(home|contact)$')
  );
CREATE POLICY "participants public update" ON public.participants
  FOR UPDATE TO anon, authenticated
  USING (id ~ '^p_[a-z0-9]{8,24}$')
  WITH CHECK (
    id ~ '^p_[a-z0-9]{8,24}$'
    AND current_url ~ '^/(view/(red|blue)/(home|contact))?$'
    AND (assigned_url IS NULL OR assigned_url ~ '^/view/(red|blue)/(home|contact)$')
  );
CREATE POLICY "participants public delete" ON public.participants
  FOR DELETE TO anon, authenticated
  USING (id ~ '^p_[a-z0-9]{8,24}$');

DROP POLICY IF EXISTS "design_pages public insert" ON public.design_pages;
DROP POLICY IF EXISTS "design_pages public update" ON public.design_pages;

CREATE POLICY "design_pages public insert" ON public.design_pages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    design IN ('red', 'blue')
    AND page IN ('home', 'contact', 'shared')
    AND kind IN ('html', 'css', 'js')
    AND length(content) <= 500000
  );
CREATE POLICY "design_pages public update" ON public.design_pages
  FOR UPDATE TO anon, authenticated
  USING (design IN ('red', 'blue') AND page IN ('home', 'contact', 'shared') AND kind IN ('html', 'css', 'js'))
  WITH CHECK (
    design IN ('red', 'blue')
    AND page IN ('home', 'contact', 'shared')
    AND kind IN ('html', 'css', 'js')
    AND length(content) <= 500000
  );