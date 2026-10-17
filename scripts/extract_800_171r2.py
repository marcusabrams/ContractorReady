"""Extract the 110 requirement statements from NIST SP 800-171 Rev 2 (Feb 2021 update).

Usage:
    pdftotext -raw NIST.SP.800-171r2.pdf 800-171r2.txt
    python3 -I scripts/extract_800_171r2.py 800-171r2.txt > src/data/sources/nist-sp800-171r2.json

Each requirement in Chapter Three is "3.F.N <statement>", wrapped over one or more
lines and followed by a DISCUSSION section. `-raw` keeps hyphens at line breaks.
"""
import json
import re
import sys

REQ_START = re.compile(r"^(3\.\d{1,2}\.\d{1,2}) (\S.*)$")
STOP = {"DISCUSSION"}
ALL_CAPS = re.compile(r"^[A-Z][A-Z ,'-]{3,}$")
# Footnote markers printed after the final period, e.g. "platforms.23" or "accounts.24 25".
FOOTNOTE = re.compile(r"\.\d+(?: \d+)*$")
NOISE = re.compile(
    r"^(NIST SP 800-171, REVISION 2 PROTECTING CONTROLLED UNCLASSIFIED INFORMATION IN NONFEDERAL SYSTEMS AND ORGANIZATIONS|"
    r"(?:NIST )?SP 800-171, REVISION 2 PROTECTING CONTROLLED UNCLASSIFIED INFORMATION|"
    r"NIST SP 800-171, REVISION 2|PROTECTING CONTROLLED UNCLASSIFIED INFORMATION IN NONFEDERAL SYSTEMS AND ORGANIZATIONS|"
    r"_+|CHAPTER [A-Z]+ PAGE \d+|PAGE \d+|"
    r"This publication is available free of charge from: https://doi\.org/10\.6028/NIST\.SP\.800-171r2|"
    r"This|publication|is|available|free|of|charge|from:|https://doi\.org/10\.6028/NIST\.SP\.800-171r2|"
    r"Basic Security Requirements|Derived Security Requirements)$"
)


def join(lines):
    out = ""
    for line in lines:
        if out.endswith("-"):
            out += line
        elif out:
            out += " " + line
        else:
            out = line
    return out.replace("’", "'").replace("“", '"').replace("”", '"')


def parse(text):
    lines = [l.strip() for l in text.splitlines()]
    # Chapter Three starts at the first "3.1 ACCESS CONTROL" heading after the table of contents.
    lines = lines[lines.index("3.1 ACCESS CONTROL"):]
    lines = [l for l in lines if l and not NOISE.match(l)]
    reqs, seen, i = [], set(), 0
    while i < len(lines):
        m = REQ_START.match(lines[i])
        if not m or m.group(1) in seen:
            i += 1
            continue
        rid, body, i = m.group(1), [m.group(2)], i + 1
        # The statement ends at DISCUSSION, or at an all-caps sidebar heading
        # (e.g. "THE MEANING OF ORGANIZATIONAL SYSTEMS") placed before it.
        while lines[i] not in STOP and not ALL_CAPS.match(lines[i]):
            body.append(lines[i])
            i += 1
        seen.add(rid)
        reqs.append({"id": rid, "text": FOOTNOTE.sub(".", join(body))})
        if rid == "3.14.7":
            break
    return reqs


if __name__ == "__main__":
    reqs = parse(open(sys.argv[1], encoding="utf-8").read())
    json.dump({"source": "NIST SP 800-171 Rev 2 (February 2021 update)", "requirements": reqs}, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
