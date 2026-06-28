from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
import schemas
import pdf_parser
import scorer

app = FastAPI(title="HIREAMIGO API - Stateless")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/process", response_model=List[schemas.CandidateResult])
async def process_resumes(
    job_description: str = Form(...),
    tags: str = Form("[]"),
    files: List[UploadFile] = File(...)
):
    try:
        parsed_tags = json.loads(tags)
        job_tags = [schemas.JobTag(**tag) for tag in parsed_tags]
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid tags JSON format")

    results = []
    
    for file in files:
        content = await file.read()
        
        # Extract text
        raw_text = pdf_parser.extract_text_from_pdf_bytes(content)
        
        # Simple name extraction
        candidate_name = file.filename.replace(".pdf", "").replace("_", " ")
        
        # Score
        tag_score, semantic_score, final_score = scorer.score_candidate(raw_text, job_tags, job_description)
        
        results.append(schemas.CandidateResult(
            candidate_name=candidate_name,
            tag_score=tag_score,
            semantic_score=semantic_score,
            final_score=final_score,
            resume_text=raw_text
        ))
        
    # Sort by final score descending
    results.sort(key=lambda x: x.final_score, reverse=True)
    return results
