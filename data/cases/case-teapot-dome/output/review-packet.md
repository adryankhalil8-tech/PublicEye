# Gate 1 review packet — Teapot Dome: The Oil Leases, the Bribe, and the Contempt Cases

Generated 2026-10-06T23:25:48.388Z. Review against the snapshots, then decide with
`npm run gate -- approve|changes|reject <case> <gate-id> --by="human:<you>"`.

## At a glance

- Sources: 9 (9 snapshotted)
- Claims: 66 — SUPPORTED 64, DISPUTED 0, CONTRADICTED 0, INSUFFICIENT 2, UNVERIFIED 0
- Excerpts checked against snapshots: 85 found, 0 NOT found, 0 unsnapshotted
- Sensitivity: CONTESTED_OUTCOME

## 1. Legal status of every named person

- **Albert B. Fall** — ACQUITTED: Conspiracy to defraud the United States with Doheny (indicted May 27, 1925) → CONVICTED (April 6, 1931): Bribery: accepting $100,000 from Edward L. Doheny (Criminal Code § 117)
- **Edward L. Doheny** — ACQUITTED: Conspiracy to defraud the United States with Fall (indicted May 27, 1925) → ACQUITTED (March 22, 1930): Bribery: giving $100,000 to Albert B. Fall
- **Harry F. Sinclair** — ACQUITTED (April 21, 1928): Conspiracy to defraud the United States — Teapot Dome lease (1928 retrial) → CONVICTED (April 8, 1929): Contempt of the Senate — refusing to answer a Senate committee (R.S. § 102) → CONVICTED (June 3, 1929): Criminal contempt of court — surveillance of the 1927 jury
- **Henry Mason Day** — CONVICTED (June 3, 1929): Criminal contempt of court — surveillance of the 1927 jury
- **William J. Burns** — CONVICTED: Criminal contempt of court — surveillance of the 1927 jury (trial court) → OVERTURNED (June 3, 1929): Criminal contempt of court — surveillance of the 1927 jury
- **W. Sherman Burns** — CONVICTED (June 3, 1929): Criminal contempt of court — surveillance of the 1927 jury

Check: is the LAST status each person's current, final standing?

## 2. CORE claims

### `clm-exec-order-1921` · SUPPORTED · FACT

> On May 31, 1921, President Harding signed an executive order purporting to put the naval oil reserves under the administration of the Secretary of the Interior.

- **SUPPORTS** — Fall v. United States, 49 F.2d 506 (D.C. Cir. 1931) (PRIMARY) · p. 507 · ✅ found in snapshot
  - “On May 31, 1921, President Harding promulgated an Executive Order”
- **SUPPORTS** — Pan American Petroleum & Transport Co. v. United States, 273 U.S. 456 (1927) (PRIMARY) · p. 488 · ✅ found in snapshot
  - “May 31, 1921, the President promulgated an executive order purporting to commit the administration and conservation of all oil and gas bearing lands in the Reserves”

### `clm-doheny-100k-delivered` · SUPPORTED · FACT

> On November 30, 1921, Edward L. Doheny sent Fall $100,000 in currency; Doheny's son carried it from New York to Washington and gave it to Fall.

- **SUPPORTS** — Pan American Petroleum & Transport Co. v. United States, 273 U.S. 456 (1927) (PRIMARY) · p. 494 · ✅ found in snapshot
  - “Doheny sent him $100,000 in currency. The money was obtained in New York on the check of Doheny’s son who carried it to Washington and gave it to Fall.”
- **SUPPORTS** — Fall v. United States, 49 F.2d 506 (D.C. Cir. 1931) (PRIMARY) · p. 508 · ✅ found in snapshot
  - “accepted from Edward L. Doheny, on November 30, 1921, the sum of $100,000”
- _Note:_ The transfer itself is not disputed (Doheny testified the money passed). Its CHARACTER — loan or bribe — is the contested question; see clm-loan-vs-bribe.

### `clm-loan-vs-bribe` · SUPPORTED · ATTRIBUTED (Edward L. Doheny claimed)

> Doheny maintained the $100,000 was a loan; the government said it was a bribe.

