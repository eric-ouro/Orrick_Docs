#!/usr/bin/env python3
"""Extract the Orrick term sheet and open-items memo into app seed data."""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Iterable

from docx import Document


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "sources"
DATA_DIR = ROOT / "data"

TERM_SHEET = SOURCE_DIR / "FORM - Venture Capital_Private Equity Fund Form Term Sheet.docx"
OPEN_ITEMS = SOURCE_DIR / "blind_pool_fund_open_items_and_drafting_changes.docx"
CHATGPT_SHARE_URL = "https://chatgpt.com/share/6a47ea7d-00d8-83e8-af2e-4c84dc4c580d"


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def slugify(text: str, fallback: str = "item") -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:70] or fallback


def unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            out.append(value)
    return out


def read_paragraphs(path: Path) -> list[str]:
    doc = Document(str(path))
    return [clean(p.text) for p in doc.paragraphs if clean(p.text)]


def read_tables(path: Path) -> list[list[list[str]]]:
    doc = Document(str(path))
    tables: list[list[list[str]]] = []
    for table in doc.tables:
        rows: list[list[str]] = []
        for row in table.rows:
            rows.append([clean(cell.text) for cell in row.cells])
        tables.append(rows)
    return tables


def extract_term_sections(path: Path) -> list[dict]:
    doc = Document(str(path))
    sections: list[dict] = []
    current_group = "Front Matter"
    for row_index, row in enumerate(doc.tables[0].rows):
        title = clean(row.cells[0].text)
        body = clean(row.cells[1].text)
        is_group = not body or body == title
        section_id = f"sec-{row_index:02d}-{slugify(title, 'section')}"
        if is_group:
            current_group = title
        sections.append(
            {
                "id": section_id,
                "row": row_index,
                "title": title,
                "body": body,
                "group": title if is_group else current_group,
                "isGroup": is_group,
            }
        )
    return sections


def build_title_index(sections: list[dict]) -> dict[str, str]:
    index: dict[str, str] = {}
    for section in sections:
        if section["isGroup"]:
            continue
        index[section["title"].lower()] = section["id"]
    for section in sections:
        index.setdefault(section["title"].lower(), section["id"])
    return index


def anchor_ids(index: dict[str, str], titles: list[str]) -> list[str]:
    return unique(index.get(title.lower(), "") for title in titles)


CATEGORY_ANCHORS = {
    "A. Entity structure and ownership": [
        "The Fund",
        "Management",
        "Sponsor Capital Commitment",
        "Carried Interest",
        "Carried Interest Clawback",
    ],
    "B. Fund economics": [
        "Capital Commitments",
        "Management Fee",
        "Management Fee Offset",
        "Distributions",
        "Carried Interest",
        "Carried Interest Clawback",
        "Sponsor Capital Commitment",
    ],
    "C. Investment mandate and whitelist": [
        "Investment Objectives and Program",
        "Investment Limitations",
        "Holding Vehicles; Feeder Vehicle; Alternative Investment Vehicles; Parallel Funds",
        "Transfers of Interests and Withdrawals",
        "General Risks",
    ],
    "D. Capital calls, speed, and warehousing": [
        "Capital Contributions",
        "Borrowing",
        "Fund Expenses",
        "Sponsor Capital Commitment",
        "Investment Limitations",
    ],
    "E. Buy-side placement / capital formation": [
        "Investor Qualifications",
        "Management Fee Offset",
        "Fund Expenses",
        "Side Letters",
        "General Risks",
    ],
    "F. Sell-side sourcing / origination": [
        "Fund Expenses",
        "Investment Limitations",
        "Other Competitive Activity; Successor Fund",
        "Exculpation and Indemnification",
    ],
    "G. Future funds, SPVs, and allocations": [
        "Other Competitive Activity; Successor Fund",
        "Co-Investment Opportunities",
        "Holding Vehicles; Feeder Vehicle; Alternative Investment Vehicles; Parallel Funds",
        "Investment Limitations",
    ],
    "H. Regulatory, compliance, and operations": [
        "Investor Qualifications",
        "Reports",
        "Valuation",
        "Fund Expenses",
        "General Partner Expenses",
        "Exculpation and Indemnification",
        "ERISA",
    ],
}


