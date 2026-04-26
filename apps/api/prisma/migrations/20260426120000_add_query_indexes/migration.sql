-- Índices alinhados ao schema (consultas por condomínio, unidade, morador, faturas)

CREATE INDEX "blocks_condominiumId_idx" ON "blocks"("condominiumId");

CREATE INDEX "units_condominiumId_idx" ON "units"("condominiumId");

CREATE INDEX "units_blockId_idx" ON "units"("blockId");

CREATE INDEX "unit_residents_unitId_idx" ON "unit_residents"("unitId");

CREATE INDEX "unit_residents_userId_idx" ON "unit_residents"("userId");

CREATE INDEX "invoices_unitId_reference_idx" ON "invoices"("unitId", "reference");

CREATE INDEX "common_spaces_condominiumId_idx" ON "common_spaces"("condominiumId");

CREATE INDEX "pets_unitId_idx" ON "pets"("unitId");

CREATE INDEX "pets_tenantId_idx" ON "pets"("tenantId");