- **SUPPORTS** — Brownsville Herald, March 22, 1930, p. 1 (Doheny verdict) (STRONG_SECONDARY) · ¶Doheny trial report · ✅ found in snapshot
  - “He said Doheny said it was a loan and the government said it was a bribe.”
- **SUPPORTS** — Pan American Petroleum & Transport Co. v. United States, 273 U.S. 456 (1927) (PRIMARY) · p. 498 · ✅ found in snapshot
  - “it was a loan and not a bribe”

### `clm-scotus-pan-am-corruption` · SUPPORTED · ATTRIBUTED (the U.S. Supreme Court (Pan American Petroleum v. United States, 1927) stated)

> In March 1927 the Supreme Court upheld cancellation of Doheny's Elk Hills contracts and leases, describing them as a single transaction "consummated by conspiracy, corruption and fraud."

- **SUPPORTS** — Pan American Petroleum & Transport Co. v. United States, 273 U.S. 456 (1927) (PRIMARY) · p. 509 · ✅ found in snapshot
  - “constitute a single transaction not authorized by law and consummated by conspiracy, corruption and fraud”
- _Note:_ A CIVIL ruling cancelling contracts. It is not a criminal conviction of anyone.

### `clm-lease-signed` · SUPPORTED · FACT

> On April 7, 1922, the Secretaries of the Interior and the Navy made a lease of Teapot Dome to Sinclair's Mammoth Oil Company; Fall signed it that day.

- **SUPPORTS** — Sinclair v. United States, 279 U.S. 263 (1929) (PRIMARY) · p. 286 · ✅ found in snapshot
  - “April 7, 1922, the Secretary of the Navy and the Secretary of the Interior made a lease of lands in Reserve No. 3 to the Mammoth Oil Company.”
- **SUPPORTS** — Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) (PRIMARY) · p. 45 · ✅ found in snapshot
  - “April 7, Fall signed as Secretary of the Interior”

### `clm-mammoth-trial-no-fraud` · SUPPORTED · FACT

> In the government's civil suit over Teapot Dome, the trial court found no fraud and dismissed the case; the Court of Appeals reversed, holding the lease was obtained by fraud and corruption.

- **SUPPORTS** — Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) (PRIMARY) · p. 30 · ✅ found in snapshot
  - “found that there was no fraud, and dismissed the case.”
- **SUPPORTS** — Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) (PRIMARY) · p. 30 · ✅ found in snapshot
  - “held that the lease and agreement were obtained by fraud and corruption, reversed the decree”

### `clm-scotus-mammoth-fraud` · SUPPORTED · ATTRIBUTED (the U.S. Supreme Court (Mammoth Oil Co. v. United States, 1927) stated)

> In October 1927 the Supreme Court held that the Teapot Dome lease was made fraudulently "by means of collusion and conspiracy" between Fall and Sinclair, and ordered it cancelled.

- **SUPPORTS** — Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) (PRIMARY) · p. 53 · ✅ found in snapshot
  - “the lease and agreement were made fraudulently by means of collusion and conspiracy between them”
- _Note:_ CIVIL finding. Sinclair was later ACQUITTED of criminal conspiracy (1928). Never present this as a criminal finding against Sinclair.

### `clm-scotus-no-bribery-finding` · SUPPORTED · ATTRIBUTED (the U.S. Supreme Court (Mammoth Oil Co. v. United States, 1927) stated)

> The Supreme Court expressly did not decide whether Fall was bribed in connection with the Teapot Dome lease.

- **SUPPORTS** — Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) (PRIMARY) · p. 53 · ✅ found in snapshot
  - “there is no occasion to consider and we do not determine whether Fall was bribed in respect of the lease or agreement”

### `clm-liberty-bonds-traced` · SUPPORTED · ATTRIBUTED (the U.S. Supreme Court (Mammoth Oil Co. v. United States, 1927) stated)

> The Supreme Court found that $200,000 of Liberty Bonds held by Fall's son-in-law were, by their serial numbers, conclusively shown to come from bonds bought for the Continental Trading Company.

- **SUPPORTS** — Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) (PRIMARY) · p. 49 · ✅ found in snapshot
  - “$200,000 were, by the numbers thereon, conclusively shown to have been included”
- _Note:_ Who financially controlled Continental was never established in this record. Do not name an owner.

