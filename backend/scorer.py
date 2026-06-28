import random
import schemas

def calculate_tag_score(resume_text: str, tags: list[schemas.JobTag]) -> float:
    if not tags:
        return 100.0
        
    score = 0.0
    total_weight = 0.0
    text_lower = resume_text.lower()
    
    for tag in tags:
        weight = 3.0 if tag.must_have else 1.0
        total_weight += weight
        
        tag_clean = tag.name.lower()
        if tag_clean in text_lower:
            score += weight
        else:
            # Partial word match for things like "Senior (5+ years)" or "B.Tech Computer Science"
            tag_words = [w.strip('()+') for w in tag_clean.split() if len(w) > 2 and w not in ('and', 'the', 'for', 'years', 'year')]
            if tag_words:
                match_count = sum(1 for w in tag_words if w in text_lower)
                score += weight * (match_count / len(tag_words))
                
    if total_weight == 0:
        return 100.0
        
    return min(100.0, (score / total_weight) * 100.0)

def calculate_semantic_score(resume_text: str, job_description: str) -> float:
    if not resume_text or not job_description:
        return 0.0
    
    resume_words = set(resume_text.lower().split())
    raw_job_words = set(job_description.lower().split())
    
    # Filter out common stop words to only match meaningful keywords
    stop_words = {'and', 'the', 'to', 'of', 'in', 'a', 'for', 'with', 'on', 'is', 'we', 'are', 'you', 'will', 'our', 'as', 'be'}
    job_words = {w for w in raw_job_words if w not in stop_words and len(w) > 3}
    
    if not job_words:
        return 100.0
        
    overlap = len(resume_words.intersection(job_words))
    ratio = overlap / len(job_words)
    
    # Since we are doing a crude intersection, hitting 100% of non-stop words is impossible.
    # We use a highly generous multiplier (350.0) so a ~25% overlap yields an 85+ score.
    base_score = min(100.0, ratio * 350.0) 
    fuzz = random.uniform(-5, 5)
    
    return max(0.0, min(100.0, base_score + fuzz))

def score_candidate(resume_text: str, tags: list[schemas.JobTag], job_description: str) -> tuple[float, float, float]:
    tag_score = calculate_tag_score(resume_text, tags)
    semantic_score = calculate_semantic_score(resume_text, job_description)
    final_score = (tag_score * 0.6) + (semantic_score * 0.4)
    return tag_score, semantic_score, final_score
