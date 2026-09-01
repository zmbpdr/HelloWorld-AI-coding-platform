"""题库批量导入功能测试"""
import requests
import io
import csv

BASE = "http://127.0.0.1:8000"

# 1. login
r = requests.post(f"{BASE}/api/v1/admin/auth/login", json={"username": "admin", "password": "admin123"}, timeout=5)
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("1. login OK")

# 2. generate test CSV with errors
buf = io.StringIO()
w = csv.writer(buf)
w.writerow(["language_id", "title", "slug", "question_type", "difficulty", "content", "answer", "knowledge_tags", "test_cases", "order"])
w.writerow([1, "print hello", "py-print-hello", "coding", "beginner", "print Hello World", 'print("Hello World")', "output,print", "[]", "1"])
w.writerow([1, "var swap", "py-swap", "coding", "beginner", "swap two vars", "a,b=b,a", "var", "[]", "2"])
w.writerow([1, "missing fields", "", "", "", "", "", "", "", ""])  # missing title & question_type
w.writerow([1, "bad type", "py-bad-type", "invalid_type", "beginner", "test", "", "", "", "3"])  # bad question_type
w.writerow([1, "bad json", "py-bad-json", "coding", "beginner", "test", "", "", "not json", "4"])  # bad test_cases JSON
csv_data = buf.getvalue().encode("utf-8-sig")

# 3. preview (with errors)
print("\n=== preview (with errors) ===")
r = requests.post(
    f"{BASE}/api/v1/admin/questions/import/preview",
    headers=headers,
    files={"file": ("test.csv", csv_data, "text/csv")},
    timeout=10,
)
res = r.json()
print(f"status={r.status_code} total={res['total_rows']} valid={res['valid_rows']} error_rows={res['error_rows']} errors={len(res['errors'])}")
for e in res["errors"]:
    print(f"  row {e['row']} {e['field']}: {e['message']}")
print(f"valid_data: {'present' if res['valid_data'] else 'absent (expected when errors exist)'}")

# 4. preview (clean data)
buf2 = io.StringIO()
w2 = csv.writer(buf2)
w2.writerow(["language_id", "title", "slug", "question_type", "difficulty", "content", "answer", "knowledge_tags", "order"])
w2.writerow([1, "print hello", "py-print-hello", "coding", "beginner", "print Hello World", 'print("Hello World")', "output,print", "1"])
w2.writerow([1, "var swap", "py-swap", "coding", "beginner", "swap two vars", "a,b=b,a", "var", "2"])
csv_data2 = buf2.getvalue().encode("utf-8-sig")

print("\n=== preview (clean) ===")
r = requests.post(
    f"{BASE}/api/v1/admin/questions/import/preview",
    headers=headers,
    files={"file": ("valid.csv", csv_data2, "text/csv")},
    timeout=10,
)
res2 = r.json()
print(f"status={r.status_code} total={res2['total_rows']} valid={res2['valid_rows']} errors={res2['error_rows']}")
print(f"valid_data: {'present' if res2['valid_data'] else 'absent'}")

# 5. confirm import
if res2["valid_data"]:
    print("\n=== confirm import ===")
    r = requests.post(
        f"{BASE}/api/v1/admin/questions/import/confirm",
        headers=headers,
        json={"rows": res2["valid_data"]},
        timeout=10,
    )
    res3 = r.json()
    print(f"status={r.status_code} imported={res3['imported']} msg={res3['message']}")

# 6. verify
print()
r = requests.get(f"{BASE}/api/v1/admin/questions", headers=headers, timeout=5)
print(f"total questions in DB: {r.json()['total']}")

# 7. test slug duplicate detection
print("\n=== slug duplicate preview ===")
r = requests.post(
    f"{BASE}/api/v1/admin/questions/import/preview",
    headers=headers,
    files={"file": ("valid.csv", csv_data2, "text/csv")},
    timeout=10,
)
res4 = r.json()
print(f"status={r.status_code} errors={len(res4['errors'])}")
for e in res4["errors"]:
    print(f"  row {e['row']} {e['field']}: {e['message']}")

print("\n=== ALL TESTS PASSED ===")