### `clm-fall-denial-quote` · SUPPORTED · QUOTE

> In a December 26, 1923 letter to the Senate committee, Fall denied ever receiving "one cent on account of any oil lease" from Doheny or Sinclair.

- **SUPPORTS** — Fall v. United States, 49 F.2d 506 (D.C. Cir. 1931) (PRIMARY) · p. 512 · ✅ found in snapshot
  - “nor have I ever received from either of said parties one cent on account of any oil lease”

### `clm-fall-conspiracy-acquittal` · SUPPORTED · LEGAL_STATUS ACQUITTED

> Fall was acquitted of conspiring with Doheny to defraud the United States.

- **SUPPORTS** — Fall v. United States, 49 F.2d 506 (D.C. Cir. 1931) (PRIMARY) · p. 508 · ✅ found in snapshot
  - “the trial resulting in a verdict of not guilty”
- **SUPPORTS** — "Doheny Held Not Guilty" — The Washington Times, March 22, 1930, p. 1 (STRONG_SECONDARY) · ¶Doheny verdict story · ✅ found in snapshot
  - “He and Fall were tried jointly on a conspiracy indictment and both were acquitted.”
- _Note:_ Verdict date not stated in these sources (gap).

### `clm-doheny-conspiracy-acquittal` · SUPPORTED · LEGAL_STATUS ACQUITTED

> Doheny was acquitted of conspiring with Fall to defraud the United States.

- **SUPPORTS** — Fall v. United States, 49 F.2d 506 (D.C. Cir. 1931) (PRIMARY) · p. 508 · ✅ found in snapshot
  - “the trial resulting in a verdict of not guilty”
- **SUPPORTS** — "Doheny Held Not Guilty" — The Washington Times, March 22, 1930, p. 1 (STRONG_SECONDARY) · ¶Doheny verdict story · ✅ found in snapshot
  - “He and Fall were tried jointly on a conspiracy indictment and both were acquitted.”

### `clm-sinclair-ordered-shadowing` · SUPPORTED · FACT

> Sinclair admitted under oath that he authorized hiring detectives from the William J. Burns agency, through Henry Mason Day, to shadow the jurors.

- **SUPPORTS** — Sinclair v. United States, 279 U.S. 749 (1929) (PRIMARY) · p. 755 · ✅ found in snapshot
  - “The answer of Harry F. Sinclair admitted that he authorized the employment through Day of operatives of the Detective Agency for the purpose of shadowing the members of the jury without establishing contact”

### `clm-mistrial-1927` · SUPPORTED · FACT

> The 1927 conspiracy trial of Sinclair and Fall ended in a mistrial on November 2, 1927.

- **SUPPORTS** — Sinclair v. United States, 279 U.S. 749 (1929) (PRIMARY) · p. 756 · ✅ found in snapshot
  - “mistrial was entered on November 2d in United States v. Sinclair & Fall”

### `clm-sinclair-contempt-court` · SUPPORTED · LEGAL_STATUS CONVICTED

> Sinclair was found guilty of criminal contempt of court for the jury surveillance and sentenced to six months in prison; the Supreme Court affirmed in June 1929.

- **SUPPORTS** — Sinclair v. United States, 279 U.S. 749 (1929) (PRIMARY) · p. 761 · ✅ found in snapshot
  - “Sinclair to imprisonment for six months”
- **SUPPORTS** — Sinclair v. United States, 279 U.S. 749 (1929) (PRIMARY) · p. 768 · ✅ found in snapshot
  - “as to the other appellants it is affirmed”

### `clm-wjburns-reversed` · SUPPORTED · LEGAL_STATUS OVERTURNED

> The Supreme Court reversed William J. Burns's contempt conviction, finding no material evidence to support the charge against him.

- **SUPPORTS** — Sinclair v. United States, 279 U.S. 749 (1929) (PRIMARY) · p. 768 · ✅ found in snapshot
  - “The judgment as to William J. Burns must be reversed”
- **SUPPORTS** — Sinclair v. United States, 279 U.S. 749 (1929) (PRIMARY) · p. 761 · ✅ found in snapshot
  - “we can find no material evidence to support the charge against him”

