-- Reconstrói o valor derivado das compras já registradas. Mantém datas de atividade anteriores.
WITH compras AS (
  SELECT empresa_id, cliente_id, SUM(total) AS total, MAX(created_at) AS ultima
  FROM vendas WHERE cliente_id IS NOT NULL GROUP BY empresa_id, cliente_id
), visitas AS (
  SELECT empresa_id, cliente_id, MAX(data_hora) AS ultima
  FROM agendamentos WHERE status='CONCLUIDO' GROUP BY empresa_id, cliente_id
), atividade AS (
  SELECT c.id, COALESCE(v.total,0) AS total, GREATEST(c.ultima_visita,v.ultima,a.ultima) AS ultima
  FROM clientes c
  LEFT JOIN compras v ON v.empresa_id=c.empresa_id AND v.cliente_id=c.id
  LEFT JOIN visitas a ON a.empresa_id=c.empresa_id AND a.cliente_id=c.id
)
UPDATE clientes c SET total_gasto=a.total, ultima_visita=a.ultima FROM atividade a
WHERE c.id=a.id AND (c.total_gasto IS DISTINCT FROM a.total OR c.ultima_visita IS DISTINCT FROM a.ultima);
