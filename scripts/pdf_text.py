import re


def clean_block(text: str) -> str:
    text = re.sub(r"-\n(?=[a-zà-ỹđ])", "", text)
    text = text.replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def apply_drop_cap(paragraph: str, letter: str) -> str:
    return letter + paragraph.lstrip()


def is_lorem(text: str) -> bool:
    return text.lstrip().lower().startswith("lorem ipsum")