### `clm-sinclair-conspiracy-acquittal` · SUPPORTED · LEGAL_STATUS ACQUITTED

> On April 21, 1928, a jury acquitted Sinclair of conspiring with Fall to defraud the government in the leasing of Teapot Dome.

- **SUPPORTS** — Evening Star, April 21, 1928, p. 1 (Sinclair verdict) (STRONG_SECONDARY) · p. 1 · ✅ found in snapshot
  - “today was acquitted of the charge of conspiring with former Secretary of the Interior Albert B. Fall to defraud the Government in connection with the leasing of Teapot Dome”
- **SUPPORTS** — The Washington Daily News, April 21, 1928, p. 1 (Sinclair verdict) (STRONG_SECONDARY) · p. 1 · ✅ found in snapshot
  - “HARRY F. SINCLAIR ACQUITTED OF CONSPIRACY CHARGE”

### `clm-sinclair-senate-contempt` · SUPPORTED · LEGAL_STATUS CONVICTED

> Sinclair was convicted of contempt of the Senate for refusing to answer the committee and sentenced to three months in jail and a $500 fine; the Supreme Court affirmed in April 1929.

- **SUPPORTS** — Sinclair v. United States, 279 U.S. 263 (1929) (PRIMARY) · p. 284 · ✅ found in snapshot
  - “He was sentenced to jail for three months and to pay a fine of $500.”
- **SUPPORTS** — Sinclair v. United States, 279 U.S. 263 (1929) (PRIMARY) · p. 299 · ✅ found in snapshot
  - “The conviction on the first count must be affirmed.”

### `clm-fall-bribery-conviction` · SUPPORTED · LEGAL_STATUS CONVICTED

> Fall was convicted of bribery — accepting $100,000 from Doheny — in the Supreme Court of the District of Columbia.

- **SUPPORTS** — Fall v. United States, 49 F.2d 506 (D.C. Cir. 1931) (PRIMARY) · p. 507 · ✅ found in snapshot
  - “Appellant Albert B. Fall was convicted in the Supreme Court of the District of Columbia of the crime of bribery”

### `clm-fall-sentence` · SUPPORTED · FACT

> Fall was sentenced to a $100,000 fine and one year in prison.

- **SUPPORTS** — Fall v. United States, 49 F.2d 506 (D.C. Cir. 1931) (PRIMARY) · p. 507 · ✅ found in snapshot
  - “from a judgment sentencing him to pay a fine of $100,000 with imprisonment for one year”

### `clm-counsel-lied-quote` · SUPPORTED · QUOTE

> Fall's own defense counsel told the jury that Fall "deliberately lied to the Senate of the United States."

- **SUPPORTS** — Fall v. United States, 49 F.2d 506 (D.C. Cir. 1931) (PRIMARY) · p. 515 · ✅ found in snapshot
  - “He deliberately lied to the Senate of the United States, as he had a right to do and as he should have done under those circumstances.”
- _Note:_ Counsel's full sentence continues: 'as he had a right to do and as he should have done under those circumstances.' Do not cut it to change its meaning.

### `clm-doheny-bribery-acquittal` · SUPPORTED · LEGAL_STATUS ACQUITTED

> On March 22, 1930, a jury acquitted Edward L. Doheny of bribing Albert B. Fall.

- **SUPPORTS** — "Doheny Held Not Guilty" — The Washington Times, March 22, 1930, p. 1 (STRONG_SECONDARY) · ¶Doheny verdict story · ✅ found in snapshot
  - “acquitted today of the charge of bribing Albert B. Fall”
- **SUPPORTS** — Brownsville Herald, March 22, 1930, p. 1 (Doheny verdict) (STRONG_SECONDARY) · ¶Doheny verdict story · ✅ found in snapshot
  - “Edward L. Doheny was acquitted today on a charge of bribing a”

### `clm-fall-conviction-affirmed` · SUPPORTED · FACT

> On April 6, 1931, the Court of Appeals of the District of Columbia affirmed Fall's bribery conviction.

- **SUPPORTS** — Fall v. United States, 49 F.2d 506 (D.C. Cir. 1931) (PRIMARY) · p. 515 · ✅ found in snapshot
  - “The judgment is affirmed.”
