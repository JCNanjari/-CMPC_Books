import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { Pagination } from '../components/Pagination';
import { describeAudit } from '../lib/audit';
import { formatDate } from '../lib/format';
import { ApiError } from '../services/apiClient';
import { listAudit } from '../services/auditService';

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'No se pudo cargar la auditoría';
}

export function AuditPage() {
  const [page, setPage] = useState(1);
  const audit = useQuery({ queryKey: ['audit', page], queryFn: () => listAudit(page) });

  return (
    <section>
      <p className="eyebrow">Bitácora</p>
      <h1>Auditoría</h1>
      <p className="lede">Altas, ediciones, bajas, exportaciones e inicios de sesión.</p>
      {audit.isLoading && <p className="muted">Cargando movimientos…</p>}
      {audit.isError && <ErrorBanner message={messageOf(audit.error)} />}
      {audit.data && audit.data.data.length === 0 && <p className="muted">Todavía no hay movimientos.</p>}
      {audit.data && audit.data.data.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Movimiento</th>
                  <th>Usuario</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {audit.data.data.map((entry) => {
                  const phrase = describeAudit(entry);
                  return (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.createdAt)}</td>
                      <td>
                        <div className="audit-move">
                          <span className={phrase.tone ? `badge ${phrase.tone}` : 'badge'}>{phrase.label}</span>
                          {phrase.href ? <Link to={phrase.href}>{phrase.subject}</Link> : <span>{phrase.subject}</span>}
                        </div>
                      </td>
                      <td>{entry.user?.name ?? 'Anónimo'}</td>
                      <td className="muted">{entry.ip ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={audit.data.meta.page} totalPages={audit.data.meta.totalPages} onPage={setPage} />
        </>
      )}
    </section>
  );
}
