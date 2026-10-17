"""Extract requirement text and assessment objectives from NIST SP 800-171A (June 2018).

Usage:
    pdftotext -raw NIST.SP.800-171a.pdf 800-171a.txt
    python3 -I scripts/extract_800_171a.py 800-171a.txt > src/data/sources/nist-sp800-171a.json

800-171A restates each NIST SP 800-171 Rev 2 requirement verbatim before its
objectives, so this one file is the source for both. `-raw` matters: the default
pdftotext mode silently drops hyphens at line breaks ("security-relevant" becomes
"securityrelevant").
"""
import json
import re
import sys

REQ_START = re.compile(r"^(3\.\d{1,2}\.\d{1,2}) SECURITY REQUIREMENT$")
OBJ_START = re.compile(r"^(3\.\d{1,2}\.\d{1,2}\[[a-z]+\])\s*(.*)$")
# Running headers, footers, and the vertical "This publication is available..." margin text.
NOISE = re.compile(
    r"^(NIST SP 800-171A|ASSESSING SECURITY REQUIREMENTS FOR CONTROLLED UNCLASSIFIED INFORMATION|"
    r"NIST SP 800-171A ASSESSING SECURITY REQUIREMENTS FOR CONTROLLED UNCLASSIFIED INFORMATION|_+|PAGE \d+|(?:CHAPTER|APPENDIX) [A-Z ]+ PAGE \d+|"
    r"This|publication|is|available|free|of|charge|from:|https://doi\.org/10\.6028/NIST\.SP\.800-171A|"
    r"3\.\d{1,2} [A-Z ]+)$"
)


def join(lines):
    """Join wrapped lines; a line ending in '-' is a hyphenated compound, so keep the hyphen and add no space."""
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
    # Start at Chapter Three; Chapter Two shows 3.1.3 as an example ("Figure 1").
    lines = lines[lines.index("3.1 ACCESS CONTROL"):]
    lines = [l for l in lines if l and not NOISE.match(l)]
    reqs, i = [], 0
    while i < len(lines):
        m = REQ_START.match(lines[i])
        if not m:
            i += 1
            continue
        rid, i = m.group(1), i + 1
        body = []
        while lines[i] != "ASSESSMENT OBJECTIVE":
            body.append(lines[i])
            i += 1
        i += 1
        objectives, cur = [], None
        if lines[i] == "Determine if:":
            i += 1
        else:
            # A requirement with a single objective has no [a] label: "Determine if <objective>."
            assert lines[i].startswith("Determine if "), (rid, lines[i])
            cur = {"id": rid, "lines": [lines[i][len("Determine if "):]]}
            objectives.append(cur)
            i += 1
        while not lines[i].startswith("POTENTIAL ASSESSMENT METHODS AND OBJECTS"):
            om = OBJ_START.match(lines[i])
            if om:
                cur = {"id": om.group(1), "lines": [om.group(2)] if om.group(2) else []}
                objectives.append(cur)
            else:
                assert cur is not None, (rid, lines[i])
                cur["lines"].append(lines[i])
            i += 1
        reqs.append({
            "id": rid,
            "text": join(body),
            "objectives": [{"id": o["id"], "text": join(o["lines"])} for o in objectives],
        })
    return reqs


if __name__ == "__main__":
    reqs = parse(open(sys.argv[1], encoding="utf-8").read())
    json.dump({"source": "NIST SP 800-171A (June 2018)", "requirements": reqs}, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
