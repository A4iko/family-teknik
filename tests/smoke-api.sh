#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:5000}"

echo "Menunggu backend dan MySQL..."
READY=0
for attempt in $(seq 1 30); do
  if curl -fsS "$API_URL/api/health" >/tmp/family-health.json; then
    READY=1
    break
  fi
  sleep 2
done
if [ "$READY" -ne 1 ]; then
  cat /tmp/backend.log || true
  exit 1
fi

CUSTOMER_ID=$(curl -fsS -X POST "$API_URL/api/customers" \
  -H "Content-Type: application/json" \
  -d '{"name":"Pelanggan Uji Integrasi","phone":"081234567890","address":"Depok"}' | jq -r '.id')
SECOND_CUSTOMER_ID=$(curl -fsS -X POST "$API_URL/api/customers" \
  -H "Content-Type: application/json" \
  -d '{"name":"Pelanggan Uji Kedua","phone":"081234567891","address":"Bogor"}' | jq -r '.id')

VEHICLE_ID=$(curl -fsS -X POST "$API_URL/api/kendaraan" \
  -H "Content-Type: application/json" \
  -d "{\"customers_id\":$CUSTOMER_ID,\"plat_nomer\":\"B 1234 TEST\",\"brand\":\"Honda\",\"tipe\":\"Vario\",\"year\":2022}" | jq -r '.id')

BAD_STATUS=$(curl -sS -o /tmp/family-invalid-relation.json -w '%{http_code}' \
  -X POST "$API_URL/api/service" -H "Content-Type: application/json" \
  -d "{\"customers_id\":$SECOND_CUSTOMER_ID,\"kendaraan_id\":$VEHICLE_ID,\"service_date\":\"$(date +%F)\",\"description\":\"Relasi tidak valid\",\"service_cost\":100000}")
if [ "$BAD_STATUS" != "400" ]; then
  echo "Validasi relasi gagal. Status yang diterima: $BAD_STATUS"
  cat /tmp/family-invalid-relation.json
  exit 1
fi

SERVICE_ID=$(curl -fsS -X POST "$API_URL/api/service" \
  -H "Content-Type: application/json" \
  -d "{\"customers_id\":$CUSTOMER_ID,\"kendaraan_id\":$VEHICLE_ID,\"service_date\":\"$(date +%F)\",\"description\":\"Ganti oli\",\"service_cost\":150000}" | jq -r '.id')

TRANSACTION_DATE=$(date +%Y-%m-%dT%H:%M)
TRANSACTION_ID=$(curl -fsS -X POST "$API_URL/api/transactions" \
  -H "Content-Type: application/json" \
  -d "{\"customers_id\":$CUSTOMER_ID,\"kendaraan_id\":$VEHICLE_ID,\"service_id\":$SERVICE_ID,\"total_amount\":150000,\"transactions_date\":\"$TRANSACTION_DATE\"}" | jq -r '.id')

curl -fsS -X PUT "$API_URL/api/transactions/$TRANSACTION_ID" \
  -H "Content-Type: application/json" \
  -d "{\"customers_id\":$CUSTOMER_ID,\"kendaraan_id\":$VEHICLE_ID,\"service_id\":$SERVICE_ID,\"total_amount\":150000,\"transactions_date\":\"$TRANSACTION_DATE\"}" >/tmp/family-update.json

curl -fsS "$API_URL/api/customer-history/$CUSTOMER_ID" | jq -e 'length == 1' >/dev/null
curl -fsS -X POST "$API_URL/api/rfm/$CUSTOMER_ID" | jq -e '.result.rfm.frequency == 1 and (.result.promo_recommendation.promo | length > 0)' >/dev/null
curl -fsS "$API_URL/api/dashboard" | jq -e '.customers == 2 and .vehicles == 1 and .services == 1 and .transactions == 1 and .revenue == 150000' >/dev/null

curl -fsS -X DELETE "$API_URL/api/transactions/$TRANSACTION_ID" >/dev/null
curl -fsS -X DELETE "$API_URL/api/service/$SERVICE_ID" >/dev/null
curl -fsS -X DELETE "$API_URL/api/kendaraan/$VEHICLE_ID" >/dev/null
curl -fsS -X DELETE "$API_URL/api/customers/$SECOND_CUSTOMER_ID" >/dev/null
curl -fsS -X DELETE "$API_URL/api/customers/$CUSTOMER_ID" >/dev/null

curl -fsS "$API_URL/api/dashboard" | jq -e '.customers == 0 and .vehicles == 0 and .services == 0 and .transactions == 0' >/dev/null
echo "LULUS: CRUD, validasi relasi, riwayat transaksi, dashboard, dan integrasi RFM."
