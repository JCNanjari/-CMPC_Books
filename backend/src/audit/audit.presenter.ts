export interface AuditRecord {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  metadata: unknown;
  createdAt: Date;
  user: { id: string; email: string; name: string } | null;
}

export function presentAudit(row: AuditRecord) {
  return {
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    ip: row.ip,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    user: row.user
      ? { id: row.user.id, email: row.user.email, name: row.user.name }
      : null,
  };
}
