from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
import schemas
import pdf_parser
import scorer

app = FastAPI(title="HIREAMIGO API - Stateless")

# gotta let the frontend talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    # just checking if the server is awake
    return {"status": "ok", "message": "HIREAMIGO API is running"}

@app.post("/api/v1/process", response_model=List[schemas.CandidateResult])
async def process_resumes(
    job_description: str = Form(...),
    tags: str = Form("[]"),
    files: List[UploadFile] = File(...)
):
    try:
        # turn the string tags into actual python objects
        job_tags = [schemas.JobTag(**t) for t in json.loads(tags)]
    except:
        raise HTTPException(status_code=400, detail="bad tags json")

    results = []
    for f in files:
        raw_text = pdf_parser.extract_text_from_pdf_bytes(await f.read())
        
        # super simple name grab from filename
        name = f.filename.replace(".pdf", "").replace("_", " ")
        
        t_score, s_score, f_score = scorer.score_candidate(raw_text, job_tags, job_description)
        
        results.append(schemas.CandidateResult(
            candidate_name=name, tag_score=t_score, semantic_score=s_score, final_score=f_score, resume_text=raw_text
        ))
        
    # sort highest score first
    return sorted(results, key=lambda x: x.final_score, reverse=True)
