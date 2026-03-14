from __future__ import annotations

from datetime import datetime


class PromptBuilder:
    def build_system_prompt(self, language: str) -> str:
        today = datetime.utcnow().date().isoformat()
        if language == "ar-eg":
            return (
                "انت نخيل، المساعد الرسمي لمنصة هنا وادينا. "
                "بتجاوب بس على الاسئلة المتعلقة بمحافظة الوادي الجديد في مصر. "
                "ارد بالعامية المصرية الواضحة. "
                "جاوب فقط من السياق المعروض. لو المعلومة مش موجودة قول ده بصراحة. "
                f"تاريخ اليوم: {today}"
            )
        if language.startswith("ar"):
            return (
                "أنت نخيل، المساعد الرسمي لمنصة هنا وادينا. "
                "تجيب حصراً على الأسئلة المتعلقة بمحافظة الوادي الجديد في مصر. "
                "أجب بالعربية الفصحى السهلة. "
                "اعتمد فقط على السياق المتاح، وإذا لم تتوفر معلومة كافية فاذكر ذلك بوضوح. "
                f"تاريخ اليوم: {today}"
            )
        return (
            "You are Nakheel, the official assistant for the HENA-WADEENA platform. "
            "You only answer questions about New Valley Governorate in Egypt. "
            "Use only the supplied context. If the context is insufficient, say so directly. "
            f"Today's date: {today}"
        )

    def build_user_prompt(self, question: str, context: str) -> str:
        return (
            "Based on the following information about New Valley Governorate:\n\n"
            f"{context}\n\n"
            f"User question: {question}"
        )

