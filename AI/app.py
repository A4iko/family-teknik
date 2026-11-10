import os
from flask import Flask, request, jsonify
from rfm import calculate_rfm
from recomendation import determine_segment, recommend_promo

app = Flask(__name__)

@app.get("/")
def home():
    return jsonify({"message": "Python AI service Family Teknik berjalan", "status": "ok"})

@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "family-teknik-ai"})

@app.post("/rfm")
def calculate_customers_rfm():
    data = request.get_json(silent=True) or {}
    transactions = data.get("transactions", [])
    if not isinstance(transactions, list):
        return jsonify({"message": "transactions harus berupa array"}), 400

    try:
        rfm = calculate_rfm(transactions)
        if rfm["recency"] is None:
            return jsonify({"message": "Belum ada transaksi untuk pelanggan ini.", "rfm": rfm}), 200
        segment = determine_segment(rfm)
        return jsonify({
            "rfm": rfm,
            "segment": segment,
            "promo_recommendation": recommend_promo(segment)
        })
    except (KeyError, TypeError, ValueError) as error:
        return jsonify({"message": "Format transaksi tidak valid", "error": str(error)}), 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)), debug=False)
