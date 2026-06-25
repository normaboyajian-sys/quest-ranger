DROP POLICY IF EXISTS "design icons public read" ON storage.objects;
CREATE POLICY "design icons public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'design-icons');

DROP POLICY IF EXISTS "design icons authed write" ON storage.objects;
CREATE POLICY "design icons authed write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'design-icons');

DROP POLICY IF EXISTS "design icons authed update" ON storage.objects;
CREATE POLICY "design icons authed update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'design-icons');

DROP POLICY IF EXISTS "design icons authed delete" ON storage.objects;
CREATE POLICY "design icons authed delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'design-icons');