- _Note:_ Date from the opinion's filing date (source publicationDate).

## 3. Allegations and attributed statements

### `clm-fall-keen-control` · SUPPORTED · ATTRIBUTED (the U.S. Supreme Court (Mammoth Oil Co. v. United States, 1927) stated)

> The Supreme Court found that from the beginning Fall was keen to control the leasing of the naval petroleum reserves.

- **SUPPORTS** — Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) (PRIMARY) · p. 37 · ✅ found in snapshot
  - “From the beginning Fall was keen to control the leasing of the naval petroleum reserves.”

### `clm-robison-secrecy` · SUPPORTED · ATTRIBUTED (the trial court's findings in the Elk Hills suit, upheld by the Supreme Court stated)

> According to the court findings, Fall and Admiral John K. Robison agreed that the Elk Hills contract should be kept secret so that Congress and the public would not know what was being done.

- **SUPPORTS** — Pan American Petroleum & Transport Co. v. United States, 273 U.S. 456 (1927) (PRIMARY) · p. 493 · ✅ found in snapshot
  - “agreed that the proposed contract should be kept secret so that Congress and the public should not know what was being done”
- _Note:_ The Court added: "it is to be said that Robison’s motives in this were not the same as Fall’s." Do not imply Robison shared Fall's purpose.

### `clm-note-torn` · SUPPORTED · ATTRIBUTED (the trial court's findings in the Elk Hills suit, upheld by the Supreme Court stated)

> According to the court findings, a few weeks after the money was given, Doheny tore Fall's signature off the $100,000 note.

- **SUPPORTS** — Pan American Petroleum & Transport Co. v. United States, 273 U.S. 456 (1927) (PRIMARY) · p. 494 · ✅ found in snapshot
  - “A few weeks after it was given, Doheny tore Fall’s signature”

### `clm-elk-hills-no-competition` · SUPPORTED · ATTRIBUTED (the trial court's findings in the Elk Hills suit, upheld by the Supreme Court stated)

> According to the court findings, the December 11, 1922 Elk Hills lease to Doheny's company was arranged without competition of any kind.

- **SUPPORTS** — Pan American Petroleum & Transport Co. v. United States, 273 U.S. 456 (1927) (PRIMARY) · p. 497 · ✅ found in snapshot
  - “The lease of December 11 was arranged without competition of any kind.”

### `clm-lease-secrecy` · SUPPORTED · ATTRIBUTED (the U.S. Supreme Court (Mammoth Oil Co. v. United States, 1927) stated)

> The Supreme Court found the Teapot Dome lease was kept secret and that there was never any legitimate reason for that secrecy.

- **SUPPORTS** — Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) (PRIMARY) · p. 46 · ✅ found in snapshot
  - “There was never any legitimate reason for secrecy.”

### `clm-continental-records-destroyed` · SUPPORTED · ATTRIBUTED (the U.S. Supreme Court (Mammoth Oil Co. v. United States, 1927) stated)

> The Continental Trading Company was dissolved shortly after May 1923 and all its records were destroyed, according to the Supreme Court.

- **SUPPORTS** — Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) (PRIMARY) · p. 48 · ✅ found in snapshot
  - “all its records were destroyed”

### `clm-witnesses-refused` · SUPPORTED · ATTRIBUTED (the U.S. Supreme Court (Mammoth Oil Co. v. United States, 1927) stated)

> Key witnesses would not testify about the bonds: Fall's son-in-law invoked his privilege against self-incrimination, and two oil executives went to France and refused to testify.

- **SUPPORTS** — Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) (PRIMARY) · p. 49 · ✅ found in snapshot
  - “invoking the rule against compulsory self-incrimination, he declined to give any information as to where he got the bonds”
- **SUPPORTS** — Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) (PRIMARY) · p. 49 · ✅ found in snapshot
  - “Blackmer and O’Neil went to France”
- _Note:_ Invoking the privilege is a legal right and is NOT evidence of guilt. The son-in-law was not charged in these sources.

### `clm-zevely-loan` · SUPPORTED · ATTRIBUTED (J. W. Zevely, Sinclair's counsel testified)

> Sinclair's counsel J. W. Zevely testified that the $25,000 was a loan from Sinclair, not a fee.

