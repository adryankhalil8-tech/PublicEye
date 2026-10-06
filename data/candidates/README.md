# Case candidates

Proposed cases, one JSON file each (`CaseCandidate`). Agents propose them
with the `case-discovery` skill; **only a person selects or rejects**:

```bash
npm run candidate -- list
npm run candidate -- select <cand-id> --by="human:Your Name" --notes="why"
npm run candidate -- reject <cand-id> --by="human:Your Name" --reason="why"
```

Summaries here are discovery notes — unverified. Facts are established only
through case-research and source-verification in `data/cases/<case-id>/`.
