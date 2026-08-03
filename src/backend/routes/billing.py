"""
Billing / invoice PDF generation.

The web app completes a sale (ledger write-back) and asks this service for
the invoice. The PDF is returned as base64 so the single-port deployment
model works: the browser never talks to this service directly.
"""
import base64
import io
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

router = APIRouter(prefix="/api/billing", tags=["billing"])


class BillItem(BaseModel):
    name: str
    sku: str | None = None
    quantity: int
    price: float


class BillRequest(BaseModel):
    customer_name: str
    items: list[BillItem]


@router.post("/generate")
def generate_bill(request: BillRequest):
    if not request.items:
        raise HTTPException(status_code=400, detail="No items provided")

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # ── Header ──────────────────────────────────────────────────────
    c.setFillColorRGB(0.08, 0.16, 0.35)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(50, height - 50, "Stock-Eye Inc.")
    c.setFillColorRGB(0.35, 0.35, 0.38)
    c.setFont("Helvetica", 9.5)
    c.drawString(50, height - 66, "123 Warehouse Avenue, Industry City")
    c.drawString(50, height - 80, "Phone: (555) 012-3456  |  stockeye.app")

    c.setFillColorRGB(0.08, 0.16, 0.35)
    c.setFont("Helvetica-Bold", 18)
    c.drawRightString(width - 50, height - 50, "INVOICE")
    c.setFillColorRGB(0.35, 0.35, 0.38)
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 50, height - 68, datetime.now().strftime("%Y-%m-%d"))
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.setFont("Helvetica", 10)
    c.drawRightString(
        width - 50, height - 84, f"Customer: {request.customer_name}"
    )

    # ── Table header ────────────────────────────────────────────────
    y = height - 130
    c.setFillColorRGB(0.08, 0.16, 0.35)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Item")
    c.drawString(300, y, "SKU")
    c.drawString(420, y, "Qty")
    c.drawString(470, y, "Unit")
    c.drawString(540, y, "Total")
    c.setStrokeColorRGB(0.8, 0.8, 0.85)
    c.line(50, y - 6, 545, y - 6)

    y -= 26
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.setFont("Helvetica", 11)
    total = 0.0

    for item in request.items:
        line_total = item.quantity * item.price
        total += line_total
        c.drawString(50, y, item.name[:42])
        c.drawString(300, y, item.sku or "-")
        c.drawString(420, y, str(item.quantity))
        c.drawString(470, y, f"{item.price:.2f}")
        c.drawString(540, y, f"{line_total:.2f}")
        y -= 20
        if y < 100:
            c.showPage()
            y = height - 50

    c.line(50, y - 2, 545, y - 2)
    y -= 24
    c.setFillColorRGB(0.08, 0.16, 0.35)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(420, y, "Total Due:")
    c.drawRightString(545, y, f"$ {total:.2f}")

    c.setFillColorRGB(0.55, 0.55, 0.58)
    c.setFont("Helvetica-Oblique", 9.5)
    c.drawString(50, 50, "Thank you for your business!")

    c.showPage()
    c.save()

    pdf_bytes = buffer.getvalue()
    filename = f"invoice_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"

    return {
        "filename": filename,
        "total": round(total, 2),
        "pdf_base64": base64.b64encode(pdf_bytes).decode("utf-8"),
    }
