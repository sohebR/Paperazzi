from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import httpx

from ml.embedding import rank_papers
from ml.recommender import recommend
from ml.classifier import classify_paper_raw

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="frontend"), name="static")

OPENALEX_API = "https://api.openalex.org/works"

class Paper(BaseModel):
    title: str
    authors: List[str]
    summary: str
    published: str
    arxiv_url: str
    pdf_url: str
    category: str

class SearchResponse(BaseModel):
    query: str
    total_found: int
    papers: List[Paper]
    recommendations: list

def reconstruct_abstract(inv):
    if not inv:
        return "No abstract available."
    max_pos = max(pos for v in inv.values() for pos in v)
    words = [""] * (max_pos + 1)
    for word, pos_list in inv.items():
        for pos in pos_list:
            words[pos] = word
    return " ".join(words)

def build_paper(p):
    authors = [
        a["author"]["display_name"]
        for a in p.get("authorships", [])
        if a.get("author", {}).get("display_name")
    ]

    abstract = reconstruct_abstract(p.get("abstract_inverted_index") or {})

    paper = Paper(
        title=p.get("title") or "Untitled",
        authors=authors,
        summary=abstract,
        published=str(p.get("publication_year") or "Unknown"),
        arxiv_url=p.get("doi") or "",
        pdf_url=(p.get("open_access") or {}).get("oa_url") or "",
        category=""
    )

    category = classify_paper_raw(
    p.get("title", ""),
    reconstruct_abstract(p.get("abstract_inverted_index") or {})
    )

    paper = Paper(
        title=p.get("title") or "Untitled",
        authors=authors,
        summary=abstract,
        published=str(p.get("publication_year") or "Unknown"),
        arxiv_url=p.get("doi") or "",
        pdf_url=(p.get("open_access") or {}).get("oa_url") or "",
        category=category
    )
    return paper
@app.get("/", response_class=FileResponse)
async def serve():
    return FileResponse("frontend/index.html")

@app.get("/search", response_model=SearchResponse)
async def search(query: str = Query(...), max_results: int = 5):
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                OPENALEX_API,
                params={
                    "search": query,
                    "per_page": max_results
                }
            )
            resp.raise_for_status()

        raw = resp.json().get("results", [])
        papers = [build_paper(p) for p in raw]

        # 🔥 ML ranking
        papers = rank_papers(query, papers)

        # 🔥 Recommendations
        recs = recommend(papers)

        return {
            "query": query,
            "total_found": len(papers),
            "papers": papers,
            "recommendations": recs
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=10000)