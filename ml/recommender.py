from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer('all-MiniLM-L6-v2')

def recommend(papers, top_k=3):
    if len(papers) < 2:
        return []

    summaries = [p.summary for p in papers]
    vecs = model.encode(summaries)

    sim_matrix = cosine_similarity(vecs)

    recommendations = []

    for i, row in enumerate(sim_matrix):
        similar_indices = row.argsort()[-(top_k+1):-1][::-1]
        recs = [papers[j].title for j in similar_indices]
        recommendations.append({
            "paper": papers[i].title,
            "recommended": recs
        })

    return recommendations