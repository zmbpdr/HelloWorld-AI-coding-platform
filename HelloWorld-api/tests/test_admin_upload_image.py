import unittest

from app.routers.admin.lessons import validate_upload_image


class AdminUploadImageValidationTests(unittest.TestCase):
    def test_accepts_png_bytes(self):
        png = b"\x89PNG\r\n\x1a\n" + b"0" * 32
        self.assertTrue(validate_upload_image("demo.png", png))

    def test_rejects_svg_content(self):
        svg = b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"
        self.assertFalse(validate_upload_image("demo.svg", svg))

    def test_rejects_oversized_images(self):
        large_png = b"\x89PNG\r\n\x1a\n" + b"A" * (6 * 1024 * 1024)
        self.assertFalse(validate_upload_image("demo.png", large_png, max_size=5 * 1024 * 1024))


if __name__ == "__main__":
    unittest.main()
