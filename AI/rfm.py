from datetime import date, datetime

def calculate_rfm(transactions):
    if not transactions:
        return {"recency": None, "frequency": 0, "monetary": 0}

    dates = []
    monetary = 0.0

    for transaction in transactions:
        raw_date = transaction.get("transactions_date")
        if not raw_date:
            continue
        if isinstance(raw_date, (datetime, date)):
            transaction_date = raw_date
        else:
            transaction_date = datetime.fromisoformat(
                str(raw_date).replace("Z", "+00:00")
            )
        dates.append(transaction_date)
        monetary += float(transaction.get("total_amount") or 0)

    if not dates:
        return {"recency": None, "frequency": len(transactions), "monetary": monetary}

    last_transaction = max(dates)
    today = datetime.now(last_transaction.tzinfo) if isinstance(last_transaction, datetime) else date.today()
    recency = (today - last_transaction).days

    return {
        "recency": max(recency, 0),
        "frequency": len(transactions),
        "monetary": monetary
    }
