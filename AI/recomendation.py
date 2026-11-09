def determine_segment(rfm):
    recency = int(rfm["recency"])
    frequency = int(rfm["frequency"])
    monetary = float(rfm["monetary"])

    if recency <= 30 and frequency >= 5 and monetary >= 500000:
        return "loyal customer"
    if recency <= 60 and frequency >= 3:
        return "potential loyalist"
    if recency <= 90:
        return "needs attention"
    return "regular customer"


def recommend_promo(segment):
    promotions = {
        "loyal customer": {
            "promo": "Diskon hingga 15% untuk servis berikutnya.",
            "alasan": "Apresiasi untuk pelanggan yang rutin menggunakan layanan bengkel."
        },
        "potential loyalist": {
            "promo": "Diskon hingga 10% untuk kunjungan berikutnya.",
            "alasan": "Mendorong pelanggan untuk kembali melakukan servis."
        },
        "needs attention": {
            "promo": "Diskon khusus 20% untuk servis berikutnya.",
            "alasan": "Mengajak pelanggan yang mulai jarang berkunjung untuk kembali."
        },
        "regular customer": {
            "promo": "Penawaran servis berkala sesuai kebutuhan kendaraan.",
            "alasan": "Menjaga hubungan dengan pelanggan dan mengingatkan jadwal perawatan."
        }
    }
    return promotions.get(segment, promotions["regular customer"])
