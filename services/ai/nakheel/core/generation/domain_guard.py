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
    normalized = response_text.strip().lower()
    refusal_markers = {
        "en": ("only help with questions about new valley", "i'm nakheel, and i can only help"),
        "ar-eg": ("\u0645\u0634 \u0642\u0627\u062f\u0631 \u0623\u0633\u0627\u0639\u062f\u0643", "\u0623\u0646\u0627 \u0646\u062e\u064a\u0644"),
        "ar-msa": ("\u0644\u0627 \u0623\u0633\u062a\u0637\u064a\u0639 \u0627\u0644\u0625\u062c\u0627\u0628\u0629", "\u0623\u0646\u0627 \u0646\u062e\u064a\u0644"),
        "mixed": ("only help with questions about new valley", "\u0623\u0646\u0627 \u0646\u062e\u064a\u0644"),
    }
    markers = refusal_markers.get(language, refusal_markers["en"])
    if any(marker in normalized for marker in markers):
        return localized_refusal(language)
    return response_text.strip()
