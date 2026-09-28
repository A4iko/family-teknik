from datetime import datetime


def calculate_rfm(transactions):

    print("=== DEBUG RFM ===")
    print("Data transactions:")
    print(transactions)

    print("Tipe transactions:")
    print(type(transactions))

    if not transactions:
        return {
            "recency": None,
            "frequency": 0,
            "monetary": 0
        }

    dates = []

    for transaction in transactions:

        print("Data transaction:")
        print(transaction)

        print("Tipe transaction:")
        print(type(transaction))

        transaction_date = datetime.strptime(
            transaction["transactions_date"],
            "%Y-%m-%d"
        )

        dates.append(transaction_date)

    last_transaction = max(dates)

    today = datetime.now()

    recency = (today - last_transaction).days

    frequency = len(transactions)

    monetary = sum(
        transaction["total_amount"]
        for transaction in transactions
    )

    return {
        "recency": recency,
        "frequency": frequency,
        "monetary": monetary
    }