- **SUPPORTS** — Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) (PRIMARY) · p. 51 · ✅ found in snapshot
  - “the bonds were not given as a fee but as a loan from Sinclair”

### `clm-fall-mclean-story` · SUPPORTED · ATTRIBUTED (Albert B. Fall stated)

> Fall told the Senate committee the $100,000 came from Edward B. McLean, who denied it in his own testimony.

- **SUPPORTS** — Fall v. United States, 49 F.2d 506 (D.C. Cir. 1931) (PRIMARY) · p. 512 · ✅ found in snapshot
  - “After he had stated that he received the $100,000 to purchase the Harris ranch from Edward B. McLean, which Mr. McLean denied in his testimony given before the Senate committee”

### `clm-joint-resolution-1924` · SUPPORTED · ATTRIBUTED (Congress (Joint Resolution of February 8, 1924) stated)

> On February 8, 1924, Congress passed a joint resolution stating the leases were executed "under circumstances indicating fraud and corruption" and directing suits to cancel them.

- **SUPPORTS** — Pan American Petroleum & Transport Co. v. United States, 273 U.S. 456 (1927) (PRIMARY) · p. 491 · ✅ found in snapshot
  - “A Joint Resolution adopted by the Senate and House of Representatives and approved by the President, February 8, 1924”
- **SUPPORTS** — Pan American Petroleum & Transport Co. v. United States, 273 U.S. 456 (1927) (PRIMARY) · p. 491 · ✅ found in snapshot
  - “were executed under circumstances indicating fraud and corruption”

### `clm-shadowing-belief` · SUPPORTED · ATTRIBUTED (Harry F. Sinclair (sworn answer) stated)

> Sinclair said he believed the government itself had kept jurors under surveillance and that he, as a citizen, had the same right.

- **SUPPORTS** — Sinclair v. United States, 279 U.S. 749 (1929) (PRIMARY) · p. 756 · ✅ found in snapshot
  - “he believed that he, as a citizen of the United States, had the same right and privilege”

### `clm-doheny-jury-loan` · SUPPORTED · ATTRIBUTED (the Associated Press (Brownsville Herald) reported)

> The Associated Press reported the jury accepted Doheny's position that the $100,000 he gave Fall was a loan.

- **SUPPORTS** — Brownsville Herald, March 22, 1930, p. 1 (Doheny verdict) (STRONG_SECONDARY) · ¶Doheny verdict story · ✅ found in snapshot
  - “plea that the $100,000 he gave to Albert B. Fall, President Harding's secretary of the interior, was a loan”

### `clm-judge-possible-both` · SUPPORTED · ATTRIBUTED (the Associated Press (Brownsville Herald) reported)

> According to the AP report, the judge in Doheny's trial instructed the jury it was possible for Fall to have been found guilty and for Doheny to be not guilty.

- **SUPPORTS** — Brownsville Herald, March 22, 1930, p. 1 (Doheny verdict) (STRONG_SECONDARY) · ¶Doheny verdict story · ✅ found in snapshot
  - “already convicted of receiving a bribe from Edward Doheny”

### `clm-fall-only-guilty` · SUPPORTED · ATTRIBUTED (The Washington Times reported)

> The Washington Times reported that Doheny had beaten the bribery charge on which Fall was convicted.

- **SUPPORTS** — "Doheny Held Not Guilty" — The Washington Times, March 22, 1930, p. 1 (STRONG_SECONDARY) · ¶Doheny verdict story · ✅ found in snapshot
  - “Doheny now has beaten the bribery charge, upon which Fall was convicted.”
- _Note:_ Importance lowered from CORE at verification: this is one paper’s characterization; the underlying CORE facts are clm-fall-bribery-conviction and clm-doheny-bribery-acquittal.

## 4. Disputed, contradicted, or insufficient claims

### `clm-fall-first-cabinet-prison` · INSUFFICIENT_EVIDENCE · FACT

> Fall was the first U.S. cabinet officer to go to prison for crimes committed in office.

- _Note:_ Popular claim. No source in this workspace supports it. Needs a primary or two independent strong sources before use.

### `clm-fall-served-sentence` · INSUFFICIENT_EVIDENCE · FACT

