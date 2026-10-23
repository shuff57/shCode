loadSettings() starts
1. SET text TO the value stored under "settings"
2. IF text is null (nothing is stored)
3.   RETURN defaults
4. END IF
5. TRY
6.   RETURN the parsed text
7. IF the parse fails
8.   RETURN defaults
9. END TRY
back to the caller
