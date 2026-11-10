from scripts.pdf_text import apply_drop_cap, clean_block, is_lorem


def test_clean_block_joins_lines_and_collapses_spaces():
    assert clean_block("Hội họa  Việt\nNam đương\n  đại") == "Hội họa Việt Nam đương đại"


def test_clean_block_removes_line_end_hyphenation():
    assert clean_block("sáng-\ntạo mới") == "sángtạo mới"


def test_clean_block_keeps_real_hyphen():
    assert clean_block("NDO - Dẫu hòa vào") == "NDO - Dẫu hòa vào"


def test_apply_drop_cap():
    assert apply_drop_cap("    riển lãm \"Hiện thực +\"", "T") == "Triển lãm \"Hiện thực +\""


def test_is_lorem():
    assert is_lorem("Lorem ipsum dolor sit amet, consectetuer")
    assert not is_lorem("Triển lãm Hiện thực")
