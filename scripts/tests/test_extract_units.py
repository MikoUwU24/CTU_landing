import pytest

from scripts.extract_pdf import assemble_page, resolve_dropcaps


def fake_block(x0, y0, y1, text):
    return {"bbox": [x0, y0, x0 + 20, y1],
            "lines": [{"bbox": [x0, y0, x0 + 20, y1], "spans": [{"text": text}]}]}


def item(text, bucket, n_lines=5, col_first=False):
    return (text, bucket, n_lines, col_first)


def test_heading_fragment_is_emitted_not_dropped():
    out = assemble_page([
        item("Một đoạn kết thúc đầy đủ.", 4),
        item("Khi truyền thống trở thành chất liệu sáng tạo", 4, n_lines=2),
        item("Đoạn tiếp theo.", 4),
    ])
    assert out == ["Một đoạn kết thúc đầy đủ.", "## Khi truyền thống trở thành chất liệu sáng tạo", "Đoạn tiếp theo."]


def test_short_tail_of_truncated_frame_stays_body():
    out = assemble_page([item("Một đoạn bị cắt ở cuối khung", 4), item("còn nốt", 4, n_lines=1)])
    assert not any(p.startswith("## ") for p in out)


def test_short_block_continued_across_column_is_body_and_merged():
    out = assemble_page([
        item("Đoạn đủ câu.", 4),
        item("Bên cạnh chất liệu truyền thống", 4, n_lines=1),
        item("và sơn mài, nhiều họa sĩ.", 8, col_first=True),
    ])
    assert out == ["Đoạn đủ câu.", "Bên cạnh chất liệu truyền thống và sơn mài, nhiều họa sĩ."]


def test_drop_cap_without_body_block_raises():
    dropcap = fake_block(40, 500, 540, "T")
    far_body = fake_block(300, 100, 130, "x")
    with pytest.raises(ValueError, match="drop cap"):
        resolve_dropcaps([dropcap], [far_body], 9)


def test_drop_cap_matches_adjacent_block():
    dropcap = fake_block(40, 500, 540, "T")
    near = fake_block(48, 520, 560, "rong")
    assert resolve_dropcaps([dropcap], [near], 9) == {0: "T"}
