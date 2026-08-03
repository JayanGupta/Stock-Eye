from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from src.backend.config import UPLOAD_DIR

router = APIRouter(prefix="/api/billing", tags=["billing"])

class BillItem(BaseModel):
    item: str
    quantity: int
    price: float

class BillRequest(BaseModel):
    customer_name: str
    items: list[BillItem]

@router.post("/generate")
def generate_bill(request: BillRequest):
    if not request.items:
        raise HTTPException(status_code=400, detail="No items provided")
        
    filename = f"bill_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    file_path = UPLOAD_DIR / filename
    
    # Generate PDF
    c = canvas.Canvas(str(file_path), pagesize=letter)
    width, height = letter
    
    # Draw professional header
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 50, "Stock-Eye Inc.")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 65, "123 Warehouse Avenue, Industry City")
    c.drawString(50, height - 80, "Phone: (555) 012-3456 | web: stockeye.tech")
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(450, height - 50, "INVOICE")
    c.setFont("Helvetica", 10)
    c.drawString(450, height - 65, f"Date: {datetime.now().strftime('%Y-%m-%d')}")
    c.drawString(450, height - 80, f"Customer: {request.customer_name}")
    
    # Draw table header
    y = height - 130
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Item Description")
    c.drawString(300, y, "Qty")
    c.drawString(400, y, "Unit Price")
    c.drawString(500, y, "Total")
    c.line(50, y - 5, 550, y - 5)
    
    y -= 25
    c.setFont("Helvetica", 12)
    total_amount = 0
    
    for item in request.items:
        line_total = item.quantity * item.price
        total_amount += line_total
        
        c.drawString(50, y, item.item)
        c.drawString(300, y, str(item.quantity))
        c.drawString(400, y, f"${item.price:.2f}")
        c.drawString(500, y, f"${line_total:.2f}")
        
        y -= 20
        if y < 100:
            c.showPage()
            y = height - 50
            
    c.line(50, y - 5, 550, y - 5)
    y -= 25
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(400, y, "Total Due:")
    c.drawString(500, y, f"${total_amount:.2f}")
    
    # Footer
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, 50, "Thank you for your business!")
    
    c.save()
    
    return {"message": "Bill generated", "download_url": f"/api/billing/download/{filename}"}

@router.get("/download/{filename}")
def download_bill(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=str(file_path), filename=filename, media_type="application/pdf")
