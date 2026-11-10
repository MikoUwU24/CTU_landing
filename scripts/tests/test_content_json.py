import json
from pathlib import Path

CONTENT = Path(__file__).resolve().parents[2] / "seed" / "content.json"


def load():
    return json.loads(CONTENT.read_text(encoding="utf-8"))


def test_has_eight_articles_in_page_order():
    arts = load()["articles"]
    assert [a["page"] for a in arts] == [3, 5, 7, 9, 11, 13, 15, 17]


def test_real_articles_have_body_and_lorem_flagged():
    for a in load()["articles"]:
        assert len(a["paragraphs"]) >= 3, a["slug"]
        assert a["isLorem"] == (a["page"] >= 13), a["slug"]


def test_first_article_starts_with_drop_cap_word():
    first = load()["articles"][0]["paragraphs"][0]
    assert first.startswith("Triển lãm"), first[:40]


def test_accent_is_substring_of_title():
    for a in load()["articles"]:
        assert a["titleAccent"].lower() in a["title"].lower(), a["slug"]


def test_foreword_and_masthead():
    c = load()
    assert c["foreword"]["title"] == "Lời ngỏ"
    assert c["foreword"]["paragraphs"]
    assert c["masthead"]["board"][0]["role"] == "Tổng biên tập"


def test_images_exist():
    c = load()
    img_dir = CONTENT.parent / "images"
    for a in c["articles"]:
        for name in a["images"]:
            assert (img_dir / name).exists(), name


def test_no_oversized_paragraphs_or_duplicate_pull_quote():
    for a in load()["articles"]:
        assert a["pullQuote"] != a["sapo"] or a["pullQuote"] is None, a["slug"]
        for p in [] if a["isLorem"] else a["paragraphs"]:
            assert len(p) < 1500, (a["slug"], len(p))
