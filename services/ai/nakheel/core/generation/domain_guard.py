from __future__ import annotations

from nakheel.core.retrieval.reranker import ScoredChunk


LOCALIZED_REFUSAL = {
    "ar-eg": "آسف، أنا نخيل وبتكلم بس في حاجات محافظة الوادي الجديد. مش قادر أساعدك في ده، بس لو عندك سؤال عن الوادي الجديد يسعدني أساعدك!",
    "ar-msa": "عذراً، أنا نخيل ومتخصص فقط في معلومات محافظة الوادي الجديد. لا أستطيع الإجابة عن هذا السؤال، لكن يسعدني مساعدتك في كل ما يخص الوادي الجديد.",
    "mixed": "آسف، أنا نخيل وبساعد فقط في الأسئلة عن محافظة الوادي الجديد. If you have a question about New Valley, I can help.",
    "en": "Sorry, I'm Nakheel and I can only help with questions about New Valley Governorate. I'm not able to answer this, but feel free to ask anything about New Valley!",
}


def is_domain_relevant(reranked_chunks: list[ScoredChunk], threshold: float) -> bool:
    if not reranked_chunks:
        return False
    return reranked_chunks[0].score >= threshold


def localized_refusal(language: str) -> str:
    return LOCALIZED_REFUSAL.get(language, LOCALIZED_REFUSAL["en"])


def post_process_response(response_text: str, language: str) -> str:
    refusal = localized_refusal(language)
    if "only help with questions about New Valley" in response_text:
        return refusal
    return response_text.strip()

