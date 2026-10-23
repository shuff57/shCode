process() starts
1. SET item 0 OF nums TO 0
2. ASK did the caller see this write? YES: nums and scores are the same array, so scores now starts with 0
3. SET nums TO a NEW array [9, 9]
4. ASK did the caller see this write? NO: only the local name nums moved, so scores is unchanged
5. The caller prints scores: [0, 20, 30]
back to the caller
