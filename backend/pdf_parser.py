# pyrefly: ignore [missing-import]
import fitz  # PyMuPDF
import io

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """
    Extracts text from a PDF file provided as bytes.
    Uses PyMuPDF (fitz) which handles layout-based text reasonably well.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return ""
