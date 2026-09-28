def determine_segment(rfm):
    recency = rfm['recency']
    frequency = rfm['frequency']
    monetary = rfm['monetary']

    if recency <= 30 and frequency >= 5 and monetary >= 500000:
        return "loyal customer"
    elif recency <= 60 and frequency >= 3 :
        return "potential loyalist"
    elif recency <= 90 :
        return "bad customer"
    else :
        return " regular customer"
    
def recommend_promo(segment):
    if segment == "loyal customer":
        return {
            "promo": "Mendapatkan Discount up to 15% servis berikutnya.",
            "alasan": "Karena Anda adalah pelanggan setia kami, kami ingin memberikan apresiasi dengan memberikan diskon khusus untuk layanan berikutnya."
        }
    elif segment == "potential loyalist":
        return {
            "promo": "Mendapatkan Discount up to 10%.",
            "alasan": "Karena Anda memiliki potensi untuk menjadi pelanggan setia, kami ingin memberikan penawaran khusus untuk mendorong Anda untuk terus berbelanja."
        }
    elif segment == "bad customer":
        return {
            "promo": "Mendapatkan discount khusus 20%.",
            "alasan": "Kami ingin mengetahui apakah ada hal yang bisa kami bantu untuk meningkatkan pengalaman Anda."
        }
    else:
        return {
            "promo": "Mendapatkan penawaran terbatas.",
            "alasan": "Kami memiliki penawaran khusus yang mungkin Anda minati."
        }   