def classify_paper_raw(title: str, summary: str):
    text = (title + " " + summary).lower()

    # Strong signals
    if "journal" in title.lower():
        return "Journal"

    if "conference" in text or "proceedings" in text or "ieee" in text:
        return "Conference"

    if "lecture notes" in text or "springer" in text:
        return "Conference"

    if "review" in text:
        return "Journal"

    return "Article"