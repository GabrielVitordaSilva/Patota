-- Execute no SQL Editor do Supabase
-- Retencao de comprovantes: o Supabase nao apaga arquivos sozinho.
-- Esta policy permite ao ADMIN excluir comprovantes, usada pelo botao
-- "Limpar comprovantes antigos" na aba Pagamentos do painel admin
-- (o membro comum continua sem poder excluir nada).

DROP POLICY IF EXISTS "Comprovante delete admin" ON storage.objects;
CREATE POLICY "Comprovante delete admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'comprovantes' AND public.is_admin());