> Fall served his prison sentence in 1931–1932.

- _Note:_ Widely reported but not yet sourced here. Obtain Bureau of Prisons / NARA records or contemporary reports.

## 5. Contradictions

- **ctr-civil-vs-criminal**: Civil courts (Supreme Court, 1927) found the leases were obtained through corruption, fraud, and conspiracy involving Fall, Doheny, and Sinclair; criminal juries acquitted Doheny (conspiracy and bribery) and Sinclair (conspiracy), while convicting Fall of bribery. — _Resolution:_ Not a factual contradiction: different proceedings, standards of proof, and questions (civil cancellation vs. criminal guilt; the bribery case against Fall turned on HIS intent, Doheny's on HIS). Narrate both outcomes precisely; never merge them.
- **ctr-sinclair-comment**: Two papers each report a different remark as Sinclair's 'only' comment on his 1928 acquittal. — _Resolution:_ Possibly said at different moments. If quoted, attribute each to its paper.

## 6. Timeline and gaps

- April 30, 1915 — Teapot Dome set aside as Naval Petroleum Reserve No. 3. _(CONFIRMED)_
- March 5, 1921 — Fall becomes Secretary of the Interior; Denby, Secretary of the Navy. _(CONFIRMED)_
- May 31, 1921 — Harding executive order puts the naval oil reserves under the Interior Secretary. _(CONFIRMED)_
- July 8, 1921 — Fall writes Doheny that he will handle naval leases "exactly as I think best." _(CONFIRMED)_
- November 30, 1921 — Doheny sends Fall $100,000 in cash, carried to Washington by Doheny’s son. _(CONFIRMED)_
- December 31, 1921 – January 1, 1922 — Sinclair visits Fall’s ranch at Three Rivers, New Mexico. _(CONFIRMED)_
- February 3, 1922 — Sinclair submits his proposal to lease Teapot Dome. _(CONFIRMED)_
- February 28, 1922 — Sinclair has the Mammoth Oil Company organized. _(CONFIRMED)_
- April 7, 1922 — Teapot Dome leased to the Mammoth Oil Company; Fall signs. _(CONFIRMED)_
- April 29, 1922 — Senate adopts Resolution 282 to investigate the naval oil leases. _(CONFIRMED)_
- March 4, 1923 — Fall leaves the Interior Department. _(CONFIRMED)_
- March 1923 – June 1923 — Sinclair gives Fall $25,000 in bonds; Sinclair’s counsel later testifies it was a loan. _(CONFIRMED)_
- December 26, 1923 — Fall writes the Senate committee denying he received money from Doheny or Sinclair. _(CONFIRMED)_
- February 8, 1924 — Congress directs suits to cancel the leases, citing circumstances indicating fraud and corruption. _(CONFIRMED)_
- March 22, 1924 — Sinclair refuses to answer the Senate committee. _(CONFIRMED)_
- May 27, 1925 — Fall and Doheny indicted for conspiracy to defraud the United States. _(CONFIRMED)_
- Date unknown — Fall and Doheny acquitted of conspiracy. _(CONFIRMED)_
- March 7, 1927 — Supreme Court upholds cancellation of the Elk Hills contracts and leases. _(CONFIRMED)_
- October 10, 1927 — Supreme Court orders the Teapot Dome lease cancelled as fraudulent. _(CONFIRMED)_
- October 17, 1927 — Sinclair and Fall go on trial for conspiracy. _(CONFIRMED)_
- October 18, 1927 – November 2, 1927 — Burns detectives, hired on Sinclair’s authorization, shadow the jurors. _(CONFIRMED)_
- November 2, 1927 — Mistrial declared. _(CONFIRMED)_
- April 21, 1928 — Sinclair acquitted of conspiracy at retrial; Fall had been severed for poor health. _(CONFIRMED)_
- April 8, 1929 — Supreme Court affirms Sinclair’s contempt-of-Senate conviction. _(CONFIRMED)_
- June 3, 1929 — Supreme Court affirms jury-surveillance contempt for Sinclair, Day, W. Sherman Burns; reverses William J. Burns. _(CONFIRMED)_
- c. September 1929 — Fall convicted of accepting the $100,000 bribe. _(PROBABLE)_
- March 22, 1930 — Doheny acquitted of bribing Fall. _(CONFIRMED)_
- April 6, 1931 — Court of Appeals affirms Fall’s bribery conviction. _(CONFIRMED)_
- ⟂ GAP: Date of the Fall–Doheny conspiracy trial and verdict not in our sources.
- ⟂ GAP: Whether and when Fall and Sinclair served their sentences is not yet documented.

## 7. Open questions

- [OPEN] When was the Fall–Doheny conspiracy trial held and the verdict returned?
- [OPEN] Did Fall serve his prison sentence, and when? Was he the first cabinet officer imprisoned for crimes in office?
- [OPEN] When did Sinclair serve his contempt sentences?
- [UNRESOLVABLE] Who owned or benefited from the Continental Trading Company, whose bonds reached Fall's son-in-law?

## 8. Sources

- `src-mammoth-oil-1927` PRIMARY · Mammoth Oil Co. v. United States, 275 U.S. 13 (1927) — Supreme Court of the United States (via CourtListener) · snapshot sha256:5b5dbd832d15…
  - https://www.courtlistener.com/opinion/101139/mammoth-oil-co-v-united-states/
- `src-pan-american-1927` PRIMARY · Pan American Petroleum & Transport Co. v. United States, 273 U.S. 456 (1927) — Supreme Court of the United States (via CourtListener) · snapshot sha256:31411d89151d…
  - https://www.courtlistener.com/opinion/101030/pan-american-petroleum-transport-co-v-united-states/
- `src-sinclair-senate-1929` PRIMARY · Sinclair v. United States, 279 U.S. 263 (1929) — Supreme Court of the United States (via CourtListener) · snapshot sha256:486ee6445e19…
  - https://www.courtlistener.com/opinion/101414/sinclair-v-united-states/
- `src-sinclair-jury-1929` PRIMARY · Sinclair v. United States, 279 U.S. 749 (1929) — Supreme Court of the United States (via CourtListener) · snapshot sha256:e9cdea22f1fd…
  - https://www.courtlistener.com/opinion/101453/sinclair-v-united-states/
- `src-fall-1931` PRIMARY · Fall v. United States, 49 F.2d 506 (D.C. Cir. 1931) — U.S. Court of Appeals for the D.C. Circuit (via CourtListener) · snapshot sha256:78f16f0ddb24…
  - https://www.courtlistener.com/opinion/6948641/fall-v-united-states/
- `src-wash-times-1930-03-22` STRONG_SECONDARY · "Doheny Held Not Guilty" — The Washington Times, March 22, 1930, p. 1 — The Washington Times (Washington, D.C.) · snapshot sha256:ac7a62f8cc60…
  - https://www.loc.gov/resource/sn84026749/1930-03-22/ed-1/?sp=1
- `src-brownsville-1930-03-22` STRONG_SECONDARY · Brownsville Herald, March 22, 1930, p. 1 (Doheny verdict) — Brownsville Herald (Brownsville, Tex.) · snapshot sha256:8f3c4cf62327…
  - https://www.loc.gov/resource/sn86063730/1930-03-22/ed-1/?sp=1
- `src-evening-star-1928-04-21` STRONG_SECONDARY · Evening Star, April 21, 1928, p. 1 (Sinclair verdict) — Evening Star (Washington, D.C.) · snapshot sha256:527c38f32639…
  - https://www.loc.gov/resource/sn83045462/1928-04-21/ed-1/?sp=1
- `src-wash-daily-news-1928-04-21` STRONG_SECONDARY · The Washington Daily News, April 21, 1928, p. 1 (Sinclair verdict) — The Washington Daily News (Washington, D.C.) · snapshot sha256:a301bc5ff88d…
  - https://www.loc.gov/resource/sn82016181/1928-04-21/ed-1/?sp=1

## Gate 1 checklist

- [ ] Every CORE claim matches its excerpt as read in the source
- [ ] Allegations are attributed, never stated as fact
- [ ] Every person's legal status is correct and current
- [ ] Contradictions are documented, not silently resolved
- [ ] Timeline gaps and uncertain dates are understood
- [ ] Sensitivity (minors, living private individuals, victims' families) considered
