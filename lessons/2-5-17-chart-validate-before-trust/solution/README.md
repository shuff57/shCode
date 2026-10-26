the program starts
1. SET typed TO "abc"
2. SET quantity TO Number(typed)
3. IF quantity is NaN (not a number)
4.   THROW error "That is not a number: abc"
5. END IF
6. IF quantity <= 0
7.   THROW error "Quantity must be at least 1."
8. END IF
9. PRINT "Ordering " quantity " items."
the program ends
