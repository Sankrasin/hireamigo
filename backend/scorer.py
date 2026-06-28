import random
import schemas

def calculate_tag_score(resume_text: str, tags: list[schemas.JobTag]) -> float:
    if not tags: return 100.0
    score, total_weight = 0.0, 0.0
    text_lower = resume_text.lower()
    
    for t in tags:
        w = 3.0 if t.must_have else 1.0
        total_weight += w
        clean = t.name.lower()
        
        if clean in text_lower:
            score += w
        else:
            # partial match for things like 'b.tech'
            words = [wd.strip('()+') for wd in clean.split() if len(wd) > 2 and wd not in ('and', 'the', 'for', 'years', 'year')]
            if words:
                score += w * (sum(1 for wd in words if wd in text_lower) / len(words))
                
    return 100.0 if total_weight == 0 else min(100.0, (score / total_weight) * 100.0)

def calculate_semantic_score(resume_text: str, job_description: str) -> float:
    if not resume_text or not job_description: return 0.0
    
    r_words = set(resume_text.lower().split())
    # ignore basic stop words so we only match real keywords
    stop = {'and', 'the', 'to', 'of', 'in', 'a', 'for', 'with', 'on', 'is', 'we', 'are', 'you', 'will', 'our', 'as', 'be'}
    j_words = {w for w in job_description.lower().split() if w not in stop and len(w) > 3}
    
    if not j_words: return 100.0
    
    # bump score since getting all keywords is too hard
    base = min(100.0, (len(r_words.intersection(j_words)) / len(j_words)) * 350.0) 
    return max(0.0, min(100.0, base + random.uniform(-5, 5)))

def score_candidate(resume_text: str, tags: list[schemas.JobTag], job_description: str) -> tuple[float, float, float]:
    t = calculate_tag_score(resume_text, tags)
    s = calculate_semantic_score(resume_text, job_description)
    return t, s, (t * 0.6) + (s * 0.4)
