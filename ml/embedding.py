from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer('all-MiniLM-L6-v2')

def rank_papers(query, papers):
    if not papers:
        return papers

    query_vec = model.encode([query])
    paper_vecs = model.encode([p.summary for p in papers])

    scores = cosine_similarity(query_vec, paper_vecs)[0]

    ranked = sorted(zip(papers, scores), key=lambda x: x[1], reverse=True)

    return [p for p, _ in ranked]