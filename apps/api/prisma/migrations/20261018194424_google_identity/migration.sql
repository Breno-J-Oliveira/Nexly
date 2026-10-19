-- Vinculação explícita; NULL preserva o acesso por senha das contas existentes.
ALTER TABLE "usuarios" ADD COLUMN "google_subject" TEXT;
CREATE UNIQUE INDEX "usuarios_google_subject_key" ON "usuarios"("google_subject");
