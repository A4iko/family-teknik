from flask import Flask, request, jsonify  

from rfm import calculate_rfm
from recomendation import determine_segment, recommend_promo

app = Flask(__name__)

@app.get("/")
def home():
    return jsonify({
        "message": "Python AI service Family teknik berjalan!"
    })


@app.post("/rfm")
def calculate_customers_rfm():

    data = request.get_json()
    print("data dari postman")
    print(data)

    transactions = data.get("transactions", [])
    print("transactions:")
    print(transactions)

    rfm = calculate_rfm(transactions)
    if rfm["recency"] is None:
        return jsonify({
            "message": "Tidak ada transaksi yang ditemukan."
        })
    
    segment = determine_segment(rfm)
    promo_recommendation = recommend_promo(segment)

    return jsonify ({
        "rfm": rfm,
        "segment": segment,
        "promo_recommendation": promo_recommendation
    })

if __name__ == "__main__":
    app.run(
        host= "127.0.0.1",
        port= 8000,
        debug= True
    )

 