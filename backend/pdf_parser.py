# pyrefly: ignore [missing-import]
import fitz
import io

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    # use pymupdf to grab text from the pdf
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = "".join(page.get_text() for page in doc)
        doc.close()
        return text
    except Exception as e:
        print(f"pdf error: {e}")
        return ""
