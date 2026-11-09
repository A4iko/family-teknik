import unittest
from datetime import date, timedelta

from rfm import calculate_rfm
from recomendation import determine_segment, recommend_promo


class RfmTests(unittest.TestCase):
    def test_empty_transactions(self):
        result = calculate_rfm([])
        self.assertEqual(result["frequency"], 0)
        self.assertEqual(result["monetary"], 0)
        self.assertIsNone(result["recency"])

    def test_rfm_calculation(self):
        today = date.today()
        transactions = [
            {"transactions_date": (today - timedelta(days=10)).isoformat(), "total_amount": 100000},
            {"transactions_date": (today - timedelta(days=2)).isoformat(), "total_amount": 250000},
        ]
        result = calculate_rfm(transactions)
        self.assertEqual(result["frequency"], 2)
        self.assertEqual(result["monetary"], 350000)
        self.assertEqual(result["recency"], 2)

    def test_segment_has_matching_promo(self):
        segment = determine_segment({"recency": 5, "frequency": 6, "monetary": 700000})
        promo = recommend_promo(segment)
        self.assertEqual(segment, "loyal customer")
        self.assertIn("promo", promo)
        self.assertIn("alasan", promo)

    def test_unknown_segment_uses_default_promo(self):
        promo = recommend_promo("unknown")
        self.assertIn("promo", promo)
        self.assertIn("alasan", promo)


if __name__ == "__main__":
    unittest.main()
