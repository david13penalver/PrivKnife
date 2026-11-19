export const SAMPLE_JSON_DOC = `{
  "service": "privknife-gateway",
  "headers": {
    "content-type": "application/json",
    "x-privacy-mode": "strict-local"
  },
  "users": [
    {
      "id": 101,
      "name": "Ada Lovelace",
      "email": "ada@example.test",
      "role": "admin",
      "active": true
    },
    {
      "id": 102,
      "name": null,
      "email": "grace@example.test",
      "role": "auditor",
      "active": false,
      "tag": "legacy-import"
    }
  ]
}`;

export const SAMPLE_SQL_QUERY = `-- Select active tenant accounts
WITH recent_orders AS (
  SELECT user_id, COUNT(*) AS order_count, SUM(amount_cents) AS total_cents
  FROM orders
  WHERE status = 'from where' AND created_at >= '2026-01-01'
  GROUP BY user_id
)
select u.id, 'select * from' as literal_note, /* preserve block comment */ ro.order_count
from "users" u
left outer join recent_orders ro on ro.user_id = u.id
where u.tenant_id = $1 and u.deleted_at is null
order by ro.total_cents desc
limit 25;`;

export const SAMPLE_YAML_DOC = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: privknife-static
  labels:
    tier: frontend
    zero-backend: "true"
spec:
  replicas: 2
  ports: [80, 443]
  csp: |
    default-src 'self';
    object-src 'none';
  containers:
    - name: web
      image: nginx:1.27-alpine
      readOnlyRootFilesystem: true
`;

export const PROTOTYPE_POLLUTION_JSON = `{
  "__proto__": {
    "polluted": true
  },
  "constructor": {
    "prototype": {
      "pwned": "yes"
    }
  },
  "safe": "intact"
}`;

export function buildLargeJsonArrayText(count = 150): string {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: i + 1,
      code: `ITEM-${String(i + 1).padStart(4, '0')}`,
      meta: {
        nested: {
          deepTag: `depth-${i % 3}`,
        },
      },
    });
  }
  return JSON.stringify(items, null, 2);
}