KEYWORD_ANCHORS = [
    (r"target fund size|hard cap|minimum commitment|capital commitment", ["Capital Commitments"]),
    (r"management fee|fee offset|placement fee|organization expense|transaction fee|monitoring fee", ["Management Fee", "Management Fee Offset", "Fund Expenses"]),
    (r"carry|carried interest|preferred return|hurdle|waterfall|catch-up|clawback", ["Distributions", "Carried Interest", "Carried Interest Clawback", "Sponsor Capital Commitment"]),
    (r"gp commitment|sponsor", ["Sponsor Capital Commitment", "Management"]),
    (r"whitelist|late-stage|secondary|spv|tender|forward|contractual|non-u\.s\.|concentration|follow-on|rofr|company consent|lockup", ["Investment Objectives and Program", "Investment Limitations", "Holding Vehicles; Feeder Vehicle; Alternative Investment Vehicles; Parallel Funds", "Transfers of Interests and Withdrawals"]),
    (r"capital call|drawn|deposit|default|borrow|bridge|subscription line|advance|warehouse|warehousing|reserves", ["Capital Contributions", "Borrowing", "Fund Expenses", "Sponsor Capital Commitment"]),
    (r"506\(b\)|506\(c\)|3\(c\)\(1\)|3\(c\)\(7\)|accredited|qualified purchaser|solicit|offering", ["Investor Qualifications", "General Risks"]),
    (r"lpac|approval|consent|governance|amendment", ["Limited Partner Advisory Committee", "Amendments"]),
    (r"successor|future fund|parallel|co-invest|allocation|sidecar|feeder|blocker|overflow", ["Other Competitive Activity; Successor Fund", "Co-Investment Opportunities", "Holding Vehicles; Feeder Vehicle; Alternative Investment Vehicles; Parallel Funds"]),
    (r"adviser|aml|kyc|bad actor|administrator|audit|reporting|valuation|privacy|records|insurance|indemnity|erisa", ["Investor Qualifications", "Reports", "Valuation", "Exculpation and Indemnification", "ERISA"]),
]


def anchors_for_text(index: dict[str, str], text: str, category: str = "") -> list[str]:
    titles: list[str] = []
    titles.extend(CATEGORY_ANCHORS.get(category, []))
    haystack = f"{category} {text}".lower()
    for pattern, matched_titles in KEYWORD_ANCHORS:
        if re.search(pattern, haystack):
            titles.extend(matched_titles)
    return anchor_ids(index, titles[:8])


def make_issue(
    *,
    issue_id: str,
    issue_type: str,
    title: str,
    prompt: str,
    source: str,
    term_section_ids: list[str],
    category: str = "",
    details: str = "",
    provisional_answer: str = "",
    priority: str = "medium",
    tags: list[str] | None = None,
) -> dict:
    return {
        "id": issue_id,
        "issueType": issue_type,
        "status": "open",
        "priority": priority,
        "category": category,
        "title": title,
        "prompt": prompt,
        "details": details,
        "provisionalAnswer": provisional_answer,
        "source": source,
        "termSectionIds": term_section_ids,
        "tags": tags or [],
    }


def extract_detailed_questions(paragraphs: list[str], index: dict[str, str]) -> list[dict]:
    issues: list[dict] = []
    current_category = ""
    in_section = False
    question_index = 1
    for text in paragraphs:
        if text == "3. Detailed Questions to Answer":
            in_section = True
            continue
        if text == "4. Requested Changes / Drafting Instructions for Orrick":
            break
        if not in_section:
            continue
        if re.match(r"^[A-H]\.\s+", text):
            current_category = text
            continue
        if "?" not in text:
            continue
        title = text.rstrip("?")
        issues.append(
            make_issue(
                issue_id=f"q-{question_index:03d}-{slugify(title)}",
                issue_type="question",
                title=title,
                prompt=text,
                source="Open-items memo - Section 3 detailed questions",
                category=current_category,
                term_section_ids=anchors_for_text(index, text, current_category),
                tags=[slugify(current_category.split(".", 1)[-1].strip())],
            )
        )
        question_index += 1
    return issues


def extract_decisions(tables: list[list[list[str]]], index: dict[str, str]) -> list[dict]:
    issues: list[dict] = []
    decision_table = tables[14]
    for row in decision_table[1:]:
        number, decision, option_a, option_b, comment = row[:5]
        prompt = f"{decision}: choose between the listed approaches or draft a custom answer."
        provisional = f"Option A: {option_a}\nOption B: {option_b}\nComment: {comment}"
        issues.append(
            make_issue(
                issue_id=f"decision-{number}-{slugify(decision)}",
                issue_type="decision",
                title=decision,
                prompt=prompt,
                source="Open-items memo - Section 5 immediate decisions",
                details=comment,
                provisional_answer=provisional,
                term_section_ids=anchors_for_text(index, f"{decision} {option_a} {option_b} {comment}"),
                priority="high",
                tags=["immediate-decision"],
            )
        )
    return issues


def extract_checklist(paragraphs: list[str], index: dict[str, str]) -> list[dict]:
    issues: list[dict] = []
    checklist_index = 1
    for text in paragraphs:
        if not text.startswith("[ ]"):
            continue
        title = text[3:].strip().rstrip(".")
        issues.append(
            make_issue(
                issue_id=f"check-{checklist_index:03d}-{slugify(title)}",
                issue_type="checklist",
                title=title,
                prompt=title,
                source="Open-items memo - Section 7 current open items checklist",
                term_section_ids=anchors_for_text(index, title),
                priority="medium",
                tags=["checklist"],
            )
        )
        checklist_index += 1
    return issues


