from pydantic import BaseModel
from typing import List, Optional

# basically the shape of our data
class JobTag(BaseModel):
    category: Optional[str] = "General"
    name: str
    must_have: bool = False

# what we send back to frontend
class CandidateResult(BaseModel):
    candidate_name: str
    tag_score: float
    semantic_score: float
    final_score: float
    resume_text: str
