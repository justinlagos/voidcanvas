"""Independently parse the files downloaded by the browser acceptance test.

Run after e2e/print-fidelity.mjs. This checks geometry, ICC embedding and TIFF
resolution; it is not a substitute for a printer's PDF/X conformance validator.
"""
from pathlib import Path
import re
from pypdf import PdfReader
from PIL import Image

root = Path('e2e/evidence/print-fidelity')
for filename in ['card-trim.pdf', 'card-real-bleed-PDFX4.pdf']:
    reader = PdfReader(root / filename)
    assert len(reader.pages) == 1
    page = reader.pages[0]
    assert abs(float(page.trimbox.width) - 252) < .002
    assert abs(float(page.trimbox.height) - 144) < .002
    if 'PDFX4' in filename:
        assert float(page.bleedbox.width) > float(page.trimbox.width)
        assert abs(float(page.trimbox.left) - 3 / 25.4 * 72) < .001
        intents = reader.trailer['/Root']['/OutputIntents']
        assert len(intents) == 1
        profile = intents[0].get_object()['/DestOutputProfile'].get_object()
        assert profile['/N'] == 4 and len(profile.get_data()) > 128
        assert len(page.images) == 1
        image = page.images[0].image
        assert image.size == (1122, 672) and image.mode == 'CMYK'
        assert sum(abs(a-b) for a,b in zip(image.getpixel((5,335)), image.getpixel((45,335)))) > 60
        matrix = re.search(r'q ([\d.]+) 0 0 ([\d.]+) (-?[\d.]+) (-?[\d.]+) cm', page.get_contents().get_data().decode('ascii'))
        assert matrix
        assert abs(float(matrix[3]) + 36 * float(matrix[1]) / 1122 - float(page.trimbox.left)) < .002
        assert abs(float(matrix[4]) + 36 * float(matrix[2]) / 672 - float(page.trimbox.bottom)) < .002
        image.convert('RGB').save(root / 'actual-bleed-image.png')
    print('PASS independent PDF parser:', filename)
image = Image.open(root / 'card-CMYK.tif')
assert image.mode == 'CMYK' and image.size == (1050,600)
assert tuple(image.info['dpi']) == (300,300)
print('PASS independent TIFF parser: CMYK 1050 × 600 at 300 DPI')