def extract_drafting_changes(paragraphs: list[str], tables: list[list[list[str]]], index: dict[str, str]) -> list[dict]:
    heads = [
        "A. Ability to give conditional carry or incentive payments",
        "B. Sourcing, origination, and strategic relationship arrangements",
        "C. Investment objectives and permitted investments",
        "D. Restriction on blind-pool fund investments - carveouts for weird vehicles",
        "E. Capital call timing and fast execution mechanics",
        "F. Successor funds, parallel funds, co-invests, and SPV carveouts",
    ]
    table_indices = [8, 9, 10, 11, 12, 13]
    instruction_prefixes = {
        heads[0]: "Add a general authorization/disclosure provision.",
        heads[1]: "Add a general authorization/disclosure provision.",
        heads[2]: "Revise the generic investment objective to cover these categories.",
        heads[3]: "Modify the blind-pool or fee-bearing vehicle restriction to preserve execution flexibility.",
        heads[4]: "Revise capital-call and funding mechanics to allow faster execution.",
        heads[5]: "Revise the successor-fund restriction and pair it with allocation rules.",
    }
    notes_by_head: dict[str, str] = {}
    for idx, text in enumerate(paragraphs):
        if text in heads:
            for nxt in paragraphs[idx + 1 : idx + 8]:
                if nxt.startswith("Counsel notes / decisions:"):
                    notes_by_head[text] = nxt
                    break

    issues: list[dict] = []
    for change_index, (head, table_index) in enumerate(zip(heads, table_indices), start=1):
        provision = tables[table_index][0][0]
        prompt = instruction_prefixes[head]
        details = notes_by_head.get(head, "")
        title = head.split(". ", 1)[1]
        issues.append(
            make_issue(
                issue_id=f"change-{change_index:02d}-{slugify(title)}",
                issue_type="drafting-change",
                title=title,
                prompt=prompt,
                source="Open-items memo - Section 4 requested drafting changes",
                details=details,
                provisional_answer=provision,
                term_section_ids=anchors_for_text(index, f"{head} {prompt} {details} {provision}"),
                priority="high",
                tags=["drafting-change"],
            )
        )
    return issues


def extract_supporting_documents(tables: list[list[list[str]]], index: dict[str, str]) -> list[dict]:
    issues: list[dict] = []
    for table_index in [2, 3, 4, 5]:
        header = tables[table_index][0][0]
        for row_index, row in enumerate(tables[table_index][1:], start=1):
            name, purpose, notes = row[:3]
            title = f"{header}: {name}"
            issues.append(
                make_issue(
                    issue_id=f"doc-{table_index}-{row_index}-{slugify(name)}",
                    issue_type="supporting-document",
                    title=title,
                    prompt=purpose,
                    source="Open-items memo - Section 1 additional documents needed",
                    details=notes,
                    term_section_ids=anchors_for_text(index, f"{name} {purpose} {notes}"),
                    priority="low",
                    tags=["supporting-document", slugify(header)],
                )
            )
    return issues


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    term_sections = extract_term_sections(TERM_SHEET)
    index = build_title_index(term_sections)
    memo_paragraphs = read_paragraphs(OPEN_ITEMS)
    memo_tables = read_tables(OPEN_ITEMS)

    issues = []
    issues.extend(extract_decisions(memo_tables, index))
    issues.extend(extract_drafting_changes(memo_paragraphs, memo_tables, index))
    issues.extend(extract_detailed_questions(memo_paragraphs, index))
    issues.extend(extract_checklist(memo_paragraphs, index))
    issues.extend(extract_supporting_documents(memo_tables, index))

    payload = {
        "meta": {
            "project": "Blind Pool Fund Term Sheet Workspace",
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
            "sourceFiles": [
                {
                    "label": "Orrick venture capital / private equity fund form term sheet",
                    "path": str(TERM_SHEET),
                },
                {
                    "label": "Blind pool fund open items and drafting changes",
                    "path": str(OPEN_ITEMS),
                },
                {
                    "label": "Shared ChatGPT conversation",
                    "url": CHATGPT_SHARE_URL,
                    "note": "The public share page was available, but the clean transcript was not directly exposed through static fetch; the attached open-items memo was used as the structured seed.",
                },
            ],
        },
        "termSheet": {
            "title": "[FUND], LP - Summary of Principal Terms",
            "sections": term_sections,
        },
        "openItemsMemo": {
            "paragraphs": memo_paragraphs,
            "tables": memo_tables,
        },
        "issues": issues,
    }

    json_text = json.dumps(payload, indent=2, ensure_ascii=False)
    (DATA_DIR / "seed-data.json").write_text(json_text + "\n", encoding="utf-8")
    (DATA_DIR / "seed-data.js").write_text(
        "window.ORRICK_SEED_DATA = " + json_text + ";\n", encoding="utf-8"
    )

    print(f"Wrote {DATA_DIR / 'seed-data.json'}")
    print(f"Wrote {DATA_DIR / 'seed-data.js'}")
    print(f"Sections: {len(term_sections)}")
    print(f"Issues: {len(issues)}")


if __name__ == "__main__":
    main()
