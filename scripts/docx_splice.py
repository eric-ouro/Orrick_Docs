"""Splice clause-election edits into a Word table cell while preserving its
formatting (fonts, bold defined terms, numbered lists, paragraph breaks).

The seed body text was produced from the cell with `clean()` (whitespace
collapsed, ends stripped) plus a few bracket-balance corrections, so this module
first aligns the normalized text back onto the cell's per-run characters, then
applies drop/replace character ops expressed in normalized coordinates.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class CellChar:
    para: int
    run: int
    idx: int
    char: str
    delete: bool = False
    inserts: list[str] = field(default_factory=list)


def cell_chars(cell) -> list[CellChar]:
    """Flatten a cell into a char stream; paragraph breaks become virtual '\n'
    entries (run index -1) so they can participate in whitespace collapsing."""
    chars: list[CellChar] = []
    for pi, para in enumerate(cell.paragraphs):
        if pi > 0:
            chars.append(CellChar(pi, -1, -1, "\n"))
        for ri, run in enumerate(para.runs):
            for ci, ch in enumerate(run.text):
                chars.append(CellChar(pi, ri, ci, ch))
    return chars


def align(normalized: str, chars: list[CellChar]) -> list[list[int]]:
    """Map each index of the normalized (clean()-ed, possibly bracket-corrected)
    text to the docx char indexes it came from.

    Whitespace runs in the docx map to the single collapsed space. Normalized
    brackets that don't exist in the docx (our balance corrections) map to no
    docx chars. Raises if the texts genuinely diverge."""
    positions: list[list[int]] = [[] for _ in normalized]
    di = 0
    n = len(chars)

    def skip_ws(i: int) -> int:
        while i < n and chars[i].char.isspace():
            i += 1
        return i

    di = skip_ws(di)
    for si, sc in enumerate(normalized):
        if sc == " ":
            start = di
            while di < n and chars[di].char.isspace():
                positions[si].append(di)
                di += 1
            if di == start:
                # normalized space with no docx whitespace: corrected-bracket
                # neighborhood; treat as virtual.
                continue
        else:
            if di < n and chars[di].char == sc:
                positions[si].append(di)
                di += 1
            elif sc in "[]":
                # bracket-balance correction: no docx counterpart
                continue
            else:
                context = normalized[max(0, si - 30) : si + 10]
                got = "".join(c.char for c in chars[di : di + 10])
                raise ValueError(f"alignment diverged at {si}: expected {sc!r} got {got!r} near ...{context!r}")
    di = skip_ws(di)
    if di != n:
        rest = "".join(c.char for c in chars[di : di + 40])
        raise ValueError(f"unconsumed docx text: {rest!r}")
    return positions


def apply_ops(chars: list[CellChar], positions: list[list[int]], ops: list[dict]) -> None:
    for op in ops:
        span = [i for si in range(op["start"], op["end"]) for i in positions[si]]
        for i in span:
            chars[i].delete = True
        if op["type"] == "replace" and op.get("text"):
            anchor = span[0] if span else None
            if anchor is None:
                # find the next real char at/after the range start
                for si in range(op["start"], len(positions)):
                    if positions[si]:
                        anchor = positions[si][0]
                        break
            if anchor is not None:
                chars[anchor].inserts.append(op["text"])


def rebuild_cell(cell, chars: list[CellChar]) -> None:
    """Write the kept/inserted chars back into the runs, then drop paragraphs
    that ended up empty (e.g. removed form notes that had their own numbered
    paragraph)."""
    for pi, para in enumerate(cell.paragraphs):
        for ri, run in enumerate(para.runs):
            parts: list[str] = []
            for c in chars:
                if c.para != pi or c.run != ri:
                    continue
                parts.extend(c.inserts)
                if not c.delete:
                    parts.append(c.char)
            run.text = "".join(parts)

    _cleanup_whitespace(cell)

    paras = list(cell.paragraphs)
    if len(paras) > 1:
        for para in paras:
            if not para.text.strip() and len(cell.paragraphs) > 1:
                para._p.getparent().remove(para._p)


def _cleanup_whitespace(cell) -> None:
    """Per paragraph: collapse doubled spaces and spaces orphaned before
    punctuation / after an opening paren by the removed segments."""
    for para in cell.paragraphs:
        runs = para.runs
        combined = "".join(r.text for r in runs)
        doomed: set[int] = set()
        for m in re.finditer(r"(\s+)[,.;:)]", combined):
            doomed.update(range(m.start(1), m.end(1)))
        for m in re.finditer(r"\((\s+)", combined):
            doomed.update(range(m.start(1), m.end(1)))
        for m in re.finditer(r"\s{2,}", combined):
            doomed.update(range(m.start() + 1, m.end()))
        if not doomed:
            continue
        pos = 0
        for run in runs:
            text = run.text
            run.text = "".join(ch for i, ch in enumerate(text) if (pos + i) not in doomed)
            pos += len(text)
